// "Digital lacquer" material kit: black lacquer, gold leaf, mother-of-pearl, eggshell crackle, vermilion lacquer.
// Inspired by Vietnamese sơn mài: layers of lacquer, gold/silver leaf, duck-eggshell mosaic and mother-of-pearl inlay,
// revealed by polishing.
import * as THREE from 'three';

export const PAL = {
  lacquer: 0x0b0907, lacquerWarm: 0x16100b, cinnabar: 0xa8231a, vermilion: 0xc63a22, gold: 0xd6a44c,
  goldDeep: 0xa8762a, ivory: 0xefe6d2, pearl: 0xf3eee7,
};

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const tex = (c, srgb = true, rep = [1, 1]) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t; };

// Gold leaf is laid in small squares: visible seams, slight tonal shifts and tiny wrinkles.
export function goldLeafTextures(seed = 1, cells = 6) {
  const N = 512, c = document.createElement('canvas'), r = document.createElement('canvas'); c.width = c.height = r.width = r.height = N;
  const x = c.getContext('2d'), y = r.getContext('2d'), R = rng(seed), s = N / cells;
  for (let i = 0; i < cells; i++) for (let j = 0; j < cells; j++) {
    const v = 0.86 + R() * 0.22; x.fillStyle = `rgb(${Math.min(255, 214 * v)},${Math.min(255, 164 * v)},${Math.min(255, 76 * v)})`; x.fillRect(i * s, j * s, s + 1, s + 1);
    const rr = 70 + R() * 50; y.fillStyle = `rgb(${rr},${rr},${rr})`; y.fillRect(i * s, j * s, s + 1, s + 1);
  }
  // seams + wrinkles
  x.strokeStyle = 'rgba(90,55,15,.55)'; y.strokeStyle = 'rgba(200,200,200,.9)';
  for (let i = 0; i <= cells; i++) { [x, y].forEach(g => { g.lineWidth = 1.5; g.beginPath(); g.moveTo(i * s + (R() - .5) * 3, 0); g.lineTo(i * s + (R() - .5) * 3, N); g.moveTo(0, i * s + (R() - .5) * 3); g.lineTo(N, i * s + (R() - .5) * 3); g.stroke(); }); }
  for (let k = 0; k < 140; k++) { const px = R() * N, py = R() * N, l = 6 + R() * 22, a = R() * 6.28;
    x.strokeStyle = `rgba(255,240,200,${0.15 + R() * 0.25})`; x.lineWidth = 0.8; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
    y.strokeStyle = 'rgba(160,160,160,.8)'; y.beginPath(); y.moveTo(px, py); y.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); y.stroke(); }
  return { map: tex(c), roughnessMap: tex(r, false) };
}
export function goldLeaf(seed = 1, { cells = 6, repeat = [1, 1] } = {}) {
  const t = goldLeafTextures(seed, cells); t.map.repeat.set(...repeat); t.roughnessMap.repeat.set(...repeat);
  return new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: t.map, metalness: 1, roughness: 1, roughnessMap: t.roughnessMap, clearcoat: 0.3, clearcoatRoughness: 0.2 });
}
export function goldSolid(rough = 0.22) { return new THREE.MeshPhysicalMaterial({ color: PAL.gold, metalness: 1, roughness: rough, clearcoat: 0.4 }); }

// Black lacquer: deep, warm black with a mirror-like clearcoat.
export function lacquer(color = PAL.lacquer, { map = null } = {}) {
  return new THREE.MeshPhysicalMaterial({ color, map, roughness: 0.32, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.04, reflectivity: 0.6 });
}
export function vermilionLacquer() { return lacquer(PAL.cinnabar); }

// Mother-of-pearl (xà cừ): pale nacre with iridescence and sheen; slight per-group tint.
export function nacreTexture(seed = 3) {
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), R = rng(seed);
  x.fillStyle = '#f4efe8'; x.fillRect(0, 0, N, N);
  for (let k = 0; k < 40; k++) { x.strokeStyle = `hsla(${R() * 360},40%,${80 + R() * 15}%,.35)`; x.lineWidth = 2 + R() * 6; x.beginPath();
    let px = 0, py = R() * N; x.moveTo(px, py); while (px < N) { px += 12; py += (R() - .5) * 18; x.lineTo(px, py); } x.stroke(); }
  return tex(c);
}
let _nacre = null;
export function pearl(tint = PAL.pearl) {
  _nacre = _nacre || nacreTexture();
  return new THREE.MeshPhysicalMaterial({ color: tint, map: _nacre, emissive: new THREE.Color(tint).multiplyScalar(0.16), envMapIntensity: 1.6, roughness: 0.16, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08,
    iridescence: 1, iridescenceIOR: 1.55, iridescenceThicknessRange: [220, 780], sheen: 0.6, sheenColor: new THREE.Color(0xd8e8ff), sheenRoughness: 0.4 });
}

