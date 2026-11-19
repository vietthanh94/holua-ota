/* asset-updater.js — OTA ASSET updater (not app/APK OTA).
 * Flow: fetch manifest -> validate (shape + path-traversal guard, no eval, data-only) ->
 * download each asset to a staging area -> verify byte-length + SHA-256 against the manifest ->
 * only when ALL assets verify, atomically activate (promote staging to current, keep the old
 * one as `previous` for rollback). Offline: the last activated assets live in IndexedDB and are
 * served from there when the network/manifest is unreachable.
 *
 * SECURITY NOTE (documented, not hidden): SHA-256 proves an asset matches the manifest; it does
 * NOT prove the manifest is authentic. Production needs HTTPS + a signed/trusted manifest source.
 * This is asset-OTA only; it never updates the Android app itself and never executes manifest data.
 *
 * Old-WebView safe: ES5, function module, fetch+Promise, IndexedDB (no Service Worker — SW needs a
 * secure context, unavailable over plain-HTTP LAN). Exposes FT.AssetUpdater. */
(function (root) {
  'use strict';
  var FT = root.FT = root.FT || {};

  var DB_NAME = 'fire-tiger-ota';
  var STORE = 'kv';
  var PATH_RE = /^assets\/fire-tiger\/[A-Za-z0-9_\-]+\.(png|jpg|jpeg|webp)$/;
  var VER_RE = /^[0-9]+\.[0-9]+\.[0-9]+$/;

  /* ---- tiny IndexedDB key/value helper (values may be structured-clone, incl. Blob) ---- */
  function openDB() {
    return new Promise(function (resolve, reject) {
      if (!root.indexedDB) { reject(new Error('no-indexeddb')); return; }
      var rq = root.indexedDB.open(DB_NAME, 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore(STORE); };
      rq.onsuccess = function () { resolve(rq.result); };
      rq.onerror = function () { reject(rq.error || new Error('idb-open')); };
    });
  }
  function idbGet(key) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
        tx.onsuccess = function () { resolve(tx.result || null); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  function idbSet(key, val) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite').objectStore(STORE).put(val, key);
        tx.onsuccess = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  /* ---- validation (data-only; any failure rejects the whole update) ---- */
  function normalizeManifest(m) {
    if (!m || typeof m !== 'object') throw new Error('manifest: not an object');
    if (typeof m.version !== 'string' || !VER_RE.test(m.version)) throw new Error('manifest: bad version');
    var assets = m.assets;
    if (!assets && m.asset) {                 /* tolerate legacy single-asset shape */
      assets = [{ id: 'tiger', path: m.asset, sha256: m.sha256 || null, bytes: m.bytes || null }];
    }
    if (!assets || Object.prototype.toString.call(assets) !== '[object Array]' || !assets.length) {
      throw new Error('manifest: no assets');
    }
    for (var i = 0; i < assets.length; i++) {
      var a = assets[i];
      if (!a || typeof a.path !== 'string') throw new Error('manifest: asset missing path');
      if (a.path.indexOf('..') !== -1 || a.path.charAt(0) === '/' || !PATH_RE.test(a.path)) {
        throw new Error('manifest: unsafe asset path: ' + a.path);
      }
      if (!a.id) a.id = a.path;
    }
    return { version: m.version, assets: assets };
  }

  function AssetUpdater(opts) {
    opts = opts || {};
    this.manifestUrl = opts.manifestUrl || 'ota/manifest.json';
    this.onStatus = opts.onStatus || function () {};
    this.current = null;         /* {version, assets:[{id,path,sha256,bytes,blob,url}]} */
  }

  AssetUpdater.prototype._emit = function (code, msg, extra) {
    if (this._quiet) return;
    this.onStatus({ code: code, msg: msg, extra: extra || null });
  };

  /* Load whatever is already cached (offline-first boot). Returns {version, map} or null. */
  AssetUpdater.prototype.loadCached = function (quiet) {
    var self = this;
    self._quiet = !!quiet;
    return idbGet('current').then(function (rec) {
      if (!rec) return null;
      var map = {};
      for (var i = 0; i < rec.assets.length; i++) {
        var a = rec.assets[i];
        a.url = root.URL.createObjectURL(a.blob);
        map[a.id] = a.url;
      }
      self.current = rec;
      self._emit('cache-hit', 'Đã nạp hình từ bộ nhớ máy (offline).', rec.version);
      return { version: rec.version, map: map };
    }).catch(function () { return null; });
  };

  /* Full OTA check+download+verify+activate. Resolves {changed, version, map} or rejects. */
  AssetUpdater.prototype.check = function (quiet) {
    var self = this;
    self._quiet = !!quiet;
    self._emit('thinking', 'Đang kiểm tra gói hình ảnh mới…');
    if (!root.fetch) { self._emit('error', 'Trình duyệt quá cũ, không hỗ trợ cập nhật.'); return Promise.reject(new Error('no-fetch')); }

    return fetch(self.manifestUrl + '?ts=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (raw) {
        var man = normalizeManifest(raw);
        if (self.current && self.current.version === man.version) {
          self._emit('uptodate', 'Đã là phiên bản mới nhất: ' + man.version + ' ✅', man.version);
          var e = new Error('up-to-date'); e.upToDate = true; throw e;
        }
        return self._downloadAndVerify(man);
      })
      .then(function (staged) { return self._activate(staged); })
      .catch(function (err) {
        if (err && err.upToDate) return { changed: false, version: self.current ? self.current.version : null, map: null };
        self._emit('error', 'Cập nhật thất bại: ' + (err && err.message ? err.message : 'lỗi') + '. Giữ bản hiện tại.');
        throw err;
      });
  };

  AssetUpdater.prototype._downloadAndVerify = function (man) {
    var self = this;
    self._emit('downloading', 'Đang tải ' + man.assets.length + ' hình…');
    var jobs = man.assets.map(function (a) {
      return fetch(a.path + '?v=' + encodeURIComponent(man.version), { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('asset http ' + r.status + ' ' + a.path); return r.arrayBuffer(); })
        .then(function (buf) {
          if (a.bytes != null && buf.byteLength !== a.bytes) {
            throw new Error('size mismatch ' + a.path + ' (' + buf.byteLength + '!=' + a.bytes + ')');
          }
          if (!a.sha256) {   /* integrity REQUIRED by V1: refuse an unverifiable asset */
            throw new Error('manifest missing sha256 for ' + a.path);
          }
          return FT.sha256hex(buf).then(function (hex) {
            if (hex.toLowerCase() !== String(a.sha256).toLowerCase()) {
              throw new Error('SHA-256 mismatch ' + a.path);
            }
            return { id: a.id, path: a.path, sha256: a.sha256, bytes: buf.byteLength, blob: new Blob([buf]) };
          });
        });
    });
    return Promise.all(jobs).then(function (assets) {
      var staged = { version: man.version, assets: assets };
      return idbSet('staging', staged).then(function () { return staged; });
    });
  };

  AssetUpdater.prototype._activate = function (staged) {
    var self = this;
    var prev = self.current;
    return (prev ? idbSet('previous', prev) : Promise.resolve())
      .then(function () { return idbSet('current', staged); })
      .then(function () {
        var map = {};
        for (var i = 0; i < staged.assets.length; i++) {
          var a = staged.assets[i];
          a.url = root.URL.createObjectURL(a.blob);
          map[a.id] = a.url;
        }
        self.current = staged;
        self._emit('activated', 'Đã cập nhật hình Hổ Lửa ' + staged.version + ' 🎉', staged.version);
        return { changed: true, version: staged.version, map: map };
      });
  };

  /* Revert to the previously-activated asset set. Resolves {version, map} or rejects. */
  AssetUpdater.prototype.rollback = function () {
    var self = this;
    self._quiet = false;
    return idbGet('previous').then(function (prev) {
      if (!prev) { self._emit('error', 'Không có bản trước để quay lui.'); throw new Error('no-previous'); }
      return idbSet('current', prev).then(function () {
        var map = {};
        for (var i = 0; i < prev.assets.length; i++) {
          var a = prev.assets[i];
          a.url = root.URL.createObjectURL(a.blob);
          map[a.id] = a.url;
        }
        self.current = prev;
        self._emit('rolledback', 'Đã quay lui về bản ' + prev.version + '.', prev.version);
        return { version: prev.version, map: map };
      });
    });
  };

  /* First-run seeding: if nothing is cached yet, download+verify the current manifest so the
   * baked-in asset is covered by the same integrity path. Falls back silently to the <img> src. */
  AssetUpdater.prototype.ensureSeed = function () {
    var self = this;
    return self.loadCached().then(function (cached) {
      if (cached) return cached;
      return self.check().then(function (res) {
        return res && res.map ? { version: res.version, map: res.map } : null;
      }).catch(function () { return null; });   /* offline first run: engine keeps the static <img> */
    });
  };

  FT.AssetUpdater = AssetUpdater;
})(window);
