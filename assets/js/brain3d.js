// NeuroUnknown 3D brain viewer. Meshes: website/assets/brain3d (built by src/neurounknown/build_brain3d.py from the
// MNI152 template, Harvard-Oxford and AAL atlases). Population-average anatomy in MNI space, not one person's brain.
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
function geometryFor(reg, buf) {
  const q = new Int16Array(buf, reg.vo, reg.nv * 3), pos = new Float32Array(reg.nv * 3);
  for (let i = 0; i < reg.nv; i++) { pos[3 * i] = q[3 * i] / 20; pos[3 * i + 1] = q[3 * i + 2] / 20; pos[3 * i + 2] = -q[3 * i + 1] / 20; }
  const idx = new Uint32Array(buf.slice(reg.fo, reg.fo + reg.nf * 12));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  return g;
}
function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#888'; }

class Brain {
  constructor(el, opts) {
    this.el = el; this.opts = opts || {}; this.meshes = {}; this.sel = null; this.hl = []; this.dimOthers = false; this.cut = false; this.cortexMode = 1;
    this.colors = this.opts.colors || {};
  }
  async init() {
    const { manifest, buf } = await loadData();
    const W = this.el.clientWidth, H = this.el.clientHeight;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.setSize(W, H); r.localClippingEnabled = true;
    this.el.appendChild(r.domElement); r.domElement.style.touchAction = 'none';
    const s = this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, W / H, 1, 3000);
    s.add(new THREE.HemisphereLight(0xffffff, 0x404050, 1.6));
    const d1 = new THREE.DirectionalLight(0xffffff, 1.6); d1.position.set(-300, 400, 300); s.add(d1);
    const d2 = new THREE.DirectionalLight(0xffffff, 0.7); d2.position.set(300, -100, -300); s.add(d2);
    this.clip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0); // keeps x<0 (left hemisphere) when active
    const group = this.group = new THREE.Group(); s.add(group);
    for (const reg of manifest.regions) {
      const g = geometryFor(reg, buf);
      let mat;
      if (reg.kind === 'context') {
        mat = new THREE.MeshStandardMaterial({ color: css('--line-strong'), roughness: 0.8, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
      } else {
        mat = new THREE.MeshStandardMaterial({ color: this.colors[reg.id] || '#5b5bd6', roughness: 0.55, metalness: 0.05, transparent: true, opacity: 0.92 });
      }
      const m = new THREE.Mesh(g, mat); m.userData.id = reg.id; m.userData.kind = reg.kind; m.renderOrder = reg.kind === 'context' ? 2 : 1;
      group.add(m); this.meshes[reg.id] = m;
    }
    for (const mk of manifest.markers || []) {
      for (const p of mk.mni) {
        const sp = new THREE.Mesh(new THREE.SphereGeometry(3.2, 20, 14), new THREE.MeshStandardMaterial({ color: css('--signal'), roughness: 0.4 }));
        sp.position.set(p[0], p[2], -p[1]); sp.userData.id = mk.id; sp.userData.kind = 'marker'; group.add(sp);
        (this.markers = this.markers || []).push(sp);
      }
    }
    const box = new THREE.Box3().setFromObject(this.meshes.cortex || group);
    this.center = box.getCenter(new THREE.Vector3()); this.radius = box.getSize(new THREE.Vector3()).length() / 2;
    const c = this.controls = new OrbitControls(this.camera, r.domElement);
    c.enableDamping = true; c.dampingFactor = 0.08; c.target.copy(this.center); c.minDistance = this.radius * 1.1; c.maxDistance = this.radius * 6;
    c.rotateSpeed = 0.7; c.zoomSpeed = 0.8;
    this.view('left');
    this.ray = new THREE.Raycaster(); this.ptr = new THREE.Vector2();
    let down = null;
    r.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
    r.domElement.addEventListener('pointerup', e => { if (down && Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) < 6) this.pick(e, true); down = null; });
    r.domElement.addEventListener('pointermove', e => { if (!down && e.pointerType === 'mouse') this.pick(e, false); });
    r.domElement.addEventListener('pointerleave', () => { this.hover(null); });
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(this.el);
    window.addEventListener('nu-theme', () => { if (this.meshes.cortex) this.meshes.cortex.material.color.set(css('--line-strong')); });
    this.apply();
    const loop = () => { this.raf = requestAnimationFrame(loop); if (!this.paused) { c.update(); r.render(s, this.camera); } };
    loop();
    return this;
  }
  resize() { const W = this.el.clientWidth, H = this.el.clientHeight; if (!W || !H) return; this.renderer.setSize(W, H); this.camera.aspect = W / H; this.camera.updateProjectionMatrix(); }
  view(name) {
    const d = this.radius * 2.7, c = this.center, v = { left: [-d, 0, 0], right: [d, 0, 0], top: [0, d, 0.01], front: [0, 0, -d], back: [0, 0, d], below: [0, -d, 0.01] }[name] || [-d, 0, 0];
    this.camera.position.set(c.x + v[0], c.y + v[1] + (name === 'left' || name === 'right' ? d * 0.12 : 0), c.z + v[2]);
    this.camera.up.set(0, 1, 0); this.camera.lookAt(c); if (this.controls) { this.controls.target.copy(c); this.controls.update(); }
  }
  setCut(on) { this.cut = on; this.apply(); if (on) this.view('right'); }
  setCortex(mode) { this.cortexMode = mode; this.apply(); }
  select(id) { this.sel = id; this.apply(); }
  highlight(ids, dimOthers) { this.hl = ids || []; this.dimOthers = !!dimOthers; this.apply(); }
  apply() {
    const planes = this.cut ? [this.clip] : [];
    for (const id in this.meshes) {
      const m = this.meshes[id], mat = m.material; mat.clippingPlanes = planes;
      if (m.userData.kind === 'context') { mat.opacity = [0, 0.16, 0.5][this.cortexMode]; m.visible = this.cortexMode > 0; continue; }
      const on = id === this.sel, h = this.hl.indexOf(id) >= 0, dim = this.dimOthers && !h && !on;
      mat.color.set(dim ? css('--line-strong') : (this.colors[id] || '#5b5bd6'));
      mat.opacity = dim ? 0.18 : (on ? 1 : 0.9); mat.depthWrite = !dim;
      mat.emissive.set(on ? css('--signal') : (h ? (this.colors[id] || '#5b5bd6') : '#000000')); mat.emissiveIntensity = on ? 0.45 : (h ? 0.25 : 0);
    }
    for (const sp of this.markers || []) { sp.material.clippingPlanes = planes; sp.visible = !this.dimOthers || this.hl.indexOf('sn') >= 0 || this.sel === 'sn'; }
  }
  pick(e, click) {
    const b = this.renderer.domElement.getBoundingClientRect();
    this.ptr.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
    this.ray.setFromCamera(this.ptr, this.camera);
    const objs = Object.values(this.meshes).filter(m => m.userData.kind !== 'context').concat(this.markers || []);
    let hits = this.ray.intersectObjects(objs, false);
    if (this.cut) hits = hits.filter(h => h.point.x <= 0.5);
    const id = hits.length ? hits[0].object.userData.id : null;
    if (click) { if (id && this.opts.onPick) this.opts.onPick(id); }
    else this.hover(id, e);
  }
  hover(id, e) {
    this.renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
    if (this.opts.onHover) this.opts.onHover(id, e);
  }
  pause(p) { this.paused = p; }
}
window.NUBrain = {
  create: async (el, opts) => {
    const t = document.createElement('canvas');
    if (!(t.getContext('webgl2') || t.getContext('webgl'))) throw new Error('webgl');
    return new Brain(el, opts).init();
  }
};
window.dispatchEvent(new Event('nubrain-ready'));
