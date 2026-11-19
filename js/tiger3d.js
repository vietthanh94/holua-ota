/* tiger3d.js — REAL 3D chibi Fire Tiger (three.js r170, WebGL2), v2 "closer to the approved art".
 * Built from parts (head, cheek fluff, big amber eyes with eyeliner, cream muzzle, open mouth with
 * tongue + fangs, ears with fluffy insides, gold diadem, body with cream belly + brush-stroke
 * stripes, chest fluff, red/gold collar + bell + tassel, gold shoulder guards, gold cuffs with red
 * gems, chubby legs with pink paw pads, ringed tail). Soft fur shading (no outlines) with a warm rim,
 * metallic gold via an environment map, shader flames for the mane and tail tip, GPU particles for
 * embers / fire breath / magic ring. Every part animates on its own.
 * If WebGL2 / ES modules are unavailable, pet-engine falls back to the 2.5D rig (rig.js). */
import * as THREE from './vendor/three.module.min.js';

const FT = (window.FT = window.FT || {});
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerpAngle = (a, b, t) => { const d = ((((b - a + Math.PI) % TAU) + TAU) % TAU) - Math.PI; return a + d * t; };
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function webgl2ok() {
  try {
    const c = document.createElement('canvas');
    const gl = window.WebGL2RenderingContext && c.getContext('webgl2');
    if (!gl) return false;
    const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
    return true;
  } catch (e) { return false; }
}

/* ---------------- painted textures ---------------- */
function canvasTex(w, h, draw, srgb) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const STRIPE = '#16100c', CREAM = '#fff1dc';
function curve(a, b, c, k) {
  k = k || 14; const pts = [];
  for (let i = 0; i <= k; i++) { const t = i / k, u = 1 - t; pts.push([u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]]); }
  return pts;
}
/* brush stroke: thin start, swells, tapers to a point */
function stroke(g, pts, w, color) {
  const n = pts.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[Math.min(n - 1, i + 1)], o = pts[Math.max(0, i - 1)];
    let dx = q[0] - o[0], dy = q[1] - o[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const t = i / (n - 1), ww = w * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.08)), 0.55);
    L.push([p[0] - dy * ww, p[1] + dx * ww]); R.push([p[0] + dy * ww, p[1] - dx * ww]);
  }
  g.fillStyle = color || STRIPE; g.beginPath(); g.moveTo(L[0][0], L[0][1]);
  for (const p of L) g.lineTo(p[0], p[1]);
  for (let i = n - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
  g.closePath(); g.fill();
}
function softEllipse(g, x, y, rx, ry, color, a0) {
  g.save(); g.translate(x, y); g.scale(rx, ry);
  const r = g.createRadialGradient(0, 0, 0, 0, 0, 1);
  r.addColorStop(0, color); r.addColorStop(a0 || 0.6, color); r.addColorStop(1, 'rgba(255,241,220,0)');
  g.fillStyle = r; g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); g.restore();
}
function strands(g, W, H, rnd, n) {
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = rnd() * W, y = rnd() * H, l = 3 + rnd() * 7, a = Math.PI / 2 + (rnd() - 0.5) * 0.7;
    g.strokeStyle = rnd() < 0.55 ? 'rgba(255,236,200,0.16)' : 'rgba(110,35,0,0.13)';
    g.lineWidth = 0.8 + rnd() * 1.1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
}
function headTex() {
  return canvasTex(1024, 512, (g, W, H) => {
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#d2440a'); grd.addColorStop(0.45, '#f2690e'); grd.addColorStop(1, '#ff8c2e');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    const cx = 256;                                   /* front of the sphere is u = 0.25 */
    softEllipse(g, cx, 0.68 * H, 0.15 * W, 0.24 * H, CREAM, 0.55);   /* muzzle / lower face */
    for (const s of [-1, 1]) softEllipse(g, cx + s * 64, 0.53 * H, 46, 30, CREAM, 0.4); /* under the eyes */
    const rnd = mulberry32(5);
    strands(g, W, H, rnd, 9000);
    /* forehead pattern */
    stroke(g, curve([cx, 0.2 * H], [cx + 2, 0.27 * H], [cx, 0.35 * H]), 9);
    for (const s of [-1, 1]) {
      stroke(g, curve([cx + s * 12, 0.17 * H], [cx + s * 30, 0.22 * H], [cx + s * 58, 0.31 * H]), 11);
      stroke(g, curve([cx + s * 20, 0.27 * H], [cx + s * 42, 0.32 * H], [cx + s * 74, 0.385 * H]), 10);
      stroke(g, curve([cx + s * 92, 0.25 * H], [cx + s * 120, 0.28 * H], [cx + s * 158, 0.36 * H]), 12);
      stroke(g, curve([cx + s * 104, 0.37 * H], [cx + s * 132, 0.4 * H], [cx + s * 168, 0.47 * H]), 10);
      /* cheek stripes pointing toward the nose */
      stroke(g, curve([cx + s * 182, 0.52 * H], [cx + s * 150, 0.54 * H], [cx + s * 112, 0.57 * H]), 10);
      stroke(g, curve([cx + s * 186, 0.6 * H], [cx + s * 156, 0.62 * H], [cx + s * 122, 0.64 * H]), 9);
    }
    /* back of the head */
    for (let k = 0; k < 9; k++) {
      const x = 430 + k * 62 + (rnd() - 0.5) * 16;
      stroke(g, curve([x, 0.1 * H], [x + 18, 0.24 * H], [x + (rnd() - 0.5) * 30, 0.42 * H]), 13 + rnd() * 5);
    }
  });
}
function bodyTex() {
  return canvasTex(1024, 512, (g, W, H) => {
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#d64a0a'); grd.addColorStop(0.42, '#f56f12'); grd.addColorStop(0.62, '#ffa050'); grd.addColorStop(0.8, CREAM); grd.addColorStop(1, CREAM);
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    softEllipse(g, 256, 0.64 * H, 140, 0.3 * H, CREAM, 0.5);      /* chest */
    const rnd = mulberry32(17);
    strands(g, W, H, rnd, 9000);
    for (let k = 0; k < 14; k++) {
      const x = (k + 0.5) / 14 * W + (rnd() - 0.5) * 20;
      if (Math.abs(x - 256) < 130) continue;
      stroke(g, curve([x, 0.1 * H], [x + 24, 0.3 * H], [x + (rnd() - 0.5) * 50, 0.56 * H]), 15 + rnd() * 7);
      stroke(g, curve([x + 34, 0.2 * H], [x + 44, 0.32 * H], [x + 30, 0.44 * H]), 8 + rnd() * 4);
    }
  });
}
function legTex() {
  return canvasTex(256, 256, (g, W, H) => {
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#e85c0c'); grd.addColorStop(0.55, '#ff8a2a'); grd.addColorStop(1, CREAM);
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    strands(g, W, H, mulberry32(23), 1600);
    for (const y of [0.22, 0.42]) {
      stroke(g, curve([0, y * H], [64, y * H + 10], [150, y * H + 4]), 11);
      stroke(g, curve([256, y * H + 2], [200, y * H + 10], [150, y * H + 6]), 9);
    }
  });
}
function irisTex() {
  return canvasTex(256, 256, (g) => {
    const r = g.createRadialGradient(128, 136, 8, 128, 128, 128);
    r.addColorStop(0, '#ffd27a'); r.addColorStop(0.45, '#f29a2a'); r.addColorStop(0.78, '#9a4a0c'); r.addColorStop(0.95, '#3a1606'); r.addColorStop(1, 'rgba(30,10,2,0)');
    g.fillStyle = r; g.beginPath(); g.arc(128, 128, 128, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(120,50,5,0.35)'; g.lineWidth = 2;
    for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; g.beginPath(); g.moveTo(128 + Math.cos(a) * 56, 128 + Math.sin(a) * 56); g.lineTo(128 + Math.cos(a) * 104, 128 + Math.sin(a) * 104); g.stroke(); }
    g.fillStyle = '#0d0603'; g.beginPath(); g.ellipse(128, 136, 50, 56, 0, 0, TAU); g.fill();
  });
}
function emberTex() {
  return canvasTex(64, 64, (g) => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.7)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  }, false);
}
function shadowTex() {
  return canvasTex(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(0,0,0,0.75)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  }, false);
}
function zTex() {
  return canvasTex(64, 64, (g) => { g.fillStyle = '#d8e8ff'; g.font = 'bold 52px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Z', 32, 34); });
}

