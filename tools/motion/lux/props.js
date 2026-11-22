// Reusable "digital lacquer" props.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PAL, goldLeaf, goldSolid, lacquer, pearl, palmLeafTexture, lacquerPanelTexture, eggshellTexture } from './materials.js';
import { V, rng, textTexture, FONT_SERIF, FONT_SANS } from './engine.js';

export const castAll = (o, cast = true, receive = true) => o.traverse(m => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = receive; } });

// 89 cittas, grouped; pastel nacre tints keep the series' semantic colors but refined
export const CITTA = [
  { key: 'sieuthe', n: 8, tint: 0xfff6e0 }, { key: 'san', n: 2, tint: 0xffb9a8 }, { key: 'si', n: 2, tint: 0xd8dde3 },
  { key: 'tham', n: 8, tint: 0xffd2b0 }, { key: 'sacgioi', n: 15, tint: 0xe2d6ff }, { key: 'vosac', n: 12, tint: 0xf6f1e6 },
  { key: 'vonhan', n: 18, tint: 0xcfe6ff }, { key: 'tinhhao', n: 24, tint: 0xffe7b0 },
];

// Palm-leaf manuscript (bó kinh lá buông): gilt-edged leaves between lacquer covers inlaid with a gold lotus, tied with gold cord.
export function manuscript({ leaves = 16, L = 4.2, D = 0.72, T = 0.022 } = {}) {
  const g = new THREE.Group(), list = [];
  const gilt = goldLeaf(21, { cells: 3, repeat: [6, 1] });
  for (let i = 0; i < leaves; i++) {
    const face = new THREE.MeshStandardMaterial({ map: palmLeafTexture(100 + i), roughness: 0.62 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(L, T, D), [gilt, gilt, face, face, gilt, gilt]);
    const p = new THREE.Group(); p.add(m); p.position.y = 0.07 + T / 2 + i * T; g.add(p); list.push(p);
  }
  const panel = lacquerPanelTexture({ w: 1024, h: 180, lotus: false }), coverMat = lacquer(PAL.lacquer, { map: panel });
  const edge = goldLeaf(22, { cells: 2 });
  const coverGeo = new RoundedBoxGeometry(L + 0.16, 0.07, D + 0.1, 2, 0.02);
  const bottom = new THREE.Mesh(coverGeo, [edge, edge, coverMat, coverMat, edge, edge]); bottom.position.y = 0.035; g.add(bottom);
  const top = new THREE.Group(); top.position.set(0, 0.07 + leaves * T + 0.035, -(D + 0.1) / 2); g.add(top);
  const topMesh = new THREE.Mesh(coverGeo, coverMat); topMesh.position.z = (D + 0.1) / 2; top.add(topMesh);
  // gold lotus medallion inlaid on the top cover
  const med = new THREE.Mesh(new THREE.CircleGeometry(0.26, 48), new THREE.MeshPhysicalMaterial({ map: lacquerPanelTexture({ w: 256, h: 256, border: false, seed: 3 }), metalness: 0.6, roughness: 0.3, clearcoat: 1 }));
  med.rotation.x = -Math.PI / 2; med.position.set(0, 0.0365, (D + 0.1) / 2); top.add(med);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.012, 8, 64), goldSolid(0.2)); ring.rotation.x = -Math.PI / 2; ring.position.copy(med.position); top.add(ring);
  // eggshell inlay bands near both ends
  const egg = new THREE.MeshStandardMaterial({ map: eggshellTexture(5), roughness: 0.4 });
  [-1, 1].forEach(sx => { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.42, D - 0.05), egg); b.rotation.x = -Math.PI / 2; b.position.set(sx * (L / 2 - 0.42), 0.0365, (D + 0.1) / 2); top.add(b); });
  // gold cords wrapping the bundle
  const cords = [];
  [-0.95, 0.95].forEach(cx => { const pts = []; const hy = 0.07 + leaves * (T + 0.002) / 2 + 0.03, ry = leaves * (T + 0.002) / 2 + 0.11, rz = D / 2 + 0.08;
    for (let a = 0; a < 64; a++) { const th = a / 64 * Math.PI * 2; pts.push(V(cx, hy + Math.sin(th) * ry, Math.cos(th) * rz)); }
    const c = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 96, 0.016, 8, true), goldSolid(0.3)); g.add(c); cords.push(c); });
  castAll(g);
  return { group: g, leaves: list, top, cords, L, D, height: 0.07 + leaves * (T + 0.002) + 0.07 };
}

