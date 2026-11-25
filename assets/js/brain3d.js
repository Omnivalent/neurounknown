// NeuroUnknown 3D brain viewer, version 2. Meshes: website/assets/brain3d (built by src/neurounknown/build_brain3d.py from the
// several atlases in ICBM 2009 space; cranial nerve nuclei are schematic ellipsoids). Population-average anatomy.
import * as THREE from 'three';
import { OrbitControls } from './three/OrbitControls.js';
import { RoomEnvironment } from './three/RoomEnvironment.js';

let DATA = null;
async function loadData() {
  if (DATA) return DATA;
  const [m, b] = await Promise.all([
    fetch('assets/brain3d/brain.json').then(r => { if (!r.ok) throw new Error('manifest ' + r.status); return r.json(); }),
    fetch('assets/brain3d/brain.bin').then(r => { if (!r.ok) throw new Error('mesh ' + r.status); return r.arrayBuffer(); })
  ]);
  let fb = null;
  if (m.fibers && m.fibers.length) { try { const r = await fetch('assets/brain3d/fibers.bin'); if (r.ok) fb = await r.arrayBuffer(); } catch (e) { /* fibres are optional */ } }
  DATA = { manifest: m, buf: b, fbuf: fb };
  return DATA;
}
// MNI (x right, y anterior, z superior) -> three (x, y up, z towards the viewer at the front)
function geometryFor(me, buf) {
  const q = new Int16Array(buf.slice(me.vo, me.vo + me.nv * 6)), pos = new Float32Array(me.nv * 3);
  for (let i = 0; i < me.nv; i++) { pos[3 * i] = q[3 * i] / 20; pos[3 * i + 1] = q[3 * i + 2] / 20; pos[3 * i + 2] = -q[3 * i + 1] / 20; }
  const n = me.nf * 3, raw = buf.slice(me.fo, me.fo + n * me.ix);
  const idx = me.ix === 2 ? new Uint16Array(raw) : new Uint32Array(raw);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  if (me.xo !== undefined) { // realistic cortex: shipped normals (no seams between structures) + baked sulcal shading
    const x = new Int8Array(buf, me.xo, me.nv * 4), u = new Uint8Array(buf, me.xo, me.nv * 4);
    const nrm = new Float32Array(me.nv * 3), ao = new Float32Array(me.nv), col = new Float32Array(me.nv * 3);
    for (let i = 0; i < me.nv; i++) {
      nrm[3 * i] = x[4 * i] / 127; nrm[3 * i + 1] = x[4 * i + 2] / 127; nrm[3 * i + 2] = -x[4 * i + 1] / 127;
      ao[i] = u[4 * i + 3] / 255; col[3 * i] = col[3 * i + 1] = col[3 * i + 2] = ao[i];
    }
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.userData = { ao, net: new Uint8Array(buf.slice(me.wo, me.wo + me.nv)) };
  } else g.computeVertexNormals();
  if (me.ao !== undefined && me.xo === undefined) { // v2.10 crease shading baked per vertex for deep structures and brainstem
    const u = new Uint8Array(buf, me.ao, me.nv), col = new Float32Array(me.nv * 3);
    for (let i = 0; i < me.nv; i++) col[3 * i] = col[3 * i + 1] = col[3 * i + 2] = u[i] / 255;
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  if (me.no !== undefined) { // v2.9 nerve fibres: distance along the nerve, angle around it (cos, sin) and radius
    const sv = new Uint16Array(buf, me.no, me.nv), o2 = me.no + me.nv * 2 + ((me.nv * 2) % 4 ? 2 : 0);
    const x = new Int8Array(buf, o2, me.nv * 4), u = new Uint8Array(buf, o2, me.nv * 4);
    const aS = new Float32Array(me.nv), aCS = new Float32Array(me.nv * 2), aR = new Float32Array(me.nv);
    for (let i = 0; i < me.nv; i++) { aS[i] = sv[i] / 10 - 3; aCS[2 * i] = x[4 * i] / 127; aCS[2 * i + 1] = x[4 * i + 1] / 127; aR[i] = u[4 * i + 2] / 40; }
    g.setAttribute('aS', new THREE.BufferAttribute(aS, 1)); g.setAttribute('aCS', new THREE.BufferAttribute(aCS, 2)); g.setAttribute('aRad', new THREE.BufferAttribute(aR, 1));
  }
  return g;
}
// v2.9 nerves as bundles of fibres: fascicles that twist gently along the nerve, fine fibres inside each fascicle, and soft
// signals travelling along the fibres: away from the brainstem in motor nerves, towards it in sensory nerves, both ways in mixed.
const NV_U = { uTime: { value: 0 }, uFlow: { value: 1 } };
const NERVE_DIR = { nerve1: 1, nerve2: -1, optic_tract: 1, nerve3: 1, nerve4: 1, nerve5: 0, nerve6: 1, nerve7: 0, nerve8: -1, nerve9: 0, nerve10: 0, nerve11: 1, nerve12: 1 };
function nerveMaterial(id) {
  const mat = new THREE.MeshPhysicalMaterial({ color: '#efe6cf', roughness: 0.5, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.3, sheenRoughness: 0.5, sheenColor: new THREE.Color('#fff2d6'), transparent: true, opacity: 1 });
  const dir = NERVE_DIR[id] === undefined ? 1 : NERVE_DIR[id];
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = NV_U.uTime; sh.uniforms.uFlow = NV_U.uFlow; sh.uniforms.uDir = { value: dir };
    sh.vertexShader = 'attribute float aS; attribute vec2 aCS; attribute float aRad; varying float vS; varying vec2 vCS; varying float vRad;\n' +
      sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vS = aS; vCS = aCS; vRad = aRad;');
    sh.fragmentShader = 'uniform float uTime; uniform float uFlow; uniform float uDir; varying float vS; varying vec2 vCS; varying float vRad;\n' +
      sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float uu = atan(vCS.y, vCS.x) / 6.2831853;
      float nf = max(5.0, floor(vRad * 9.0 + 0.5));            // fascicles around the nerve (more in thick nerves)
      float a = (uu + vS * 0.028) * nf;                          // gentle twist along the nerve
      float fi = floor(a), fr = fract(a);
      float wa = fwidth(a);                                      // fade the pattern where it gets finer than a pixel (no shimmer)
      float groove = mix(smoothstep(0.0, 0.2, fr) * smoothstep(1.0, 0.8, fr), 0.8, clamp((wa - 0.12) * 4.0, 0.0, 1.0));
      float fine = mix(0.5 + 0.5 * sin(6.2831853 * (a * 3.0 + 0.35 * sin(vS * 0.7 + fi * 1.9))), 0.5, clamp((wa * 3.0 - 0.15) * 3.0, 0.0, 1.0));
      float hh = fract(sin(fi * 127.1 + nf * 3.7) * 43758.5453);
      diffuseColor.rgb *= mix(0.93, 1.0, groove) * mix(0.99, 1.01, fine);
      float nvH = groove;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { vec3 p = -vViewPosition; vec3 sx = dFdx(p), sy = dFdy(p); float hx = dFdx(nvH), hy = dFdy(nvH);
        vec3 r1 = cross(sy, normal), r2 = cross(normal, sx); float det = dot(sx, r1);
        normal = normalize(abs(det) * normal - sign(det) * (hx * r1 + hy * r2) * 0.22); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float d = uDir == 0.0 ? (hh < 0.5 ? 1.0 : -1.0) : uDir;
      float ph = fract(d * (vS / 26.0) - uTime * (0.22 + 0.16 * hh) + hh);
      float sig = smoothstep(0.0, 0.06, ph) * (1.0 - smoothstep(0.06, 0.34, ph));
      totalEmissiveRadiance += diffuseColor.rgb * sig * 0.5 * uFlow * groove * fine;`);
  };
  mat.customProgramCacheKey = () => 'nerve-v5-' + dir;
  return mat;
}
// Yeo 7 networks (Yeo et al. 2011; Schaefer et al. 2018 parcellation), conventional colours
const NODE_TEX = {};
function nodeTex(col) {
  if (NODE_TEX[col]) return NODE_TEX[col];
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const halo = g.createRadialGradient(32, 32, 10, 32, 32, 31); halo.addColorStop(0, col + '88'); halo.addColorStop(1, col + '00');
  g.fillStyle = halo; g.beginPath(); g.arc(32, 32, 31, 0, 7); g.fill();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(32, 32, 17, 0, 7); g.fill();
  g.fillStyle = col; g.beginPath(); g.arc(32, 32, 13, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (NODE_TEX[col] = t);
}
function glowTex(col) {
  const key = 'g' + col; if (NODE_TEX[key]) return NODE_TEX[key];
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 31); r.addColorStop(0, '#ffffff'); r.addColorStop(0.3, col + 'ee'); r.addColorStop(1, col + '00');
  g.fillStyle = r; g.beginPath(); g.arc(32, 32, 31, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (NODE_TEX[key] = t);
}
// Fibre lines: smooth streamlines (tracts) or strands (nerves). Colour = focus colour, or the standard diffusion colour code
// (red left-right, green front-back, blue up-down) mixed in by uDec. A soft light travels along each fibre.
function fiberMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOp: { value: 0 }, uCol: { value: new THREE.Color('#ffffff') }, uDec: { value: 1 }, uFlow: { value: 1 }, uDark: { value: 0 } },
    vertexShader: `attribute float aT; attribute float aR; attribute vec3 aDir; varying float vT; varying float vR; varying vec3 vDir;
      #include <clipping_planes_pars_vertex>
      void main(){ vT = aT; vR = aR; vDir = aDir; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
      #include <clipping_planes_vertex>
      }`,
    fragmentShader: `uniform float uTime; uniform float uOp; uniform vec3 uCol; uniform float uDec; uniform float uFlow; uniform float uDark; varying float vT; varying float vR; varying vec3 vDir;
      #include <clipping_planes_pars_fragment>
      void main(){
      #include <clipping_planes_fragment>
        vec3 dec = abs(vDir); dec = dec / max(max(dec.r, dec.g), max(dec.b, 0.001));
        dec = mix(dec * 0.82 + 0.06, dec * 0.95 + 0.05, uDark);
        vec3 c = mix(uCol, dec, uDec);
        float p = fract(vT * 2.2 - uTime * 0.18 + vR);
        float h = smoothstep(0.78, 0.97, p) * (1.0 - smoothstep(0.97, 1.0, p)) * uFlow;
        float edge = smoothstep(0.0, 0.06, vT) * smoothstep(0.0, 0.06, 1.0 - vT);
        gl_FragColor = vec4(mix(c, vec3(1.0), h * 0.65), uOp * (0.5 + 0.5 * h) * (0.35 + 0.65 * edge));
      }`,
    transparent: true, depthWrite: false, clipping: true
  });
}
function fiberObject(fe, buf) {
  const q = new Int16Array(buf, fe.po, fe.np * 3), ln = new Uint16Array(buf, fe.lo, fe.nf);
  const n = fe.np, pos = new Float32Array(n * 3), aT = new Float32Array(n), aR = new Float32Array(n), aDir = new Float32Array(n * 3), idx = [];
  for (let i = 0; i < n; i++) { pos[3 * i] = q[3 * i] / 20; pos[3 * i + 1] = q[3 * i + 2] / 20; pos[3 * i + 2] = -q[3 * i + 1] / 20; }
  let o = 0;
  for (let f = 0; f < fe.nf; f++) {
    const L = ln[f], r = Math.random();
    for (let j = 0; j < L; j++) {
      const i = o + j, a = Math.max(o, i - 1), b = Math.min(o + L - 1, i + 1);
      const dx = q[3 * b] - q[3 * a], dy = q[3 * b + 1] - q[3 * a + 1], dz = q[3 * b + 2] - q[3 * a + 2], d = Math.hypot(dx, dy, dz) || 1;
      aDir[3 * i] = dx / d; aDir[3 * i + 1] = dy / d; aDir[3 * i + 2] = dz / d; aT[i] = L > 1 ? j / (L - 1) : 0; aR[i] = r;
      if (j < L - 1) idx.push(i, i + 1);
    }
    o += L;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
  g.setAttribute('aR', new THREE.BufferAttribute(aR, 1)); g.setAttribute('aDir', new THREE.BufferAttribute(aDir, 3));
  g.setIndex(n > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  const L = new THREE.LineSegments(g, fiberMaterial()); L.renderOrder = 6; L.frustumCulled = false; L.visible = false; L.userData.kind = fe.kind;
  return L;
}
// v2.9 arteries: separate file, loaded the first time they are shown. Flow coordinate per vertex (mm along the vessel from the
// internal carotid or vertebral artery) drives a soft travelling pulse, so the blood visibly flows from the heart outwards.
let ART = null;
async function loadArteries(m) {
  if (ART) return ART;
  if (!m.arteries) return null;
  const r = await fetch('assets/brain3d/' + m.arteries.file); if (!r.ok) throw new Error('arteries ' + r.status);
  ART = { mf: m.arteries, buf: await r.arrayBuffer() }; return ART;
}
function arteryGeometry(me, buf) {
  const g = geometryFor(me, buf), q = new Uint16Array(buf, me.so, me.nv), f = new Float32Array(me.nv);
  for (let i = 0; i < me.nv; i++) f[i] = q[i] / 10;
  g.setAttribute('aFlow', new THREE.BufferAttribute(f, 1)); return g;
}
const ART_U = { uTime: { value: 0 }, uPulse: { value: 1 } };
function arteryMaterial() {
  const mat = new THREE.MeshPhysicalMaterial({ color: '#b3262e', roughness: 0.34, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.28, sheen: 0.25, sheenColor: new THREE.Color('#ff9a8a'), transparent: true, opacity: 1 });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = ART_U.uTime; sh.uniforms.uPulse = ART_U.uPulse;
    sh.vertexShader = 'attribute float aFlow; varying float vFlow;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vFlow = aFlow;');
    sh.fragmentShader = 'uniform float uTime; uniform float uPulse; varying float vFlow;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      // a pulse wave every second, travelling outwards at about 90 mm/s, plus a faint steady glow
      float ph = fract(uTime * 1.0 - vFlow / 90.0);
      float wave = smoothstep(0.0, 0.08, ph) * (1.0 - smoothstep(0.08, 0.42, ph));
      totalEmissiveRadiance += diffuseColor.rgb * (0.10 + 0.55 * wave) * uPulse;`);
  };
  mat.customProgramCacheKey = () => 'artery-v1';
  return mat;
}
// v2.10 tissue look for every structure mesh (not arteries or nerves): a fine procedural micro-relief (bump from 3D noise in
// millimetres), a slight colour mottling, a soft rim light (tissue looks a little translucent at grazing angles), and a gentle
// breathing glow on the selected structure. Purely visual: it does not change any shape.
const TS_U = { uTime: { value: 0 } };
const GLSL_NOISE = `
float nuH3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float nuVN(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(nuH3(i), nuH3(i + vec3(1,0,0)), f.x), mix(nuH3(i + vec3(0,1,0)), nuH3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(nuH3(i + vec3(0,0,1)), nuH3(i + vec3(1,0,1)), f.x), mix(nuH3(i + vec3(0,1,1)), nuH3(i + vec3(1,1,1)), f.x), f.y), f.z); }
vec3 nuBump(vec3 n, float h, float k){ vec3 p = -vViewPosition; vec3 sx = dFdx(p), sy = dFdy(p); float hx = dFdx(h), hy = dFdy(h);
  vec3 r1 = cross(sy, n), r2 = cross(n, sx); float det = dot(sx, r1); vec3 g = sign(det) * (hx * r1 + hy * r2);
  return normalize(abs(det) * n - g * k); }`;