// Duck-eggshell crackle mosaic on lacquer (ivory cells with dark cracks).
export function eggshellTexture(seed = 5, cells = 90) {
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), R = rng(seed);
  x.fillStyle = '#16100b'; x.fillRect(0, 0, N, N);
  const pts = [...Array(cells)].map(() => [R() * N, R() * N]);
  const img = x.getImageData(0, 0, N, N), d = img.data;
  for (let py = 0; py < N; py += 2) for (let px = 0; px < N; px += 2) {
    let a = 1e9, b = 1e9, ai = 0;
    pts.forEach(([qx, qy], i) => { const dx = Math.min(Math.abs(qx - px), N - Math.abs(qx - px)), dy = Math.min(Math.abs(qy - py), N - Math.abs(qy - py)), dd = dx * dx + dy * dy; if (dd < a) { b = a; a = dd; ai = i; } else if (dd < b) b = dd; });
    const edge = Math.sqrt(b) - Math.sqrt(a), shade = 214 + ((ai * 37) % 30);
    const v = edge < 2.2 ? 30 : shade;
    for (let oy = 0; oy < 2; oy++) for (let ox = 0; ox < 2; ox++) { const o = ((py + oy) * N + px + ox) * 4; d[o] = v; d[o + 1] = v * 0.96; d[o + 2] = v * 0.86; d[o + 3] = 255; }
  }
  x.putImageData(img, 0, 0);
  return tex(c);
}

// A black lacquer panel with a gold-leaf border and a lotus drawn in gold and eggshell.
export function lacquerPanelTexture({ w = 512, h = 512, lotus = true, border = true, seed = 7 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'), R = rng(seed);
  const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#120c08'); g.addColorStop(1, '#070504'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  if (border) { x.strokeStyle = '#d6a44c'; x.lineWidth = w * 0.012; x.strokeRect(w * 0.06, h * 0.06, w * 0.88, h * 0.88); x.lineWidth = w * 0.004; x.strokeRect(w * 0.085, h * 0.085, w * 0.83, h * 0.83); }
  if (lotus) {
    x.save(); x.translate(w / 2, h * 0.56); const s = w * 0.0026;
    for (let k = -3; k <= 3; k++) { x.save(); x.rotate(k * 0.36); x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(-26 * s * 10, -40 * s * 10, -10 * s * 10, -86 * s * 10, 0, -100 * s * 10); x.bezierCurveTo(10 * s * 10, -86 * s * 10, 26 * s * 10, -40 * s * 10, 0, 0);
      x.fillStyle = Math.abs(k) % 2 ? '#e9dfc9' : '#d6a44c'; x.globalAlpha = 0.92; x.fill(); x.globalAlpha = 1; x.strokeStyle = '#6a4a1a'; x.lineWidth = 1.2; x.stroke(); x.restore(); }
    x.restore();
  }
  // faint polish marks
  for (let k = 0; k < 60; k++) { x.strokeStyle = `rgba(255,230,190,${R() * 0.03})`; x.lineWidth = 1; x.beginPath(); const yy = R() * h; x.moveTo(0, yy); x.lineTo(w, yy + (R() - .5) * 20); x.stroke(); }
  return tex(c);
}

// Palm-leaf (lá buông) page: warm parchment with fibres and incised script lines.
export function palmLeafTexture(seed = 1) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 160; const x = c.getContext('2d'), R = rng(seed);
  const g = x.createLinearGradient(0, 0, 0, 160); g.addColorStop(0, '#e3c690'); g.addColorStop(0.5, '#d6b47a'); g.addColorStop(1, '#bf9558'); x.fillStyle = g; x.fillRect(0, 0, 1024, 160);
  for (let k = 0; k < 260; k++) { x.strokeStyle = `rgba(120,80,30,${0.04 + R() * 0.08})`; x.lineWidth = 1; x.beginPath(); const yy = R() * 160; x.moveTo(0, yy); x.lineTo(1024, yy + (R() - .5) * 4); x.stroke(); }
  x.strokeStyle = 'rgba(55,32,10,.62)'; x.lineWidth = 2.2;
  for (let l = 0; l < 4; l++) { let px = 60; const yy = 34 + l * 30; x.beginPath(); x.moveTo(px, yy);
    while (px < 960) { const seg = 4 + R() * 9; if (R() < 0.12) { px += 14; x.moveTo(px, yy); continue; } x.quadraticCurveTo(px + seg / 2, yy - 6 + R() * 12, px + seg, yy + (R() - .5) * 3); px += seg; } x.stroke(); }
  x.fillStyle = 'rgba(40,22,6,.85)'; [340, 684].forEach(cx => { x.beginPath(); x.arc(cx, 80, 9, 0, 7); x.fill(); });
  return tex(c);
}

// Studio environment for reflections: a dark room with large soft boxes. Gold, pearl and lacquer get their
// premium look from these highlights.
export function studioEnvironment(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ color: 0x050403, side: THREE.BackSide })));
  const box = (w, h, pos, rot, rgb) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb), side: THREE.DoubleSide }));
    m.position.set(...pos); m.rotation.set(...rot); s.add(m); };
  box(30, 10, [0, 22, 4], [Math.PI / 2, 0, 0], [3.2, 2.7, 2.1]);         // big warm overhead softbox
  box(3, 26, [-20, 4, 6], [0, Math.PI / 2, 0], [2.4, 2.2, 2.0]);         // tall strip, left
  box(2, 24, [20, 4, -6], [0, -Math.PI / 2, 0], [0.9, 1.1, 1.5]);        // cool rim strip, right
  box(16, 4, [0, 2, -24], [0, 0, 0], [1.2, 0.8, 0.5]);                   // warm back glow
  box(40, 40, [0, -14, 0], [-Math.PI / 2, 0, 0], [0.05, 0.035, 0.025]);  // dark floor bounce
  const pm = new THREE.PMREMGenerator(renderer);
  return pm.fromScene(s, 0.03).texture;
}
