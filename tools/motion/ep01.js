// Episode 01 scenes. Each scene: build(group, engine) -> { update(localT, duration, engine) }
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { C, clamp, lerp, smooth, easeOut, easeInOut, backOut, rng, textPlane, glowSprite, dotTexture, textTexture } from './engine.js';

// 89 cittas by group, used for consistent colors across the season
export const CITTA_GROUPS = [
  { key: 'tham', n: 8, color: 0xff8a3d }, { key: 'san', n: 2, color: 0xff3b3b }, { key: 'si', n: 2, color: 0x9aa3ad },
  { key: 'vonhan', n: 18, color: 0x7fd0ff }, { key: 'tinhhao', n: 24, color: 0xffc94a },
  { key: 'sacgioi', n: 15, color: 0xc6a8ff }, { key: 'vosac', n: 12, color: 0xf3ead8 }, { key: 'sieuthe', n: 8, color: 0xfff6d0 },
];
function cittaList() { const out = []; CITTA_GROUPS.forEach(g => { for (let i = 0; i < g.n; i++) out.push(g); }); return out; }
function fib(i, n, r) {
  const y = 1 - (i / (n - 1)) * 2, rad = Math.sqrt(1 - y * y), th = Math.PI * (3 - Math.sqrt(5)) * i;
  return new THREE.Vector3(Math.cos(th) * rad * r, y * r, Math.sin(th) * rad * r);
}
function orbMesh(color, r = 0.16) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6, roughness: .3 }));
}
function leafMaterial(seed) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 96); g.addColorStop(0, '#d8b77c'); g.addColorStop(1, '#b88f52'); x.fillStyle = g; x.fillRect(0, 0, 512, 96);
  const r = rng(seed); x.strokeStyle = 'rgba(70,40,15,.55)'; x.lineWidth = 2;
  for (let l = 0; l < 4; l++) { x.beginPath(); let px = 30; const y = 20 + l * 19; x.moveTo(px, y); while (px < 480) { px += 6 + r() * 10; x.lineTo(px, y + (r() - .5) * 5); } x.stroke(); }
  x.fillStyle = 'rgba(60,35,10,.8)'; x.beginPath(); x.arc(170, 48, 6, 0, 7); x.arc(340, 48, 6, 0, 7); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: .8 });
}
function palmBook(nLeaves = 12, seed = 1) {
  const g = new THREE.Group(), leaves = [];
  const cover = new THREE.MeshStandardMaterial({ color: 0x5a3519, roughness: .6 });
  const bot = new THREE.Mesh(new RoundedBoxGeometry(5.2, 0.16, 1.0, 2, 0.06), cover); bot.position.y = -0.1; g.add(bot);
  for (let i = 0; i < nLeaves; i++) {
    const p = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(5, 0.035, 0.9), leafMaterial(seed + i));
    p.add(m); p.position.y = i * 0.045; g.add(p); leaves.push(p);
  }
  const top = new THREE.Mesh(new RoundedBoxGeometry(5.2, 0.16, 1.0, 2, 0.06), cover); top.position.y = nLeaves * 0.045 + 0.06; g.add(top);
  return { g, leaves, top };
}
function mannequin(mat) {
  const g = new THREE.Group();
  const add = (geo, x, y, z = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.z = rz; g.add(m); return m; };
  add(new THREE.SphereGeometry(0.42, 24, 18), 0, 2.55);
  add(new THREE.CapsuleGeometry(0.62, 1.3, 6, 16), 0, 1.3);
  add(new THREE.CapsuleGeometry(0.18, 1.2, 4, 10), -0.85, 1.35, 0, 0.18);
  add(new THREE.CapsuleGeometry(0.18, 1.2, 4, 10), 0.85, 1.35, 0, -0.18);
  add(new THREE.CapsuleGeometry(0.22, 1.3, 4, 10), -0.3, -0.35);
  add(new THREE.CapsuleGeometry(0.22, 1.3, 4, 10), 0.3, -0.35);
  return g;
}
const camTo = (e, p, l, fov = 38) => { e.camera.position.copy(p); e.camera.lookAt(l); e.camera.fov = fov; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------- scenes
export const scenes = [
  // 1 · Hook: palm-leaf book bursts into 89 orbs
  { build(g, e) {
    const book = palmBook(12, 3); book.g.position.set(0, -1.2, 0); g.add(book.g);
    const light = new THREE.PointLight(0xffc870, 0, 20); light.position.set(0, 0.5, 1.5); g.add(light);
    const halo = glowSprite('#ffcf7a', 4); halo.position.set(0, -0.6, -1); g.add(halo);
    const list = cittaList(), orbs = list.map((c, i) => { const o = orbMesh(c.color, 0.13); g.add(o); return o; });
    const target = list.map((c, i) => { const a = i * 2.39996, r = 1.2 + Math.sqrt(i / 89) * 4.2; return V(Math.cos(a) * r, Math.sin(i * 1.7) * 0.6 + 0.6, Math.sin(a) * r); });
    const burst = e.wordTime(0, 'đếm') ?? 2.6;
    return { update(t, d, e) {
      const open = smooth(burst - 1.2, burst, t);
      book.g.rotation.y = -0.5 + t * 0.12; book.g.rotation.x = 0.25;
      book.leaves.forEach((p, i) => { const k = (i - 5.5) / 6; p.rotation.z = k * 0.55 * open; p.position.y = i * 0.045 + open * (i * 0.09); });
      book.top.position.y = 12 * 0.045 + 0.06 + open * 0.5; book.top.rotation.z = open * 0.35;
      light.intensity = 4 + open * 10; halo.material.opacity = 0.15 + open * 0.3;
      orbs.forEach((o, i) => {
        const k = easeOut((t - burst - i * 0.012) / 2.2);
        const from = V(0, -0.8, 0), to = target[i].clone().applyAxisAngle(V(0, 1, 0), t * 0.25);
        const swirl = V(Math.sin(i + t * 2) * (1 - k), Math.cos(i * 2 + t) * (1 - k), 0);
        o.position.copy(from.lerp(to, k).add(swirl)); o.visible = t > burst - 0.05; o.scale.setScalar(0.4 + k * 0.8);
      });
      camTo(e, V(Math.sin(t * 0.15) * 2.5, 2.2 + t * 0.08, 15 - t * 0.3), V(0, 0.2, 0), 40);
      e.bloom.strength = 0.7 + open * 0.25;
    } };
  } },

  // 2 · Three relatable moments: storm cloud, phone at 2:00, fridge at 23:00
  { build(g, e) {
    // A: anger cloud
    const A = new THREE.Group(); g.add(A);
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0x4a3a44, emissive: 0xff2a2a, emissiveIntensity: .05, roughness: 1, flatShading: false });
    const r = rng(11), puffs = [];
    for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.45 + r() * 0.65, 24, 16), cloudMat); const a = r() * Math.PI * 2; m.position.set(Math.cos(a) * r() * 2.6, Math.sin(a) * r() * 0.8 + 1.4, (r() - .5) * 1.4); A.add(m); puffs.push(m); }
    const under = new THREE.PointLight(0xff3a3a, 0, 10); under.position.set(0, -0.5, 1.5); A.add(under);
    const boltPts = []; let x = 0.2; for (let i = 0; i < 9; i++) { boltPts.push(V(x, 0.6 - i * 0.55, 0.8)); x += (r() - .5) * 0.9; }
    const bolt = new THREE.Line(new THREE.BufferGeometry().setFromPoints(boltPts), new THREE.LineBasicMaterial({ color: 0xfff0c0 }));
    A.add(bolt); const red = new THREE.PointLight(0xff3030, 0, 16); red.position.set(0, 0, 3); A.add(red);
    const angry = textPlane('CÁU!', 1.1, { color: '#ff6b6b', glow: '#ff2020', weight: 900 }); angry.position.set(0, -2.4, 1); A.add(angry);
    // B: phone
    const B = new THREE.Group(); B.position.x = 16; g.add(B);
    const phone = new THREE.Mesh(new RoundedBoxGeometry(2.4, 4.8, 0.28, 4, 0.3), new THREE.MeshStandardMaterial({ color: 0x15181f, roughness: .35, metalness: .6 }));
    B.add(phone);
    const sc = document.createElement('canvas'); sc.width = 480; sc.height = 960; const x2 = sc.getContext('2d');
    const gr = x2.createLinearGradient(0, 0, 0, 960); gr.addColorStop(0, '#2a4cff'); gr.addColorStop(1, '#0a1240'); x2.fillStyle = gr; x2.fillRect(0, 0, 480, 960);
    x2.fillStyle = '#fff'; x2.font = '900 150px "Be Vietnam Pro"'; x2.textAlign = 'center'; x2.fillText('02:00', 240, 250);
    for (let i = 0; i < 4; i++) { x2.fillStyle = 'rgba(255,255,255,.16)'; x2.beginPath(); x2.roundRect(40, 340 + i * 150, 400, 120, 24); x2.fill(); }
    const stex = new THREE.CanvasTexture(sc); stex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.15, 4.45), new THREE.MeshBasicMaterial({ map: stex, color: 0x9aa3b8 }));
    screen.position.z = 0.15; B.add(screen);
    const blue = glowSprite('#4d7bff', 7); blue.material.opacity = .5; blue.position.z = -0.5; B.add(blue);
    const bl = new THREE.PointLight(0x5577ff, 25, 12); bl.position.z = 2; B.add(bl);
    // C: fridge
    const Cc = new THREE.Group(); Cc.position.x = 32; g.add(Cc);
    const fm = new THREE.MeshStandardMaterial({ color: 0xdfe5ea, roughness: .4, metalness: .2 });
    const body = new THREE.Mesh(new RoundedBoxGeometry(2.8, 5.4, 2.2, 3, 0.12), fm); Cc.add(body);
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 5.0), new THREE.MeshBasicMaterial({ color: 0xd9c08a })); inner.position.z = 1.11; Cc.add(inner);
    const pivot = new THREE.Group(); pivot.position.set(-1.4, 0, 1.12); Cc.add(pivot);
    const door = new THREE.Mesh(new RoundedBoxGeometry(2.8, 5.4, 0.25, 3, 0.1), fm); door.position.set(1.4, 0, 0.12); pivot.add(door);
    const spill = glowSprite('#ffe6a8', 10); spill.position.set(0, 0, 2); Cc.add(spill);
    const warm = new THREE.PointLight(0xffd79a, 0, 14); warm.position.set(0, 0, 3); Cc.add(warm);
    const clock = textPlane('23:00', 0.9, { color: '#ffe3a3', glow: '#ffb347', weight: 900 }); clock.position.set(0.4, -3.6, 1.6); Cc.add(clock);
    const s1 = e.sentenceStart(1, 1), s2 = e.sentenceStart(1, 2), s3 = e.sentenceStart(1, 3);
    return { update(t, d, e) {
      // anger flicker
      const flick = (Math.sin(t * 37) > 0.7 && Math.sin(t * 5.3) > 0) ? 1 : 0;
      bolt.visible = flick && t > s1 - 0.2; red.intensity = 3 + flick * 30; under.intensity = 10 + flick * 25; cloudMat.emissiveIntensity = 0.04 + flick * 0.25 + smooth(s1, s1 + 1, t) * 0.12;
      puffs.forEach((p, i) => { p.position.y += Math.sin(t * 2 + i) * 0.002; });
      angry.material.opacity = smooth(s1 + 0.3, s1 + 0.7, t); angry.scale.setScalar(0.8 + 0.2 * backOut((t - s1 - 0.3) / 0.4));
      phone.rotation.set(-0.15 + Math.sin(t) * .04, 0.25 + Math.sin(t * .7) * .1, 0); screen.rotation.copy(phone.rotation);
      screen.position.set(Math.sin(phone.rotation.y) * 0.15, 0, Math.cos(phone.rotation.y) * 0.15);
      pivot.rotation.y = -1.7 * easeInOut((t - s3 - 0.2) / 1.0);
      const op = smooth(s3, s3 + 1.2, t); warm.intensity = op * 14; spill.material.opacity = op * 0.3; inner.visible = op > 0.01;
      // camera between stations
      const k1 = easeInOut((t - s2 + 0.2) / 0.7), k2 = easeInOut((t - s3 + 0.2) / 0.7);
      const cx = lerp(lerp(0, 16, k1), 32, k2);
      const zoom = (t < s1 ? 17 - t * 0.6 : 14.5) * (1 - k1) + 11 * k1;
      camTo(e, V(cx + 1.2 + k2 * 5.5, 0.8 + k2 * 0.6, zoom + k2 * 3), V(cx - k2 * 0.6, 0.2 - k2 * 0.4, 0), 40);
      e.bloom.strength = 0.6;
    } };
  } },

  // 3 · The mind as a complex machine without a manual
  { build(g, e) {
    const sph = new THREE.Mesh(new THREE.SphereGeometry(2.4, 64, 32), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { c: { value: new THREE.Color(0x6fc8ff) } },
      vertexShader: 'varying vec3 n; varying vec3 v; void main(){ n=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); v=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform vec3 c; varying vec3 n; varying vec3 v; void main(){ float f=pow(1.-abs(dot(n,v)),2.5); gl_FragColor=vec4(c*f*1.6, f); }',
    }));
    g.add(sph);
    const rings = [0, 1, 2].map(i => { const m = new THREE.Mesh(new THREE.TorusGeometry(2.9 + i * 0.35, 0.025, 8, 160), new THREE.MeshBasicMaterial({ color: [0xffc94a, 0x7fd0ff, 0xe98aa8][i], toneMapped: false })); g.add(m); return m; });
    const n = 700, r = rng(5), pos = new Float32Array(n * 3), seeds = [];
    for (let i = 0; i < n; i++) seeds.push([r() * 6.28, r() * 6.28, 0.4 + r() * 1.7, 0.3 + r() * 1.2]);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.12, map: dotTexture(), color: 0xbfe8ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    g.add(pts);
    const manual = new THREE.Group(); manual.position.set(1.0, -4.2, 1.5); g.add(manual);
    manual.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.8, 2.4, 0.35)), new THREE.LineBasicMaterial({ color: 0xffd27a })));
    const q = textPlane('?', 1.5, { color: '#ffd27a', glow: '#ffb347', weight: 900 }); manual.add(q);
    const s1 = e.sentenceStart(2, 1), s2 = e.sentenceStart(2, 2);
    return { update(t, d, e) {
      const speed = 1 + smooth(s2, s2 + 1, t) * 2.5;
      for (let i = 0; i < n; i++) { const [a, b, rr, sp] = seeds[i]; const th = a + t * sp * speed;
        pos[i * 3] = Math.cos(th) * rr * Math.cos(b); pos[i * 3 + 1] = Math.sin(th * 1.3 + b) * rr * 0.8; pos[i * 3 + 2] = Math.sin(th) * rr * Math.sin(b + 1); }
      pg.attributes.position.needsUpdate = true;
      rings.forEach((m, i) => { m.rotation.set(t * (0.3 + i * 0.2) + i, t * (0.2 + i * 0.15), i * 0.7); });
      const mk = smooth(s1, s1 + 0.8, t); manual.scale.setScalar(0.01 + backOut((t - s1) / 0.6)); manual.visible = mk > 0.01;
      manual.rotation.y = t * 0.8; manual.position.y = -4.2 + Math.sin(t * 2) * 0.15;
      const look = V(lerp(0, 0.4, mk), lerp(0, -1.6, mk), 0);
      camTo(e, V(look.x + Math.sin(t * .2) * 1.2, look.y + 0.3, 15.5 - mk * 2), V(look.x, look.y - 0.6, 0), 40);
      e.bloom.strength = 0.8 + smooth(s2, s2 + 1, t) * 0.3;
    } };
  } },

  // 4 · Reveal: light beam, palm-leaf stack lands on a pedestal; history across countries
  { build(g, e) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 3.2, 16, 48, 1, true), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { o: { value: 0 } },
      vertexShader: 'varying vec2 u; void main(){ u=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform float o; varying vec2 u; void main(){ float a=(1.-u.y*.2)*smoothstep(0.,.7,u.y)*o*.35; gl_FragColor=vec4(vec3(1.,.85,.55)*a, a); }',
    }));
    beam.position.y = 4; g.add(beam);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 1.2, 64), new THREE.MeshStandardMaterial({ color: 0x3b3f4a, roughness: .9 })); ped.position.y = -3.6; g.add(ped);
    const book = palmBook(10, 21); book.g.scale.setScalar(0.8); g.add(book.g);
    const halo = glowSprite('#ffd27a', 5); halo.position.set(0, -2.6, -1); g.add(halo);
    const title = textPlane('VI DIỆU PHÁP', 1.1, { color: '#ffe0a0', glow: '#ffb347', weight: 900 }); title.position.set(0, 0.2, 1.2); g.add(title);
    const sub = textPlane('Abhidhamma', 0.55, { color: '#ffffff', weight: 600 }); sub.position.set(0, -0.75, 1.2); g.add(sub);
    const places = ['Miến Điện', 'Thái Lan', 'Việt Nam'].map((p, i) => {
      const grp = new THREE.Group(); const dot = glowSprite('#ffcf7a', 1.4); grp.add(dot);
      const lab = textPlane(p, 0.5, { color: '#fff', weight: 800, bg: 'rgba(10,20,35,.75)', radius: 30 }); lab.position.y = -0.7; grp.add(lab);
      grp.position.set(-3 + i * 3, -5.6 + (i === 1 ? -0.4 : 0), 1.5); g.add(grp); return grp;
    });
    const tTitle = e.wordTime(3, 'diệu') ?? 6, tPlaces = ['miến', 'thái', 'việt'].map(w => e.wordTime(3, w) ?? 99);
    return { update(t, d, e) {
      beam.material.uniforms.o.value = smooth(0.2, 1.4, t) * 0.7;
      const land = easeOut((t - 0.6) / 2.4); book.g.position.set(0, lerp(7, -2.95, land), 0); book.g.rotation.y = t * 0.25;
      halo.material.opacity = land * 0.45;
      const tk = backOut((t - tTitle + 0.3) / 0.6); title.scale.setScalar(Math.max(0.001, tk)); sub.scale.setScalar(Math.max(0.001, tk));
      title.material.opacity = sub.material.opacity = clamp((t - tTitle + 0.3) / 0.3);
      places.forEach((p, i) => { const k = backOut((t - tPlaces[i]) / 0.5); p.scale.setScalar(Math.max(0.001, k)); });
      const late = smooth(tPlaces[0] - 0.8, tPlaces[0] + 0.4, t);
      camTo(e, V(Math.sin(t * .2) * 1.5, lerp(1.2, -1.6, late), lerp(13, 14.5, late)), V(0, lerp(0, -2.4, late), 0), 40);
      e.bloom.strength = 0.75;
    } };
  } },

  // 5 · Three baskets, X-ray of the third
  { build(g, e) {
    const wc = document.createElement('canvas'); wc.width = wc.height = 256; const x = wc.getContext('2d');
    x.fillStyle = '#9a6a3a'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { x.fillStyle = (i + j) % 2 ? '#b8834a' : '#7a4f28'; x.fillRect(i * 16, j * 16 + ((i % 2) * 8), 16, 8); }
    const wt = new THREE.CanvasTexture(wc); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(6, 2); wt.colorSpace = THREE.SRGBColorSpace;
    const prof = [V(0, 0, 0), V(1.0, 0, 0), V(1.35, 0.5, 0), V(1.5, 1.4, 0), V(1.55, 1.8, 0), V(1.45, 1.85, 0)].map(v => new THREE.Vector2(v.x, v.y));
    const names = [['KINH', 'Sutta'], ['LUẬT', 'Vinaya'], ['LUẬN', 'Abhidhamma']];
    const baskets = names.map((nm, i) => {
      const grp = new THREE.Group(); grp.position.set((i - 1) * 4.2, -2.2, 0);
      const m = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshStandardMaterial({ map: wt, roughness: .9, side: THREE.DoubleSide })); grp.add(m); grp.userData.mesh = m;
      const lab = textPlane(nm[0], 0.9, { color: '#ffe0a0', glow: '#ffb347', weight: 900 }); lab.position.y = 3.0; grp.add(lab);
      const sub = textPlane(nm[1], 0.42, { color: '#fff', weight: 600 }); sub.position.y = 2.25; grp.add(sub);
      const glow = glowSprite('#ffcf7a', 3); glow.position.set(0, 1.0, -1.2); grp.add(glow);
      g.add(grp); return { grp, glow, lab, sub };
    });
    const advice = textPlane('“Ngủ sớm đi!”', 0.5, { color: '#10223a', weight: 800, bg: 'rgba(255,240,210,.95)', radius: 40 }); advice.position.set(-4.2, 2.3, 1.5); g.add(advice);
    const rules = textPlane('Nội quy xuất gia', 0.5, { color: '#10223a', weight: 800, bg: 'rgba(255,240,210,.95)', radius: 40 }); rules.position.set(0, 2.3, 1.5); g.add(rules);
    // x-ray figure
    e.renderer.localClippingEnabled = true;
    const scanY = new THREE.Plane(V(0, -1, 0), 0), scanY2 = new THREE.Plane(V(0, 1, 0), 0);
    const solid = mannequin(new THREE.MeshStandardMaterial({ color: 0xcfb89a, roughness: .7, clippingPlanes: [scanY] }));
    const xr = mannequin(new THREE.MeshBasicMaterial({ color: 0x6fe3ff, wireframe: true, transparent: true, opacity: .55, clippingPlanes: [scanY2], toneMapped: false }));
    const fig = new THREE.Group(); fig.add(solid, xr); fig.position.set(4.2, -1.2, 2.2); fig.scale.setScalar(0.95); g.add(fig);
    const nodes = [[0, 2.6, '#ff6b6b'], [0.2, 1.6, '#ffb347'], [-0.25, 1.2, '#7fd0ff'], [0.1, 0.8, '#e98aa8'], [-0.1, 2.0, '#ffd27a']].map(([nx, ny, col]) => {
      const s = glowSprite(col, 0.9); s.position.set(nx, ny, 0.3); fig.add(s); return s;
    });
    const scanBar = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.06), new THREE.MeshBasicMaterial({ color: 0x9ff0ff, toneMapped: false })); fig.add(scanBar);
    const ss = [1, 2, 3, 4, 5].map(j => e.sentenceStart(4, j));
    return { update(t, d, e) {
      const focus = t < ss[0] ? -1 : t < ss[1] ? 0 : t < ss[2] ? 1 : 2;
      baskets.forEach((b, i) => { b.glow.material.opacity = focus === i ? 0.45 : 0.1; b.grp.userData.mesh.rotation.y = t * 0.2 + i; b.grp.position.y = -2.2 + (focus === i ? Math.sin(t * 2) * 0.1 + 0.2 : 0); });
      advice.scale.setScalar(Math.max(0.001, backOut((t - ss[0] - 1.2) / 0.5)) * (focus === 0 ? 1 : 0.001));
      rules.scale.setScalar(Math.max(0.001, backOut((t - ss[1] - 0.4) / 0.5)) * (focus === 1 ? 1 : 0.001));
      const figIn = easeOut((t - ss[2] - 0.6) / 0.8); fig.visible = figIn > 0.01;
      baskets[2].lab.material.opacity = baskets[2].sub.material.opacity = 1 - figIn; fig.position.y = lerp(-6, -1.2, figIn);
      const scan = clamp((t - ss[3]) / 2.4); const y = lerp(3.4, -1.3, scan);
      scanY.constant = y - fig.position.y + 0.0; scanY2.constant = -(y - fig.position.y);
      // planes are in world space: compute with figure offset
      scanY.set(V(0, -1, 0), y + fig.position.y); scanY2.set(V(0, 1, 0), -(y + fig.position.y));
      scanBar.position.y = y; scanBar.visible = scan > 0 && scan < 1;
      nodes.forEach((n, i) => { const k = clamp((t - ss[4] - i * 0.25) / 0.4); n.material.opacity = k * (0.7 + 0.3 * Math.sin(t * 4 + i)); });
      const fx = focus < 0 ? 0 : (focus - 1) * 4.2, wide = focus < 0;
      const k = easeInOut(clamp((t - (focus < 0 ? 0 : ss[focus]) + 0.1) / 0.8));
      const prevX = focus <= 0 ? 0 : (focus - 2) * 4.2;
      const cx = wide ? 0 : lerp(prevX, fx, k);
      camTo(e, V(cx + 0.6, 1.2, wide ? 17 : 12), V(cx, 0.2, 0), 40);
      e.bloom.strength = 0.6;
    } };
  } },

  // 6 · 89 orbs: highlight 2 aversion, 8 greed, 8 great wholesome
  { build(g, e) {
    const list = cittaList();
    const orbs = list.map((c, i) => { const o = orbMesh(c.color, 0.2); o.userData = { home: fib(i, 89, 3.2), c }; g.add(o); return o; });
    const labels = [['TÂM SÂN · 2', '#ff6b6b'], ['TÂM THAM · 8', '#ffa25a'], ['TÂM ĐẠI THIỆN · 8', '#ffd56b']].map(([s, col]) => {
      const m = textPlane(s, 0.42, { color: col, weight: 900, bg: 'rgba(8,14,26,.85)', radius: 50 }); m.position.set(0, 1.0, 4.5); g.add(m); return m; });
    const idx = { san: list.map((c, i) => c.key === 'san' ? i : -1).filter(i => i >= 0), tham: list.map((c, i) => c.key === 'tham' ? i : -1).filter(i => i >= 0), thien: list.map((c, i) => c.key === 'tinhhao' ? i : -1).filter(i => i >= 0).slice(0, 8) };
    const ss = [1, 2, 3].map(j => e.sentenceStart(5, j));
    return { update(t, d, e) {
      const stage = t < ss[0] ? -1 : t < ss[1] ? 0 : t < ss[2] ? 1 : 2;
      const sel = stage === 0 ? idx.san : stage === 1 ? idx.tham : stage === 2 ? idx.thien : [];
      const k = easeOut((t - (stage >= 0 ? ss[stage] : 0)) / 0.9);
      const rot = new THREE.Euler(0.3, t * 0.22, 0);
      orbs.forEach((o, i) => {
        const home = o.userData.home.clone().applyEuler(rot);
        const si = sel.indexOf(i);
        if (si >= 0) { const tgt = V((si - (sel.length - 1) / 2) * 0.62, 0.2 + Math.sin(t * 3 + si) * 0.08, 4.5); o.position.copy(home.lerp(tgt, k)); o.scale.setScalar(1 + k * 0.15); o.material.emissiveIntensity = 1.2; }
        else { o.position.copy(home); o.scale.setScalar(stage >= 0 ? 0.75 : 1); o.material.emissiveIntensity = stage >= 0 ? 0.35 : 0.8; }
      });
      labels.forEach((l, i) => { l.visible = stage === i; l.scale.setScalar(Math.max(0.001, backOut((t - ss[i] - 0.3) / 0.5))); });
      camTo(e, V(Math.sin(t * 0.1) * 1.5, 0.6, 13), V(0, 0.2, 0), 40);
      e.bloom.strength = 0.75;
    } };
  } },

  // 7 · Precise terms: DOM glass card over a slow mandala
  { build(g, e) {
    const rings = [];
    for (let k = 0; k < 3; k++) {
      const n = 60 + k * 24, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pos[i * 3] = Math.cos(a) * (2.5 + k * 1.3); pos[i * 3 + 1] = Math.sin(a) * (2.5 + k * 1.3); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const p = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.16 - k * 0.03, map: dotTexture(), color: [0xffd27a, 0xe98aa8, 0x7fd0ff][k], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      g.add(p); rings.push(p);
    }
    const leaves = [0, 1, 2, 3].map(i => { const b = palmBook(1, 40 + i); b.g.scale.setScalar(0.5); g.add(b.g); return b.g; });
    return { update(t, d, e) {
      rings.forEach((r, k) => { r.rotation.z = t * (0.08 + k * 0.04) * (k % 2 ? -1 : 1); });
      leaves.forEach((l, i) => { l.position.set(Math.sin(t * .3 + i * 1.6) * 3.5, ((t * 0.4 + i * 2) % 8) - 4, -2 - i); l.rotation.set(t * .3 + i, t * .2, i); });
      camTo(e, V(0, 0, 10), V(0, 0, 0), 40); e.bloom.strength = 1.0;
    } };
  } },

  // 8 · Dusty books turn into particles, then into a mirror with a figure
  { build(g, e) {
    const books = new THREE.Group(); g.add(books);
    const bm = new THREE.MeshStandardMaterial({ color: 0x6b5a48, roughness: 1 });
    [[0, -2.2, 3.2], [0.15, -1.6, 2.9], [-0.1, -1.05, 3.0], [0.05, -0.5, 2.7]].forEach(([x, y, w], i) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, 2), bm); b.position.set(x, y, 0); b.rotation.y = i * 0.12; books.add(b); });
    const n = 2600, r = rng(9), A = new Float32Array(n * 3), B = new Float32Array(n * 3), P = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      A[i * 3] = (r() - .5) * 3.1; A[i * 3 + 1] = -2.45 + r() * 2.2; A[i * 3 + 2] = (r() - .5) * 2;
      let bx, by;
      if (i < n * 0.5) { const a = r() * Math.PI * 2; bx = Math.cos(a) * 2.3; by = Math.sin(a) * 3.2 + 0.6; }
      else if (i < n * 0.66) { const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 0.55; bx = Math.cos(a) * rr; by = Math.sin(a) * rr * 1.15 + 1.55; }
      else if (i < n * 0.7) { bx = (r() - .5) * 0.4; by = 0.75 + r() * 0.3; }
      else { const a = r() * Math.PI, rr = Math.sqrt(r()); bx = Math.cos(a) * 1.35 * rr; by = Math.sin(a) * 1.25 * rr - 0.55; }
      B[i * 3] = bx; B[i * 3 + 1] = by; B[i * 3 + 2] = (r() - .5) * 0.15;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.09, map: dotTexture(), color: 0xffe2a8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    g.add(pts);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { o: { value: 0 } },
      vertexShader: 'varying vec2 u; void main(){u=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform float o; varying vec2 u; void main(){ float d=distance(u,vec2(.5)); vec3 c=mix(vec3(.55,.75,.95),vec3(.1,.18,.3),d*1.6); gl_FragColor=vec4(c, o*.16*(1.-smoothstep(.45,.5,d))); }' }));
    glass.scale.set(2.3, 3.2, 1); glass.position.set(0, 0.6, -0.2); g.add(glass);
    const tBreak = e.sentenceStart(7, 1), tForm = e.sentenceStart(7, 2);
    return { update(t, d, e) {
      const br = clamp((t - tBreak) / 0.6); books.visible = br < 1; books.scale.setScalar(1 - br * 0.1);
      bm.opacity = 1 - br; bm.transparent = true; books.position.y = Math.sin(t) * 0.05;
      pts.visible = t > tBreak;
      const form = easeInOut((t - tForm + 0.8) / 2.6);
      for (let i = 0; i < n; i++) {
        const j = i * 3, rise = clamp((t - tBreak) / 2) * (1 - form);
        const nx = Math.sin(i * 12.9 + t * 1.3) * 0.6 * rise, ny = rise * (1.5 + Math.sin(i) * 1.2), nz = Math.cos(i * 7.1 + t) * 0.6 * rise;
        P[j] = lerp(A[j], B[j], form) + nx; P[j + 1] = lerp(A[j + 1], B[j + 1], form) + ny; P[j + 2] = lerp(A[j + 2], B[j + 2], form) + nz;
      }
      geo.attributes.position.needsUpdate = true;
      glass.material.uniforms.o.value = form;
      camTo(e, V(Math.sin(t * .2) * 1.2, 0.4, 11), V(0, 0, 0), 40); e.bloom.strength = 1.15;
    } };
  } },

  // 9 · Name it: glass chips "đang bực", "đang thèm", then comment prompt
  { build(g, e) {
    const chip = (txt, col) => {
      const grp = new THREE.Group();
      const body = new THREE.Mesh(new RoundedBoxGeometry(4.2, 1.3, 0.25, 4, 0.2), new THREE.MeshStandardMaterial({ color: 0x1a2436, roughness: .2, metalness: .4, emissive: new THREE.Color(col), emissiveIntensity: .12, transparent: true, opacity: .95 }));
      grp.add(body); const lab = textPlane(txt, 0.75, { color: '#fff', weight: 900 }); lab.position.z = 0.16; lab.material.color.setScalar(0.85); grp.add(lab);
      const gl = glowSprite(col, 4); gl.material.opacity = .35; gl.position.z = -0.8; grp.add(gl); g.add(grp); return grp;
    };
    const c1 = chip('à, đang bực', '#ff5a5a'), c2 = chip('à, đang thèm', '#ff9a3c');
    const opts = [['1', 'Cáu', '#ff5a5a'], ['2', 'Thức khuya', '#5b7cff'], ['3', 'Ăn đêm', '#ffb347']].map(([n, s, col], i) => {
      const grp = new THREE.Group(); const p = textPlane(`${n}   ${s}`, 0.62, { color: col, weight: 900, bg: 'rgba(12,20,36,.9)', radius: 46, pad: 50 }); grp.add(p);
      grp.position.set(0, 2.0 - i * 1.2, 1); g.add(grp); return grp; });
    const plate = new THREE.Mesh(new THREE.CircleGeometry(5, 64), new THREE.MeshStandardMaterial({ color: 0x101a2a, roughness: .5 }));
    plate.rotation.x = -Math.PI / 2; plate.position.y = -2.6; g.add(plate);
    const t1 = e.wordTime(8, 'bực') ?? 3, t2 = e.wordTime(8, 'thèm', 1) ?? 6, t3 = e.sentenceStart(8, 3), t4 = e.sentenceStart(8, 4);
    return { update(t, d, e) {
      const land = (c, t0, x, y) => { const k = easeOut((t - t0 + 0.4) / 1.0); c.visible = k > 0;
        c.position.set(lerp(x * 3, x, k), lerp(5, y, k), lerp(-3, 0, k)); c.rotation.set((1 - k) * 1.2, (1 - k) * 2 + Math.sin(t) * 0.1, (1 - k) * 0.6); };
      const outk = smooth(t4 - 0.3, t4 + 0.4, t);
      land(c1, t1, -0.6, 1.2); land(c2, t2, 0.6, -0.4);
      [c1, c2].forEach(c => { c.position.y += outk * 8; });
      const press = smooth(t3, t3 + 0.6, t); c1.scale.setScalar(1 + press * 0.08 * Math.sin(t * 6)); c2.scale.copy(c1.scale);
      opts.forEach((o, i) => { const k = backOut((t - t4 - 0.6 - i * 0.35) / 0.5); o.scale.setScalar(Math.max(0.001, k)); o.visible = t > t4; o.position.x = Math.sin(t * 2 + i) * 0.05; });
      camTo(e, V(Math.sin(t * .25) * 1.5, 1.5, 11), V(0, 0, 0), 40); e.bloom.strength = 1.0;
    } };
  } },

  // 10 · The table assembles, then flies apart: is it real?
  { build(g, e) {
    const wm = new THREE.MeshStandardMaterial({ color: C.wood, roughness: .55 });
    const parts = [];
    const top = new THREE.Mesh(new RoundedBoxGeometry(4.2, 0.28, 2.6, 3, 0.08), wm); parts.push([top, V(0, 0, 0), V(0, 3.5, -1), V(0.3, 0.2, 0)]);
    [[-1.8, -1.1], [1.8, -1.1], [-1.8, 1.1], [1.8, 1.1]].forEach(([x, z], i) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.2, 0.22), wm);
      parts.push([leg, V(x, -1.24, z), V(x * 2.4, -1.5 + (i % 2) * 2.5, z * 3), V(i, i * 0.7, i * 1.3)]);
    });
    parts.forEach(([m]) => g.add(m));
    const tl2 = new THREE.PointLight(0xffc27a, 30, 20); tl2.position.set(-3, 4, 4); g.add(tl2);
    const q = textPlane('?', 3.2, { color: '#ffd27a', glow: '#ffb347', weight: 900 }); q.position.set(0, 1.2, -1.5); g.add(q);
    const tq = e.wordTime(9, 'thật') ?? 4;
    return { update(t, d, e) {
      const asm = easeOut(t / 1.4), exp = easeInOut((t - tq + 0.3) / 1.6);
      parts.forEach(([m, home, far, spin], i) => {
        const s = V(home.x * 4 + (i - 2) * 2, home.y + 6 - i, -4);
        const p = s.lerp(home, asm).lerp(far, exp);
        m.position.copy(p); m.rotation.set(spin.x * exp + (1 - asm) * 2, spin.y * exp + t * 0.1, spin.z * exp);
      });
      q.material.opacity = clamp((t - tq) / 0.5); q.scale.setScalar(Math.max(0.001, backOut((t - tq) / 0.7)));
      camTo(e, V(Math.sin(t * .3) * 3, 3, 10), V(0, 0, 0), 40); e.bloom.strength = 1.0;
    } };
  } },
];

