/* puppet.js — the APPROVED Fire Tiger art, animated as a cut-out puppet (Live2D-style).
 * The picture is NOT redrawn: assets/fire-tiger/puppet/char.png is the original art (fire breath and
 * the swirl under the feet split off into breath.png / swirl.png). It is drawn on a dense mesh whose
 * vertices are skinned to 2D bones (body, head, jaw, ears, 3 tail bones, 4 legs), so each part moves
 * on its own and joints bend smoothly, with no holes. The fragment shader adds eye blinks (lid made of
 * the fur above the eye), pupils that follow the finger, and flickering flames (flame.png mask).
 * Limits (honest): one camera angle, it cannot turn 360°; motion is bending/rotating the art, not a
 * 3D model. Same public API as rig.js / tiger3d.js. Needs WebGL2 (falls back like tiger3d). */
import * as THREE from './vendor/three.module.min.js';

const FT = (window.FT = window.FT || {});
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const BASE = 'assets/fire-tiger/puppet/';

function webgl2ok() {
  try {
    const c = document.createElement('canvas');
    const gl = window.WebGL2RenderingContext && c.getContext('webgl2');
    if (!gl) return false;
    const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
    return true;
  } catch (e) { return false; }
}

/* ---- source-picture layout (pixels of the 1425x1071 cut-out) ---- */
const LAYERS = { char: [9, 10, 1013, 858], breath: [867, 33, 1425, 460], swirl: [59, 701, 1014, 1062] };
const EYES = [ // lid ellipse cx, cy, rx, ry | iris cx, cy, r
  [714, 225, 56, 44, 723, 228, 34],
  [862, 203, 32, 36, 868, 205, 21]
];
const MOUTH = [872, 308];            // where the fire breath leaves the mouth
/* bones: name, parent, pivot */
const BONES = [
  ['root', -1, 560, 560], ['body', 0, 560, 640], ['head', 1, 700, 420], ['jaw', 2, 790, 292],
  ['earL', 2, 525, 238], ['earR', 2, 838, 150],
  ['tail1', 1, 380, 640], ['tail2', 6, 240, 648], ['tail3', 7, 180, 520],
  ['legFL', 1, 690, 505], ['legFR', 1, 893, 490], ['legBA', 1, 435, 690], ['legBB', 1, 575, 702]
];
const B = {}; BONES.forEach((b, i) => { B[b[0]] = i; });
const NB = BONES.length;

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}
const cap = (ax, ay, bx, by, r) => (x, y) => 1 - sstep(r * 0.55, r * 1.05, segDist(x, y, ax, ay, bx, by));
const ellW = (cx, cy, rx, ry) => (x, y) => 1 - sstep(0.62, 1.05, Math.hypot((x - cx) / rx, (y - cy) / ry));
/* painted weights, parents before children: each one takes its share from what is already there */
const PAINT = [
  ['head', (x, y) => sstep(450, 390, y) * sstep(250, 380, x)],
  ['jaw', ellW(836, 333, 64, 36)],
  ['earL', ellW(478, 182, 78, 84)],
  ['earR', ellW(866, 92, 44, 64)],
  ['tail1', (x, y) => cap(392, 640, 240, 652, 62)(x, y) * sstep(445, 405, x)],
  ['tail2', (x, y) => cap(240, 652, 180, 520, 62)(x, y) * sstep(345, 300, x)],
  ['tail3', (x, y) => cap(180, 512, 190, 330, 230)(x, y) * sstep(420, 260, x) * sstep(600, 540, y)],
  ['legFL', cap(690, 505, 772, 598, 74)],
  ['legFR', cap(918, 502, 960, 566, 56)],
  ['legBA', cap(435, 690, 372, 806, 74)],
  ['legBB', cap(575, 706, 552, 814, 68)]
];