// Mandala of 89 mother-of-pearl pearls on concentric gold rings, lotus petals around the rim.
export function pearlMandala({ r0 = 0.5, dr = 0.42, size = 0.11 } = {}) {
  const g = new THREE.Group(), pearls = [], rings = [], homes = [];
  const geo = new THREE.SphereGeometry(size, 32, 24), gold = goldSolid(0.18);
  CITTA.forEach((grp, k) => {
    const r = k === 0 ? r0 * 0.55 : r0 + (k - 1) * dr * (k === 1 ? 0 : 1) + (k > 1 ? 0 : 0);
    const rad = k === 0 ? 0.28 : k <= 2 ? 0.62 : r0 + (k - 2) * dr + 0.12;
    const count = grp.n, mat = pearl(grp.tint), off = k * 0.37;
    for (let i = 0; i < count; i++) {
      const a = off + (i / count) * Math.PI * 2 + (k === 2 ? Math.PI / 2 : 0);
      const m = new THREE.Mesh(geo, mat); const h = V(Math.cos(a) * rad, Math.sin(a) * rad, 0); m.position.copy(h);
      m.userData = { group: grp.key, ring: k, home: h }; g.add(m); pearls.push(m); homes.push(h);
    }
    if (k !== 1) { const t = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.0045, 6, 200), gold); t.userData.ring = k; g.add(t); rings.push(t); }
  });
  // radial spokes and lotus petals in gold wire
  const R = 0.5 + 5 * 0.42 + 0.12, petals = new THREE.Group(); g.add(petals);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const pts = [V(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0), V(Math.cos(a) * R, Math.sin(a) * R, 0)];
    petals.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(...pts), 4, 0.0035, 5, false), gold)); }
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, b = a + Math.PI / 12, c = a + Math.PI / 6, rr = R + 0.02, tip = R + 0.34;
    const curve = new THREE.CatmullRomCurve3([V(Math.cos(a) * rr, Math.sin(a) * rr, 0), V(Math.cos(b - 0.12) * (tip - 0.1), Math.sin(b - 0.12) * (tip - 0.1), 0), V(Math.cos(b) * tip, Math.sin(b) * tip, 0), V(Math.cos(b + 0.12) * (tip - 0.1), Math.sin(b + 0.12) * (tip - 0.1), 0), V(Math.cos(c) * rr, Math.sin(c) * rr, 0)]);
    petals.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.005, 5, false), gold)); }
  castAll(g, true, false);
  return { group: g, pearls, rings, petals, homes, R: R + 0.34 };
}

// A gear outline extruded in gold leaf.
export function gear({ teeth = 18, r = 0.5, depth = 0.06, hole = 0.12, spokes = 5 } = {}) {
  const s = new THREE.Shape(), tooth = 0.07 * r / 0.5 * 1.4;
  for (let i = 0; i < teeth * 4; i++) { const a = i / (teeth * 4) * Math.PI * 2, q = i % 4, rr = q === 1 || q === 2 ? r + tooth : r; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? s.lineTo(x, y) : s.moveTo(x, y); }
  for (let k = 0; k < spokes; k++) { const a = k / spokes * Math.PI * 2 + 0.3, h = new THREE.Path(); const rr = (r * 0.42 + hole) / 2 + r * 0.18;
    h.absarc(Math.cos(a) * rr, Math.sin(a) * rr, r * 0.16, 0, Math.PI * 2, true); s.holes.push(h); }
  const hp = new THREE.Path(); hp.absarc(0, 0, hole, 0, Math.PI * 2, true); s.holes.push(hp);
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 2, curveSegments: 6 }); geo.center();
  const m = new THREE.Mesh(geo, goldLeaf(31 + teeth, { cells: 3 })); m.castShadow = true; return m;
}