export const hideHeadline = (idx, lt) => idx === 3 || (idx === 9 && lt > 3);

// DOM overlays specific to this episode: the big "89", the term cards, the end card
export function overlay(ov, t, info, engine) {
  const tl = engine.tl.scenes, big = ov.$('.big'), card = ov.$('.card');
  // big 89 in scene 1
  if (info.idx === 0) {
    const t89 = (engine.wordTime(0, 'tám') ?? 6);
    const k = backOut((info.lt - t89) / 0.5); big.textContent = '89';
    big.style.opacity = clamp((info.lt - t89) / 0.2) * clamp((info.dur - info.lt) / 0.3); big.style.transform = `scale(${Math.max(0.01, k)})`;
  } else if (info.idx === 9 && info.lt > 3) {
    const k = easeOut((info.lt - 3) / 0.6);
    big.innerHTML = `<div style="font-size:54px;letter-spacing:.14em;color:#fff;text-shadow:none">TẬP SAU</div><div style="font-size:104px;line-height:1.1">Cái bàn<br>có thật không?</div>`;
    big.style.top = '290px'; big.style.opacity = k; big.style.transform = `translateY(${(1 - k) * 40}px)`;
  } else { big.style.opacity = 0; big.style.top = ''; }
  // term cards in scene 7
  if (info.idx === 6) {
    const sc = tl[6], j = sc.sentences.findIndex((s, i) => t < (sc.sentences[i + 1]?.s ?? 1e9));
    const states = [
      `<div class="g"><div class="t1">Vi Diệu Pháp</div><div class="t2">Thắng Pháp · Luận Tạng</div></div>`,
      `<div class="g"><div class="t2">tiếng Pāli</div><div class="t0">Abhidhamma</div><div class="t2">Vi Diệu Pháp</div></div>`,
      `<div class="g split"><div><div class="t0 hi">Abhi</div><div class="t2">cao hơn<br>thù thắng</div></div><div><div class="t0 dim">Dhamma</div></div></div>`,
      `<div class="g split"><div><div class="t0 dim">Abhi</div><div class="t2">cao hơn<br>thù thắng</div></div><div><div class="t0 hi">Dhamma</div><div class="t2">Pháp<br>sự thật</div></div></div>`,
      `<div class="g"><div class="t2">Abhi + Dhamma</div><div class="t1">= Pháp thù thắng</div></div>`,
      `<div class="g"><div class="t1">Tam Tạng · Tipiṭaka</div><div class="cols"><div><b>Kinh tạng</b><span>Sutta</span></div><div><b>Luật tạng</b><span>Vinaya</span></div><div class="on"><b>Luận tạng</b><span>Abhidhamma</span></div></div></div>`,
      `<div class="g book"><div class="t2">Sách nhập môn</div><div class="t1">Vi Diệu Pháp Tập Yếu</div><div class="t3">Abhidhammattha Saṅgaha</div><div class="t2">Ngài Anuruddha soạn<br>Bản Việt: Ngài Tịnh Sự dịch</div></div>`,
    ];
    const st = clamp(j, 0, states.length - 1);
    if (card.dataset.st !== String(st)) { card.dataset.st = st; card.innerHTML = states[st]; }
    const k = easeOut((t - (st === 0 ? sc.s + 0.2 : sc.sentences[st].s)) / 0.45);
    card.style.opacity = k * clamp((info.dur - info.lt) / 0.3);
    card.style.transform = `perspective(1400px) rotateY(${(1 - k) * -28}deg) translateY(${(1 - k) * 30}px)`;
  } else { card.style.opacity = 0; card.dataset.st = ''; }
}