/* 2D affine [a b c d e f]: x' = a x + c y + e, y' = b x + d y + f */
function mul(m, n) {
  return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
}
function local(px, py, ox, oy, rot, sx, sy) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const a = c * sx, b = s * sx, cc = -s * sy, d = c * sy;
  return [a, b, cc, d, px + ox - (a * px + cc * py), py + oy - (b * px + d * py)];
}
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/* ---------------- shaders ---------------- */
const NOISE = `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }`;
const CHAR_VS = `
attribute vec4 skinIdx; attribute vec4 skinW; attribute vec2 src;
uniform vec3 uB[${NB * 2}];
varying vec2 vUv; varying vec2 vSrc;
vec2 sk(float i, vec2 p){ int k = int(i) * 2; vec3 r0 = uB[k], r1 = uB[k + 1]; return vec2(dot(r0, vec3(p, 1.0)), dot(r1, vec3(p, 1.0))); }
void main(){
  vUv = uv; vSrc = src;
  vec2 p = sk(skinIdx.x, src) * skinW.x + sk(skinIdx.y, src) * skinW.y + sk(skinIdx.z, src) * skinW.z + sk(skinIdx.w, src) * skinW.w;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p.x, -p.y, 0.0, 1.0);
}`;
const CHAR_FS = `
uniform sampler2D map; uniform sampler2D fmap; uniform vec4 uBox; uniform float uTime; uniform float uFlame;
uniform float uDistort; uniform vec2 uBlink; uniform vec2 uLook; uniform float uBright; uniform vec3 uTint;
uniform vec2 uLidSrc; uniform vec4 uEye0; uniform vec3 uIris0; uniform vec4 uEye1; uniform vec3 uIris1;
varying vec2 vUv; varying vec2 vSrc;
${NOISE}
vec2 toUv(vec2 s){ return (s - uBox.xy) / uBox.zw; }
vec2 eye(vec2 s, vec4 e, vec3 ir, float blink, inout float lid, inout float lash, inout float shade){
  vec2 q = (s - e.xy) / e.zw;
  float r = length(q);
  if (r > 1.0) return s;
  float d = length((s - ir.xy) / ir.z);
  s -= uLook * 4.5 * (1.0 - smoothstep(0.55, 1.0, d));          /* pupil follows the finger */
  float edge = -1.05 + 2.5 * blink;                            /* lid slides down */
  float m = (1.0 - smoothstep(edge - 0.08, edge + 0.02, q.y)) * (1.0 - smoothstep(0.78, 1.0, r));
  lid = max(lid, m);
  float line = min(edge, 0.12 + 0.3 * (1.0 - q.x * q.x));      /* shut eye = a curved lash line */
  lash = max(lash, (1.0 - smoothstep(0.03, 0.13, abs(q.y - line))) * smoothstep(0.02, 0.15, blink) * (1.0 - smoothstep(0.72, 0.92, r)));
  shade = max(shade, m * (1.0 - smoothstep(-1.0, line, q.y)));
  return s;
}
void main(){
  vec2 s = vSrc; float lid = 0.0, lash = 0.0, shade = 0.0;
  s = eye(s, uEye0, uIris0, uBlink.x, lid, lash, shade);
  s = eye(s, uEye1, uIris1, uBlink.y, lid, lash, shade);
  vec2 uv = toUv(s);
  float fm = texture2D(fmap, vUv).r * uDistort;
  if (fm > 0.003) {
    float t = uTime;
    float n1 = noise(vSrc * 0.035 + vec2(0.0, t * 2.2)), n2 = noise(vSrc * 0.05 + vec2(t * 0.7, t * 2.9));
    uv += fm * vec2((n1 - 0.5) * 7.0, (n2 - 0.5) * 6.0 + 3.5 * sin(t * 3.0 + vSrc.x * 0.02)) / uBox.zw;
  }
  vec4 c = texture2D(map, uv);
  float fl = texture2D(fmap, vUv).r;
  float flick = 0.82 + 0.18 * noise(vSrc * 0.02 + vec2(0.0, uTime * 3.5)) + 0.08 * sin(uTime * 13.0);
  float k = fl * (flick * uFlame - 1.0);
  if (k < 0.0) { c.rgb *= vec3(1.0 + k * 0.25, 1.0 + k * 0.85, 1.0 + k); c.a *= 1.0 + k * 0.5; }   /* calmer = redder, fainter */
  else c.rgb *= 1.0 + k;
  if (lid > 0.001) {                                            /* closed lid: fur colour from just above the eye */
    vec3 fur = texture2D(map, toUv(uLidSrc)).rgb * (0.94 + 0.08 * noise(vSrc * 0.25));
    fur *= 0.8 + 0.2 * (1.0 - shade);
    c.rgb = mix(c.rgb, fur, lid);
  }
  c.rgb = mix(c.rgb, vec3(0.13, 0.06, 0.04), lash * 0.9);
  c.rgb = c.rgb * uBright + uTint * c.a;
  if (c.a < 0.01) discard;
  gl_FragColor = c;
}`;
const LAYER_VS = `
uniform vec3 uM[2]; varying vec2 vUv; varying vec2 vSrc; attribute vec2 src;
void main(){ vUv = uv; vSrc = src;
  vec2 p = vec2(dot(uM[0], vec3(src, 1.0)), dot(uM[1], vec3(src, 1.0)));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p.x, -p.y, 0.0, 1.0); }`;