/* ---------------- shader flame (billboard tongue of fire) ---------------- */
const FLAME_VS = `
uniform float uSize; uniform float uRot; varying vec2 vUv;
void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vec2 p = position.xy * uSize; float c = cos(uRot), s = sin(uRot);
  mv.xy += vec2(c * p.x - s * p.y, s * p.x + c * p.y); gl_Position = projectionMatrix * mv; }`;
const FLAME_FS = `
uniform float uTime; uniform float uSeed; uniform float uInt; varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
void main(){
  vec2 uv = vUv; float t = uTime * 1.7 + uSeed * 10.0;
  float n = fbm(vec2(uv.x * 3.2 + uSeed * 7.0, uv.y * 2.6 - t * 1.25));
  float x = (uv.x - 0.5) + (n - 0.5) * 0.42 * uv.y + sin(t * 0.9 + uv.y * 4.0) * 0.05 * uv.y;
  float width = 0.4 * (1.0 - pow(uv.y, 1.15)) + 0.025;
  float body = 1.0 - smoothstep(width * 0.45, width, abs(x));
  float flame = body * smoothstep(0.0, 0.14, uv.y) * (0.6 + 0.8 * n);
  flame *= smoothstep(1.0, 0.5, uv.y + (n - 0.5) * 0.3);
  float i = clamp(flame * uInt, 0.0, 1.6);
  vec3 col = mix(vec3(0.85, 0.1, 0.02), vec3(1.0, 0.48, 0.05), smoothstep(0.12, 0.5, i));
  col = mix(col, vec3(1.0, 0.9, 0.55), smoothstep(0.65, 1.1, i));
  float a = smoothstep(0.04, 0.38, i);
  gl_FragColor = vec4(col, a);
}`;

/* ---------------- GPU particles (embers, breath, ring, charge) ---------------- */
const VS = `
attribute vec4 pcolor; attribute float psize; uniform float scale; varying vec4 vC;
void main(){ vC = pcolor; vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = psize * scale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`;
const FS = `
uniform sampler2D map; varying vec4 vC;
void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC.rgb * t.rgb, vC.a * t.a); }`;

class Fire {
  constructor(max, tex) {
    this.max = max; this.cap = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4); this.size = new Float32Array(max);
    this.life = new Float32Array(max); this.mlife = new Float32Array(max);
    this.base = new Float32Array(max); this.kind = new Uint8Array(max);
    const geo = (this.geo = new THREE.BufferGeometry());
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.aPos); geo.setAttribute('pcolor', this.aCol); geo.setAttribute('psize', this.aSize);
    geo.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({ uniforms: { map: { value: tex }, scale: { value: 400 } }, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.points = new THREE.Points(geo, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 10;
  }
  emit(x, y, z, vx, vy, vz, life, size, kind) {
    if (this.n >= this.cap) return;
    const i = this.n++, i3 = i * 3;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.life[i] = life; this.mlife[i] = life; this.base[i] = size; this.kind[i] = kind;
  }
  _move(d, s) {
    const d3 = d * 3, s3 = s * 3;
    for (let k = 0; k < 3; k++) { this.pos[d3 + k] = this.pos[s3 + k]; this.vel[d3 + k] = this.vel[s3 + k]; }
    this.life[d] = this.life[s]; this.mlife[d] = this.mlife[s]; this.base[d] = this.base[s]; this.kind[d] = this.kind[s];
  }
  update(dt) {
    let i = 0;
    while (i < this.n) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.n--; if (i !== this.n) this._move(i, this.n); continue; }
      const i3 = i * 3, k = this.kind[i];
      if (k === 0) { this.vel[i3 + 1] += 1.8 * dt; const drag = 1 - 1.2 * dt; this.vel[i3] *= drag; this.vel[i3 + 2] *= drag; }
      else if (k === 1) { this.vel[i3 + 1] -= 7 * dt; }
      else { this.vel[i3 + 1] += 0.5 * dt; this.vel[i3] += Math.sin(this.life[i] * 9 + i) * 0.6 * dt; }
      this.pos[i3] += this.vel[i3] * dt; this.pos[i3 + 1] += this.vel[i3 + 1] * dt; this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      const f = this.life[i] / this.mlife[i], a = 1 - f, c4 = i * 4;
      let r, g, b, al, sz;
      if (k === 1) { r = 1; g = 0.85; b = 0.4; al = f; sz = this.base[i] * (0.6 + 0.4 * f); }
      else if (k === 2) { r = 1; g = 0.55 + 0.35 * f; b = 0.15 * f; al = Math.min(1, a * 6) * f; sz = this.base[i] * (0.8 + 0.4 * f); }
      else if (k === 3) { r = 1; g = 0.62; b = 0.22; al = Math.min(1, a * 5) * f * 0.9; sz = this.base[i]; }
      else {
        if (a < 0.32) { const t = a / 0.32; r = 1; g = lerp(0.97, 0.66, t); b = lerp(0.7, 0.14, t); }
        else if (a < 0.65) { const t = (a - 0.32) / 0.33; r = lerp(1, 0.95, t); g = lerp(0.66, 0.24, t); b = lerp(0.14, 0.03, t); }
        else { const t = (a - 0.65) / 0.35; r = lerp(0.95, 0.3, t); g = lerp(0.24, 0.05, t); b = 0.03; }
        al = Math.min(1, a * 7) * Math.pow(f, 0.8);
        sz = this.base[i] * (0.55 + a * 0.9) * (0.35 + 0.65 * f);
      }
      this.col[c4] = r; this.col[c4 + 1] = g; this.col[c4 + 2] = b; this.col[c4 + 3] = al; this.size[i] = sz;
      i++;
    }
    this.geo.setDrawRange(0, this.n);
    this.aPos.needsUpdate = true; this.aCol.needsUpdate = true; this.aSize.needsUpdate = true;
  }
}