function tissueMaterial(mat, opts) {
  const o = opts || {}, relief = o.relief == null ? 0.5 : o.relief, scale = o.scale || 1;
  mat.userData.selAmp = { value: 0 };
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = TS_U.uTime; sh.uniforms.uSel = mat.userData.selAmp;
    sh.vertexShader = 'varying vec3 vPosO;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vPosO = position;');
    sh.fragmentShader = 'uniform float uTime; uniform float uSel; varying vec3 vPosO;\n' + sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + GLSL_NOISE)
      .replace('#include <color_fragment>', `#include <color_fragment>
      float tH = nuVN(vPosO * ${(0.55 * scale).toFixed(3)}) * 0.62 + nuVN(vPosO * ${(1.9 * scale).toFixed(3)}) * 0.38;
      diffuseColor.rgb *= (0.95 + 0.09 * tH) * vec3(${o.tone || '1.0, 1.0, 1.0'});`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      normal = nuBump(normal, tH, ${relief.toFixed(3)});`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float rim = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.6);
      totalEmissiveRadiance += diffuseColor.rgb * rim * 0.16;
      totalEmissiveRadiance += diffuseColor.rgb * uSel * (0.16 + 0.12 * sin(uTime * 2.2));`);
  };
  mat.customProgramCacheKey = () => 'tissue-v3-' + relief + '-' + scale + '-' + (o.tone || '');
  return mat;
}
export const NETCOL = ['#000000', '#781180', '#4682b4', '#00760e', '#c43afa', '#b8cf6e', '#e69422', '#cd3e4e'];
function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#888'; }
const CORTEX = { frontal: 1, parietal: 1, temporal: 1, occipital: 1, limbic: 1, insula: 1 };
const HIDDEN = { 'white matter': 1, ventricles: 1 }; // shown only when selected
// structures kept in the 'cranial nerves + brainstem' view
const LAYER_OF = { frontal: 'cortex', parietal: 'cortex', temporal: 'cortex', occipital: 'cortex', limbic: 'cortex', insula: 'cortex', 'basal ganglia': 'deep', subcortical: 'deep', brainstem: 'brainstem', cerebellum: 'cerebellum', 'cranial nerves': 'nerves', arteries: 'arteries' };
const ISO = { midbrain: 1, pons: 1, medulla: 1, ventral_dc: 1, optic_chiasm: 1, lgn: 1 };