// An armillary sphere (hồn nghi) in gold leaf with a gear train and a pearl core: "a very complex machine".
export function armillary() {
  const g = new THREE.Group(), rings = [], gears = [], orbiters = [];
  const gl = goldLeaf(41, { cells: 3, repeat: [10, 1] });
  [[1.12, 0.026, [0, 0, 0]], [1.12, 0.026, [Math.PI / 2, 0, 0]], [1.04, 0.02, [0.41, 0, 0]], [0.96, 0.018, [Math.PI / 2, 0.6, 0]], [1.22, 0.012, [0.2, 0, 1.1]]].forEach(([r, tube, rot]) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 12, 220), gl); m.rotation.set(...rot); g.add(m); rings.push(m); });
  // engraved band (ecliptic) with tick marks
  const c = document.createElement('canvas'); c.width = 2048; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#d6a44c'; x.fillRect(0, 0, 2048, 64); x.fillStyle = '#3a2408';
  for (let i = 0; i < 180; i++) { const px = i / 180 * 2048; x.fillRect(px, 0, 2, i % 5 ? 18 : 34); }
  for (let i = 0; i < 12; i++) { x.beginPath(); x.arc(i / 12 * 2048 + 85, 46, 6, 0, 7); x.fill(); }
  const bt = new THREE.CanvasTexture(c); bt.colorSpace = THREE.SRGBColorSpace;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.06, 0.1, 160, 1, true), new THREE.MeshPhysicalMaterial({ map: bt, metalness: 1, roughness: 0.28, side: THREE.DoubleSide }));
  band.rotation.set(0.41, 0, 0.2); g.add(band); rings.push(band);
  // gear train in the core
  const gt = new THREE.Group(); g.add(gt);
  [[18, 0.36, V(0, 0, 0)], [12, 0.25, V(0.62, 0.0, 0.02)], [24, 0.46, V(-0.18, -0.78, -0.02)], [10, 0.2, V(-0.62, 0.32, 0.03)]].forEach(([teeth, r, p], i) => {
    const m = gear({ teeth, r, depth: 0.05 }); m.position.copy(p); m.userData.ratio = (i % 2 ? -1 : 1) * 18 / teeth; gt.add(m); gears.push(m); });
  gt.scale.setScalar(0.62); gt.rotation.set(-0.25, 0.35, 0);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 48, 32), pearl(0xfff4e2)); g.add(core);
  const om = pearl(0xe8f0ff);
  for (let i = 0; i < 10; i++) { const o = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 14), om); o.userData = { r: 0.55 + (i % 3) * 0.18, a: i * 0.63, s: 0.6 + (i % 4) * 0.25, tilt: (i % 5) * 0.5 }; g.add(o); orbiters.push(o); }
  castAll(g, true, false);
  return { group: g, rings, gears, core, orbiters };
}

// Lacquer pedestal with a gold inlay ring.
export function pedestal({ r = 0.6, h = 0.5 } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 96), lacquer(PAL.lacquerWarm)); body.position.y = h / 2; g.add(body);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.002, 0.012, 8, 128), goldSolid(0.2)); ring.rotation.x = Math.PI / 2; ring.position.y = h - 0.04; g.add(ring);
  castAll(g); return g;
}