const MOODS = {
  IDLE:     { hover: 0,     pitch: 0,    yawAmp: 0.38, legAmp: 0.2,  legSpd: 2.6, front: 0.85, back: 0.35, tailAmp: 0.32, tailSpd: 2.4, eye: 1,    jaw: 0.45, ear: 0,     mane: 1,    tilt: 0,    headPitch: -0.05, breath: 2.2, eyeUp: 0 },
  TOUCH:    { hover: 0.05,  pitch: 0,    yawAmp: 0.2,  legAmp: 0.3,  legSpd: 3.5, front: 1.0,  back: 0.35, tailAmp: 0.6,  tailSpd: 6,   eye: 0.32, jaw: 0.55, ear: -0.45, mane: 1.3,  tilt: 0.25, headPitch: -0.08, breath: 3,   eyeUp: 0 },
  HAPPY:    { hover: 0.2,   pitch: -0.1, yawAmp: 0.1,  legAmp: 0.55, legSpd: 7,   front: 1.3,  back: 0.6,  tailAmp: 0.7,  tailSpd: 9,   eye: 0.35, jaw: 0.8,  ear: 0.2,   mane: 1.6,  tilt: 0,    headPitch: -0.15, breath: 3,   eyeUp: 0 },
  FLY:      { hover: 0.1,   pitch: 0.35, yawAmp: 0,    legAmp: 0.15, legSpd: 4,   front: -0.9, back: -0.9, tailAmp: 0.25, tailSpd: 5,   eye: 1,    jaw: 0.45, ear: -0.6,  mane: 1.7,  tilt: 0,    headPitch: -0.3,  breath: 2.5, eyeUp: 0 },
  FIRE:     { hover: 0.05,  pitch: 0,    yawAmp: 0,    legAmp: 0.1,  legSpd: 3,   front: 0.6,  back: 0.4,  tailAmp: 0.5,  tailSpd: 6,   eye: 0.75, jaw: 0.3,  ear: -0.5,  mane: 1.9,  tilt: 0,    headPitch: 0,     breath: 2.2, eyeUp: 0 },
  SLEEP:    { hover: -0.55, pitch: 0.12, yawAmp: 0.05, legAmp: 0.02, legSpd: 1,   front: -0.15, back: 0.9, tailAmp: 0.06, tailSpd: 0.8, eye: 0.06, jaw: 0.05, ear: -0.35, mane: 0.35, tilt: 0.12, headPitch: 0.45,  breath: 1.0, eyeUp: 0 },
  THINKING: { hover: 0.05,  pitch: 0,    yawAmp: 0.12, legAmp: 0.08, legSpd: 1.5, front: 0.4,  back: 0.35, tailAmp: 0.25, tailSpd: 1.6, eye: 0.85, jaw: 0.15, ear: 0.15,  mane: 0.9,  tilt: 0.28, headPitch: -0.12, breath: 1.8, eyeUp: 1 },
  ERROR:    { hover: -0.1,  pitch: 0.05, yawAmp: 0.05, legAmp: 0.05, legSpd: 2,   front: 0.2,  back: 0.35, tailAmp: 0.1,  tailSpd: 2,   eye: 0.7,  jaw: 0.15, ear: -0.8,  mane: 0.4,  tilt: -0.1, headPitch: 0.2,   breath: 2.5, eyeUp: 0 }
};
const DUR = { happy: 1.25, fly: 2.7, fire: 1.35, error: 0.9, touch: 0.7, wake: 0.8 };

