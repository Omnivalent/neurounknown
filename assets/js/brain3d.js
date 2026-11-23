// NeuroUnknown 3D brain viewer, version 2. Meshes: website/assets/brain3d (built by src/neurounknown/build_brain3d.py from the
// several atlases in ICBM 2009 space; cranial nerve nuclei are schematic ellipsoids). Population-average anatomy.
import * as THREE from 'three';
import { OrbitControls } from './three/OrbitControls.js';

let DATA = null;
async function loadData() {
  if (DATA) return DATA;
  const [m, b] = await Promise.all([
    fetch('assets/brain3d/brain.json').then(r => { if (!r.ok) throw new Error('manifest ' + r.status); return r.json(); }),
    fetch('assets/brain3d/brain.bin').then(r => { if (!r.ok) throw new Error('mesh ' + r.status); return r.arrayBuffer(); })
  ]);
  DATA = { manifest: m, buf: b };
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
  g.computeVertexNormals();
  return g;
}
function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#888'; }
const CORTEX = { frontal: 1, parietal: 1, temporal: 1, occipital: 1, limbic: 1, insula: 1 };
const HIDDEN = { 'white matter': 1, ventricles: 1 }; // shown only when selected

class Brain {
  constructor(el, opts) {
    this.el = el; this.opts = opts || {}; this.meshes = []; this.byId = {};
    this.focus = {}; this.sel = null; this.cut = false; this.cortexMode = 2;
    this.info = this.opts.structures || {}; // id -> {lobe, tint}
  }
  async init() {
    const { manifest, buf } = await loadData();
    const W = this.el.clientWidth, H = this.el.clientHeight;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.setSize(W, H); r.localClippingEnabled = true;
    this.el.appendChild(r.domElement); r.domElement.style.touchAction = 'none';
    const s = this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, W / H, 1, 3000);
    s.add(new THREE.HemisphereLight(0xffffff, 0x50505a, 1.5));
    const d1 = new THREE.DirectionalLight(0xffffff, 1.5); d1.position.set(-300, 400, 300); s.add(d1);
    const d2 = new THREE.DirectionalLight(0xffffff, 0.8); d2.position.set(300, -100, -300); s.add(d2);
    const d3 = new THREE.DirectionalLight(0xffffff, 0.5); d3.position.set(300, 200, 200); s.add(d3);
    this.clip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
    const group = this.group = new THREE.Group(); s.add(group);
    for (const me of manifest.meshes) {
      const g = geometryFor(me, buf);
      const mat = new THREE.MeshStandardMaterial({ color: '#bbb', roughness: 0.62, metalness: 0.02, transparent: true, opacity: 1 });
      if (me.side === 'M') mat.side = THREE.DoubleSide;
      const m = new THREE.Mesh(g, mat); m.userData = { id: me.id, side: me.side };
      group.add(m); this.meshes.push(m); (this.byId[me.id] = this.byId[me.id] || []).push(m);
    }
    const box = new THREE.Box3().setFromObject(group);
    this.center = box.getCenter(new THREE.Vector3()); this.radius = box.getSize(new THREE.Vector3()).length() / 2;
    const c = this.controls = new OrbitControls(this.camera, r.domElement);
    c.enableDamping = true; c.dampingFactor = 0.08; c.target.copy(this.center); c.minDistance = this.radius * 0.7; c.maxDistance = this.radius * 6;
    c.rotateSpeed = 0.7; c.zoomSpeed = 0.9;
    this.view('left');
    this.ray = new THREE.Raycaster(); this.ptr = new THREE.Vector2();
    let down = null;
    r.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
    r.domElement.addEventListener('pointerup', e => { if (down && Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) < 6) this.pick(e, true); down = null; });
    r.domElement.addEventListener('pointermove', e => { if (!down && e.pointerType === 'mouse') this.pick(e, false); });
    r.domElement.addEventListener('pointerleave', () => { this.hover(null); });
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(this.el);
    window.addEventListener('nu-theme', () => this.apply());
    this.apply();
    const loop = () => { this.raf = requestAnimationFrame(loop); if (!this.paused) { c.update(); r.render(s, this.camera); } };
    loop();
    return this;
  }
  resize() { const W = this.el.clientWidth, H = this.el.clientHeight; if (!W || !H) return; this.renderer.setSize(W, H); this.camera.aspect = W / H; this.camera.updateProjectionMatrix(); }
  view(name) {
    const d = this.radius * 2.6, c = this.center;
    const v = { left: [-d, 0, 0], right: [d, 0, 0], top: [0, d, 0.01], front: [0, 0, -d], back: [0, 0, d], below: [0, -d, 0.01], medial: [d, 0, 0] }[name] || [-d, 0, 0];
    this.camera.position.set(c.x + v[0], c.y + v[1] + (name === 'left' || name === 'right' || name === 'medial' ? d * 0.1 : 0), c.z + v[2]);
    this.camera.up.set(0, 1, 0); this.camera.lookAt(c); if (this.controls) { this.controls.target.copy(c); this.controls.update(); }
  }
  setCut(on) { this.cut = on; this.apply(); if (on) this.view('medial'); }
  setCortex(mode) { this.cortexMode = mode; this.apply(); }
  // focus: {structureId: color}; empty = natural view
  setFocus(map, sel) { this.focus = map || {}; this.sel = sel || null; this.apply(); }
  apply() {
    const any = Object.keys(this.focus).length > 0, grey = css('--line-strong');
    const approxOn = Object.keys(this.focus).some(k => (this.info[k.split('@')[0]] || {}).inner);
    const planes = this.cut ? [this.clip] : [];
    for (const m of this.meshes) {
      const id = m.userData.id, mat = m.material, inf = this.info[id] || {}, isCortex = CORTEX[inf.lobe];
      m.visible = !(this.cut && m.userData.side === 'R');
      mat.clippingPlanes = m.userData.side === 'M' ? planes : [];
      if (HIDDEN[inf.lobe] && !(this.focus[id] || this.focus[id + '@' + m.userData.side])) { m.visible = false; continue; }
      const f = this.focus[id + '@' + m.userData.side] || this.focus[id];
      if (any && f) {
        mat.color.set(f); mat.opacity = 1; mat.transparent = false; mat.depthWrite = true;
        mat.emissive.set(id === this.sel ? f : '#000000'); mat.emissiveIntensity = id === this.sel ? 0.28 : 0;
        m.renderOrder = 1;
      } else if (any) {
        if (approxOn && id === 'ventral_dc') m.visible = false;
        mat.color.set(grey); mat.emissive.set('#000000'); mat.transparent = true; mat.depthWrite = false;
        mat.opacity = isCortex ? 0.07 : 0.12; m.renderOrder = 3;
        if (isCortex && this.cortexMode === 0) m.visible = false;
      } else {
        mat.color.set(inf.tint || '#bbb'); mat.emissive.set('#000000');
        const op = isCortex ? [0, 0.22, 1][this.cortexMode] : 1;
        mat.opacity = op; mat.transparent = op < 1; mat.depthWrite = op >= 1; m.renderOrder = op < 1 ? 3 : 1;
        if (isCortex && this.cortexMode === 0) m.visible = false;
      }
      mat.needsUpdate = true;
    }
  }
  pick(e, click) {
    const b = this.renderer.domElement.getBoundingClientRect();
    this.ptr.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
    this.ray.setFromCamera(this.ptr, this.camera);
    let hits = this.ray.intersectObjects(this.meshes.filter(m => m.visible && m.material.opacity > 0.05), false);
    if (this.cut) hits = hits.filter(h => h.object.userData.side !== 'M' || h.point.x <= 0.5);
    const foc = hits.find(h => this.focus[h.object.userData.id] || this.focus[h.object.userData.id + '@' + h.object.userData.side]);
    const h = foc || hits.find(h => h.object.material.opacity > 0.2) || hits[0];
    const id = h ? h.object.userData.id : null;
    if (click) { if (id && this.opts.onPick) this.opts.onPick(id); }
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
