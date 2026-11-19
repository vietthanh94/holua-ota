/* sha256.js — pure-JS SHA-256 fallback for non-secure (plain HTTP LAN) contexts.
 * Old-WebView safe: ES5, no classes, no async. Exposes FT.sha256hex(ArrayBuffer|Uint8Array)->hex string.
 * Prefer window.crypto.subtle when available (secure context); this is the fallback. */
(function (root) {
  'use strict';
  var FT = root.FT = root.FT || {};

  var K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];

  function toBytes(input) {
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (input && input.buffer) return new Uint8Array(input.buffer);
    throw new Error('sha256: unsupported input');
  }

  function digestSync(input) {
    var bytes = toBytes(input);
    var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var l = bytes.length;
    var withOne = l + 1;
    var k = (56 - (withOne % 64) + 64) % 64;
    var total = withOne + k + 8;
    var msg = new Uint8Array(total);
    msg.set(bytes, 0);
    msg[l] = 0x80;
    var bitLenHi = Math.floor(l / 0x20000000);
    var bitLenLo = (l * 8) >>> 0;
    msg[total - 8] = (bitLenHi >>> 24) & 0xff;
    msg[total - 7] = (bitLenHi >>> 16) & 0xff;
    msg[total - 6] = (bitLenHi >>> 8) & 0xff;
    msg[total - 5] = bitLenHi & 0xff;
    msg[total - 4] = (bitLenLo >>> 24) & 0xff;
    msg[total - 3] = (bitLenLo >>> 16) & 0xff;
    msg[total - 2] = (bitLenLo >>> 8) & 0xff;
    msg[total - 1] = bitLenLo & 0xff;

    var w = new Int32Array(64);
    var i, t;
    for (i = 0; i < total; i += 64) {
      for (t = 0; t < 16; t++) {
        w[t] = (msg[i + t * 4] << 24) | (msg[i + t * 4 + 1] << 16) | (msg[i + t * 4 + 2] << 8) | (msg[i + t * 4 + 3]);
      }
      for (t = 16; t < 64; t++) {
        var x = w[t - 15], y = w[t - 2];
        var s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
        var s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var ch = (e & f) ^ ((~e) & g);
        var t1 = (h + S1 + ch + K[t] + w[t]) | 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }

    var hex = '';
    for (i = 0; i < 8; i++) {
      var v = H[i] >>> 0;
      hex += ('00000000' + v.toString(16)).slice(-8);
    }
    return hex;
  }

  /* Returns a Promise<hexstring>. Uses Web Crypto when available, else pure-JS. */
  FT.sha256hex = function (input) {
    var bytes = toBytes(input);
    if (root.crypto && root.crypto.subtle && root.isSecureContext) {
      return root.crypto.subtle.digest('SHA-256', bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
        .then(function (buf) {
          var arr = new Uint8Array(buf), s = '', j;
          for (j = 0; j < arr.length; j++) s += ('0' + arr[j].toString(16)).slice(-2);
          return s;
        })
        .catch(function () { return digestSync(bytes); });
    }
    return Promise.resolve(digestSync(bytes));
  };

  FT.sha256Engine = (root.crypto && root.crypto.subtle && root.isSecureContext) ? 'web-crypto' : 'pure-js';
})(window);