// Black lacquer box with vermilion interior and a hinged lid.
export function lacquerBox({ w = 1.3, h = 0.42, d = 0.9 } = {}) {
  const g = new THREE.Group(), out = lacquer(), inside = lacquer(PAL.cinnabar), gold = goldSolid(0.25);
  const wall = 0.05;
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  add(new RoundedBoxGeometry(w, wall, d, 2, 0.01), out, 0, wall / 2, 0);
  add(new RoundedBoxGeometry(w, h, wall, 2, 0.01), out, 0, h / 2, d / 2 - wall / 2); add(new RoundedBoxGeometry(w, h, wall, 2, 0.01), out, 0, h / 2, -d / 2 + wall / 2);
  add(new RoundedBoxGeometry(wall, h, d, 2, 0.01), out, w / 2 - wall / 2, h / 2, 0); add(new RoundedBoxGeometry(wall, h, d, 2, 0.01), out, -w / 2 + wall / 2, h / 2, 0);
  const inner = add(new THREE.BoxGeometry(w - 2 * wall - 0.005, 0.01, d - 2 * wall - 0.005), inside, 0, wall + 0.006, 0);
  [[w - 2 * wall, h - wall, 0.004, 0, (h + wall) / 2, d / 2 - wall - 0.003], [w - 2 * wall, h - wall, 0.004, 0, (h + wall) / 2, -d / 2 + wall + 0.003]].forEach(([a, b, c, x, y, z]) => add(new THREE.BoxGeometry(a, b, c), inside, x, y, z));
  const hinge = new THREE.Group(); hinge.position.set(0, h, -d / 2); g.add(hinge);
  const lidPanel = lacquerPanelTexture({ w: 512, h: 360, lotus: true, seed: 9 });
  const lid = new THREE.Mesh(new RoundedBoxGeometry(w + 0.04, 0.07, d + 0.04, 2, 0.015), [gold, gold, lacquer(PAL.lacquer, { map: lidPanel }), inside, gold, gold]); lid.position.set(0, 0.035, d / 2); hinge.add(lid);
  castAll(g);
  return { group: g, hinge, inner };
}

// Phone lying screen-up on the lacquer, its screen showing a clock.
export function phone(timeText = '02:00', dateText = '') {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.05, 1.6, 4, 0.02), new THREE.MeshPhysicalMaterial({ color: 0x0c0d10, metalness: 0.7, roughness: 0.25, clearcoat: 1 }));
  body.position.y = 0.025; g.add(body);
  const c = document.createElement('canvas'); c.width = 480; c.height = 984; const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 984); gr.addColorStop(0, '#1b2a5c'); gr.addColorStop(0.6, '#0b1230'); gr.addColorStop(1, '#05070f'); x.fillStyle = gr; x.fillRect(0, 0, 480, 984);
  x.fillStyle = '#eef2ff'; x.textAlign = 'center'; x.font = `300 170px ${FONT_SANS}`; x.fillText(timeText, 240, 300);
  x.font = `500 30px ${FONT_SANS}`; x.globalAlpha = 0.75; x.fillText(dateText, 240, 352); x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 1.48), new THREE.MeshBasicMaterial({ map: t, color: 0xc8d0e8 })); screen.rotation.x = -Math.PI / 2; screen.position.y = 0.0515; g.add(screen);
  castAll(g); return { group: g, screen };
}

// Frosted-glass notification card.
export function glassCard(text, { w = 1.25 } = {}) {
  const g = new THREE.Group();
  const card = new THREE.Mesh(new RoundedBoxGeometry(w, 0.26, 0.02, 3, 0.012), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0, transmission: 0, transparent: true, opacity: 0.16, clearcoat: 1 }));
  g.add(card);
  const { tex, aspect } = textTexture(text, { size: 48, color: '#f3f5ff', weight: 500, font: FONT_SANS, pad: 18 });
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.15 * aspect, 0.15), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })); lab.position.z = 0.012; g.add(lab);
  return { group: g, card, lab };
}

// Pearl-white refrigerator with a hinged door and a warm interior.
export function fridge() {
  const g = new THREE.Group(), W = 1.05, Hh = 2.1, D = 0.85;
  const shell = new THREE.MeshPhysicalMaterial({ color: 0xece6dc, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(W, Hh, D, 4, 0.05), shell); body.position.y = Hh / 2; g.add(body);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.12, Hh - 0.16), new THREE.MeshBasicMaterial({ color: 0xffe2a8 })); inner.position.set(0, Hh / 2, D / 2 + 0.002); g.add(inner);
  const hinge = new THREE.Group(); hinge.position.set(-W / 2, 0, D / 2 + 0.01); g.add(hinge);
  const door = new THREE.Mesh(new RoundedBoxGeometry(W, Hh, 0.08, 4, 0.03), shell); door.position.set(W / 2, Hh / 2, 0.04); hinge.add(door);
  const handle = new THREE.Mesh(new RoundedBoxGeometry(0.035, 0.6, 0.05, 2, 0.012), goldSolid(0.2)); handle.position.set(W - 0.1, Hh * 0.62, 0.11); hinge.add(handle);
  castAll(g);
  return { group: g, hinge, inner, W, H: Hh, D };
}