class Brain {
  constructor(el, opts) {
    this.el = el; this.opts = opts || {}; this.meshes = []; this.byId = {};
    this.focus = {}; this.sel = null; this.cut = false; this.cortexMode = 2; this.nerveMode = (opts && opts.nerves) || 'hide';
    this.info = this.opts.structures || {}; // id -> {lobe, tint}
  }
  async init() {
    const { manifest, buf } = await loadData(); this.mf = manifest;
    const W = this.el.clientWidth, H = this.el.clientHeight;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.setSize(W, H); r.localClippingEnabled = true;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.12; // v2.10: filmic response, no blown-out whites
    this.el.appendChild(r.domElement); r.domElement.style.touchAction = 'none';
    if (this.opts.labels) { const lb = this.lab = document.createElement('div'); lb.className = 'b3lab'; lb.innerHTML = '<i></i><b></b><span></span>'; this.el.appendChild(lb); }
    const s = this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, W / H, 1, 3000);
    // soft studio lighting: image-based light from a neutral room + a key light that follows the camera
    try { const pm = new THREE.PMREMGenerator(r); s.environment = pm.fromScene(new RoomEnvironment(r), 0.04).texture; s.environmentIntensity = 0.4; pm.dispose(); } catch (e) { /* older GPUs: lights only */ }
    s.add(new THREE.HemisphereLight(0xfffaf2, 0x5a5550, 0.9));
    const key = this.key = new THREE.DirectionalLight(0xffffff, 1.4); s.add(key); s.add(key.target);
    const d2 = new THREE.DirectionalLight(0xffffff, 0.45); d2.position.set(300, -100, -300); s.add(d2);
    this.clip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
    const group = this.group = new THREE.Group(); s.add(group);
    for (const me of manifest.meshes) {
      const g = geometryFor(me, buf);
      const real = me.xo !== undefined, nerve = (this.info[me.id] || {}).lobe === 'cranial nerves';
      const mat = me.no !== undefined ? nerveMaterial(me.id) : tissueMaterial(new THREE.MeshPhysicalMaterial({ color: '#bbb', roughness: real ? 0.7 : 0.6, metalness: 0, clearcoat: real ? 0 : 0.22, clearcoatRoughness: 0.5, sheen: real ? 0.15 : 0.2, sheenRoughness: 0.6, sheenColor: new THREE.Color('#fff4ea'), transparent: true, opacity: 1, vertexColors: real || me.ao !== undefined }), { relief: real ? 0.35 : 0.16, scale: real ? 1 : 0.6, tone: real ? null : '0.7, 0.66, 0.62' });
      if (me.side === 'M') mat.side = THREE.DoubleSide;
      const m = new THREE.Mesh(g, mat); m.userData = { id: me.id, side: me.side, real };
      group.add(m); this.meshes.push(m); (this.byId[me.id] = this.byId[me.id] || []).push(m);
    }
    if (DATA.fbuf) for (const fe of manifest.fibers) {
      const host = (this.byId[fe.id] || []).find(m => m.userData.side === fe.side); if (!host) continue;
      const L = fiberObject(fe, DATA.fbuf); host.add(L); host.userData.fib = L; this.fibs = this.fibs || []; this.fibs.push(L);
    }
    const box = new THREE.Box3().setFromObject(group);
    this.center = box.getCenter(new THREE.Vector3()); this.radius = box.getSize(new THREE.Vector3()).length() / 2;
    const c = this.controls = new OrbitControls(this.camera, r.domElement);
    c.enableDamping = true; c.dampingFactor = 0.08; c.target.copy(this.center); c.minDistance = this.radius * 0.7; c.maxDistance = this.radius * 6;
    c.rotateSpeed = 0.7; c.zoomSpeed = 0.9;
    // calm rotation while nobody touches the brain (off for reduced-motion users and where opts.autoRotate is false)
    const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.idleOK = this.opts.autoRotate !== false && !still; NV_U.uFlow.value = still ? 0 : 1; c.autoRotateSpeed = 0.55; this.lastTouch = performance.now();
    const touch = () => { this.lastTouch = performance.now(); c.autoRotate = false; this.flight = null; };
    c.addEventListener('start', touch); c.addEventListener('end', touch);
    r.domElement.addEventListener('wheel', touch, { passive: true });
    this.view('left');
    this.ray = new THREE.Raycaster(); this.ptr = new THREE.Vector2();
    let down = null;
    r.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
    r.domElement.addEventListener('pointerup', e => { if (down && Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) < 6) { this.pick(e, true); this.hover(null); } down = null; });
    r.domElement.addEventListener('pointermove', e => { if (!down && e.pointerType === 'mouse') this.pick(e, false); });
    r.domElement.addEventListener('pointerleave', () => { this.hover(null); });
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(this.el);
    window.addEventListener('nu-theme', () => this.apply());
    this.apply(); this.ready = true;
    if (this.opts.assemble && !still) this.assemble();
    let prev = performance.now();
    const loop = () => {
      this.raf = requestAnimationFrame(loop); if (this.paused) return;
      const now = performance.now(), dt = Math.min(0.1, (now - prev) / 1000); prev = now;
      c.autoRotate = this.idleOK && !this.holdRotate && now - this.lastTouch > 5000 && !document.hidden;
      c.update(dt);
      this.key.position.copy(this.camera.position).add(this.camera.up.clone().multiplyScalar(this.radius * 1.2)); this.key.target.position.copy(c.target);
      if (this.flows) this.tickFlows(dt);
      if (this.tweening) this.tickTween(now);
      if (this.assembling) this.tickAssemble(now);
      if (this.flight) this.tickFly(now);
      if (this.nodeGroup) this.tickNodes(now);
      if (this.fibs) this.tickFibs(now, dt);
      if (this.arts) ART_U.uTime.value = now / 1000;
      NV_U.uTime.value = now / 1000; TS_U.uTime.value = now / 1000;
      if (this.netTw) this.tickNet(now);
      if (this.lab) this.placeLabel();
      r.render(s, this.camera);
    };
    loop();
    return this;
  }
  resize() { const W = this.el.clientWidth, H = this.el.clientHeight; if (!W || !H) return; this.renderer.setSize(W, H); this.camera.aspect = W / H; this.camera.updateProjectionMatrix(); }
  view(name) {
    const d = this.radius * 2.6, c = this.center;
    const v = { left: [-d, 0, 0], right: [d, 0, 0], top: [0, d, 0.01], front: [0, 0, -d], back: [0, 0, d], below: [0, -d, -0.01], medial: [d, 0, 0] }[name] || [-d, 0, 0];
    const off = new THREE.Vector3(v[0], v[1] + (name === 'left' || name === 'right' || name === 'medial' ? d * 0.1 : 0), v[2]);
    this.camera.up.set(0, 1, 0);
    if (this.ready && this.controls) { this.fly(c, off.length(), off, 1000); this.framed = false; return; }
    this.camera.position.copy(c).add(off); this.camera.lookAt(c); if (this.controls) { this.controls.target.copy(c); this.controls.update(); }
    this.touch();
  }
  // turn to a named viewing direction while keeping the current (or planned) target and distance
  look(name) {
    const v = { left: [-1, 0.1, 0], right: [1, 0.1, 0], top: [0, 1, 0.01], front: [0, 0, -1], back: [0, 0, 1], below: [0, -1, -0.01] }[name]; if (!v || !this.controls) return;
    const t = this.flight ? this.flight.tt : this.controls.target.clone(), d = this.flight ? this.flight.dist : this.camera.position.distanceTo(this.controls.target);
    this.fly(t, d, new THREE.Vector3(v[0], v[1], v[2]).normalize(), 1100);
  }
  // stop the idle rotation for a while (e.g. after a programmatic view change)
  touch() { this.lastTouch = performance.now(); if (this.controls) this.controls.autoRotate = false; }
  setAutoRotate(on) { this.holdRotate = !on; this.touch(); }
  setCut(on) { this.cut = on; this.apply(); if (on) this.view('medial'); }
  setCortex(mode) { this.cortexMode = mode; this.apply(); }
  // MRI planes inside the 3D scene. planes: [{ax:'ax'|'co'|'sa', mm, canvas, flip}], ext: {x0,x1,y0,y1,z0,z1} (MNI mm),
  // cut: remove the brain on one side of every plane (with several planes, the removed part is their intersection: a corner).
  setPlanes(planes, ext, cut) {
    this.planes = planes || []; this.planeCut = !!cut; this.planeObjs = this.planeObjs || {};
    const cx = (ext.x0 + ext.x1) / 2, cy = (ext.y0 + ext.y1) / 2, cz = (ext.z0 + ext.z1) / 2;
    for (const k of ['ax', 'co', 'sa']) {
      const p = this.planes.find(q => q.ax === k); let o = this.planeObjs[k];
      if (!p) { if (o) o.visible = false; continue; }
      if (!o) {
        const g = k === 'ax' ? new THREE.PlaneGeometry(ext.x1 - ext.x0, ext.y1 - ext.y0) : k === 'co' ? new THREE.PlaneGeometry(ext.x1 - ext.x0, ext.z1 - ext.z0) : new THREE.PlaneGeometry(ext.y1 - ext.y0, ext.z1 - ext.z0);
        if (k === 'ax') g.rotateX(-Math.PI / 2); else if (k === 'sa') g.rotateY(-Math.PI / 2);
        const tex = new THREE.CanvasTexture(p.canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
        const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 });
        o = this.planeObjs[k] = new THREE.Mesh(g, mat); o.renderOrder = 2; this.scene.add(o);
      } else if (o.material.map.image !== p.canvas) { o.material.map.dispose(); o.material.map = new THREE.CanvasTexture(p.canvas); o.material.map.colorSpace = THREE.SRGBColorSpace; o.material.needsUpdate = true; }
      else o.material.map.needsUpdate = true;
      if (k === 'ax') o.position.set(cx, p.mm, -cy); else if (k === 'co') o.position.set(cx, cz, -p.mm); else o.position.set(p.mm, cz, -cy);
      o.visible = true;
    }
    this.clipPlanes = this.planeCut ? this.planes.map(p => {
      const f = p.flip ? -1 : 1;
      if (p.ax === 'ax') return new THREE.Plane(new THREE.Vector3(0, -f, 0), f * p.mm);   // keep below (flip: above)
      if (p.ax === 'co') return new THREE.Plane(new THREE.Vector3(0, 0, f), f * p.mm);    // keep behind (flip: in front)
      return new THREE.Plane(new THREE.Vector3(f, 0, 0), -f * p.mm);                       // keep right of the plane (flip: left)
    }) : [];
    this.apply();
  }
  // cranial nerves: 'show' (with the brain), 'hide', 'iso' (nerves and their nuclei with a see-through brainstem only)
  setNerves(mode) { this.nerveMode = mode; this.apply(); if (mode === 'iso') this.fit('front'); else if (this.fitted) this.unfit(); }
  // layers: {cortex, deep, brainstem, cerebellum, nerves, tracts, ventricles} -> false hides that group (focused structures stay visible)
  setLayers(L) { this.layers = L || {}; if (this.layers.arteries) this.ensureArteries(); this.apply(); }
  // v2.9: load the artery meshes on first use (about 3 MB), then fade them in like any other structure
  ensureArteries() {
    if (this.arts || this.artLoading || !this.mf.arteries) return this.artLoading || Promise.resolve();
    this.artLoading = loadArteries(this.mf).then(A => {
      if (!A || this.disposed) return;
      this.arts = [];
      for (const me of A.mf.meshes) {
        const m = new THREE.Mesh(arteryGeometry(me, A.buf), arteryMaterial()); m.userData = { id: me.id, side: me.side, art: true };
        m.visible = false; this.group.add(m); this.meshes.push(m); this.arts.push(m); (this.byId[me.id] = this.byId[me.id] || []).push(m);
      }
      ART_U.uPulse.value = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1;
      this.apply(); if (this.opts.onArteries) this.opts.onArteries();
    }).catch(() => { this.artLoading = null; });
    return this.artLoading;
  }
  // frame the currently visible meshes (used for the nerves + brainstem view)
  fit(name) {
    const box = new THREE.Box3(); let n = 0;
    for (const m of this.meshes) { const vis = m.userData.tw ? m.userData.tw.to.v : m.visible; if (vis) { box.union(new THREE.Box3().setFromBufferAttribute(m.geometry.attributes.position)); n++; } }
    if (!n) return; this.fitted = true;
    const c = box.getCenter(new THREE.Vector3()), r = Math.max(20, box.getSize(new THREE.Vector3()).length() / 2);
    this.center0 = this.center0 || this.center.clone(); this.radius0 = this.radius0 || this.radius;
    this.center = c; this.radius = r; this.controls.minDistance = r * 0.6; this.view(name || 'front');
  }
  unfit() { if (!this.center0) return; this.center = this.center0; this.radius = this.radius0; this.controls.minDistance = this.radius * 0.7; this.fitted = false; this.view('left'); }
  // centre of a structure (three coords); side 'L'/'R'/'M' or any
  centroid(id, side) {
    const box = new THREE.Box3(); let n = 0;
    for (const m of this.byId[id] || []) if (!side || m.userData.side === side || m.userData.side === 'M') { box.expandByObject(m); n++; }
    return n ? box.getCenter(new THREE.Vector3()) : null;
  }
  // animated pathway lines. flows: [{a: {id, side} | {p:[x,y,z] MNI}, b: same, color}], markers: [{p:[x,y,z] MNI, color}]
  setFlows(flows, markers) {
    if (this.flowGroup) { this.flowGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); this.scene.remove(this.flowGroup); }
    this.flows = null; this.flowGroup = null; this.parts = [];
    if (!flows || !flows.length) return;
    const G = this.flowGroup = new THREE.Group(); this.scene.add(G); this.flows = [];
    const pos = e => e.p ? new THREE.Vector3(e.p[0], e.p[2], -e.p[1]) : this.centroid(e.id, e.side);
    const mid0 = this.center0 || this.center;
    for (const f of flows) {
      const A = pos(f.a), B = pos(f.b); if (!A || !B) continue;
      const L = A.distanceTo(B); if (L < 2) continue;
      const M = A.clone().add(B).multiplyScalar(0.5), dir = M.clone().sub(mid0); if (dir.length() < 1) dir.set(0, 1, 0);
      M.add(dir.normalize().multiplyScalar(L * 0.16));
      const curve = new THREE.QuadraticBezierCurve3(A, M, B);
      const g = new THREE.TubeGeometry(curve, Math.max(24, Math.round(L * 1.5)), 0.8, 10, false);
      const mat = new THREE.ShaderMaterial({
        uniforms: { uT: { value: Math.random() }, uC: { value: new THREE.Color(f.color) }, uR: { value: Math.max(1, L / 14) }, uA: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform float uT; uniform vec3 uC; uniform float uR; uniform float uA; varying vec2 vUv; void main(){ float k = fract(vUv.x * uR - uT); float h = smoothstep(0.35, 0.96, k) * (1.0 - smoothstep(0.96, 1.0, k)); gl_FragColor = vec4(mix(uC, vec3(1.0), h * 0.6), (0.6 + 0.4 * h) * uA); }',
        transparent: true, depthWrite: false, depthTest: false
      });
      const t = new THREE.Mesh(g, mat); t.renderOrder = 5; G.add(t); this.flows.push(mat);
      for (let k = 0; k < 2; k++) { // particles travelling from source to target
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(f.color), depthTest: false, transparent: true, sizeAttenuation: false }));
        sp.scale.set(0.022, 0.022, 1); sp.renderOrder = 8; sp.userData = { curve, ph: k / 2 + Math.random() * 0.2, sp: 0.16 + 6 / Math.max(20, L) }; G.add(sp); this.parts = this.parts || []; this.parts.push(sp);
      }
    }
    for (const mk of markers || []) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(1.4, 20, 14), new THREE.MeshStandardMaterial({ color: mk.color, emissive: mk.color, emissiveIntensity: 0.45, roughness: 0.4 }));
      s.position.set(mk.p[0], mk.p[2], -mk.p[1]); s.renderOrder = 4; G.add(s);
    }
  }
  tickFlows(dt) {
    for (const m of this.flows) { m.uniforms.uT.value += dt * 0.55; m.uniforms.uA.value = Math.min(1, m.uniforms.uA.value + dt * 1.8); }
    for (const p of this.parts || []) { const u = p.userData; u.ph = (u.ph + dt * u.sp) % 1; p.position.copy(u.curve.getPoint(u.ph)); p.material.opacity = Math.sin(Math.PI * u.ph) * (this.flows[0] ? this.flows[0].uniforms.uA.value : 1); }
  }
  // Yeo networks on the cortex: null = off, 'all' = every network in its colour, 1..7 = one network
  setNetwork(n) { this.net = n == null ? null : n; this.apply(); }
  paintNet(m) {
    const g = m.geometry, u = g.userData; if (!u || !u.ao) return; const key = this.net == null ? 'ao' : String(this.net);
    if (u.key === key) return; u.key = key;
    const col = g.attributes.color.array, cs = NETCOL.map(c => new THREE.Color(c)), neutral = new THREE.Color('#e9e3d8');
    const to = new Float32Array(col.length);
    for (let i = 0; i < u.ao.length; i++) {
      const a = u.ao[i]; let c = null;
      if (this.net != null) { const k = u.net[i]; c = k && (this.net === 'all' || this.net === k) ? cs[k] : neutral; }
      to[3 * i] = (c ? c.r : 1) * a; to[3 * i + 1] = (c ? c.g : 1) * a; to[3 * i + 2] = (c ? c.b : 1) * a;
    }
    if (!this.ready || this.noTween) { col.set(to); g.attributes.color.needsUpdate = true; return; }
    u.from = Float32Array.from(col); u.to = to; this.netTw = this.netTw || { t0: performance.now(), list: new Set() }; this.netTw.t0 = performance.now(); this.netTw.list.add(g);
  }
  tickNet(now) {
    const k = Math.min(1, (now - this.netTw.t0) / 600), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    for (const g of this.netTw.list) { const u = g.userData, col = g.attributes.color.array; for (let i = 0; i < col.length; i++) col[i] = u.from[i] + (u.to[i] - u.from[i]) * e; g.attributes.color.needsUpdate = true; }
    if (k >= 1) this.netTw = null;
  }
  // fibres: fade toward their target opacity, advance the travelling light
  tickFibs(now, dt) {
    const t = now / 1000, a = Math.min(1, dt * 5);
    for (const L of this.fibs) { const u = L.material.uniforms, tg = L.userData.tgt || 0; u.uTime.value = t; u.uOp.value += (tg - u.uOp.value) * a; L.visible = u.uOp.value > 0.01 || tg > 0; }
  }
  // label above the selected structure (tap or list); anchored to the tapped point or the structure centre
  placeLabel() {
    const lb = this.lab, A = this.labAt; if (!A) { lb.classList.remove('on'); return; }
    const p = A.p.clone(); if (A.m) p.add(A.m.position); p.project(this.camera);
    if (p.z > 1 || Math.abs(p.x) > 1.05 || Math.abs(p.y) > 1.05) { lb.classList.remove('on'); return; }
    const W = this.el.clientWidth, H = this.el.clientHeight;
    const x = Math.round((p.x + 1) / 2 * W), y = Math.round((1 - p.y) / 2 * H), pill = lb.querySelector('b'), bw = pill.offsetWidth;
    let shift = 0; if (x - bw / 2 < 8) shift = 8 - (x - bw / 2); else if (x + bw / 2 > W - 8) shift = (W - 8) - (x + bw / 2);
    pill.style.marginLeft = shift + 'px'; lb.classList.toggle('below', y < 70);
    lb.style.transform = 'translate(' + x + 'px,' + y + 'px)'; lb.classList.add('on');
  }
  setLabel(id, color) {
    if (!this.lab) return; if (!id) { this.labAt = null; return; }
    const inf = this.info[id] || {}, name = (inf.n || id).replace(' (approximate)', '');
    let p = null, m = null;
    if (this.lastHit && this.lastHit.id === id && performance.now() - this.lastHit.t < 2000) p = this.lastHit.point.clone();
    else { const ms = (this.byId[id] || []).filter(x => x.visible); const pick = ms.find(x => x.userData.side === 'L') || ms[0]; if (pick) { const b = new THREE.Box3().setFromObject(pick); p = b.getCenter(new THREE.Vector3()).sub(pick.position); m = pick; } }
    if (!p) { this.labAt = null; return; }
    this.labAt = { p, m }; this.lab.querySelector('b').textContent = name; this.lab.querySelector('i').style.background = color || '#d98a00';
    this.lab.classList.remove('pop'); void this.lab.offsetWidth; this.lab.classList.add('pop');
  }
  // focus: {structureId: color}; empty = natural view
  setFocus(map, sel) { this.focus = map || {}; this.sel = sel || null;
    if (Object.keys(this.focus).some(k => (this.info[k.split('@')[0]] || {}).lobe === 'arteries')) this.ensureArteries();
    this.apply();
    if (this.lab) this.setLabel(this.sel, this.sel ? (this.focus[this.sel] || this.focus[this.sel + '@L'] || this.focus[this.sel + '@R'] || this.focus[this.sel + '@M']) : null); }
  // apply() with a soft cross-fade: compute the new look, then animate colour and opacity from the old one
  apply() {
    if (!this.meshes.length || this.noTween || !this.ready) return this.applyNow();
    const before = this.meshes.map(m => ({ c: m.material.color.clone(), o: m.visible ? m.material.opacity : 0, v: m.visible }));
    this.applyNow();
    const now = performance.now(); let n = 0;
    this.meshes.forEach((m, i) => {
      const b = before[i], mat = m.material, to = { c: mat.color.clone(), o: m.visible ? mat.opacity : 0, v: m.visible, tr: mat.transparent, dw: mat.depthWrite };
      if (b.c.equals(to.c) && Math.abs(b.o - to.o) < 0.01 && b.v === to.v) { m.userData.tw = null; return; }
      m.userData.tw = { t0: now, from: b, to }; n++;
      mat.color.copy(b.c); mat.opacity = b.o; mat.transparent = true; m.visible = b.v || to.v; mat.needsUpdate = true;
    });
    this.tweening = n > 0;
    this.frameFocus();
  }
  tickTween(now) {
    let live = false;
    for (const m of this.meshes) {
      const tw = m.userData.tw; if (!tw) continue;
      const k = Math.min(1, (now - tw.t0) / 480), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, mat = m.material;
      mat.color.copy(tw.from.c).lerp(tw.to.c, e); mat.opacity = tw.from.o + (tw.to.o - tw.from.o) * e;
      if (k >= 1) { mat.opacity = tw.to.o; mat.transparent = tw.to.tr; mat.depthWrite = tw.to.dw; m.visible = tw.to.v; mat.needsUpdate = true; m.userData.tw = null; }
      else live = true;
    }
    this.tweening = live;
  }
  // regions fly in from around the brain and settle into place (first load, and when returning to the whole brain)
  assemble() {
    if (!this.center) return; const now = performance.now(), c = this.center0 || this.center, R = this.radius0 || this.radius;
    this.meshes.forEach(m => {
      if (!m.visible) return;
      const box = new THREE.Box3().setFromObject(m), mc = box.getCenter(new THREE.Vector3()), d = mc.clone().sub(c);
      const dist = d.length(); if (dist < 1) d.set(0, 1, 0); d.normalize();
      m.userData.as = { t0: now + 40 + (dist / R) * 380 + Math.random() * 160, off: d.multiplyScalar(R * (0.45 + Math.random() * 0.25)) };
      m.position.copy(m.userData.as.off);
    });
    this.assembling = true;
  }
  tickAssemble(now) {
    let live = false;
    for (const m of this.meshes) {
      const a = m.userData.as; if (!a) continue;
      const k = Math.max(0, Math.min(1, (now - a.t0) / 950)), e = 1 - Math.pow(1 - k, 4);
      m.position.copy(a.off).multiplyScalar(1 - e);
      if (k >= 1) { m.position.set(0, 0, 0); m.userData.as = null; } else live = true;
    }
    this.assembling = live;
  }
  // camera glide to a target point and distance (keeps the viewing direction unless one is given)
  fly(target, dist, dir, ms) {
    const c = this.controls, cam = this.camera, ft = c.target.clone(), d0 = cam.position.clone().sub(ft);
    this.flight = { t0: performance.now(), ms: ms || 900, ft, tt: target.clone(), dist, d0: d0.length(), u0: d0.clone().normalize(), u1: (dir ? dir.clone() : d0.clone()).normalize() };
    this.touch();
  }
  tickFly(now) {
    const f = this.flight, k = Math.min(1, (now - f.t0) / f.ms), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const t = f.ft.clone().lerp(f.tt, e), u = f.u0.clone().lerp(f.u1, e).normalize(), dist = f.d0 + (f.dist - f.d0) * e;
    this.controls.target.copy(t); this.camera.position.copy(t).add(u.multiplyScalar(dist)); this.camera.lookAt(t);
    if (k >= 1) this.flight = null;
    this.lastTouch = now;
  }
  // frame the focused structures (atlas only)
  frameFocus() {
    if (!this.opts.frame || this.fitted || !this.controls) return;
    const keys = Object.keys(this.focus), c0 = this.center0 || this.center, R = this.radius0 || this.radius;
    if (!keys.length) { if (this.framed) { this.framed = false; this.fly(c0, R * 2.6); } return; }
    const box = new THREE.Box3(); let n = 0;
    for (const k of keys) { const [id, side] = k.split('@'); for (const m of this.byId[id] || []) if (!side || m.userData.side === side) { box.expandByObject(m); n++; } }
    if (!n) return;
    const c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length() / 2;
    const dist = Math.max(R * ((this.planes || []).length ? 2.0 : 1.6), Math.min(R * 2.6, r * 3.4)), tgt = c.clone().lerp(c0, 0.35);
    if (tgt.distanceTo(this.controls.target) < 2 && Math.abs(dist - this.camera.position.distanceTo(this.controls.target)) < 4) return;
    this.framed = true; this.fly(tgt, dist);
  }
  // glowing circuit nodes at structure centres: [{id, side, color} | {p:[x,y,z] MNI, color}]
  setNodes(list) {
    if (this.nodeGroup) { this.nodeGroup.traverse(o => { if (o.material) o.material.dispose(); }); this.scene.remove(this.nodeGroup); this.nodeGroup = null; }
    if (!list || !list.length) return;
    const G = this.nodeGroup = new THREE.Group(); this.scene.add(G);
    for (const nd of list) {
      const p = nd.p ? new THREE.Vector3(nd.p[0], nd.p[2], -nd.p[1]) : this.centroid(nd.id, nd.side); if (!p) continue;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: nodeTex(nd.color), depthTest: false, transparent: true, sizeAttenuation: false }));
      sp.scale.set(0.036, 0.036, 1); sp.position.copy(p); sp.renderOrder = 9; sp.userData.ph = Math.random() * 6.28; G.add(sp);
    }
    G.userData.t0 = performance.now();
  }
  tickNodes(now) {
    const k = Math.min(1, (now - (this.nodeGroup.userData.t0 || 0)) / 500);
    for (const sp of this.nodeGroup.children) { const s = (0.03 + 0.004 * Math.sin(now / 420 + sp.userData.ph)) * (0.3 + 0.7 * (1 - Math.pow(1 - k, 3))); sp.scale.set(s, s, 1); sp.material.opacity = k; }
  }
  applyNow() {
    const any = Object.keys(this.focus).length > 0, grey = css('--line-strong');
    const approxOn = Object.keys(this.focus).some(k => (this.info[k.split('@')[0]] || {}).inner);
    const planes = this.cut ? [this.clip] : [];
    const cp = this.clipPlanes || [], planeView = (this.planes || []).length > 0;
    for (const m of this.meshes) {
      const id = m.userData.id, mat = m.material, inf = this.info[id] || {}, isCortex = CORTEX[inf.lobe];
      m.visible = !(this.cut && !cp.length && m.userData.side === 'R');
      mat.clippingPlanes = cp.length ? cp : (m.userData.side === 'M' ? planes : []); mat.clipIntersection = true;
      const Lz = this.layers || {}, showHidden = (Lz.tracts && inf.lobe === 'white matter' && id !== 'cerebral_wm' && id !== 'cerebellar_wm') || (Lz.ventricles && inf.lobe === 'ventricles');
      if (HIDDEN[inf.lobe] && !showHidden && !(this.focus[id] || this.focus[id + '@' + m.userData.side])) { m.visible = false; continue; }
      const f = this.focus[id + '@' + m.userData.side] || this.focus[id];
      const isNerve = inf.lobe === 'cranial nerves', nm = this.nerveMode, isArt = m.userData.art;
      if (isNerve && nm === 'hide' && !f) { m.visible = false; continue; }
      if (isArt && !f && !Lz.arteries) { m.visible = false; continue; }
      if (nm === 'iso' && !f && !(isNerve || ISO[id] || inf.nerveof || isArt)) { m.visible = false; continue; }
      const Ly = this.layers || {}, grp = LAYER_OF[inf.lobe];
      if (!f && nm !== 'iso' && grp && Ly[grp] === false) { m.visible = false; continue; }
      if (!f && !any && nm !== 'iso' && Ly.tracts && inf.lobe === 'white matter' && id !== 'cerebral_wm' && id !== 'cerebellar_wm') { m.visible = !(this.cut && m.userData.side === 'R'); mat.color.set(inf.tint || '#e6e0d2'); mat.opacity = 1; mat.transparent = false; mat.depthWrite = true; mat.emissive.set('#000000'); mat.clippingPlanes = cp.length ? cp : mat.clippingPlanes; mat.needsUpdate = true; continue; }
      if (!f && nm !== 'iso' && Ly.ventricles && inf.lobe === 'ventricles') { m.visible = !(this.cut && m.userData.side === 'R'); mat.color.set(inf.tint || '#8fb3c9'); mat.opacity = 1; mat.transparent = false; mat.depthWrite = true; mat.emissive.set('#000000'); mat.needsUpdate = true; continue; }
      if (nm === 'iso' && !any) { // nerve view: nerves and nuclei in matching colours, see-through brainstem
        m.visible = !(this.cut && m.userData.side === 'R') || isNerve;
        let c = isArt ? (inf.tint || '#b3262e') : inf.ncol || (id === 'optic_chiasm' || id === 'lgn' ? '#e9c46a' : null);
        // natural ivory nerves with a light tint of their key colour; nuclei keep the key colour (softened)
        if (c && !isArt) c = isNerve || id === 'optic_chiasm' ? new THREE.Color('#efe6cf').lerp(new THREE.Color(c), 0.38) : new THREE.Color(c).lerp(new THREE.Color('#ffffff'), 0.12);
        if (c) { mat.color.set(c); mat.opacity = 1; mat.transparent = false; mat.depthWrite = true; m.renderOrder = 1; }
        else { mat.color.set(inf.tint || '#bbb'); mat.opacity = 0.26; mat.transparent = true; mat.depthWrite = false; m.renderOrder = 3; }
        mat.emissive.set('#000000'); mat.needsUpdate = true; continue;
      }
      if (any && f) {
        mat.color.set(f); mat.opacity = 1; mat.transparent = false; mat.depthWrite = true;
        mat.emissive.set(id === this.sel ? f : '#000000'); mat.emissiveIntensity = id === this.sel ? 0.18 : 0;
        if (mat.userData.selAmp) mat.userData.selAmp.value = id === this.sel && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 1 : 0;
        m.renderOrder = 1;
      } else if (any) {
        if (approxOn && id === 'ventral_dc') m.visible = false;
        mat.color.set(isArt ? '#d8a7a7' : grey); mat.emissive.set('#000000'); mat.transparent = true; mat.depthWrite = false;
        mat.opacity = isCortex ? 0.07 : isArt ? 0.06 : 0.12; m.renderOrder = 3;
        if (isCortex && this.cortexMode === 0) m.visible = false;
      } else {
        mat.color.set(inf.tint || '#bbb'); mat.emissive.set('#000000');
        const op = isCortex ? [0, 0.22, 1][this.cortexMode] : 1;
        mat.opacity = op; mat.transparent = op < 1; mat.depthWrite = op >= 1; m.renderOrder = op < 1 ? 3 : 1;
        if (isCortex && this.cortexMode === 0) m.visible = false;
      }
      if (planeView && !cp.length && !f) { mat.transparent = true; mat.depthWrite = false; mat.opacity = Math.min(mat.opacity, isCortex ? 0.12 : 0.25); m.renderOrder = 3; }
      if (m.userData.real) this.paintNet(m);
      if (this.net != null && m.userData.real && !any) { mat.color.set(isCortex ? '#ffffff' : (inf.tint || '#bbb')); mat.opacity = 1; mat.transparent = false; mat.depthWrite = true; m.renderOrder = 1; m.visible = isCortex || inf.lobe === 'cerebellum'; }
      mat.needsUpdate = true;
    }
    // fibre lines (tracts: streamlines inside the atlas mask; nerves: strands, shown in the nerve view) and their faint sheath
    const Lyr = this.layers || {}, nmode = this.nerveMode, dark = document.documentElement.getAttribute('data-theme') === 'dark';
    for (const m of this.meshes) {
      const L = m.userData.fib; if (!L) continue;
      const id = m.userData.id, inf = this.info[id] || {}, f = this.focus[id + '@' + m.userData.side] || this.focus[id], u = L.material.uniforms, mat = m.material;
      const isNerve = L.userData.kind === 'nerve';
      u.uDark.value = dark ? 1 : 0; L.material.clippingPlanes = mat.clippingPlanes; L.material.clipIntersection = true;
      let tgt = 0;
      if (m.visible) {
        if (isNerve) { if (nmode === 'iso' && !any) { tgt = 0.95; u.uDec.value = 0; u.uCol.value.set(inf.ncol || '#c9a227').lerp(new THREE.Color(dark ? '#ffffff' : '#000000'), dark ? 0.15 : 0.25); } }
        else if (f) { tgt = 0.92; u.uDec.value = 0; u.uCol.value.set(f).lerp(new THREE.Color(dark ? '#ffffff' : '#000000'), dark ? 0.05 : 0.1); }
        else if (Lyr.tracts && !any && nmode !== 'iso') { tgt = dark ? 0.85 : 0.9; u.uDec.value = 1; }
      }
      L.userData.tgt = tgt;
      if (tgt > 0) { mat.transparent = true; mat.depthWrite = false; m.renderOrder = 3; mat.opacity = isNerve ? 0.34 : (f ? 0.16 : 0.07); if (!f && !isNerve) mat.color.set(dark ? '#8a8f99' : '#cfc8b8'); mat.needsUpdate = true; }
    }
  }
  pick(e, click) {
    const b = this.renderer.domElement.getBoundingClientRect();
    this.ptr.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
    this.ray.setFromCamera(this.ptr, this.camera);
    let hits = this.ray.intersectObjects(this.meshes.filter(m => m.visible && m.material.opacity > 0.05), false);
    if (this.cut && !(this.clipPlanes || []).length) hits = hits.filter(h => h.object.userData.side !== 'M' || h.point.x <= 0.5);
    if ((this.clipPlanes || []).length) hits = hits.filter(h => !this.clipPlanes.every(pl => pl.distanceToPoint(h.point) < 0));
    const foc = hits.find(h => this.focus[h.object.userData.id] || this.focus[h.object.userData.id + '@' + h.object.userData.side]);
    const h = foc || hits.find(h => h.object.material.opacity > 0.2) || hits[0];
    const id = h ? h.object.userData.id : null;
    if (click) { if (id) this.lastHit = { id, point: h.point.clone(), t: performance.now() }; if (id && this.opts.onPick) this.opts.onPick(id); }
    else this.hover(id, e);
  }
  hover(id, e) {
    this.renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
    if (this.opts.onHover) this.opts.onHover(id, e);
  }
  pause(p) { this.paused = p; }
  dispose() {
    cancelAnimationFrame(this.raf); if (this.ro) this.ro.disconnect();
    for (const m of this.meshes) { m.geometry.dispose(); m.material.dispose(); }
    this.controls.dispose(); this.renderer.dispose(); try { this.renderer.forceContextLoss(); } catch (e) {}
    this.renderer.domElement.remove(); this.meshes = []; this.disposed = true;
  }
}
window.NUBrain = {
  create: async (el, opts) => {
    const t = document.createElement('canvas');
    if (!(t.getContext('webgl2') || t.getContext('webgl'))) throw new Error('webgl');
    return new Brain(el, opts).init();
  }
};
window.dispatchEvent(new Event('nubrain-ready'));
