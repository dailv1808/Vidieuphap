// Reusable scene building blocks for the whole series.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { V, clamp, lerp, easeOut, rng, glowSprite, dotTexture, orbMaterial, textPlane, FONT_TITLE } from './engine.js';

export const CITTA_GROUPS = [
  { key: 'tham', n: 8, color: 0xff8a3d }, { key: 'san', n: 2, color: 0xff3b3b }, { key: 'si', n: 2, color: 0x9aa3ad },
  { key: 'vonhan', n: 18, color: 0x7fd0ff }, { key: 'tinhhao', n: 24, color: 0xffc94a },
  { key: 'sacgioi', n: 15, color: 0xc6a8ff }, { key: 'vosac', n: 12, color: 0xf3ead8 }, { key: 'sieuthe', n: 8, color: 0xfff6d0 },
];
export const cittaList = () => CITTA_GROUPS.flatMap(g => Array(g.n).fill(g));
export const fib = (i, n, r) => { const y = 1 - (i / (n - 1)) * 2, rad = Math.sqrt(1 - y * y), th = Math.PI * (3 - Math.sqrt(5)) * i; return V(Math.cos(th) * rad * r, y * r, Math.sin(th) * rad * r); };
export const camTo = (e, p, l, fov = 38) => { e.camera.position.copy(p); e.camera.lookAt(l); e.camera.fov = fov; };
export const chrome = () => new THREE.MeshPhysicalMaterial({ color: 0xe8e8ee, metalness: 1, roughness: 0.14, clearcoat: 1 });
export function rod(a, b, r, mat) {
  const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 14), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return m;
}
export function leafMaterial(seed) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 96); g.addColorStop(0, '#e2c088'); g.addColorStop(1, '#b88f52'); x.fillStyle = g; x.fillRect(0, 0, 512, 96);
  const r = rng(seed); x.strokeStyle = 'rgba(70,40,15,.55)'; x.lineWidth = 2;
  for (let l = 0; l < 4; l++) { x.beginPath(); let px = 30; const y = 20 + l * 19; x.moveTo(px, y); while (px < 480) { px += 6 + r() * 10; x.lineTo(px, y + (r() - .5) * 5); } x.stroke(); }
  x.fillStyle = 'rgba(60,35,10,.8)'; x.beginPath(); x.arc(170, 48, 6, 0, 7); x.arc(340, 48, 6, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: .7 });
}
export function palmBook(nLeaves = 12, seed = 1) {
  const g = new THREE.Group(), leaves = [];
  const cover = new THREE.MeshPhysicalMaterial({ color: 0x5a3519, roughness: .45, clearcoat: .6 });
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xd9a441, metalness: 1, roughness: .25 });
  const bot = new THREE.Mesh(new RoundedBoxGeometry(5.2, 0.16, 1.0, 2, 0.06), cover); bot.position.y = -0.1; g.add(bot);
  for (let i = 0; i < nLeaves; i++) { const p = new THREE.Group(); p.add(new THREE.Mesh(new THREE.BoxGeometry(5, 0.035, 0.9), leafMaterial(seed + i))); p.position.y = i * 0.045; g.add(p); leaves.push(p); }
  const top = new THREE.Mesh(new RoundedBoxGeometry(5.2, 0.16, 1.0, 2, 0.06), cover); top.position.y = nLeaves * 0.045 + 0.06; g.add(top);
  [-1.2, 1.2].forEach(x => { const s = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 8, 24), gold); s.position.set(x, nLeaves * 0.045 + 0.16, 0); s.rotation.x = Math.PI / 2; top.add(s); s.position.y = 0.09; });
  return { g, leaves, top };
}
export function mannequin(mat) {
  const g = new THREE.Group();
  const add = (geo, x, y, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, 0); m.rotation.z = rz; g.add(m); };
  add(new THREE.SphereGeometry(0.42, 28, 20), 0, 2.55);
  add(new THREE.CapsuleGeometry(0.62, 1.3, 8, 18), 0, 1.3);
  add(new THREE.CapsuleGeometry(0.18, 1.2, 4, 12), -0.85, 1.35, 0.18); add(new THREE.CapsuleGeometry(0.18, 1.2, 4, 12), 0.85, 1.35, -0.18);
  add(new THREE.CapsuleGeometry(0.22, 1.3, 4, 12), -0.3, -0.35); add(new THREE.CapsuleGeometry(0.22, 1.3, 4, 12), 0.3, -0.35);
  return g;
}
// point positions forming a head-and-shoulders bust
export function bustPoints(n, r, s = 1) {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let x, y; const k = r();
    if (k < 0.33) { const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 0.55; x = Math.cos(a) * rr; y = Math.sin(a) * rr * 1.15 + 1.55; }
    else if (k < 0.38) { x = (r() - .5) * 0.4; y = 0.75 + r() * 0.3; }
    else { const a = r() * Math.PI, rr = Math.sqrt(r()); x = Math.cos(a) * 1.35 * rr; y = Math.sin(a) * 1.25 * rr - 0.55; }
    out[i * 3] = x * s; out[i * 3 + 1] = y * s; out[i * 3 + 2] = (r() - .5) * 0.2;
  }
  return out;
}
export function puffTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.5, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}