export const CSS_EP = `
.card .g{background:linear-gradient(160deg,rgba(255,255,255,.14),rgba(255,255,255,.04));border:2px solid rgba(255,220,150,.35);border-radius:44px;padding:56px 48px;text-align:center;backdrop-filter:blur(6px);box-shadow:0 30px 80px rgba(0,0,0,.45)}
.card .t0{font-weight:900;font-size:128px;color:#ffe3a3;text-shadow:0 0 40px rgba(245,185,66,.6);line-height:1.05}
.card .t1{font-weight:900;font-size:84px;color:#fff;line-height:1.15}
.card .t2{font-weight:600;font-size:46px;color:rgba(255,255,255,.85);line-height:1.35;margin:14px 0}
.card .t3{font-weight:800;font-size:50px;color:#ffb4c8;margin:10px 0}
.card .split{display:flex;gap:24px;justify-content:center}.card .split>div{flex:1}
.card .hi{color:#ffe3a3}.card .dim{color:rgba(255,255,255,.3);text-shadow:none}
.card .cols{display:flex;gap:18px;margin-top:34px}.card .cols div{flex:1;padding:28px 10px;border-radius:28px;background:rgba(255,255,255,.07);display:flex;flex-direction:column;gap:10px}
.card .cols b{font-size:44px;font-weight:900}.card .cols span{font-size:34px;color:rgba(255,255,255,.7)}
.card .cols .on{background:rgba(245,185,66,.25);border:2px solid rgba(245,185,66,.8)}
`;