const LAYER_FS = `
uniform sampler2D map; uniform float uTime; uniform float uAlpha; uniform float uReveal; uniform vec2 uFrom; uniform float uLen; uniform vec2 uSize;
varying vec2 vUv; varying vec2 vSrc;
${NOISE}
void main(){
  float n1 = noise(vSrc * 0.03 + vec2(-uTime * 2.5, uTime * 0.6)), n2 = noise(vSrc * 0.045 + vec2(uTime * 0.5, -uTime * 2.0));
  vec2 uv = vUv + vec2(n1 - 0.5, n2 - 0.5) * 9.0 / uSize;
  vec4 c = texture2D(map, uv);
  float d = length(vSrc - uFrom) / uLen;                        /* breath grows out of the mouth */
  float rv = 1.0 - smoothstep(uReveal - 0.12, uReveal, d + (n1 - 0.5) * 0.12);
  c.rgb *= 0.85 + 0.3 * n2;
  c.a *= uAlpha * rv;
  if (c.a < 0.01) discard;
  gl_FragColor = c;
}`;
const PT_VS = `
attribute vec4 pcolor; attribute float psize; uniform float scale; varying vec4 vC;
void main(){ vC = pcolor; gl_PointSize = psize * scale; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const PT_FS = `
uniform sampler2D map; varying vec4 vC;
void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC.rgb * t.rgb, vC.a * t.a); }`;

function emberTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.7)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
function zTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.fillStyle = '#d8e8ff'; g.font = 'bold 52px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Z', 32, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------------- particles (world = source pixels, y up) ---------------- */
class Sparks {
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
    this.mat = new THREE.ShaderMaterial({ uniforms: { map: { value: tex }, scale: { value: 1 } }, vertexShader: PT_VS, fragmentShader: PT_FS, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
    this.points = new THREE.Points(geo, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 10;
  }
  /* x,y in source px (y down); velocities px/s (y down) */
  emit(x, y, vx, vy, life, size, kind) {
    if (this.n >= this.cap) return;
    const i = this.n++, i3 = i * 3;
    this.pos[i3] = x; this.pos[i3 + 1] = -y; this.pos[i3 + 2] = 0;
    this.vel[i3] = vx; this.vel[i3 + 1] = -vy; this.vel[i3 + 2] = 0;
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
      if (k === 0) { this.vel[i3 + 1] += 260 * dt; const drag = 1 - 1.4 * dt; this.vel[i3] *= drag; }
      else if (k === 1) this.vel[i3 + 1] -= 1100 * dt;
      else if (k === 2) { this.vel[i3 + 1] += 60 * dt; this.vel[i3] += Math.sin(this.life[i] * 9 + i) * 90 * dt; }
      this.pos[i3] += this.vel[i3] * dt; this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
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
  IDLE:     { hover: 0,   bob: 20, sway: 0.045, leg: 0.15, legSpd: 2.6, tail: 0.2,  tailSpd: 2.4, eye: 0,    jaw: 0,     ear: 0,     flame: 1.0,  head: 0,     swirl: 0.55, breath: 2.0 },
  TOUCH:    { hover: 0,   bob: 8,  sway: 0.02,  leg: 0.1,  legSpd: 4,   tail: 0.2,  tailSpd: 7,   eye: 0.4,  jaw: 0.03,  ear: -0.12, flame: 1.15, head: 0,     swirl: 0.6,  breath: 3 },
  HAPPY:    { hover: 0,   bob: 10, sway: 0.03,  leg: 0.16, legSpd: 8,   tail: 0.15, tailSpd: 9,   eye: 0,    jaw: 0.05,  ear: 0.08,  flame: 1.3,  head: -0.04, swirl: 1.0,  breath: 3 },
  FLY:      { hover: 0,   bob: 6,  sway: 0,     leg: 0.12, legSpd: 5,   tail: 0.12, tailSpd: 5,   eye: 0,    jaw: 0,     ear: -0.15, flame: 1.35, head: -0.03, swirl: 0.25, breath: 2.5 },
  FIRE:     { hover: 0,   bob: 4,  sway: 0,     leg: 0.04, legSpd: 3,   tail: 0.18, tailSpd: 6,   eye: 0.2,  jaw: 0,     ear: -0.12, flame: 1.45, head: 0,     swirl: 0.7,  breath: 2.2 },
  SLEEP:    { hover: 40,  bob: 5,  sway: 0.006, leg: 0.01, legSpd: 1,   tail: 0.03, tailSpd: 0.8, eye: 1,    jaw: -0.42, ear: -0.1,  flame: 0.6,  head: 0.14,  swirl: 0.12, breath: 1.0 },
  THINKING: { hover: 0,   bob: 8,  sway: 0.01,  leg: 0.03, legSpd: 1.5, tail: 0.08, tailSpd: 1.6, eye: 0.15, jaw: -0.08, ear: 0.05,  flame: 0.95, head: -0.07, swirl: 0.4,  breath: 1.8 },
  ERROR:    { hover: 10,  bob: 4,  sway: 0.01,  leg: 0.02, legSpd: 2,   tail: 0.04, tailSpd: 2,   eye: 0.35, jaw: -0.12, ear: -0.2,  flame: 0.7,  head: 0.08,  swirl: 0.3,  breath: 2.5 }
};
const DUR = { happy: 1.3, fly: 2.7, fire: 1.4, error: 0.9, touch: 0.7, wake: 0.8 };

class Puppet {
  static supported() { return webgl2ok(); }

  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.reduced = !!opts.reduced;
    this._autoReduce = opts.autoReduce !== false;
    this._onFps = opts.onFps || null;
    const R = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: false }));
    R.setClearColor(0x000000, 0);
    R.outputColorSpace = THREE.LinearSRGBColorSpace;   /* the art is shown as-is, no colour management */
    this.pr = Math.min(window.devicePixelRatio || 1, 1.5, 1500 / Math.max(1, window.innerWidth));
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
    this.bones = BONES.map(() => ({ ox: 0, oy: 0, rot: 0, sx: 1, sy: 1 }));
    this.world = BONES.map(() => [1, 0, 0, 1, 0, 0]);
    this.uB = []; for (let i = 0; i < NB * 2; i++) this.uB.push(new THREE.Vector3());
    this.ready = false;
    this._build();
    this.sparks = new Sparks(300, emberTex());
    this.scene.add(this.sparks.points);
    this._initState();
    this.setReduced(this.reduced);
    this._bound = this._loop.bind(this);
  }

  _tex(name) {
    const done = () => { this._loaded = (this._loaded || 0) + 1; if (this._loaded >= 4) this.ready = true; };
    const t = new THREE.TextureLoader().load(BASE + name, done, undefined, done);
    t.flipY = false; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
    return t;
  }

  _build() {
    /* ---- character mesh, skinned ---- */
    const [x0, y0, x1, y1] = LAYERS.char, w = x1 - x0, h = y1 - y0;
    const nx = this.reduced ? 46 : 64, ny = Math.round(nx * h / w);
    const nv = (nx + 1) * (ny + 1);
    const src = new Float32Array(nv * 2), uv = new Float32Array(nv * 2), pos = new Float32Array(nv * 3);
    const idx = new Float32Array(nv * 4), wt = new Float32Array(nv * 4);
    const ws = new Float32Array(NB);
    let v = 0;
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++, v++) {
      const x = x0 + (w * i) / nx, y = y0 + (h * j) / ny;
      src[v * 2] = x; src[v * 2 + 1] = y; uv[v * 2] = i / nx; uv[v * 2 + 1] = j / ny;
      pos[v * 3] = x; pos[v * 3 + 1] = -y;
      ws.fill(0); ws[B.body] = 1;
      for (const [name, f] of PAINT) {
        const k = clamp(f(x, y), 0, 1); if (k <= 0) continue;
        for (let b = 0; b < NB; b++) ws[b] *= 1 - k;
        ws[B[name]] += k;
      }
      const order = Array.from(ws.keys()).sort((a, b) => ws[b] - ws[a]).slice(0, 4);
      let sum = 0; for (const o of order) sum += ws[o];
      order.forEach((o, k) => { idx[v * 4 + k] = o; wt[v * 4 + k] = ws[o] / (sum || 1); });
    }
    const index = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      index.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('src', new THREE.BufferAttribute(src, 2));
    geo.setAttribute('skinIdx', new THREE.BufferAttribute(idx, 4));
    geo.setAttribute('skinW', new THREE.BufferAttribute(wt, 4));
    geo.setIndex(index);
    const eu = (e) => [new THREE.Vector4(e[0], e[1], e[2], e[3]), new THREE.Vector3(e[4], e[5], e[6])];
    const [e0, i0] = eu(EYES[0]), [e1, i1] = eu(EYES[1]);
    this.charMat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: this._tex('char.png') }, fmap: { value: this._tex('flame.png') }, uB: { value: this.uB },
        uBox: { value: new THREE.Vector4(x0, y0, w, h) }, uTime: { value: 0 }, uFlame: { value: 1 }, uDistort: { value: 1 },
        uBlink: { value: new THREE.Vector2() }, uLook: { value: new THREE.Vector2() }, uBright: { value: 1 }, uTint: { value: new THREE.Vector3() },
        uLidSrc: { value: new THREE.Vector2(728, 272) }, uEye0: { value: e0 }, uIris0: { value: i0 }, uEye1: { value: e1 }, uIris1: { value: i1 }
      },
      vertexShader: CHAR_VS, fragmentShader: CHAR_FS, side: THREE.DoubleSide, transparent: true, depthWrite: false, depthTest: false
    });
    this.char = new THREE.Mesh(geo, this.charMat); this.char.frustumCulled = false; this.char.renderOrder = 2;
    this.scene.add(this.char);

    /* ---- breath + swirl: simple quads that follow one bone ---- */
    const quad = (box, file, order, blend) => {
      const [a0, b0, a1, b1] = box, sx = 12, sy = 8, n = (sx + 1) * (sy + 1);
      const p = new Float32Array(n * 3), u = new Float32Array(n * 2), s = new Float32Array(n * 2); let k = 0;
      for (let j = 0; j <= sy; j++) for (let i = 0; i <= sx; i++, k++) {
        const x = a0 + ((a1 - a0) * i) / sx, y = b0 + ((b1 - b0) * j) / sy;
        p[k * 3] = x; p[k * 3 + 1] = -y; u[k * 2] = i / sx; u[k * 2 + 1] = j / sy; s[k * 2] = x; s[k * 2 + 1] = y;
      }
      const ix = []; for (let j = 0; j < sy; j++) for (let i = 0; i < sx; i++) { const a = j * (sx + 1) + i; ix.push(a, a + sx + 1, a + 1, a + 1, a + sx + 1, a + sx + 2); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.BufferAttribute(u, 2)); g.setAttribute('src', new THREE.BufferAttribute(s, 2)); g.setIndex(ix);
      const mat = new THREE.ShaderMaterial({
        uniforms: { map: { value: this._tex(file) }, uM: { value: [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)] }, uTime: { value: 0 }, uAlpha: { value: 1 },
          uReveal: { value: 2 }, uFrom: { value: new THREE.Vector2(MOUTH[0], MOUTH[1]) }, uLen: { value: 600 }, uSize: { value: new THREE.Vector2(a1 - a0, b1 - b0) } },
        vertexShader: LAYER_VS, fragmentShader: LAYER_FS, side: THREE.DoubleSide, transparent: true, depthWrite: false, depthTest: false, blending: blend || THREE.NormalBlending
      });
      const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = order; this.scene.add(m);
      return m;
    };
    this.swirl = quad(LAYERS.swirl, 'swirl.png', 1);
    this.breath = quad(LAYERS.breath, 'breath.png', 3);

    /* sleep Z's */
    this.zs = [];
    const zt = zTex();
    for (let k = 0; k < 3; k++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: zt, transparent: true, depthWrite: false, depthTest: false, opacity: 0 }));
      sp.renderOrder = 11; this.scene.add(sp); this.zs.push({ sp, ph: k / 3 });
    }
  }

  _initState() {
    this.mood = 'IDLE';
    this.p = Object.assign({}, MOODS.IDLE); this.tp = Object.assign({}, MOODS.IDLE);
    this.t = 0;
    this.tr = { happy: -1, fly: -1, fire: -1, error: -1, touch: -1, wake: -1 };
    this.look = { x: 0, y: 0, tx: 0, ty: 0, until: 0 };
    this.blink = { next: 1.5, t: -1 };
    this.ear = { next: 2, t: -1, side: 0 };
    this.charge = { on: false, level: 0 };
    this.acc = { ember: 0, breath: 0, trail: 0, charge: 0, think: 0 };
    this.touchSide = 1;
    this.running = false; this._raf = 0; this._last = 0; this._fpsEMA = 60; this._low = 0;
  }

  /* ---------- public API (same as rig.js / tiger3d.js) ---------- */
  setImage() { /* the puppet uses its own split layers of the approved art */ }
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
    if (fx != null && fx < 0.4) this._startGesture('swish');      /* touched near the tail */
    else this._startGesture(Math.random() < 0.5 ? 'ears' : 'paw');
    if (fx != null) this.setLook(fx, 0.35);
    const c = apply(this.world[B.head], 700, 250), n = this.reduced ? 10 : 22;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = 250 + Math.random() * 380;
      this.sparks.emit(c[0] + (Math.random() - 0.5) * 160, c[1] + (Math.random() - 0.5) * 120, Math.cos(a) * s, Math.sin(a) * s - 250, 0.6 + Math.random() * 0.3, 22 + Math.random() * 14, 1);
    }
  }
  setCharge(on) { this.charge.on = !!on; if (!on) this.charge.level = 0; }
  setChargeLevel(v) { this.charge.level = clamp(v, 0, 1); }
  setReduced(on) {
    this.reduced = !!on;
    this.renderer.setPixelRatio(on ? Math.min(1, this.pr) : this.pr);
    this.sparks.cap = on ? 120 : this.sparks.max;
    this.resize();
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    /* frame the tiger (and room for the fire breath on wide screens) */
    const cx = 545, cy = 452, needW = 1060, needH = 990;
    const ppu = Math.min(w / needW, h / needH);            /* css px per source px */
    const hw = w / ppu / 2, hh = h / ppu / 2;
    const cam = this.camera;
    cam.left = cx - hw; cam.right = cx + hw; cam.top = -cy + hh; cam.bottom = -cy - hh;
    cam.updateProjectionMatrix();
    this.ppu = ppu;
    this.sparks.mat.uniforms.scale.value = ppu * this.renderer.getPixelRatio();
  }
  start() { if (this.running) return; this.running = true; this._last = 0; this._raf = requestAnimationFrame(this._bound); }
  stop() { this.running = false; cancelAnimationFrame(this._raf); }
  fps() { return Math.round(this._fpsEMA); }

  /* little things it does by itself while idle, and reactions to touch */
  _startGesture(kind) { this.gest = { kind, t: 0 }; }
  _gesture(dt, bo, head, root, body) {
    if (!this.gest) {
      this._gNext = (this._gNext == null ? 2.5 : this._gNext) - dt;
      if (this._gNext <= 0 && this.mood === 'IDLE' && !this.charge.on) {
        this._gNext = 3 + Math.random() * 4;
        const kinds = ['look', 'paw', 'swish', 'hop', 'roar', 'ears', 'stretch'];
        this._startGesture(kinds[(Math.random() * kinds.length) | 0]);
      }
      return;
    }
    const g = this.gest; g.t += dt;
    const D = { look: 2.2, paw: 1.1, swish: 1.3, hop: 0.8, roar: 1.2, ears: 0.8, stretch: 1.6 }[g.kind];
    const u = g.t / D, s = Math.sin(Math.PI * Math.min(1, u));
    if (u >= 1) { this.gest = null; return; }
    switch (g.kind) {
      case 'look':   /* looks around: up-left then down-right */
        head.rot += Math.sin(u * TAU) * 0.13; this.look.tx = -Math.sin(u * TAU) * 0.8; this.look.until = performance.now() + 300; break;
      case 'paw':    /* waves the front paw */
        bo[B.legFR].rot -= s * 0.32 + Math.sin(g.t * 16) * 0.08 * s; bo[B.legFL].rot -= s * 0.15; break;
      case 'swish':  /* big tail swish */
        bo[B.tail1].rot += Math.sin(g.t * 9) * 0.22 * s; bo[B.tail2].rot += Math.sin(g.t * 9 - 0.8) * 0.3 * s; bo[B.tail3].rot += Math.sin(g.t * 9 - 1.6) * 0.3 * s;
        this.acc.ember += dt * 30; break;
      case 'hop':
        root.oy -= Math.sin(u * Math.PI) * 60; body.sy *= 1 + 0.05 * s; break;
      case 'roar':   /* mini roar: head back, jaw wide, sparks */
        head.rot -= s * 0.1; bo[B.jaw].rot += s * 0.14; if (u > 0.3 && u < 0.7) this.acc.ember += dt * 60; break;
      case 'ears':
        bo[B.earL].rot += Math.sin(g.t * 30) * 0.2 * s; bo[B.earR].rot -= Math.sin(g.t * 30) * 0.22 * s; break;
      case 'stretch':
        body.sx *= 1 + 0.06 * s; body.sy *= 1 - 0.04 * s; head.rot -= 0.08 * s;
        bo[B.legFL].rot -= 0.3 * s; bo[B.legFR].rot -= 0.3 * s; bo[B.legBA].rot += 0.25 * s; bo[B.legBB].rot += 0.25 * s; break;
    }
  }

  _ring() {
    const c = apply(this.world[B.root], 560, 760), n = this.reduced ? 24 : 46;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      this.sparks.emit(c[0] + Math.cos(a) * 330, c[1] + Math.sin(a) * 70, -Math.sin(a) * 260, Math.cos(a) * 60 - 60, 0.9, 60, 2);
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
    if (this.ready) this.renderer.render(this.scene, this.camera);
  }

  _update(dt) {
    this.t += dt;
    const t = this.t, p = this.p, tp = this.tp, tr = this.tr, S = this.sparks, bo = this.bones;
    const k = Math.min(1, dt * 5);
    for (const key in tp) p[key] += (tp[key] - p[key]) * k;
    for (const key in tr) if (tr[key] >= 0) { tr[key] += dt; if (tr[key] > DUR[key]) tr[key] = -1; }
    for (const b of bo) { b.ox = 0; b.oy = 0; b.rot = 0; b.sx = 1; b.sy = 1; }

    const L = this.look;
    if (performance.now() > L.until) { L.tx = 0; L.ty = 0; }
    const lk = Math.min(1, dt * 6); L.x += (L.tx - L.x) * lk; L.y += (L.ty - L.y) * lk;

    /* blink */
    const bl = this.blink; let blinkF = 0;
    bl.next -= dt;
    if (bl.next <= 0 && bl.t < 0) { bl.t = 0; bl.next = 2.2 + Math.random() * 3.5; }
    if (bl.t >= 0) { bl.t += dt; const u = bl.t / 0.18; if (u >= 1) bl.t = -1; else blinkF = Math.sin(u * Math.PI); }
    /* ear twitch */
    const et = this.ear; let earTw = 0;
    et.next -= dt;
    if (et.next <= 0 && et.t < 0) { et.t = 0; et.side = Math.random() < 0.5 ? 0 : 1; et.next = 2.5 + Math.random() * 4; }
    if (et.t >= 0) { et.t += dt; const u = et.t / 0.35; if (u >= 1) et.t = -1; else earTw = Math.sin(u * Math.PI * 2) * Math.sin(u * Math.PI); }

    const cl = this.charge.on ? this.charge.level : 0;
    const root = bo[B.root], body = bo[B.body], head = bo[B.head], jaw = bo[B.jaw];

    /* whole body: hover + bob + sway */
    root.oy = p.hover + Math.sin(t * 1.6) * p.bob + cl * 30;
    root.rot = Math.sin(t * 0.9) * p.sway;
    let flip = 1;
    if (tr.happy >= 0) {
      const u = tr.happy / DUR.happy, hop = Math.sin(u * Math.PI);
      root.oy -= hop * 90;
      const sq = u < 0.12 ? Math.sin(u / 0.12 * Math.PI) : 0;
      body.sy = 1 - sq * 0.08 + hop * 0.04; body.sx = 1 + sq * 0.06 - hop * 0.02;
      root.rot += Math.sin(u * TAU * 2) * 0.08 * hop;
      head.rot += Math.sin(u * TAU * 3) * 0.07;
    }
    if (tr.fly >= 0) {
      const u = tr.fly / DUR.fly, a = u * TAU, wv = sstep(0, 0.1, u) * (1 - sstep(0.9, 1, u));
      root.ox += Math.sin(a) * 330 * wv;
      root.oy += (-Math.sin(u * Math.PI) * 170 - Math.sin(2 * a) * 50) * wv;
      const vx = Math.cos(a);                      /* bank into the turn (no mirroring) */
      root.rot += -vx * 0.12 * wv;
      const depth = 1 - 0.14 * (1 - Math.cos(a)) * 0.5 * wv;
      root.sx = depth; root.sy = depth;
      root.rot += -0.18 * Math.sin(2 * a) * wv;
      this.acc.trail += dt * (this.reduced ? 28 : 60);
    }
    let breathOn = 0, jawAdd = 0;
    if (tr.fire >= 0) {
      const u = tr.fire;
      if (u < 0.4) { const s = sstep(0, 0.38, u); head.rot -= 0.13 * s; body.sy *= 1 + 0.04 * s; body.sx *= 1 + 0.03 * s; jawAdd -= 0.1 * s; }
      else if (u < 1.2) {
        const s = sstep(0.4, 0.5, u);
        head.rot += 0.05 * s; jawAdd += 0.12 * s; breathOn = s * (1 - sstep(1.05, 1.2, u));
        root.ox -= 22 * Math.sin(((u - 0.4) / 0.8) * Math.PI); root.ox += (Math.random() - 0.5) * 4;
      }
    }
    this._breathT = breathOn > 0 ? (this._breathT || 0) + dt : 0;
    if (tr.error >= 0) head.rot += Math.sin(tr.error * 26) * 0.1 * (1 - tr.error / DUR.error);
    if (tr.touch >= 0) {
      const u = tr.touch / DUR.touch, s = Math.sin(u * Math.PI);
      const sq = u < 0.25 ? Math.sin(u / 0.25 * Math.PI) : 0;
      head.rot += this.touchSide * 0.16 * s; body.sy *= 1 - 0.09 * sq + 0.04 * s; body.sx *= 1 + 0.06 * sq;
      root.oy -= 45 * Math.sin(u * Math.PI) * (u > 0.15 ? 1 : 0); root.rot += this.touchSide * 0.05 * s;
    }
    let yawn = 0;
    if (tr.wake >= 0) { const u = tr.wake / DUR.wake; yawn = Math.sin(u * Math.PI); head.rot -= 0.1 * yawn; body.sy *= 1 + 0.05 * yawn; }
    if (cl > 0) { body.sy *= 1 - cl * 0.07; body.sx *= 1 + cl * 0.04; head.rot += cl * 0.05; if (cl > 0.6) root.ox += (Math.random() - 0.5) * (cl - 0.6) * 14; }
    root.sx *= flip;

    /* breathing */
    const br = Math.sin(t * p.breath);
    body.sy *= 1 + br * 0.03; body.sx *= 1 + br * 0.015;

    /* head: mood angle + look + sway */
    head.rot += p.head + L.y * 0.08 + Math.sin(t * 0.7) * 0.05 - br * 0.015;
    head.ox += L.x * 8; head.oy += L.y * 5;
    jaw.rot = clamp(p.jaw + jawAdd + Math.sin(t * 1.3) * 0.02 - yawn * 0.05 + 0.12 * yawn, -0.45, 0.2);
    bo[B.earL].rot = p.ear * -1 + (et.side === 0 ? earTw * 0.18 : 0) + Math.sin(t * 1.1) * 0.015;
    bo[B.earR].rot = p.ear + (et.side === 1 ? earTw * 0.2 : 0);

    /* tail wave travels from the base to the flame ball */
    const tSpd = p.tailSpd;
    bo[B.tail1].rot = Math.sin(t * tSpd) * p.tail;
    bo[B.tail2].rot = Math.sin(t * tSpd - 0.7) * p.tail * 1.3;
    bo[B.tail3].rot = Math.sin(t * tSpd - 1.4) * p.tail * 1.0;
    /* paddling legs (mid-leap pose) */
    const ls = t * p.legSpd;
    bo[B.legFL].rot = Math.sin(ls) * p.leg - cl * 0.1;
    bo[B.legFR].rot = Math.sin(ls + Math.PI * 0.8) * p.leg * 0.9 - cl * 0.12;
    bo[B.legBA].rot = Math.sin(ls + Math.PI) * p.leg * 0.8 + cl * 0.1;
    bo[B.legBB].rot = Math.sin(ls + Math.PI * 0.3) * p.leg * 0.8 + cl * 0.08;

    this._gesture(dt, bo, head, root, body);

    /* bone matrices */
    for (let i = 0; i < NB; i++) {
      const [, par, px, py] = BONES[i], b = bo[i];
      const l = local(px, py, b.ox, b.oy, b.rot, b.sx, b.sy);
      this.world[i] = par < 0 ? l : mul(this.world[par], l);
      const m = this.world[i];
      this.uB[i * 2].set(m[0], m[2], m[4]); this.uB[i * 2 + 1].set(m[1], m[3], m[5]);
    }
    const setM = (mesh, m) => { const u = mesh.material.uniforms.uM.value; u[0].set(m[0], m[2], m[4]); u[1].set(m[1], m[3], m[5]); };
    setM(this.breath, this.world[B.head]);
    setM(this.swirl, this.world[B.root]);

    /* shader state */
    const fl = p.flame * (1 + cl * 0.8);
    const cu = this.charMat.uniforms;
    cu.uTime.value = t; cu.uFlame.value = fl; cu.uDistort.value = this.reduced ? 0.5 : 1;
    const lid = clamp(Math.max(p.eye, blinkF) + (cl > 0.3 ? 0.2 : 0), 0, 1);
    cu.uBlink.value.set(lid, lid);
    cu.uLook.value.set(L.x * flip, L.y - (this.mood === 'THINKING' ? 0.8 : 0));
    cu.uBright.value = 1 + cl * 0.12 + breathOn * 0.08;
    cu.uTint.value.set(cl * 0.08 + breathOn * 0.05, cl * 0.025, 0);
    const bu = this.breath.material.uniforms;
    bu.uTime.value = t; bu.uAlpha.value = breathOn; bu.uReveal.value = Math.min(1.15, this._breathT * 5);
    const su = this.swirl.material.uniforms;
    let ring = p.swirl;
    if (tr.happy >= 0) ring = Math.max(ring, Math.sin((tr.happy / DUR.happy) * Math.PI));
    su.uTime.value = t; su.uAlpha.value = clamp(ring * (0.85 + 0.15 * Math.sin(t * 5)) + cl * 0.5, 0, 1);

    /* particles */
    const red = this.reduced ? 0.45 : 1, hw = this.world[B.head];
    this.acc.ember += dt * 14 * fl * red;
    while (this.acc.ember >= 1) {
      this.acc.ember -= 1;
      const r = Math.random();
      const sp = r < 0.6 ? [380 + Math.random() * 300, 40 + Math.random() * 240] : [80 + Math.random() * 220, 230 + Math.random() * 170];
      const q = apply(r < 0.6 ? hw : this.world[B.tail3], sp[0], sp[1]);
      S.emit(q[0], q[1], (Math.random() - 0.5) * 60, -(140 + Math.random() * 140), 1.0 + Math.random() * 0.7, 14 + Math.random() * 14, 2);
    }
    if (breathOn > 0.3) {
      this.acc.breath += dt * (this.reduced ? 70 : 160) * breathOn;
      const o = apply(hw, MOUTH[0], MOUTH[1]), e = apply(hw, MOUTH[0] + 100, MOUTH[1] - 32);
      const dx = (e[0] - o[0]) / 105, dy = (e[1] - o[1]) / 105;
      while (this.acc.breath >= 1) {
        this.acc.breath -= 1;
        const s = 700 + Math.random() * 450;
        S.emit(o[0] + dx * 20, o[1] + dy * 20, dx * s + (Math.random() - 0.5) * 120, dy * s + (Math.random() - 0.5) * 120, 0.35 + Math.random() * 0.25, 60 + Math.random() * 50, 0);
      }
    }
    if (this.acc.trail >= 1) {
      const c = apply(this.world[B.body], 560, 600);
      while (this.acc.trail >= 1) {
        this.acc.trail -= 1;
        S.emit(c[0] + (Math.random() - 0.5) * 260, c[1] + (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 50, 30, 0.5 + Math.random() * 0.4, 60 + Math.random() * 40, 0);
      }
    }
    if (cl > 0) {
      this.acc.charge += dt * (40 + cl * 140) * red;
      const c = apply(this.world[B.body], 600, 520);
      while (this.acc.charge >= 1) {
        this.acc.charge -= 1;
        const a = Math.random() * TAU, r = 380 + Math.random() * 120, life = 0.45;
        const ox = Math.cos(a) * r, oy = Math.sin(a) * r * 0.8;
        S.emit(c[0] + ox, c[1] + oy, -ox / life, -oy / life, life, 34 + Math.random() * 16, 3);
      }
    }
    if (this.mood === 'THINKING') {
      this.acc.think += dt * 30 * red;
      const c = apply(hw, 700, 120);
      while (this.acc.think >= 1) {
        this.acc.think -= 1;
        const a = t * 3.2 + Math.random() * 0.3;
        S.emit(c[0] + Math.cos(a) * 260, c[1] - 60 + Math.sin(a) * 50, 0, -15, 0.5, 44, 3);
      }
    }

    /* Z's while sleeping */
    const sl = this.mood === 'SLEEP', zc = apply(hw, 880, 120);
    for (const z of this.zs) {
      const u = (t * 0.35 + z.ph) % 1;
      z.sp.position.set(zc[0] + 40 + u * 90, -(zc[1] - 20 - u * 200), 0);
      const s = 40 + u * 50; z.sp.scale.set(s, s, 1);
      z.sp.material.opacity += ((sl ? Math.sin(u * Math.PI) : 0) - z.sp.material.opacity) * Math.min(1, dt * 4);
    }

    S.update(dt);
  }
}

FT.Puppet = Puppet;
