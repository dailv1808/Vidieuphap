// Episode 01 (v3). Each scene: build(group, engine) -> { update(localT, duration, engine) }
// Framing rule: the subject lives in the middle band of the frame (between the headline and the captions),
// roughly within 0.3 x camera-distance in width and height, centered near world y = 0.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { C, V, clamp, lerp, smooth, easeOut, easeInOut, backOut, rng, textPlane, glowSprite, flare, dotTexture, orbMaterial, glassMaterial, shockwave, particleField, FONT_TITLE } from './engine.js';

export const CITTA_GROUPS = [
  { key: 'tham', n: 8, color: 0xff8a3d }, { key: 'san', n: 2, color: 0xff3b3b }, { key: 'si', n: 2, color: 0x9aa3ad },
  { key: 'vonhan', n: 18, color: 0x7fd0ff }, { key: 'tinhhao', n: 24, color: 0xffc94a },
  { key: 'sacgioi', n: 15, color: 0xc6a8ff }, { key: 'vosac', n: 12, color: 0xf3ead8 }, { key: 'sieuthe', n: 8, color: 0xfff6d0 },
];
const cittaList = () => CITTA_GROUPS.flatMap(g => Array(g.n).fill(g));
const fib = (i, n, r) => { const y = 1 - (i / (n - 1)) * 2, rad = Math.sqrt(1 - y * y), th = Math.PI * (3 - Math.sqrt(5)) * i; return V(Math.cos(th) * rad * r, y * r, Math.sin(th) * rad * r); };
const camTo = (e, p, l, fov = 38) => { e.camera.position.copy(p); e.camera.lookAt(l); e.camera.fov = fov; };
const chrome = () => new THREE.MeshPhysicalMaterial({ color: 0xe8e8ee, metalness: 1, roughness: 0.14, clearcoat: 1 });
function rod(a, b, r, mat) {
  const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 14), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return m;
}
function leafMaterial(seed) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 96); g.addColorStop(0, '#e2c088'); g.addColorStop(1, '#b88f52'); x.fillStyle = g; x.fillRect(0, 0, 512, 96);
  const r = rng(seed); x.strokeStyle = 'rgba(70,40,15,.55)'; x.lineWidth = 2;
  for (let l = 0; l < 4; l++) { x.beginPath(); let px = 30; const y = 20 + l * 19; x.moveTo(px, y); while (px < 480) { px += 6 + r() * 10; x.lineTo(px, y + (r() - .5) * 5); } x.stroke(); }
  x.fillStyle = 'rgba(60,35,10,.8)'; x.beginPath(); x.arc(170, 48, 6, 0, 7); x.arc(340, 48, 6, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: .7 });
}
function palmBook(nLeaves = 12, seed = 1) {
  const g = new THREE.Group(), leaves = [];
  const cover = new THREE.MeshPhysicalMaterial({ color: 0x5a3519, roughness: .45, clearcoat: .6 });
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xd9a441, metalness: 1, roughness: .25 });
  const bot = new THREE.Mesh(new RoundedBoxGeometry(5.2, 0.16, 1.0, 2, 0.06), cover); bot.position.y = -0.1; g.add(bot);
  for (let i = 0; i < nLeaves; i++) { const p = new THREE.Group(); p.add(new THREE.Mesh(new THREE.BoxGeometry(5, 0.035, 0.9), leafMaterial(seed + i))); p.position.y = i * 0.045; g.add(p); leaves.push(p); }
  const top = new THREE.Mesh(new RoundedBoxGeometry(5.2, 0.16, 1.0, 2, 0.06), cover); top.position.y = nLeaves * 0.045 + 0.06; g.add(top);
  [-1.2, 1.2].forEach(x => { const s = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 8, 24), gold); s.position.set(x, nLeaves * 0.045 + 0.16, 0); s.rotation.x = Math.PI / 2; top.add(s); s.position.y = 0.09; });
  return { g, leaves, top };
}
function mannequin(mat) {
  const g = new THREE.Group();
  const add = (geo, x, y, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, 0); m.rotation.z = rz; g.add(m); };
  add(new THREE.SphereGeometry(0.42, 28, 20), 0, 2.55);
  add(new THREE.CapsuleGeometry(0.62, 1.3, 8, 18), 0, 1.3);
  add(new THREE.CapsuleGeometry(0.18, 1.2, 4, 12), -0.85, 1.35, 0.18); add(new THREE.CapsuleGeometry(0.18, 1.2, 4, 12), 0.85, 1.35, -0.18);
  add(new THREE.CapsuleGeometry(0.22, 1.3, 4, 12), -0.3, -0.35); add(new THREE.CapsuleGeometry(0.22, 1.3, 4, 12), 0.3, -0.35);
  return g;
}
// point positions forming a head-and-shoulders bust
function bustPoints(n, r, s = 1) {
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
function puffTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.5, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}