// The "Map of 89 minds": the series' signature object. Orbs grouped and colored by citta group.
// update(t, { lit: Set of group keys fully lit, pulse: group key highlighted now, dim }) .
export function cittaMap(g, { r = 2.3, size = 0.15, seed = 0 } = {}) {
  const list = cittaList(), geo = new THREE.SphereGeometry(size, 28, 18);
  const orbs = list.map((c, i) => { const o = new THREE.Mesh(geo, orbMaterial(c.color, 0.35)); o.userData = { home: fib(i, 89, r), c }; g.add(o); return o; });
  return { list, orbs, update(t, { lit = new Set(), pulse = null, dim = 0.08, rot = new THREE.Euler(0.3, t * 0.2, 0) } = {}) {
    orbs.forEach((o, i) => { const c = o.userData.c, on = lit.has(c.key), p = pulse === c.key;
      o.position.copy(o.userData.home).applyEuler(rot);
      o.material.emissiveIntensity = p ? 0.9 : on ? 0.45 : dim; o.scale.setScalar(p ? 1.25 : on ? 1 : 0.8); });
  } };
}

// A motorbike built from primitives, with an exploded-view control. Used by ep01 (teaser) and ep02.
export function motorbike({ scale = 0.78, y = -0.7 } = {}) {
  const bike = new THREE.Group(); bike.scale.setScalar(scale); bike.position.y = y;
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xa3122a, roughness: .25, metalness: .3, clearcoat: 1, clearcoatRoughness: .05 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: .7 }), steel = chrome(), dark = new THREE.MeshPhysicalMaterial({ color: 0x2a2d33, metalness: .8, roughness: .35 });
  const parts = [];
  const part = (obj, dir, name) => { const p = new THREE.Group(); p.add(obj); p.userData = { dir, name }; bike.add(p); parts.push(p); return p; };
  const wheel = x => { const w = new THREE.Group(); w.position.x = x;
    w.add(new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.17, 16, 48), rubber));
    w.add(new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.035, 8, 48), steel));
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.3, 20), steel); hub.rotation.x = Math.PI / 2; w.add(hub);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; w.add(rod(V(0, 0, 0), V(Math.cos(a) * 0.54, Math.sin(a) * 0.54, 0), 0.012, steel)); }
    return w; };
  part(wheel(-1.5), V(-1.6, -0.3, 1.0), 'wheel'); part(wheel(1.6), V(1.6, -0.3, 1.0), 'wheel2');
  const frame = new THREE.Group(); [[-1.5, 0, -0.3, 0.9], [-0.3, 0.9, 0.9, 1.1], [-0.3, 0.9, 0.2, 0.15], [0.2, 0.15, 0.9, 1.1]].forEach(([a, b, c, d]) => frame.add(rod(V(a, b, 0), V(c, d, 0), 0.06, dark)));
  part(frame, V(0, 0.1, -1.4), 'frame');
  const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.95, 8, 20), paint); tank.rotation.z = Math.PI / 2 - 0.12; tank.position.set(0.35, 1.25, 0); tank.scale.z = 0.85; part(tank, V(0.2, 1.7, 0.4), 'tank');
  const seat = new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.2, 0.52, 3, 0.08), new THREE.MeshPhysicalMaterial({ color: 0x111111, roughness: .5, clearcoat: .4 })); seat.position.set(-0.6, 1.22, 0); part(seat, V(-0.9, 1.5, 0.6), 'seat');
  const fork = new THREE.Group(); [-0.12, 0.12].forEach(z => fork.add(rod(V(1.6, 0, z), V(1.15, 1.5, z), 0.045, steel))); part(fork, V(1.3, 0.5, -0.8), 'fork');
  const bar = new THREE.Group(); bar.add(rod(V(1.12, 1.58, -0.6), V(1.12, 1.58, 0.6), 0.035, steel)); [-0.6, 0.6].forEach(z => bar.add(rod(V(1.12, 1.58, z), V(1.12, 1.58, z * 1.25), 0.06, rubber))); part(bar, V(1.0, 1.6, -0.2), 'bar');
  const lamp = new THREE.Group(); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), new THREE.MeshStandardMaterial({ color: 0xfff1c8, emissive: 0xffe2a0, emissiveIntensity: 2 })); bulb.position.set(1.38, 1.32, 0); lamp.add(bulb);
  part(lamp, V(2.0, 1.0, 0.7), 'lamp');
  const eng = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.6, 0.5, 3, 0.08), dark); eng.position.set(0.25, 0.45, 0); part(eng, V(0, -1.3, 1.2), 'engine');
  const ex = rod(V(-0.2, 0.32, 0.32), V(-1.6, 0.48, 0.32), 0.075, steel); part(ex, V(-1.1, -1.0, -0.9), 'exhaust');
  for (let i = 0; i < 10; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 6), steel); b.position.set(-0.8 + i * 0.2, 0.7, 0); const a = i * 0.7; part(b, V(Math.cos(a) * 2.2, Math.sin(a) * 1.6 + 0.6, Math.sin(a * 2) * 1.2), 'bolt'); }
  const lines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0x7fe3ff, dashSize: 0.08, gapSize: 0.06, transparent: true, opacity: 0.6 })); bike.add(lines);
  const homes = parts.map(p => new THREE.Box3().setFromObject(p.children[0]).getCenter(V(0, 0, 0)));
  // k: 0 assembled .. 1 exploded; custom per-part offsets can override the default exploded direction
  const setExplode = (k, override = null) => {
    const lp = [];
    parts.forEach((p, i) => { const d = override?.[i] ?? p.userData.dir, kk = clamp(k * 1.15 - (i % 5) * 0.03);
      p.position.set(d.x * kk, d.y * kk, d.z * kk); p.rotation.set(d.z * kk * 0.3, d.x * kk * 0.2, d.y * kk * 0.15);
      const h = homes[i]; lp.push(h.x, h.y, h.z, h.x + d.x * kk, h.y + d.y * kk, h.z + d.z * kk); });
    lines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); lines.computeLineDistances(); lines.visible = k > 0.05 && !override; lines.material.opacity = k * 0.6;
  };
  return { bike, parts, homes, setExplode, lines, bulb };
}

// A glowing name tag ("sticker") used for concepts (paññatti).
export function nameTag(text, { h = 0.5, color = '#ffffff', bg = 'rgba(124,92,255,.85)' } = {}) {
  const m = textPlane(text, h, { color, weight: 800, bg, radius: 40, pad: 40 });
  return m;
}