class Tiger3D {
  static supported() { return webgl2ok(); }

  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.reduced = !!opts.reduced;
    this._onFps = opts.onFps || null;
    this._autoReduce = opts.autoReduce !== false;
    const R = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'default' }));
    R.setClearColor(0x000000, 0);
    R.outputColorSpace = THREE.SRGBColorSpace;
    R.toneMapping = THREE.NeutralToneMapping;
    R.toneMappingExposure = 1.05;
    /* keep the drawing buffer near the CSS size on big low-dpr panels (T2: 1336 css px) */
    this.pr = Math.min(window.devicePixelRatio || 1, 1.25, 1500 / Math.max(1, window.innerWidth));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    this.camTarget = new THREE.Vector3(0, -0.7, 0);
    this.camDist = 10;

    this.scene.add(new THREE.HemisphereLight(0xffe6cc, 0x3a1206, 0.55));
    const key = new THREE.DirectionalLight(0xfff4e8, 2.1); key.position.set(-3, 5, 7); this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffd2a8, 0.7); fill.position.set(5, 1, 5); this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xff7a2a, 2.4); rim.position.set(1, 4, -6); this.scene.add(rim);
    this.fireLight = new THREE.PointLight(0xff7a1a, 12, 9, 2); this.scene.add(this.fireLight);
    this.mouthLight = new THREE.PointLight(0xffb040, 0, 7, 2); this.scene.add(this.mouthLight);
    this._envMap();

    this.tex = { ember: emberTex() };
    this._build();
    this.fire = new Fire(360, this.tex.ember);
    this.scene.add(this.fire.points);
    this._initState();
    this.setReduced(this.reduced);
    this._bound = this._loop.bind(this);
  }

  /* warm studio environment for gold reflections and soft fur fill */
  _envMap() {
    const pm = new THREE.PMREMGenerator(this.renderer);
    const env = new THREE.Scene();
    const g = new THREE.SphereGeometry(10, 32, 16), pos = g.attributes.position, cols = [];
    const lo = new THREE.Color(0x1a0703), hi = new THREE.Color(0xffe9cc), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { c.lerpColors(lo, hi, (pos.getY(i) / 10 + 1) / 2); cols.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    env.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const fireP = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), new THREE.MeshBasicMaterial({ color: 0xff6a10 })); fireP.position.set(0, 1, -8); env.add(fireP);
    const keyP = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({ color: 0xffffff })); keyP.position.set(-6, 6, 6); keyP.lookAt(0, 0, 0); env.add(keyP);
    this.scene.environment = pm.fromScene(env, 0.03).texture;
    pm.dispose();
  }

  /* ---------- materials ---------- */
  fur(map, color, rim) {
    const m = new THREE.MeshStandardMaterial({ color: map ? 0xffffff : color, map: map || null, roughness: 0.92, metalness: 0, envMapIntensity: 0.25 });
    const rc = new THREE.Color(rim == null ? 0xffb36b : rim).multiplyScalar(0.35);
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uRim = { value: rc };
      sh.fragmentShader = 'uniform vec3 uRim;\n' + sh.fragmentShader.replace('#include <opaque_fragment>',
        'float rimF = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.4);\noutgoingLight += uRim * rimF;\n#include <opaque_fragment>');
    };
    m.customProgramCacheKey = () => 'fur-rim';
    return m;
  }
  mesh(geo, mat, parent, pos, scale) {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    if (scale) m.scale.set(scale[0], scale[1], scale[2]);
    parent.add(m);
    return m;
  }
  flame(parent, pos, size, rot, seed, kind) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uSeed: { value: seed }, uInt: { value: 1 }, uSize: { value: size }, uRot: { value: rot } },
      vertexShader: FLAME_VS, fragmentShader: FLAME_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const m = new THREE.Mesh(this.flameGeo, mat);
    m.position.set(pos[0], pos[1], pos[2]); m.frustumCulled = false; m.renderOrder = 5;
    parent.add(m);
    this.flames.push({ m, mat, size, kind: kind || 'mane' });
    return m;
  }

  _build() {
    const sph = new THREE.SphereGeometry(1, 30, 22), sphLo = new THREE.SphereGeometry(1, 14, 10), sphHi = new THREE.SphereGeometry(1, 48, 32);
    /* a pointed fur tuft (teardrop lathe) */
    const tp = []; for (let i = 0; i <= 10; i++) { const t = i / 10; tp.push(new THREE.Vector2(Math.sin(Math.PI * Math.min(1, t * 1.25)) * 0.5 * (1 - t * 0.85), t * 1.6 - 0.3)); }
    const tuftG = new THREE.LatheGeometry(tp, 12);
    this.flameGeo = new THREE.PlaneGeometry(1, 1.7); this.flameGeo.translate(0, 0.72, 0);
    this.flames = [];

    const T = this.tex;
    T.head = headTex(); T.body = bodyTex(); T.leg = legTex(); T.iris = irisTex();
    const M = (this.M = {
      head: this.fur(T.head), body: this.fur(T.body), leg: this.fur(T.leg),
      orange: this.fur(null, 0xf26a10), cream: this.fur(null, 0xfff0da, 0xffffff), dark: this.fur(null, 0x1c120d, 0x55301a),
      pinkIn: this.fur(null, 0xf6b4b8), pad: new THREE.MeshStandardMaterial({ color: 0xf28c98, roughness: 0.55 }),
      nose: new THREE.MeshStandardMaterial({ color: 0xe86b7a, roughness: 0.35 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xffc44a, metalness: 1, roughness: 0.28, envMapIntensity: 1.4 }),
      red: new THREE.MeshStandardMaterial({ color: 0xc8141f, roughness: 0.45, metalness: 0.1 }),
      gem: new THREE.MeshStandardMaterial({ color: 0xff1a2a, roughness: 0.12, metalness: 0.2, emissive: 0x4a0000, envMapIntensity: 1.6 }),
      white: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 }),
      iris: new THREE.MeshBasicMaterial({ map: T.iris, transparent: true }),
      shine: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      liner: new THREE.MeshStandardMaterial({ color: 0x120a07, roughness: 0.5 }),
      mouth: new THREE.MeshStandardMaterial({ color: 0x6a0f14, roughness: 0.6 }),
      tongue: new THREE.MeshStandardMaterial({ color: 0xff7f90, roughness: 0.45 }),
      fang: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
    });

    const root = (this.root = new THREE.Group());
    this.scene.add(root);
    const sh = (this.shadow = new THREE.Mesh(new THREE.CircleGeometry(1.3, 32), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false })));
    sh.rotation.x = -Math.PI / 2; sh.position.y = -2.75; this.scene.add(sh);

    /* ---------- body ---------- */
    const body = (this.bodyG = new THREE.Group());
    body.position.set(0, -1.22, -0.05); root.add(body);
    this.mesh(sph, M.body, body, [0, 0, 0], [0.86, 0.8, 0.98]);
    for (let k = 0; k < 5; k++) {           /* chest fluff */
      const a = (k - 2) * 0.32, t = this.mesh(tuftG, M.cream, body, [Math.sin(a) * 0.42, 0.05 - Math.abs(k - 2) * 0.04, 0.78], [0.2, 0.22, 0.16]);
      t.rotation.set(Math.PI * 0.82, 0, -a * 0.6);
    }
    /* collar: red band, gold trims, gold bell, red tassel */
    const collar = new THREE.Group(); collar.position.set(0, 0.38, 0.06); collar.rotation.x = -0.18; collar.scale.set(1, 1, 1.12); body.add(collar);
    const band = this.mesh(new THREE.TorusGeometry(0.7, 0.095, 12, 40), M.red, collar); band.rotation.x = Math.PI / 2;
    for (const y of [-0.075, 0.075]) { const tr = this.mesh(new THREE.TorusGeometry(0.715, 0.022, 6, 40), M.gold, collar, [0, y, 0]); tr.rotation.x = Math.PI / 2; }
    for (let k = 0; k < 7; k++) { const a = -1.2 + k * 0.4; this.mesh(sphLo, M.gold, collar, [Math.sin(a) * 0.79, 0, Math.cos(a) * 0.79], [0.045, 0.045, 0.03]); }
    this.mesh(sph, M.gold, collar, [0, -0.15, 0.82], [0.17, 0.17, 0.16]);
    { const slit = this.mesh(new THREE.TorusGeometry(0.17, 0.012, 6, 24), M.liner, collar, [0, -0.15, 0.82]); slit.rotation.x = Math.PI / 2; }
    this.mesh(new THREE.ConeGeometry(0.05, 0.08, 10), M.gold, collar, [0, -0.36, 0.84]);
    this.mesh(new THREE.ConeGeometry(0.085, 0.36, 12), M.red, collar, [0, -0.56, 0.84]).rotation.x = Math.PI;

    /* ---------- legs ---------- */
    this.legs = [];
    const capG = new THREE.CapsuleGeometry(0.22, 0.3, 6, 14);
    const mkLeg = (x, y, z, front, side) => {
      const pivot = new THREE.Group(); pivot.position.set(x, y, z); body.add(pivot);
      if (!front) this.mesh(sph, M.body, pivot, [0, -0.02, 0], [0.36, 0.42, 0.44]);
      this.mesh(capG, M.leg, pivot, [0, -0.32, 0], front ? [1, 1, 1] : [1.08, 1, 1.08]);
      this.mesh(sph, M.cream, pivot, [0, -0.62, 0.05], [0.28, 0.22, 0.31]);
      /* paw pads (show when the paw is raised toward the viewer) */
      this.mesh(sphLo, M.pad, pivot, [0, -0.82, 0.04], [0.12, 0.035, 0.1]);
      for (const tx of [-0.11, 0, 0.11]) this.mesh(sphLo, M.pad, pivot, [tx, -0.79, 0.2 - Math.abs(tx) * 0.4], [0.05, 0.025, 0.045]);
      if (front) {
        const cuff = this.mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.13, 28, 1, true), M.gold, pivot, [0, -0.42, 0]);
        cuff.material = M.gold; cuff.material.side = THREE.DoubleSide;
        this.mesh(sphLo, M.gem, pivot, [0, -0.42, 0.25], [0.055, 0.055, 0.035]);
        for (const yy of [-0.355, -0.485]) { const r = this.mesh(new THREE.TorusGeometry(0.252, 0.016, 6, 28), M.gold, pivot, [0, yy, 0]); r.rotation.x = Math.PI / 2; }
      }
      this.legs.push({ pivot, front, side, rx: 0 });
    };
    mkLeg(-0.44, 0.22, 0.48, true, -1); mkLeg(0.44, 0.22, 0.48, true, 1);
    mkLeg(-0.5, -0.38, -0.2, false, -1); mkLeg(0.5, -0.38, -0.2, false, 1);
    /* gold shoulder guards with a red gem */
    for (const s of [-1, 1]) {
      const sg = new THREE.Group(); sg.position.set(s * 0.6, 0.32, 0.36); sg.rotation.set(0.2, s * 0.5, -s * 0.75); body.add(sg);
      this.mesh(new THREE.SphereGeometry(1, 24, 12, 0, TAU, 0, 1.15), M.gold, sg, [0, 0, 0], [0.3, 0.22, 0.28]);
      this.mesh(sphLo, M.gem, sg, [0, 0.2, 0.06], [0.06, 0.05, 0.06]);
      const sw = this.mesh(new THREE.TorusGeometry(0.1, 0.018, 6, 20, 4.2), M.gold, sg, [0, 0.19, 0.14]); sw.rotation.x = -0.6;
    }

    /* ---------- tail: segment chain with black rings ---------- */
    this.tail = [];
    const tailBase = new THREE.Group(); tailBase.position.set(0.45, -0.25, -0.72); tailBase.rotation.set(-0.15, 0, -1.05); body.add(tailBase);
    let parent = tailBase;
    for (let i = 0; i < 9; i++) {
      const seg = new THREE.Group(); seg.position.set(0, i === 0 ? 0 : 0.2, 0); parent.add(seg);
      const r = 0.2 - i * 0.009;
      this.mesh(sphLo, M.orange, seg, [0, 0, 0], [r, r * 1.2, r]);
      if (i % 2 === 1) { const ring = this.mesh(new THREE.TorusGeometry(r * 0.98, 0.04, 6, 18), M.dark, seg, [0, 0.02, 0]); ring.rotation.x = Math.PI / 2; }
      this.tail.push(seg); parent = seg;
    }
    this.tailTip = new THREE.Object3D(); this.tailTip.position.set(0, 0.15, 0); parent.add(this.tailTip);
    this.flame(this.tailTip, [0, -0.05, 0], 1.25, 0, 3.3, 'tail');
    this.flame(this.tailTip, [0.05, -0.1, 0.05], 0.85, 0.35, 7.1, 'tail');

    /* ---------- head (pivot at the neck) ---------- */
    const neck = (this.neck = new THREE.Group()); neck.position.set(0, -0.6, 0.12); root.add(neck);
    const head = (this.head = new THREE.Group()); head.position.set(0, 0.6, 0); neck.add(head);
    this.mesh(sphHi, M.head, head, [0, 0, 0], [1.08, 0.96, 0.94]);
    const A = 1.08, B = 0.96, Cz = 0.94, Z = new THREE.Vector3(0, 0, 1);
    const onHead = (x, y, lift) => {
      const zz = Cz * Math.sqrt(Math.max(0, 1 - (x / A) ** 2 - (y / B) ** 2));
      const n = new THREE.Vector3(x / (A * A), y / (B * B), zz / (Cz * Cz)).normalize();
      return { p: new THREE.Vector3(x, y, zz).addScaledVector(n, lift || 0), n };
    };

    /* cheek fluff that flares out like the art */
    for (const s of [-1, 1]) {
      for (let k = 0; k < 5; k++) {
        const ang = -0.9 + k * 0.32;
        const t = this.mesh(tuftG, M.cream, head, [s * (0.86 + Math.cos(ang) * 0.06), -0.12 + Math.sin(ang) * 0.32, 0.28 - k * 0.04], [0.2, 0.26 - Math.abs(k - 2) * 0.03, 0.16]);
        t.rotation.set(0, 0, -s * (Math.PI / 2 + 0.3 - ang * 0.7));
      }
    }
    /* muzzle + chin */
    for (const s of [-1, 1]) this.mesh(sph, M.cream, head, [s * 0.2, -0.3, 0.76], [0.27, 0.22, 0.23]);
    this.mesh(sph, M.cream, head, [0, -0.47, 0.62], [0.2, 0.14, 0.17]);
    this.mesh(sph, M.nose, head, [0, -0.14, 0.97], [0.12, 0.08, 0.08]);
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) this.mesh(sphLo, M.liner, head, [s * (0.17 + k * 0.06), -0.27 - (k % 2) * 0.05, 0.97 - k * 0.04], [0.012, 0.012, 0.01]);

    /* open mouth */
    const mouthG = (this.mouthG = new THREE.Group()); mouthG.position.set(0, -0.38, 0.8); head.add(mouthG);
    this.mouthMesh = this.mesh(sph, M.mouth, mouthG, [0, 0, 0], [0.19, 0.12, 0.1]);
    this.tongue = this.mesh(sph, M.tongue, mouthG, [0, -0.04, 0.05], [0.12, 0.045, 0.07]);
    this.fangs = [];
    for (const s of [-1, 1]) { const f = this.mesh(new THREE.ConeGeometry(0.03, 0.1, 8), M.fang, mouthG, [s * 0.1, 0.06, 0.07]); f.rotation.x = Math.PI; this.fangs.push(f); }

    /* big amber eyes with eyeliner wings */
    this.eyes = [];
    for (const s of [-1, 1]) {
      const { p, n } = onHead(s * 0.38, 0.07, -0.07);
      const eg = new THREE.Group(); eg.position.copy(p); eg.quaternion.setFromUnitVectors(Z, n); eg.rotateZ(-s * 0.08); head.add(eg);
      this.mesh(sph, M.white, eg, [0, 0, 0], [0.27, 0.3, 0.13]);
      const ir = new THREE.Group(); eg.add(ir);
      this.mesh(new THREE.CircleGeometry(0.235, 32), M.iris, ir, [0, -0.02, 0.124], [1, 1.07, 1]);
      this.mesh(new THREE.CircleGeometry(0.075, 20), M.shine, ir, [0.08 * -s + 0.02, 0.1, 0.13]);
      this.mesh(new THREE.CircleGeometry(0.035, 16), M.shine, ir, [-0.07 * -s, -0.1, 0.13]);
      const lid = this.mesh(new THREE.TorusGeometry(0.285, 0.038, 8, 28, Math.PI * 1.05), M.liner, eg, [0, 0.0, 0.03]);
      lid.rotation.z = -0.025 * Math.PI;
      const wing = this.mesh(new THREE.ConeGeometry(0.035, 0.16, 8), M.liner, eg, [s * 0.32, 0.07, 0.03]); wing.rotation.z = s * 1.9;
      this.eyes.push({ eg, ir, s });
    }

    /* ears: dark back, orange front, fluffy cream inside */
    this.ears = [];
    for (const s of [-1, 1]) {
      const eg = new THREE.Group(); eg.position.set(s * 0.66, 0.74, -0.1); eg.rotation.z = -s * 0.38; head.add(eg);
      this.mesh(sph, M.dark, eg, [0, 0.13, -0.03], [0.33, 0.37, 0.12]);
      this.mesh(sph, M.orange, eg, [0, 0.12, 0.0], [0.3, 0.34, 0.13]);
      this.mesh(sph, M.pinkIn, eg, [0, 0.1, 0.07], [0.18, 0.22, 0.05]);
      for (let k = 0; k < 3; k++) { const t = this.mesh(tuftG, M.cream, eg, [(k - 1) * 0.07, 0.02, 0.1], [0.08, 0.13, 0.06]); t.rotation.z = (k - 1) * 0.35; }
      this.ears.push({ eg, s });
    }

    /* gold diadem with a red gem */
    {
      const { p, n } = onHead(0, 0.8, 0.0);
      const dg = new THREE.Group(); dg.position.copy(p); dg.quaternion.setFromUnitVectors(Z, n); head.add(dg);
      this.mesh(new THREE.OctahedronGeometry(1, 0), M.gold, dg, [0, 0, 0.02], [0.13, 0.17, 0.05]);
      this.mesh(sphLo, M.gem, dg, [0, 0, 0.06], [0.06, 0.07, 0.045]);
      for (const s of [-1, 1]) { const sw = this.mesh(new THREE.TorusGeometry(0.085, 0.02, 6, 18, 4.4), M.gold, dg, [s * 0.16, -0.03, 0.02]); sw.rotation.z = s > 0 ? 0.6 : 2.6; }
    }

    /* fire mane: flame tongues behind the head (the head hides their roots, like the art) */
    const maneSpots = [
      [0, 0.82, -0.35, 1.65, 0], [-0.42, 0.72, -0.35, 1.4, 0.35], [0.42, 0.72, -0.35, 1.4, -0.35],
      [-0.78, 0.38, -0.3, 1.2, 0.75], [0.78, 0.38, -0.3, 1.2, -0.75], [-0.25, 0.9, -0.5, 1.2, 0.15],
      [0.25, 0.9, -0.5, 1.2, -0.15], [-0.9, -0.05, -0.35, 1.0, 1.05], [0.9, -0.05, -0.35, 1.0, -1.05]
    ];
    maneSpots.forEach((m, i) => this.flame(head, [m[0], m[1], m[2]], m[3], m[4], i * 1.37 + 0.5, 'mane'));
    /* along the back */
    this.flame(body, [0, 0.62, -0.45], 1.0, 0.1, 9.9, 'back');
    this.flame(body, [-0.3, 0.5, -0.65], 0.85, 0.4, 4.4, 'back');
    this.flame(body, [0.3, 0.5, -0.65], 0.85, -0.4, 6.6, 'back');

    /* ember emitters */
    this.maneLocal = maneSpots.map(m => new THREE.Vector3(m[0], m[1] + 0.3, m[2]));

    /* sleep Z's */
    this.zs = [];
    const zt = zTex();
    for (let k = 0; k < 3; k++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: zt, transparent: true, depthWrite: false, opacity: 0 }));
      this.scene.add(sp); this.zs.push({ sp, ph: k / 3 });
    }
  }

  _initState() {
    this.mood = 'IDLE';
    this.p = Object.assign({}, MOODS.IDLE); this.tp = Object.assign({}, MOODS.IDLE);
    this.t = 0;
    this.tr = { happy: -1, fly: -1, fire: -1, error: -1, touch: -1, wake: -1 };
    this.look = { x: 0, y: 0, tx: 0, ty: 0, until: 0 };
    this.blink = { next: 2, t: -1 };
    this.charge = { on: false, level: 0 };
    this.acc = { ember: 0, breath: 0, trail: 0, charge: 0, think: 0 };
    this.touchSide = 1;
    this.running = false; this._raf = 0; this._last = 0; this._fpsEMA = 60; this._low = 0;
    this._v = new THREE.Vector3(); this._v2 = new THREE.Vector3();
  }

  /* ---------- public API (same shape as rig.js) ---------- */
  setImage() { /* procedural model; image OTA does not apply */ }
  setMood(name) {
    if (!MOODS[name]) return;
    this.mood = name; Object.assign(this.tp, MOODS[name]);
    const tr = this.tr;
    if (name === 'HAPPY') { tr.happy = 0; this._ring(); }
    if (name === 'FLY') { tr.fly = 0; this._ring(); }
    if (name === 'FIRE') tr.fire = 0;
    if (name === 'ERROR') tr.error = 0;
    if (name === 'TOUCH') tr.touch = 0;
  }
  wakeUp() { this.tr.wake = 0; }
  setLook(fx, fy) {
    this.look.tx = clamp((fx - 0.5) * 2, -1, 1);
    this.look.ty = fy == null ? 0 : clamp((fy - 0.45) * 2, -1, 1);
    this.look.until = performance.now() + 2200;
  }
  tap(fx) {
    this.touchSide = fx < 0.5 ? -1 : 1;
    if (fx != null) this.setLook(fx, 0.35);
    this.root.updateMatrixWorld(true);
    this.head.getWorldPosition(this._v);
    const c = this._v, n = this.reduced ? 10 : 22;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = 1.5 + Math.random() * 2.5;
      this.fire.emit(c.x + (Math.random() - 0.5) * 0.8, c.y + (Math.random() - 0.5) * 0.6, c.z + 0.8,
        Math.cos(a) * s, Math.sin(a) * s + 1.5, Math.random() * 1.5, 0.6 + Math.random() * 0.3, 0.12 + Math.random() * 0.08, 1);
    }
  }
  setCharge(on) { this.charge.on = !!on; if (!on) this.charge.level = 0; }
  setChargeLevel(v) { this.charge.level = clamp(v, 0, 1); }
  setReduced(on) {
    this.reduced = !!on;
    this.renderer.setPixelRatio(on ? Math.min(1, this.pr) : this.pr);
    this.fire.cap = on ? 140 : this.fire.max;
    /* fewer flame quads when the GPU struggles (fill-rate is the cost on Adreno 505) */
    this.flames.forEach((f, i) => { f.m.visible = !on || (f.kind === 'tail' && i % 2 === 0) || (f.kind === 'mane' && i % 2 === 0); });
    this.resize();
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    const asp = w / h, tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.camera.aspect = asp;
    this.camDist = Math.max(6.0 / (2 * tanH), 5.2 / (2 * tanH * asp));
    this.camera.updateProjectionMatrix();
    this.fire.mat.uniforms.scale.value = this.renderer.domElement.height / (2 * tanH);
  }
  start() { if (this.running) return; this.running = true; this._last = 0; this._raf = requestAnimationFrame(this._bound); }
  stop() { this.running = false; cancelAnimationFrame(this._raf); }
  fps() { return Math.round(this._fpsEMA); }

  _ring() {
    this.root.updateMatrixWorld(true);
    this.bodyG.getWorldPosition(this._v);
    const c = this._v, n = this.reduced ? 24 : 48;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, r = 1.4;
      this.fire.emit(c.x + Math.cos(a) * r, c.y + 0.1, c.z + Math.sin(a) * r,
        Math.cos(a) * 1.6 - Math.sin(a) * 1.2, 0.2, Math.sin(a) * 1.6 + Math.cos(a) * 1.2, 0.9, 0.38, 2);
    }
  }

  _loop(ts) {
    if (!this.running) return;
    this._raf = requestAnimationFrame(this._bound);
    let dt = this._last ? (ts - this._last) / 1000 : 1 / 60; this._last = ts;
    if (dt > 0) { this._fpsEMA = this._fpsEMA * 0.92 + (1 / dt) * 0.08; if (this._onFps) this._onFps(this._fpsEMA); }
    if (dt > 0.1) dt = 0.1;
    if (this._autoReduce && !this.reduced) {
      this._low = this._fpsEMA < 24 ? this._low + dt : 0;
      if (this._low > 3) this.setReduced(true);
    }
    this._update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  _update(dt) {
    this.t += dt;
    const t = this.t, p = this.p, tp = this.tp, tr = this.tr, F = this.fire;
    const k = Math.min(1, dt * 5);
    for (const key in tp) p[key] += (tp[key] - p[key]) * k;
    for (const key in tr) if (tr[key] >= 0) { tr[key] += dt; if (tr[key] > DUR[key]) tr[key] = -1; }

    const L = this.look;
    if (performance.now() > L.until) { L.tx = 0; L.ty = 0; }
    const lk = Math.min(1, dt * 6); L.x += (L.tx - L.x) * lk; L.y += (L.ty - L.y) * lk;

    const bl = this.blink; let blinkF = 1;
    bl.next -= dt;
    if (bl.next <= 0 && bl.t < 0) { bl.t = 0; bl.next = 2.2 + Math.random() * 3.5; }
    if (bl.t >= 0) { bl.t += dt; const u = bl.t / 0.16; if (u >= 1) bl.t = -1; else blinkF = 1 - Math.sin(u * Math.PI) * 0.92; }

    const cl = this.charge.on ? this.charge.level : 0;

    let px = 0, py = p.hover + Math.sin(t * 1.6) * 0.12, pz = 0;
    let yaw = Math.sin(t * 0.45) * p.yawAmp + L.x * 0.25, pitch = p.pitch, roll = 0;
    if (tr.happy >= 0) { const u = tr.happy / DUR.happy; py += Math.sin(u * Math.PI) * 0.9; yaw += smoothstep(0.1, 0.85, u) * TAU; }
    if (tr.fly >= 0) {
      const u = tr.fly / DUR.fly, a = u * TAU;
      const w = smoothstep(0, 0.12, u) * (1 - smoothstep(0.88, 1, u));
      px += Math.sin(a) * 1.7; pz += (Math.cos(a) - 1) * 1.5; py += Math.sin(u * Math.PI) * 0.55;
      yaw = lerpAngle(yaw, Math.atan2(Math.cos(a), -Math.sin(a) * (1.5 / 1.7)), w);
      roll = -Math.sin(a) * 0.45 * w; pitch += 0.15 * w;
      this.acc.trail += dt * (this.reduced ? 30 : 70);
    }
    let headPitchAdd = 0, jawAdd = 0, bodyPuff = 0, shake = 0, breathRate = 0;
    if (tr.fire >= 0) {
      const u = tr.fire;
      yaw += 0.75 * smoothstep(0, 0.25, u) * (1 - smoothstep(1.15, 1.35, u));
      if (u < 0.42) { const s = smoothstep(0, 0.4, u); headPitchAdd = -0.35 * s; bodyPuff = 0.07 * s; }
      else if (u < 1.15) { headPitchAdd = 0.12; jawAdd = 0.7; breathRate = this.reduced ? 90 : 200; shake = 0.03; pz -= 0.18 * Math.sin(((u - 0.42) / 0.73) * Math.PI); }
    }
    let headYawAdd = 0;
    if (tr.error >= 0) headYawAdd = Math.sin(tr.error * 28) * 0.35 * (1 - tr.error / DUR.error);
    let tiltAdd = 0, wob = 0;
    if (tr.touch >= 0) { const u = tr.touch / DUR.touch; tiltAdd = this.touchSide * 0.25 * Math.sin(u * Math.PI); wob = Math.sin(tr.touch * 30) * 0.03 * (1 - u); }
    let stretch = 0, yawn = 0;
    if (tr.wake >= 0) { const u = tr.wake / DUR.wake; stretch = Math.sin(u * Math.PI) * 0.12; yawn = Math.sin(u * Math.PI) * 0.6; }
    py -= cl * 0.3;
    if (cl > 0.6) shake = Math.max(shake, (cl - 0.6) * 0.06);

    const R = this.root;
    R.position.set(px + (shake ? (Math.random() - 0.5) * shake : 0), py, pz);
    R.rotation.set(pitch, yaw, roll, 'YXZ');

    const br = Math.sin(t * p.breath);
    this.bodyG.scale.set(1 + br * 0.02 + bodyPuff + wob - cl * 0.04, 1 + br * 0.035 + bodyPuff * 0.6 - cl * 0.12 + stretch, 1 + br * 0.02 + bodyPuff);

    this.neck.rotation.set(
      p.headPitch + headPitchAdd + L.y * 0.25 + br * 0.02,
      L.x * 0.55 + headYawAdd + Math.sin(t * 0.3) * 0.08 * (1 - Math.abs(L.x)),
      p.tilt * this.touchSide + tiltAdd, 'YXZ');

    const eyeOpen = Math.min(p.eye, blinkF) * (cl > 0.3 ? 0.8 : 1);
    for (const e of this.eyes) {
      e.eg.scale.y = Math.max(0.06, eyeOpen);
      e.ir.position.set(L.x * 0.045, -L.y * 0.035 + p.eyeUp * 0.05, 0);
    }
    for (const e of this.ears) {
      const tw = Math.pow(Math.max(0, Math.sin(t * 0.7 + e.s * 2.1)), 20) * 0.3;
      e.eg.rotation.set(-p.ear * 0.35, 0, -e.s * (0.38 - p.ear * 0.6 + tw));
    }
    const o = clamp(p.jaw + jawAdd + yawn, 0, 1);
    this.mouthG.position.set(0, -0.36 - o * 0.12, 0.8 + o * 0.12);
    this.mouthMesh.scale.set(0.19 + o * 0.03, 0.08 + o * 0.19, 0.1);
    this.tongue.position.y = -0.03 - o * 0.08;
    for (const f of this.fangs) f.position.y = 0.05 + o * 0.07;

    for (const lg of this.legs) {
      const ph = t * p.legSpd + (lg.side > 0 ? 0 : Math.PI) + (lg.front ? 0 : Math.PI * 0.5);
      let rx;
      if (lg.front) { rx = -p.front + Math.sin(ph) * p.legAmp; if (this.mood === 'THINKING' && lg.side > 0) rx = -2.2; rx += cl * 0.4; }
      else rx = -p.back * 0.6 + Math.sin(ph) * p.legAmp * 0.7 - cl * 0.3;
      lg.rx += (rx - lg.rx) * Math.min(1, dt * 8);
      lg.pivot.rotation.set(lg.rx, 0, lg.side * (lg.front ? 0.12 : 0.08));
    }
    const curl = (this.mood === 'SLEEP' ? 0.12 : 0) + (tr.fly >= 0 ? -0.12 : 0);
    for (let i = 0; i < this.tail.length; i++) {
      const seg = this.tail[i];
      seg.rotation.x = (i === 0 ? 0 : 0.16) + Math.sin(t * p.tailSpd * 0.5 - i * 0.5) * 0.06 + curl;
      seg.rotation.z = Math.sin(t * p.tailSpd - i * 0.55) * p.tailAmp * (0.25 + i * 0.09);
    }

    /* shader flames */
    const fi = clamp(p.mane * (1 + cl * 1.5), 0.2, 3);
    for (const f of this.flames) {
      const u = f.mat.uniforms;
      u.uTime.value = t;
      u.uInt.value = (f.kind === 'tail' ? 1.0 : f.kind === 'back' ? 0.7 : 0.8) * Math.min(1.5, 0.55 + fi * 0.45);
      u.uSize.value = f.size * 0.72 * (0.6 + 0.4 * Math.min(1.5, fi)) * (this.mood === 'SLEEP' ? 0.75 : 1);
    }

    R.updateMatrixWorld(true);

    const red = this.reduced ? 0.45 : 1, hw = this.head.matrixWorld, v = this._v, v2 = this._v2;
    /* rising embers from the mane */
    this.acc.ember += dt * 16 * fi * red;
    while (this.acc.ember >= 1) {
      this.acc.ember -= 1;
      v.copy(this.maneLocal[(Math.random() * this.maneLocal.length) | 0]).applyMatrix4(hw);
      F.emit(v.x + (Math.random() - 0.5) * 0.4, v.y, v.z, (Math.random() - 0.5) * 0.5, 1.2 + Math.random() * 0.9, (Math.random() - 0.5) * 0.3,
        1.0 + Math.random() * 0.7, 0.09 + Math.random() * 0.09, 2);
    }
    if (breathRate > 0) {
      this.acc.breath += dt * breathRate;
      this.mouthG.getWorldPosition(v);
      v2.set(0, -0.15, 1).transformDirection(hw);
      while (this.acc.breath >= 1) {
        this.acc.breath -= 1;
        const sp = 5.5 + Math.random() * 2.5;
        F.emit(v.x + v2.x * 0.15, v.y + v2.y * 0.15, v.z + v2.z * 0.15,
          v2.x * sp + (Math.random() - 0.5) * 0.9, v2.y * sp + (Math.random() - 0.5) * 0.9, v2.z * sp + (Math.random() - 0.5) * 0.9,
          0.4 + Math.random() * 0.3, 0.5 + Math.random() * 0.4, 0);
      }
      this.mouthLight.position.copy(v).addScaledVector(v2, 1.2);
      this.mouthLight.intensity = 25;
    } else { this.acc.breath = 0; this.mouthLight.intensity *= 0.8; }
    if (this.acc.trail >= 1) {
      this.bodyG.getWorldPosition(v);
      while (this.acc.trail >= 1) {
        this.acc.trail -= 1;
        F.emit(v.x + (Math.random() - 0.5) * 0.6, v.y + (Math.random() - 0.5) * 0.6, v.z + (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 0.3, 0.3, (Math.random() - 0.5) * 0.3, 0.5 + Math.random() * 0.4, 0.45 + Math.random() * 0.3, 0);
      }
    }
    if (cl > 0) {
      this.acc.charge += dt * (40 + cl * 140) * red;
      this.bodyG.getWorldPosition(v);
      while (this.acc.charge >= 1) {
        this.acc.charge -= 1;
        const th = Math.random() * TAU, ph = Math.acos(Math.random() * 2 - 1), r = 2 + Math.random() * 0.6, life = 0.45;
        const ox = Math.sin(ph) * Math.cos(th) * r, oy = Math.cos(ph) * r * 0.8 + 0.6, oz = Math.sin(ph) * Math.sin(th) * r;
        F.emit(v.x + ox, v.y + oy, v.z + oz, -ox / life, -oy / life, -oz / life, life, 0.22 + Math.random() * 0.12, 3);
      }
    }
    if (this.mood === 'THINKING') {
      this.acc.think += dt * 30 * red;
      this.head.getWorldPosition(v);
      while (this.acc.think >= 1) {
        this.acc.think -= 1;
        const a = t * 3.2 + Math.random() * 0.3;
        F.emit(v.x + Math.cos(a) * 1.5, v.y + 0.9 + Math.sin(t * 2) * 0.1, v.z + Math.sin(a) * 1.5, 0, 0.1, 0, 0.5, 0.3, 3);
      }
    }

    this.head.getWorldPosition(v);
    this.fireLight.position.set(v.x, v.y + 1.2, v.z - 0.5);
    const fl = 0.75 + 0.25 * Math.sin(t * 13) * Math.sin(t * 7.3 + 1);
    this.fireLight.intensity = 12 * fl * (0.4 + 0.6 * Math.min(2, fi));

    const sl = this.mood === 'SLEEP';
    for (const z of this.zs) {
      const u = (t * 0.35 + z.ph) % 1;
      z.sp.position.set(v.x + 0.9 + u * 0.6, v.y + 0.6 + u * 1.4, v.z);
      const s = 0.25 + u * 0.35; z.sp.scale.set(s, s, 1);
      z.sp.material.opacity += ((sl ? Math.sin(u * Math.PI) : 0) - z.sp.material.opacity) * Math.min(1, dt * 4);
    }

    this.shadow.position.x = R.position.x; this.shadow.position.z = R.position.z;
    const ss = clamp(1.2 - (R.position.y + 0.3) * 0.25, 0.5, 1.4);
    this.shadow.scale.set(ss, ss, ss);
    this.shadow.material.opacity = clamp(0.75 - R.position.y * 0.2, 0.2, 0.85);

    const cs = shake * 0.6;
    this.camera.position.set(cs ? (Math.random() - 0.5) * cs : 0, 0.3 + (cs ? (Math.random() - 0.5) * cs : 0), this.camDist);
    this.camera.lookAt(this.camTarget);

    F.update(dt);
  }
}

FT.Tiger3D = Tiger3D;