export const scenes = [
  // 1 · Hook: palm-leaf book opens, 89 iridescent orbs burst into a galaxy
  { build(g, e) {
    const book = palmBook(12, 3); book.g.scale.setScalar(0.68); book.g.position.set(0, -1.0, 0); g.add(book.g);
    const light = new THREE.PointLight(0xffc870, 0, 18); light.position.set(0, 0, 1.5); g.add(light);
    const halo = glowSprite('#ffcf7a', 3.5, 0.3); halo.position.set(0, -0.7, -0.5); g.add(halo);
    const fl = flare('#ffd9a0', 9, 0.4, 0); fl.position.set(0, -0.6, 0.6); g.add(fl);
    const wave = shockwave(0xffd27a); wave.rotation.x = Math.PI / 2 - 0.35; wave.position.y = -0.6; g.add(wave);
    const list = cittaList(), geo = new THREE.SphereGeometry(0.12, 24, 16);
    const orbs = list.map(c => { const o = new THREE.Mesh(geo, orbMaterial(c.color, 0.35)); g.add(o); return o; });
    const target = list.map((c, i) => { const a = i * 2.39996, r = 0.9 + Math.sqrt(i / 89) * 2.6; return V(Math.cos(a) * r, 0.5 + Math.sin(i * 1.7) * 0.35, Math.sin(a) * r); });
    const burst = e.wordTime(0, 'đếm') ?? 2.6;
    return { update(t, d, e) {
      e.setNebula(0x0a1030, 0x23305e, 0x9a5a3a, 0.6);
      const open = smooth(burst - 1.2, burst, t);
      book.g.rotation.set(0.3, -0.5 + t * 0.12, 0);
      book.leaves.forEach((p, i) => { const k = (i - 5.5) / 6; p.rotation.z = k * 0.5 * open; p.position.y = i * 0.045 + open * i * 0.08; });
      book.top.position.y = 12 * 0.045 + 0.06 + open * 0.45; book.top.rotation.z = open * 0.3;
      light.intensity = 2 + open * 4; halo.material.opacity = 0.1 + open * 0.18;
      const fk = clamp((t - burst) / 1.2); fl.material.opacity = Math.sin(Math.PI * fk) * 0.9;
      wave.userData.play(clamp((t - burst) / 1.6), 3.2);
      orbs.forEach((o, i) => {
        const k = easeOut((t - burst - i * 0.012) / 2.2);
        const to = target[i].clone().applyAxisAngle(V(0, 1, 0), t * 0.22).applyAxisAngle(V(1, 0, 0), 0.35);
        const swirl = V(Math.sin(i + t * 2) * (1 - k) * 0.8, Math.cos(i * 2 + t) * (1 - k) * 0.8, 0);
        o.position.copy(V(0, -0.6, 0).lerp(to, k).add(swirl)); o.visible = t > burst - 0.05; o.scale.setScalar(0.3 + k * 0.9);
      });
      camTo(e, V(Math.sin(t * 0.18) * 2.2, 1.6 + t * 0.05, 14 - t * 0.25), V(0, 0, 0));
      e.bloom.strength = 0.49 + open * 0.2;
    } };
  } },

  // 2 · Three moments: storm cloud of anger, phone at 2:00 with notifications, fridge at 23:00
  { build(g, e) {
    const A = new THREE.Group(); A.position.y = 0.4; g.add(A);
    const ptex = puffTexture(), r = rng(11), puffs = [];
    for (let i = 0; i < 46; i++) {
      const dark = r() < 0.6;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ptex, color: dark ? 0x6a4a58 : 0xa85a68, transparent: true, depthWrite: false, opacity: 0.9 }));
      const a = r() * Math.PI * 2, rad = Math.sqrt(r());
      s.position.set(Math.cos(a) * rad * 1.9, Math.sin(a) * rad * 0.7 + 0.2, (r() - .5) * 1.2); s.scale.setScalar(0.9 + r() * 1.2); A.add(s); puffs.push(s);
    }
    const inner = glowSprite('#ff2d2d', 2.6, 0); inner.position.z = 0.2; A.add(inner);
    const bolts = [0, 1].map(k => { const pts = []; let x = k ? -0.6 : 0.4; for (let i = 0; i < 9; i++) { pts.push(V(x, -0.2 - i * 0.32, 0.8)); x += (r() - .5) * 0.6; }
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xfff3c8, toneMapped: false })); A.add(l); return l; });
    const strike = glowSprite('#fff0c0', 2.5, 0); strike.position.set(0.2, -1.6, 0.8); A.add(strike);
    const angry = textPlane('CÁU!', 0.9, { color: '#ff6b6b', glow: '#ff2020', weight: 900 }); angry.position.set(0, -1.9, 1.2); A.add(angry);
    // phone
    const B = new THREE.Group(); B.position.x = 16; g.add(B);
    const phone = new THREE.Mesh(new RoundedBoxGeometry(1.9, 3.8, 0.22, 4, 0.24), new THREE.MeshPhysicalMaterial({ color: 0x15181f, roughness: .25, metalness: .7, clearcoat: 1 })); B.add(phone);
    const sc = document.createElement('canvas'); sc.width = 480; sc.height = 960; const x2 = sc.getContext('2d');
    const gr = x2.createLinearGradient(0, 0, 0, 960); gr.addColorStop(0, '#2b3fae'); gr.addColorStop(1, '#0b1033'); x2.fillStyle = gr; x2.fillRect(0, 0, 480, 960);
    x2.fillStyle = '#fff'; x2.font = '800 150px Montserrat'; x2.textAlign = 'center'; x2.fillText('02:00', 240, 250);
    x2.font = '600 34px Montserrat'; x2.fillText('Thứ Ba, 12 tháng 11', 240, 310);
    const stex = new THREE.CanvasTexture(sc); stex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 3.6), new THREE.MeshBasicMaterial({ map: stex, color: 0xa8b0c8 })); screen.position.z = 0.115; phone.add(screen);
    const blue = glowSprite('#4d7bff', 6, 0.45); blue.position.z = -0.6; B.add(blue);
    { const pl = new THREE.PointLight(0x5577ff, 18, 10); pl.position.set(0, 0, 2); B.add(pl); }
    const notes = ['Video bạn sẽ thích', '+99 tin nhắn', 'Xem tiếp tập 5?', 'Đang trực tuyến', 'Lướt thêm chút…'].map((s, i) => {
      const m = textPlane(s, 0.3, { color: '#fff', weight: 700, bg: 'rgba(30,40,80,.9)', radius: 30, pad: 26 }); B.add(m); return m; });
    // fridge
    const Cc = new THREE.Group(); Cc.position.x = 32; Cc.scale.setScalar(0.78); g.add(Cc);
    const fm = new THREE.MeshPhysicalMaterial({ color: 0xd8dee4, roughness: .3, metalness: .3, clearcoat: .8 });
    Cc.add(new THREE.Mesh(new RoundedBoxGeometry(2.3, 4.4, 1.8, 3, 0.12), fm));
    const inside = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 4.0), new THREE.MeshBasicMaterial({ color: 0xc8b080 })); inside.position.z = 0.91; Cc.add(inside);
    const pivot = new THREE.Group(); pivot.position.set(-1.15, 0, 0.92); Cc.add(pivot);
    const door = new THREE.Mesh(new RoundedBoxGeometry(2.3, 4.4, 0.22, 3, 0.1), fm); door.position.set(1.15, 0, 0.11); pivot.add(door);
    const rays = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 3.2, 5, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    rays.rotation.x = Math.PI / 2; rays.position.set(0.3, 0, 3.4); Cc.add(rays);
    const warm = new THREE.PointLight(0xffd79a, 0, 12); warm.position.set(0, 0, 2.5); Cc.add(warm);
    const clock = textPlane('23:00', 0.62, { color: '#ffe3a3', glow: '#ffb347', weight: 800 }); clock.position.set(0, -2.75, 1.4); Cc.add(clock);
    const s1 = e.sentenceStart(1, 1), s2 = e.sentenceStart(1, 2), s3 = e.sentenceStart(1, 3);
    return { update(t, d, e) {
      e.setNebula(0x140812, 0x3a1424, 0x6a2a2a, 0.5);
      const flick = (Math.sin(t * 37) > 0.75 && Math.sin(t * 5.3) > 0) ? 1 : 0, act = t > s1 - 0.2;
      bolts.forEach((b, i) => { b.visible = act && flick && (i === 0 || Math.sin(t * 11) > 0); });
      strike.material.opacity = act ? flick * 0.8 : 0;
      inner.material.opacity = 0.12 + (act ? flick * 0.45 + smooth(s1, s1 + 1, t) * 0.1 : 0);
      puffs.forEach((p, i) => { p.position.x += Math.sin(t * 0.8 + i) * 0.0015; p.material.rotation = t * 0.05 * (i % 2 ? 1 : -1); });
      angry.material.opacity = smooth(s1 + 0.3, s1 + 0.7, t); angry.scale.setScalar(Math.max(0.001, backOut((t - s1 - 0.3) / 0.4)));
      phone.rotation.set(-0.12 + Math.sin(t) * .03, 0.3 + Math.sin(t * .7) * .1, 0);
      notes.forEach((m, i) => { const k = backOut((t - s2 - 0.5 - i * 0.45) / 0.45); m.scale.setScalar(Math.max(0.001, k));
        const a = -0.9 + i * 0.5; m.position.set(0.55 * (i % 2 ? -1 : 1), 1.4 - i * 0.62, 0.9 + Math.sin(t + i) * 0.1); });
      pivot.rotation.y = -1.9 * easeInOut((t - s3 - 0.2) / 1.0);
      const op = smooth(s3, s3 + 1.2, t); warm.intensity = op * 8; rays.material.opacity = op * 0.08;
      const k1 = easeInOut((t - s2 + 0.2) / 0.7), k2 = easeInOut((t - s3 + 0.2) / 0.7);
      const cx = lerp(lerp(0, 16, k1), 32, k2);
      const dist = (t < s1 ? 14 - t * 0.4 : 12.5) * (1 - k1) + 11.5 * k1;
      camTo(e, V(cx + 0.8 + k2 * 4.5, 0.6 + k2 * 0.6, dist + k2 * 4.5), V(cx - k2 * 0.4, -0.2 * k2, 0));
      e.bloom.strength = 0.45;
    } };
  } },

  // 3 · The mind: glass sphere with a firing neural web; an empty manual with a question mark
  { build(g, e) {
    const sph = new THREE.Mesh(new THREE.SphereGeometry(1.75, 64, 32), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { c: { value: new THREE.Color(0x6fc8ff) } },
      vertexShader: 'varying vec3 n; varying vec3 v; void main(){ n=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); v=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform vec3 c; varying vec3 n; varying vec3 v; void main(){ float f=pow(1.-abs(dot(n,v)),2.6); gl_FragColor=vec4(c*f*1.4, f); }' }));
    const core = new THREE.Group(); core.position.y = 0.6; g.add(core); core.add(sph);
    const rings = [0, 1, 2].map(i => { const m = new THREE.Mesh(new THREE.TorusGeometry(2.05 + i * 0.18, 0.012, 8, 200), new THREE.MeshBasicMaterial({ color: [0xffc94a, 0x7fd0ff, 0xe98aa8][i], toneMapped: false })); core.add(m); return m; });
    const r = rng(5), N = 140, nodes = [];
    for (let i = 0; i < N; i++) { const p = fib(i, N, 1.0 + r() * 0.55); nodes.push(p); }
    const pairs = []; for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (nodes[i].distanceTo(nodes[j]) < 0.55) pairs.push([i, j]);
    const lp = new Float32Array(pairs.length * 6); pairs.forEach(([a, b], k) => { lp.set([nodes[a].x, nodes[a].y, nodes[a].z, nodes[b].x, nodes[b].y, nodes[b].z], k * 6); });
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
    const web = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })); core.add(web);
    const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nodes.flatMap(p => [p.x, p.y, p.z])), 3));
    const np = new THREE.Points(ng, new THREE.PointsMaterial({ size: 0.12, map: dotTexture(), color: 0xd8f3ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); core.add(np);
    const sparks = [...Array(24)].map((_, i) => { const s = glowSprite(['#ffd27a', '#7fd0ff', '#ff9fbb'][i % 3], 0.55, 0); core.add(s); return s; });
    const manual = new THREE.Group(); manual.position.set(0, -2.25, 1.6); g.add(manual);
    manual.add(new THREE.LineSegments(new THREE.EdgesGeometry(new RoundedBoxGeometry(1.25, 1.65, 0.22, 2, 0.06)), new THREE.LineBasicMaterial({ color: 0xffd27a })));
    const q = textPlane('?', 1.05, { color: '#ffd27a', glow: '#ffb347', weight: 800, font: FONT_TITLE }); q.position.z = 0.05; manual.add(q);
    const s1 = e.sentenceStart(2, 1), s2 = e.sentenceStart(2, 2);
    return { update(t, d, e) {
      e.setNebula(0x061428, 0x123a5a, 0x3a2a6a, 0.6);
      const fast = smooth(s2, s2 + 1, t);
      core.rotation.y = t * (0.25 + fast * 0.5); core.rotation.x = 0.25;
      rings.forEach((m, i) => m.rotation.set(t * (0.3 + i * 0.2) + i, t * (0.2 + i * 0.15), i * 0.7));
      web.material.opacity = 0.25 + fast * 0.3 + 0.08 * Math.sin(t * 6);
      sparks.forEach((s, i) => { const [a, b] = pairs[(i * 37 + Math.floor(t * (2 + fast * 6) + i)) % pairs.length], f = (t * (2 + fast * 6) + i) % 1;
        s.position.lerpVectors(nodes[a], nodes[b], f); s.material.opacity = Math.sin(Math.PI * f) * (0.6 + fast * 0.4); });
      const mk = smooth(s1, s1 + 0.8, t); manual.visible = mk > 0.01; manual.scale.setScalar(Math.max(0.001, backOut((t - s1) / 0.6)));
      manual.rotation.y = Math.sin(t * 1.2) * 0.5; manual.position.y = -2.25 + Math.sin(t * 2) * 0.08;
      camTo(e, V(Math.sin(t * .2) * 1.0, 0.2, 14.5), V(0, -0.35 * mk, 0));
      e.bloom.strength = 0.52 + fast * 0.3;
    } };
  } },

  // 4 · Reveal: god rays, the book descends to a gold-ringed pedestal; title; the journey across countries
  { build(g, e) {
    const rays = [...Array(7)].map((_, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9 + (i % 3) * 0.5, 12), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { o: { value: 0 } },
      vertexShader: 'varying vec2 u; void main(){u=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform float o; varying vec2 u; void main(){ float a=smoothstep(0.,.5,u.y)*(1.-abs(u.x-.5)*2.)*o*.22; gl_FragColor=vec4(vec3(1.,.86,.58)*a,a); }' }));
      m.position.set(0, 3.5, -0.5); m.userData.a = (i - 3) * 0.09; g.add(m); return m; });
    const beamDust = particleField({ n: 260, spread: [2.4, 8, 2.4], center: [0, 1, 0], size: 4, seed: 4, drift: 0.05, color: 0xffe6b0 }); g.add(beamDust);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.0, 0.8, 64), new THREE.MeshPhysicalMaterial({ color: 0x2a2e38, roughness: .35, metalness: .4, clearcoat: 1 })); ped.position.y = -2.3; g.add(ped);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.03, 8, 128), new THREE.MeshBasicMaterial({ color: 0xffc94a, toneMapped: false })); ring.rotation.x = Math.PI / 2; ring.position.y = -1.9; g.add(ring);
    const book = palmBook(10, 21); book.g.scale.setScalar(0.55); g.add(book.g);
    const halo = glowSprite('#ffd27a', 3.5, 0); halo.position.set(0, -1.6, -0.6); g.add(halo);
    const title = textPlane('Vi Diệu Pháp', 0.95, { color: '#ffe7b0', glow: '#ffb347', weight: 800, font: FONT_TITLE }); title.position.set(0, 1.25, 0.6); g.add(title);
    const sub = textPlane('ABHIDHAMMA', 0.34, { color: '#ffffff', weight: 700 }); sub.position.set(0, 0.45, 0.6); g.add(sub);
    const wave = shockwave(0xffd27a); wave.rotation.x = Math.PI / 2; wave.position.y = -1.85; g.add(wave);
    const places = ['Miến Điện', 'Thái Lan', 'Việt Nam'].map((p, i) => {
      const grp = new THREE.Group(); grp.add(glowSprite('#ffcf7a', 0.9));
      const lab = textPlane(p, 0.3, { color: '#fff', weight: 700, bg: 'rgba(10,20,35,.8)', radius: 26 }); lab.position.y = -0.42; grp.add(lab);
      grp.position.set(-1.6 + i * 1.6, -3.1 + (i === 1 ? -0.25 : 0), 1.2); g.add(grp); return grp; });
    const arcPts = [...Array(40)].map((_, i) => { const k = i / 39; return V(-1.6 + 3.2 * k, -3.1 - Math.sin(Math.PI * k) * 0.25, 1.2); });
    const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPts), new THREE.LineBasicMaterial({ color: 0xffd27a, transparent: true, opacity: .7, toneMapped: false })); g.add(arc);
    const tTitle = e.wordTime(3, 'diệu') ?? 6, tPl = ['miến', 'thái', 'việt'].map(w => e.wordTime(3, w) ?? 99);
    const land = 2.6;
    return { update(t, d, e) {
      e.setNebula(0x0c0a1a, 0x2a2240, 0x8a6a3a, 0.55);
      rays.forEach((m, i) => { m.rotation.z = m.userData.a + Math.sin(t * 0.3 + i) * 0.03; m.material.uniforms.o.value = smooth(0.1, 1.2, t); });
      beamDust.material.uniforms.time.value = t;
      const lk = easeOut((t - 0.5) / (land - 0.5)); book.g.position.set(0, lerp(6, -1.82, lk), 0); book.g.rotation.y = 0.4 + t * 0.2;
      wave.userData.play(clamp((t - land) / 1.4), 3.5); halo.material.opacity = smooth(land - 0.3, land + 0.5, t) * 0.4;
      const tk = clamp((t - tTitle + 0.35) / 0.5); title.material.opacity = sub.material.opacity = tk;
      title.scale.setScalar(0.85 + 0.15 * easeOut(tk)); title.position.y = 1.25 + (1 - easeOut(tk)) * 0.3;
      places.forEach((p, i) => p.scale.setScalar(Math.max(0.001, backOut((t - tPl[i]) / 0.5))));
      const ak = clamp((t - tPl[0]) / Math.max(0.5, tPl[2] - tPl[0])); arc.geometry.setDrawRange(0, Math.floor(ak * 40)); arc.visible = ak > 0;
      camTo(e, V(Math.sin(t * .2) * 1.2, 0.3, 14), V(0, -0.5, 0));
      e.bloom.strength = 0.49;
    } };
  } },

  // 5 · A carousel of three baskets; the figure rises from "Luận" and gets X-rayed
  { build(g, e) {
    const wc = document.createElement('canvas'); wc.width = wc.height = 256; const x = wc.getContext('2d');
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { x.fillStyle = (i + j) % 2 ? '#c08a4c' : '#7a4f28'; x.fillRect(i * 16, j * 16 + (i % 2) * 8, 16, 8); }
    const wt = new THREE.CanvasTexture(wc); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(6, 2); wt.colorSpace = THREE.SRGBColorSpace;
    const prof = [[0, 0], [1.0, 0], [1.35, 0.5], [1.5, 1.4], [1.55, 1.8], [1.45, 1.85]].map(([a, b]) => new THREE.Vector2(a, b));
    const car = new THREE.Group(); car.position.y = -1.7; g.add(car);
    const names = [['Kinh', 'SUTTA'], ['Luật', 'VINAYA'], ['Luận', 'ABHIDHAMMA']];
    const R = 3.0;
    const baskets = names.map((nm, i) => {
      const grp = new THREE.Group(); const a = i * Math.PI * 2 / 3; grp.position.set(Math.sin(a) * R, 0, Math.cos(a) * R); car.add(grp);
      const m = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), new THREE.MeshStandardMaterial({ map: wt, roughness: .85, side: THREE.DoubleSide })); m.scale.setScalar(0.62); grp.add(m);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.93, 0.025, 8, 96), new THREE.MeshBasicMaterial({ color: 0xffc94a, toneMapped: false })); rim.rotation.x = Math.PI / 2; rim.position.y = 1.15; grp.add(rim);
      const lab = textPlane(nm[0], 0.78, { color: '#ffe7b0', glow: '#ffb347', weight: 800, font: FONT_TITLE }); lab.position.y = 2.25; grp.add(lab);
      const sub = textPlane(nm[1], 0.26, { color: '#fff', weight: 700 }); sub.position.y = 1.62; grp.add(sub);
      return { grp, lab, sub, rim, a };
    });
    const bubble = (s) => { const m = textPlane(s, 0.4, { color: '#13213a', weight: 800, bg: 'rgba(255,243,220,.96)', radius: 36 }); m.position.set(0, 1.45, 2.4); g.add(m); return m; };
    const advice = bubble('“Ngủ sớm đi, bớt giận đi!”'), rules = bubble('Nội quy người xuất gia');
    const scanY = new THREE.Plane(V(0, -1, 0), 0), scanY2 = new THREE.Plane(V(0, 1, 0), 0);
    const solid = mannequin(new THREE.MeshPhysicalMaterial({ color: 0xd9c2a5, roughness: .5, clearcoat: .3, clippingPlanes: [scanY] }));
    const xr = mannequin(new THREE.MeshBasicMaterial({ color: 0x6fe3ff, wireframe: true, transparent: true, opacity: .5, clippingPlanes: [scanY2], toneMapped: false }));
    const fig = new THREE.Group(); fig.add(solid, xr); fig.scale.setScalar(0.62); g.add(fig);
    const nodes = [[0, 2.6, '#ff6b6b'], [0.2, 1.6, '#ffb347'], [-0.25, 1.2, '#7fd0ff'], [0.1, 0.8, '#e98aa8'], [-0.1, 2.0, '#ffd27a']].map(([nx, ny, col]) => { const s = glowSprite(col, 0.9, 0); s.position.set(nx, ny, 0.3); fig.add(s); return s; });
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.05), new THREE.MeshBasicMaterial({ color: 0x9ff0ff, toneMapped: false })); fig.add(bar);
    const barGlow = flare('#7fe8ff', 5, 0.5, 0.8); fig.add(barGlow);
    const ss = [1, 2, 3, 4, 5].map(j => e.sentenceStart(4, j));
    return { update(t, d, e) {
      e.setNebula(0x0c0a14, 0x2a1e2a, 0x5a4020, 0.5);
      const focus = t < ss[0] ? 0 : t < ss[1] ? 0 : t < ss[2] ? 1 : 2;
      const prev = Math.max(0, focus - 1), k = easeInOut((t - (focus === 0 ? 0 : ss[focus === 1 ? 1 : 2]) + 0.1) / 0.9);
      const ang = lerp(prev, focus, focus === 0 ? 1 : k) * Math.PI * 2 / 3;
      car.rotation.y = -ang + (t < ss[0] ? (1 - easeOut(t / ss[0])) * 1.2 : 0);
      baskets.forEach((b, i) => { const front = i === focus; b.rim.material.color.setHex(front ? 0xffc94a : 0x6a5020);
        b.lab.material.opacity = b.sub.material.opacity = front ? 1 : 0; b.grp.children[0].rotation.y = t * 0.15;
        b.lab.quaternion.copy(car.quaternion).invert(); b.sub.quaternion.copy(b.lab.quaternion); });
      advice.scale.setScalar(focus === 0 && t > ss[0] + 1.0 ? Math.max(0.001, backOut((t - ss[0] - 1.0) / 0.5)) : 0.001);
      rules.scale.setScalar(focus === 1 ? Math.max(0.001, backOut((t - ss[1] - 0.6) / 0.5)) : 0.001);
      const rise = easeOut((t - ss[2] - 0.8) / 1.2); fig.visible = rise > 0.01; fig.position.set(0, lerp(-2.4, -1.05, rise), R + 0.2);
      baskets[2].lab.material.opacity *= 1 - rise; baskets[2].sub.material.opacity *= 1 - rise;
      const scan = clamp((t - ss[3]) / 2.2), yLocal = lerp(3.4, -1.3, scan), yW = fig.position.y + yLocal * 0.62;
      scanY.set(V(0, -1, 0), yW); scanY2.set(V(0, 1, 0), -yW);
      bar.position.y = barGlow.position.y = yLocal; bar.visible = barGlow.visible = scan > 0 && scan < 1;
      nodes.forEach((n, i) => { n.material.opacity = clamp((t - ss[4] - i * 0.25) / 0.4) * (0.7 + 0.3 * Math.sin(t * 4 + i)); });
      camTo(e, V(Math.sin(t * .25) * 0.8, 1.0, 13.5), V(0, -0.2, 0));
      e.bloom.strength = 0.45;
    } };
  } },

  // 6 · 89 iridescent orbs; 2 aversion, 8 greed, 8 great wholesome step forward
  { build(g, e) {
    const list = cittaList(), geo = new THREE.SphereGeometry(0.17, 28, 18);
    const orbs = list.map((c, i) => { const o = new THREE.Mesh(geo, orbMaterial(c.color, 0.35)); o.userData.home = fib(i, 89, 2.35); g.add(o); return o; });
    const labels = [['Tâm sân · 2', '#ff7a7a'], ['Tâm tham · 8', '#ffaa66'], ['Tâm đại thiện · 8', '#ffd56b']].map(([s, col]) => {
      const m = textPlane(s, 0.46, { color: col, weight: 800, font: FONT_TITLE, bg: 'rgba(8,12,24,.82)', radius: 50, pad: 34 }); m.position.set(0, 1.0, 4.6); g.add(m); return m; });
    const halos = [...Array(8)].map(() => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.008, 6, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, toneMapped: false })); g.add(r); return r; });
    const idx = { san: [], tham: [], thien: [] };
    list.forEach((c, i) => { if (c.key === 'san') idx.san.push(i); if (c.key === 'tham') idx.tham.push(i); if (c.key === 'tinhhao' && idx.thien.length < 8) idx.thien.push(i); });
    const ss = [1, 2, 3].map(j => e.sentenceStart(5, j));
    return { update(t, d, e) {
      e.setNebula(0x0a0c22, 0x1e2650, 0x5a3a6a, 0.55);
      const stage = t < ss[0] ? -1 : t < ss[1] ? 0 : t < ss[2] ? 1 : 2;
      const sel = [idx.san, idx.tham, idx.thien][stage] || [], k = easeOut((t - (stage >= 0 ? ss[stage] : 0)) / 0.9);
      const rot = new THREE.Euler(0.3, t * 0.22, 0);
      orbs.forEach((o, i) => {
        const home = o.userData.home.clone().applyEuler(rot), si = sel.indexOf(i);
        if (si >= 0) { const tgt = V((si - (sel.length - 1) / 2) * 0.5, 0.15 + Math.sin(t * 3 + si) * 0.05, 4.6); o.position.copy(home.lerp(tgt, k)); o.scale.setScalar(1 + k * 0.1); o.material.emissiveIntensity = 0.45; }
        else { o.position.copy(home); o.scale.setScalar(stage >= 0 ? 0.8 : 1); o.material.emissiveIntensity = stage >= 0 ? 0.15 : 0.35; }
      });
      halos.forEach((h, j) => { const i = sel[j]; h.visible = i !== undefined && k > 0.6; if (h.visible) { h.position.copy(orbs[i].position); h.rotation.set(t * 2 + j, t * 1.5, 0); h.material.opacity = (k - 0.6) * 2; h.material.color.setHex(list[i].color); } });
      labels.forEach((l, i) => { l.visible = stage === i; l.scale.setScalar(Math.max(0.001, backOut((t - ss[i] - 0.3) / 0.5))); });
      camTo(e, V(Math.sin(t * 0.1) * 1.2, 0.5, 13), V(0, 0.1, 0));
      e.bloom.strength = 0.49;
    } };
  } },

  // 7 · Precise terms: glass card (DOM) over a slow golden mandala
  { build(g, e) {
    const rings = [];
    for (let k = 0; k < 4; k++) {
      const n = 48 + k * 24, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pos[i * 3] = Math.cos(a) * (1.6 + k * 0.9); pos[i * 3 + 1] = Math.sin(a) * (1.6 + k * 0.9); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const p = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.13 - k * 0.02, map: dotTexture(), color: [0xffd27a, 0xe98aa8, 0x7fd0ff, 0xffd27a][k], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      p.position.z = -2; g.add(p); rings.push(p);
    }
    const petals = [...Array(12)].map((_, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.008, 6, 96), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: .35, toneMapped: false })); m.position.z = -2; m.rotation.y = i * Math.PI / 12; g.add(m); return m; });
    return { update(t, d, e) {
      e.setNebula(0x0e0a20, 0x2c1e4a, 0x6a4a2a, 0.55);
      rings.forEach((r, k) => { r.rotation.z = t * (0.06 + k * 0.03) * (k % 2 ? -1 : 1); });
      petals.forEach((p, i) => { p.rotation.set(t * 0.2, i * Math.PI / 12 + t * 0.15, 0); });
      camTo(e, V(0, 0, 11), V(0, 0, 0)); e.bloom.strength = 0.45;
    } };
  } },

  // 8 · Dusty books dissolve into light that forms a mirror and a human bust
  { build(g, e) {
    const books = new THREE.Group(); books.position.y = -0.6; g.add(books);
    const bm = new THREE.MeshStandardMaterial({ color: 0x6b5a48, roughness: 1, transparent: true });
    [[0, -1.0, 2.4], [0.1, -0.6, 2.2], [-0.08, -0.2, 2.3], [0.04, 0.2, 2.0]].forEach(([x, y, w], i) => { const b = new THREE.Mesh(new RoundedBoxGeometry(w, 0.38, 1.5, 2, 0.04), bm); b.position.set(x, y, 0); b.rotation.y = i * 0.12; books.add(b); });
    const n = 2600, r = rng(9), A = new Float32Array(n * 3), P = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { A[i * 3] = (r() - .5) * 2.4; A[i * 3 + 1] = -1.8 + r() * 1.6; A[i * 3 + 2] = (r() - .5) * 1.5; }
    const Bust = bustPoints(Math.floor(n * 0.5), r, 0.85), B = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { if (i < n * 0.5) { const a = r() * Math.PI * 2; B[i * 3] = Math.cos(a) * 1.7; B[i * 3 + 1] = Math.sin(a) * 2.3 + 0.3; B[i * 3 + 2] = 0; }
      else { const j = i - Math.floor(n * 0.5); B[i * 3] = Bust[j * 3] ?? 0; B[i * 3 + 1] = (Bust[j * 3 + 1] ?? 0) - 0.15; B[i * 3 + 2] = Bust[j * 3 + 2] ?? 0; } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.075, map: dotTexture(), color: 0xffe2a8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); g.add(pts);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { o: { value: 0 } },
      vertexShader: 'varying vec2 u; void main(){u=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform float o; varying vec2 u; void main(){ float d=distance(u,vec2(.5)); vec3 c=mix(vec3(.5,.7,.95),vec3(.08,.14,.26),d*1.6); gl_FragColor=vec4(c, o*.14*(1.-smoothstep(.45,.5,d))); }' }));
    glass.scale.set(1.7, 2.3, 1); glass.position.set(0, 0.3, -0.2); g.add(glass);
    const tB = e.sentenceStart(7, 1), tF = e.sentenceStart(7, 2);
    return { update(t, d, e) {
      e.setNebula(0x0a0e1c, 0x1e2a44, 0x5a4a3a, 0.55);
      const br = clamp((t - tB) / 0.6); books.visible = br < 1; bm.opacity = 1 - br;
      pts.visible = t > tB;
      const form = easeInOut((t - tF + 0.8) / 2.6);
      for (let i = 0; i < n; i++) { const j = i * 3, rise = clamp((t - tB) / 2) * (1 - form);
        P[j] = lerp(A[j], B[j], form) + Math.sin(i * 12.9 + t * 1.3) * 0.5 * rise; P[j + 1] = lerp(A[j + 1] - 0.6, B[j + 1], form) + rise * (1.2 + Math.sin(i) * 1.0); P[j + 2] = lerp(A[j + 2], B[j + 2], form) + Math.cos(i * 7.1 + t) * 0.5 * rise; }
      geo.attributes.position.needsUpdate = true; glass.material.uniforms.o.value = form;
      camTo(e, V(Math.sin(t * .2) * 1.0, 0.2, 12.5), V(0, -0.1, 0)); e.bloom.strength = 0.52;
    } };
  } },

  // 9 · Name it: glass chips land on a reflective disc; then the comment prompt
  { build(g, e) {
    const chip = (txt, col) => {
      const grp = new THREE.Group();
      grp.add(new THREE.Mesh(new RoundedBoxGeometry(3.4, 1.05, 0.2, 4, 0.16), new THREE.MeshPhysicalMaterial({ color: 0x182234, roughness: .1, metalness: .5, clearcoat: 1, iridescence: .5, emissive: new THREE.Color(col), emissiveIntensity: .08 })));
      const lab = textPlane(txt, 0.58, { color: '#fff', weight: 800 }); lab.position.z = 0.13; grp.add(lab);
      const gl = glowSprite(col, 3.0, 0.15); gl.position.z = -0.6; grp.add(gl); g.add(grp); return grp; };
    const c1 = chip('à, đang bực', '#ff5a5a'), c2 = chip('à, đang thèm', '#ff9a3c');
    const opts = [['1', 'Cáu', '#ff7a7a'], ['2', 'Thức khuya', '#8aa2ff'], ['3', 'Ăn đêm', '#ffc66b']].map(([n, s, col], i) => {
      const p = textPlane(`${n}   ${s}`, 0.5, { color: col, weight: 800, bg: 'rgba(12,20,36,.9)', radius: 40, pad: 44 }); p.position.set(0, 1.3 - i * 1.0, 1); g.add(p); return p; });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(2.4, 96), new THREE.MeshPhysicalMaterial({ color: 0x0e1626, roughness: .15, metalness: .6, clearcoat: 1 }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = -1.5; g.add(disc);
    const discRing = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.02, 6, 128), new THREE.MeshBasicMaterial({ color: 0xffc94a, toneMapped: false })); discRing.rotation.x = Math.PI / 2; discRing.position.y = -1.5; g.add(discRing);
    const t1 = e.wordTime(8, 'bực') ?? 3, t2 = e.wordTime(8, 'thèm', 1) ?? 6, t3 = e.sentenceStart(8, 3), t4 = e.sentenceStart(8, 4);
    return { update(t, d, e) {
      e.setNebula(0x0c0c1a, 0x2a1e30, 0x6a3a2a, 0.5);
      const out = smooth(t4 - 0.3, t4 + 0.5, t);
      const land = (c, t0, x, y) => { const k = easeOut((t - t0 + 0.4) / 1.0); c.visible = k > 0 && out < 1;
        c.position.set(lerp(x * 3, x, k), lerp(5, y, k) + out * 6, lerp(-3, 0.5, k)); c.rotation.set((1 - k) * 1.2, (1 - k) * 2 + Math.sin(t) * 0.08, (1 - k) * 0.6); };
      land(c1, t1, -0.35, 0.7); land(c2, t2, 0.35, -0.6);
      opts.forEach((o, i) => { o.visible = t > t4; o.scale.setScalar(Math.max(0.001, backOut((t - t4 - 0.6 - i * 0.35) / 0.5))); });
      camTo(e, V(Math.sin(t * .25) * 1.0, 1.0, 13), V(0, 0.1, 0)); e.bloom.strength = 0.45;
    } };
  } },

  // 10 · Teaser for episode 2: a motorbike on a turntable explodes into parts, then into a human bust
  { build(g, e) {
    const bike = new THREE.Group(); bike.scale.setScalar(0.78); bike.position.y = -0.7; g.add(bike);
    const paint = new THREE.MeshPhysicalMaterial({ color: 0xa3122a, roughness: .25, metalness: .3, clearcoat: 1, clearcoatRoughness: .05 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: .7 }), steel = chrome(), dark = new THREE.MeshPhysicalMaterial({ color: 0x2a2d33, metalness: .8, roughness: .35 });
    const parts = [];
    const part = (obj, dir) => { const p = new THREE.Group(); p.add(obj); p.userData.dir = dir; bike.add(p); parts.push(p); return p; };
    const wheel = x => { const w = new THREE.Group(); w.position.x = x;
      w.add(new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.17, 16, 48), rubber));
      w.add(new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.035, 8, 48), steel));
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.3, 20), steel); hub.rotation.x = Math.PI / 2; w.add(hub);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; w.add(rod(V(0, 0, 0), V(Math.cos(a) * 0.54, Math.sin(a) * 0.54, 0), 0.012, steel)); }
      return w; };
    part(wheel(-1.5), V(-1.6, -0.3, 1.0)); part(wheel(1.6), V(1.6, -0.3, 1.0));
    const frame = new THREE.Group(); [[-1.5, 0, -0.3, 0.9], [-0.3, 0.9, 0.9, 1.1], [-0.3, 0.9, 0.2, 0.15], [0.2, 0.15, 0.9, 1.1]].forEach(([a, b, c, d]) => frame.add(rod(V(a, b, 0), V(c, d, 0), 0.06, dark)));
    part(frame, V(0, 0.1, -1.4));
    const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.95, 8, 20), paint); tank.rotation.z = Math.PI / 2 - 0.12; tank.position.set(0.35, 1.25, 0); tank.scale.z = 0.85; part(tank, V(0.2, 1.7, 0.4));
    const seat = new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.2, 0.52, 3, 0.08), new THREE.MeshPhysicalMaterial({ color: 0x111111, roughness: .5, clearcoat: .4 })); seat.position.set(-0.6, 1.22, 0); part(seat, V(-0.9, 1.5, 0.6));
    const fork = new THREE.Group(); [-0.12, 0.12].forEach(z => fork.add(rod(V(1.6, 0, z), V(1.15, 1.5, z), 0.045, steel))); part(fork, V(1.3, 0.5, -0.8));
    const bar = new THREE.Group(); bar.add(rod(V(1.12, 1.58, -0.6), V(1.12, 1.58, 0.6), 0.035, steel)); [-0.6, 0.6].forEach(z => bar.add(rod(V(1.12, 1.58, z), V(1.12, 1.58, z * 1.25), 0.06, rubber))); part(bar, V(1.0, 1.6, -0.2));
    const lamp = new THREE.Group(); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), new THREE.MeshStandardMaterial({ color: 0xfff1c8, emissive: 0xffe2a0, emissiveIntensity: 2 })); bulb.position.set(1.38, 1.32, 0); lamp.add(bulb);
    const lf = flare('#ffe0a8', 3.5, 0.18, 0.7); lf.position.set(1.6, 1.32, 0.3); lamp.add(lf); part(lamp, V(2.0, 1.0, 0.7));
    const eng = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.6, 0.5, 3, 0.08), dark); eng.position.set(0.25, 0.45, 0); part(eng, V(0, -1.3, 1.2));
    const ex = rod(V(-0.2, 0.32, 0.32), V(-1.6, 0.48, 0.32), 0.075, steel); part(ex, V(-1.1, -1.0, -0.9));
    const bolts = [...Array(10)].map((_, i) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 6), steel); b.position.set(-0.8 + i * 0.2, 0.7, 0); const a = i * 0.7; return part(b, V(Math.cos(a) * 2.2, Math.sin(a) * 1.6 + 0.6, Math.sin(a * 2) * 1.2)); });
    const lines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0x7fe3ff, dashSize: 0.08, gapSize: 0.06, transparent: true, opacity: 0.6 })); bike.add(lines);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.25, 96), new THREE.MeshPhysicalMaterial({ color: 0x1a1e28, metalness: .6, roughness: .2, clearcoat: 1 })); ped.position.y = -1.55; g.add(ped);
    const pring = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.02, 6, 160), new THREE.MeshBasicMaterial({ color: 0x7fe3ff, toneMapped: false })); pring.rotation.x = Math.PI / 2; pring.position.y = -1.42; g.add(pring);
    const spot = new THREE.SpotLight(0xffffff, 60, 20, 0.5, 0.6); spot.position.set(0, 7, 3); spot.target.position.set(0, -1, 0); g.add(spot, spot.target);
    // morph particles: from exploded parts to a human bust
    const n = 2200, r = rng(21), A = new Float32Array(n * 3), B = bustPoints(n, r, 1.05), P = new Float32Array(n * 3);
    const homes = parts.map(p => { const b = new THREE.Box3().setFromObject(p.children[0]); return b.getCenter(V(0, 0, 0)); });
    for (let i = 0; i < n; i++) { const k = i % parts.length, h = homes[k], d = parts[k].userData.dir;
      A[i * 3] = (h.x + d.x) * 0.78 + (r() - .5) * 0.5; A[i * 3 + 1] = (h.y + d.y) * 0.78 - 0.7 + (r() - .5) * 0.5; A[i * 3 + 2] = (h.z + d.z) * 0.78 + (r() - .5) * 0.5; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(P, 3));
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.075, map: dotTexture(), color: 0xbfeaff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); g.add(pts);
    const q = textPlane('?', 1.6, { color: '#ffd27a', glow: '#ffb347', weight: 800, font: FONT_TITLE }); q.position.set(0, 1.9, 0.5); g.add(q);
    const tEx = e.wordTime(9, 'tháo') ?? 2, tQ = e.sentenceStart(9, 1), tM = e.sentenceStart(9, 2);
    return { update(t, d, e) {
      e.setNebula(0x061018, 0x12304a, 0x2a5a6a, 0.55);
      const ex = easeInOut((t - tEx) / 2.2), morph = easeInOut((t - tM + 0.3) / 2.2);
      bike.rotation.y = 0.6 + t * 0.35 * (1 - ex * 0.7); bike.rotation.x = ex * 0.15;
      const lp = [];
      parts.forEach((p, i) => { const d = p.userData.dir, k = clamp(ex * 1.15 - (i % 5) * 0.03); p.position.set(d.x * k, d.y * k, d.z * k);
        p.rotation.set(d.z * k * 0.3, d.x * k * 0.2, d.y * k * 0.15); p.visible = morph < 0.15;
        const h = homes[i]; lp.push(h.x, h.y, h.z, h.x + d.x * k, h.y + d.y * k, h.z + d.z * k); });
      lines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); lines.computeLineDistances(); lines.visible = ex > 0.05 && morph < 0.15; lines.material.opacity = ex * 0.6;
      q.material.opacity = clamp((t - tQ) / 0.4) * (1 - morph); q.scale.setScalar(Math.max(0.001, backOut((t - tQ) / 0.6))); q.rotation.y = Math.sin(t * 2) * 0.3;
      pts.visible = morph > 0.1;
      for (let i = 0; i < n * 3; i += 3) { const w = Math.sin(Math.PI * morph) * 0.6;
        P[i] = lerp(A[i], B[i], morph) + Math.sin(i + t * 2) * w; P[i + 1] = lerp(A[i + 1], B[i + 1] - 0.2, morph) + Math.cos(i * 0.7 + t) * w; P[i + 2] = lerp(A[i + 2], B[i + 2], morph); }
      pg.attributes.position.needsUpdate = true;
      ped.visible = pring.visible = morph < 0.6; pring.material.opacity = 1 - morph;
      camTo(e, V(Math.sin(t * 0.15) * 1.5, 1.4 - ex * 0.4, 11.5 + ex * 1.2), V(0, -0.3, 0));
      e.bloom.strength = 0.49 + morph * 0.15;
    } };
  } },
];

const END_AT = (e) => e.sentenceStart(9, 3) - 0.3;
export const hideHeadline = (idx, lt) => idx === 3 || (idx === 9 && lt > (window.__endAt ?? 99));

// DOM overlays: the big "89", term cards, and the episode-2 end card
export function overlay(ov, t, info, engine) {
  const tl = engine.tl.scenes, big = ov.$('.big'), card = ov.$('.card');
  if (info.idx === 0) {
    const t89 = engine.wordTime(0, 'tám') ?? 6, k = backOut((info.lt - t89) / 0.5);
    big.textContent = '89'; big.style.top = '';
    big.style.opacity = clamp((info.lt - t89) / 0.2) * clamp((info.dur - info.lt) / 0.3); big.style.transform = `scale(${Math.max(0.01, k)})`;
  } else if (info.idx === 9 && info.lt > (window.__endAt = END_AT(engine))) {
    const k = easeOut((info.lt - window.__endAt) / 0.7);
    big.innerHTML = `<div class="endk">TẬP 2</div><div class="endt">Chiếc xe<br>biến đi đâu?</div>`;
    big.style.top = '270px'; big.style.opacity = k; big.style.transform = `translateY(${(1 - k) * 40}px)`;
  } else { big.style.opacity = 0; }
  if (info.idx === 6) {
    const sc = tl[6], j = sc.sentences.findIndex((s, i) => t < (sc.sentences[i + 1]?.s ?? 1e9));
    const states = [
      `<div class="g"><div class="t1">Vi Diệu Pháp</div><div class="t2">Thắng Pháp · Luận Tạng</div></div>`,
      `<div class="g"><div class="t2">tiếng Pāli</div><div class="t0">Abhidhamma</div><div class="t2">Vi Diệu Pháp</div></div>`,
      `<div class="g split"><div><div class="t0 hi">Abhi</div><div class="t2">cao hơn<br>thù thắng</div></div><div><div class="t0 dim">Dhamma</div></div></div>`,
      `<div class="g split"><div><div class="t0 dim">Abhi</div><div class="t2">cao hơn<br>thù thắng</div></div><div><div class="t0 hi">Dhamma</div><div class="t2">Pháp<br>sự thật</div></div></div>`,
      `<div class="g"><div class="t2">Abhi + Dhamma</div><div class="t1">Pháp thù thắng</div></div>`,
      `<div class="g"><div class="t1">Tam Tạng</div><div class="t3">Tipiṭaka</div><div class="cols"><div><b>Kinh tạng</b><span>Sutta</span></div><div><b>Luật tạng</b><span>Vinaya</span></div><div class="on"><b>Luận tạng</b><span>Abhidhamma</span></div></div></div>`,
      `<div class="g"><div class="t2">Sách nhập môn</div><div class="t1">Vi Diệu Pháp Tập Yếu</div><div class="t3">Abhidhammattha Saṅgaha</div><div class="t2">Ngài Anuruddha soạn<br>Ngài Tịnh Sự dịch</div></div>`,
    ];
    const st = clamp(j, 0, states.length - 1);
    if (card.dataset.st !== String(st)) { card.dataset.st = st; card.innerHTML = states[st]; }
    const k = easeOut((t - (st === 0 ? sc.s + 0.2 : sc.sentences[st].s)) / 0.5);
    card.style.opacity = k * clamp((info.dur - info.lt) / 0.3);
    card.style.transform = `perspective(1400px) rotateY(${(1 - k) * -30}deg) translateY(${(1 - k) * 30}px) scale(${0.94 + 0.06 * k})`;
  } else { card.style.opacity = 0; card.dataset.st = ''; }
}

export const CSS_EP = `
.card .g{background:linear-gradient(160deg,rgba(255,255,255,.13),rgba(255,255,255,.03));border:1.5px solid rgba(255,220,150,.4);border-radius:40px;padding:54px 44px;text-align:center;backdrop-filter:blur(8px);box-shadow:0 30px 90px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.25)}
.card .t0{font-family:"Playfair Display",serif;font-weight:800;font-size:124px;color:#ffe3a3;text-shadow:0 0 40px rgba(245,185,66,.55);line-height:1.05}
.card .t1{font-family:"Playfair Display",serif;font-weight:800;font-size:82px;color:#fff;line-height:1.12}
.card .t2{font-weight:600;font-size:42px;color:rgba(255,255,255,.85);line-height:1.4;margin:14px 0}
.card .t3{font-family:"Playfair Display",serif;font-style:italic;font-weight:700;font-size:50px;color:#ffbfd0;margin:10px 0}
.card .split{display:flex;gap:20px;justify-content:center}.card .split>div{flex:1}
.card .hi{color:#ffe3a3}.card .dim{color:rgba(255,255,255,.28);text-shadow:none}
.card .cols{display:flex;gap:16px;margin-top:30px}.card .cols div{flex:1;padding:26px 8px;border-radius:26px;background:rgba(255,255,255,.07);display:flex;flex-direction:column;gap:10px}
.card .cols b{font-size:38px;font-weight:800}.card .cols span{font-size:30px;color:rgba(255,255,255,.7)}
.card .cols .on{background:rgba(245,185,66,.22);border:1.5px solid rgba(245,185,66,.8)}
.big .endk{font-family:Montserrat,sans-serif;font-size:44px;font-weight:700;letter-spacing:.3em;color:#fff;text-shadow:none;margin-bottom:10px}
.big .endt{font-size:112px;line-height:1.05}
`;
