// Episode 02 · Chiếc xe biến đi đâu? (paññatti vs paramattha). Same conventions as ep01.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CITTA_GROUPS, bustPoints, camTo, cittaMap, motorbike, nameTag } from './lib.js';
import { V, clamp, lerp, smooth, easeOut, easeInOut, backOut, rng, textPlane, glowSprite, dotTexture, glassMaterial, shockwave, particleField, FONT_TITLE } from './engine.js';

// v3 look: classic gold palette and serif titles (same as episode 01)
const TH = { title: '#ffe7b0', glow: '#ffb347', coolHex: 0x7fe3ff, accentHex: 0xffc94a, titleFont: FONT_TITLE };
const TAG_BG = 'rgba(176,120,32,.92)', ME_BG = 'rgba(200,90,130,.9)';

const STR = {
  vi: { parts: ['Bánh xe', 'Yên xe', 'Động cơ'], notBike: '✗ Không phải xe', bikeTag: 'XE MÁY', objects: ['Cái bàn', 'Ngôi nhà', 'Chiếc xe'], yourName: 'Tên của bạn',
    clusters: ['cứng', 'nóng', 'màu sắc', 'cái biết'], me: 'TÔI', feel: ['cứng', 'mát', 'nhẵn'], map: 'Bản đồ 89 tâm', mapCount: '0 / 89 · nền móng: chân đế',
    endk: 'TẬP 3', endt: 'Chỉ có 4 thứ<br>là thật',
    w: { not1: ['không', 0], seat2: ['yên', 1], lap: 'lắp', tag: 'tên', you: ['chính', 0], peel: 'soi', clusters: ['cứng', 'nóng', 'màu', 'biết'], hair: 'tóc', think: ['suy', 0], feel: ['cảm', 0],
      no: ['không', 0], bind: 'trói', place: 'đặt', feels: ['cứng', 'mát', 'nhẵn'], real: 'chân', four: 'bốn', use: 'dùng' } },
  en: { parts: ['Wheel', 'Seat', 'Engine'], notBike: '✗ Not the bike', bikeTag: 'MOTORBIKE', objects: ['Table', 'House', 'Bike'], yourName: 'Your name',
    clusters: ['hardness', 'heat', 'color', 'knowing'], me: 'ME', feel: ['hard', 'cool', 'smooth'], map: 'Map of 89 minds', mapCount: '0 / 89 · foundations: ultimate realities',
    endk: 'EPISODE 3', endt: 'Only 4 things<br>are real',
    w: { not1: ['no', 0], seat2: ['seat', 1], lap: 'put', tag: 'label', you: ['you', 0], peel: 'closely', clusters: ['hardness', 'heat', 'color', 'knowing'], hair: 'hair', think: ['thoughts', 0], feel: ['feelings', 0],
      no: ['not', 0], bind: 'trapped', place: 'put', feels: ['hard', 'cool', 'smooth'], real: 'ultimate', four: 'four', use: 'using' } },
};
const L = e => STR[e.cfg.lang || 'vi'];
const W = (e, i, key, fallback) => { const v = L(e).w[key]; const r = Array.isArray(v) ? e.wordTime(i, v[0], v[1]) : e.wordTime(i, v); return r ?? fallback; };
const pedestal = (g, y = -1.55) => {
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.25, 96), new THREE.MeshPhysicalMaterial({ color: 0x141826, metalness: .6, roughness: .2, clearcoat: 1 })); ped.position.y = y; g.add(ped);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.02, 6, 160), new THREE.MeshBasicMaterial({ color: TH.coolHex, toneMapped: false })); ring.rotation.x = Math.PI / 2; ring.position.y = y + 0.13; g.add(ring);
  return { ped, ring };
};
const HOOK_CAM = [V(0, 1.4, 12.5), V(0, -0.3, 0)];

export const scenes = [
  // 1 · Hook: the exploded motorbike from the end of episode 1, a question mark scanning it
  { build(g, e) {
    const mb = motorbike({ scale: 0.55, y: -0.3 }); g.add(mb.bike); mb.setExplode(1);
    const pd = pedestal(g, -1.6); pd.ped.scale.set(0.75, 1, 0.75); pd.ring.scale.set(0.75, 0.75, 1);
    const q = textPlane('?', 1.2, { color: TH.title, glow: TH.glow, weight: 800, font: TH.titleFont }); q.position.set(0, 1.9, 0.8); g.add(q);
    const scan = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 4.2), new THREE.MeshBasicMaterial({ color: TH.coolHex, transparent: true, opacity: 0.8, toneMapped: false })); scan.position.z = 1.6; g.add(scan);
    return { update(t, d, e) {
      e.setNebula(0x061018, 0x12304a, 0x2a5a6a, 0.55);
      mb.bike.rotation.y = 0.6 + t * 0.3;
      q.rotation.y = Math.sin(t * 2) * 0.3; q.position.y = 1.9 + Math.sin(t * 1.5) * 0.1;
      scan.position.x = Math.sin(t * 1.6) * 1.8; scan.material.opacity = 0.5 + 0.3 * Math.sin(t * 8);
      camTo(e, V(Math.sin(t * 0.15) * 1.2, 1.4, 13), V(0, -0.1, 0));
      e.bloom.strength = 0.5;
    } };
  } },

  // 2 · Parts on a glowing floor; the camera visits each part; none of them is "the bike"; then they reassemble
  { build(g, e) {
    const S = 0.8, Y = -0.5;
    const mb = motorbike({ scale: S, y: Y }); g.add(mb.bike);
    const grid = new THREE.GridHelper(16, 32, TH.coolHex, TH.accentHex); grid.position.y = -1.55; grid.material.transparent = true; grid.material.opacity = 0.18; g.add(grid);
    const spots = { wheel: V(-3.2, -0.85, 0.6), seat: V(0, -1.3, 0.6), engine: V(3.2, -1.2, 0.6) };
    const r = rng(4);
    const targets = mb.parts.map((p, i) => { const n = p.userData.name;
      const w = spots[n] || V(-4.5 + r() * 9, -1.4, -1.6 - r() * 1.2);
      const h = mb.homes[i]; return V(w.x / S - h.x, (w.y - Y) / S - h.y, w.z / S - h.z); });
    const label = (s, x, y) => { const m = textPlane(s, 0.5, { color: '#fff', weight: 800, bg: 'rgba(30,22,10,.88)', radius: 34, pad: 30 }); m.position.set(x, y, 1.2); g.add(m); return m; };
    const labs = L(e).parts.map((s, i) => label(s, [-3.2, 0, 3.2][i], 0.5));
    const stamps = [0, 1, 2].map(i => { const m = textPlane(L(e).notBike, 0.42, { color: '#ff6b8a', weight: 800, bg: 'rgba(40,8,20,.85)', radius: 24, pad: 22 }); m.position.set([-3.2, 0, 3.2][i], -0.05, 1.3); m.rotation.z = -0.12; g.add(m); return m; });
    const ss = [0, 1, 2, 3, 4, 5, 6].map(j => e.sentenceStart(1, j));
    const tStamp = [W(e, 1, 'not1', ss[4]), W(e, 1, 'seat2', ss[4] + 1), ss[5]], tAsm = W(e, 1, 'lap', ss[6]);
    return { update(t, d, e) {
      e.setNebula(0x061018, 0x14284a, 0x3a2a6a, 0.5);
      const asm = easeInOut((t - tAsm) / 1.4);
      mb.parts.forEach((p, i) => { const o = targets[i].clone().multiplyScalar(1 - asm); p.position.copy(o); p.rotation.set(0, 0, 0); });
      mb.lines.visible = false; mb.bike.rotation.y = asm * (t - tAsm) * 0.4;
      labs.forEach((m, i) => { const k = backOut((t - ss[i] - 0.1) / 0.45); m.scale.setScalar(Math.max(0.001, k * (1 - asm))); });
      stamps.forEach((m, i) => { const k = backOut((t - tStamp[i]) / 0.35); m.scale.setScalar(Math.max(0.001, (k > 0 ? 1.15 - 0.15 * k : 0.001) * (1 - asm))); m.visible = t > tStamp[i]; });
      const stop = t < ss[1] ? 0 : t < ss[2] ? 1 : t < ss[3] ? 2 : 3;
      const xs = [-3.2, 0, 3.2, 0], cx = xs[stop], prev = stop === 0 ? -3.2 : xs[stop - 1], k = easeInOut((t - (stop === 0 ? 0 : ss[stop])) / 0.7);
      const x = lerp(prev, cx, k), wide = stop === 3 ? k : 0;
      camTo(e, V(x * (1 - wide * 0.2), lerp(1.2, 2.2, wide), lerp(10, 14, wide)), V(x, lerp(-0.4, -0.5, wide), 0));
      e.bloom.strength = 0.5;
    } };
  } },

  // 3 · A glowing "MOTORBIKE" sticker lands on the assembled bike: it is only a name
  { build(g, e) {
    const mb = motorbike({ scale: 0.8, y: -0.7 }); g.add(mb.bike); mb.setExplode(0);
    pedestal(g, -1.75);
    const tag = nameTag(L(e).bikeTag, { h: 0.62, bg: TAG_BG }); g.add(tag);
    const wave = shockwave(TH.accentHex); wave.position.set(0, 0.9, 0.5); g.add(wave);
    const tTag = W(e, 2, 'tag', 1.5), tYou = W(e, 2, 'you', 5);
    return { update(t, d, e) {
      e.setNebula(0x0a0a24, 0x2a1a5a, 0x5a3a8a, 0.55);
      mb.bike.rotation.y = 0.5 + t * 0.12;
      const k = easeOut((t - tTag + 0.5) / 0.6); tag.position.set(lerp(3.5, 0, k), lerp(4, 1.15, k), lerp(2, 0.9, k)); tag.rotation.z = (1 - k) * 0.8;
      tag.scale.setScalar(1 + (t > tTag + 0.1 && t < tTag + 0.4 ? 0.1 : 0));
      wave.userData.play(clamp((t - tTag - 0.1) / 1.2), 3);
      const glow = smooth(tYou - 0.2, tYou + 0.6, t); tag.material.opacity = 1 - glow * 0.3;
      camTo(e, V(Math.sin(t * 0.2) * 1.2, 1.2 + glow * 0.6, 11.5 - glow * 1.5), V(0, 0.1, 0));
      e.bloom.strength = 0.55;
    } };
  } },

  // 4 · Table, house, bike with name tags; looked at closely they become hardness, heat, color and knowing
  { build(g, e) {
    const wood = new THREE.MeshPhysicalMaterial({ color: 0x8a5a33, roughness: .5, clearcoat: .4 });
    const objs = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
    objs[0].add(new THREE.Mesh(new RoundedBoxGeometry(1.6, 0.14, 1.0, 2, 0.04), wood));
    objs[0].children[0].position.y = 0.4; [[-0.7, -0.4], [0.7, -0.4], [-0.7, 0.4], [0.7, 0.4]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), wood); l.position.set(x, -0.08, z); objs[0].add(l); });
    const wall = new THREE.Mesh(new RoundedBoxGeometry(1.3, 1.0, 1.1, 2, 0.04), new THREE.MeshPhysicalMaterial({ color: 0xe9e4f5, roughness: .6 })); objs[1].add(wall);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.05, 0.7, 4), new THREE.MeshPhysicalMaterial({ color: 0x8a3a5a, roughness: .5 })); roof.position.y = 0.85; roof.rotation.y = Math.PI / 4; objs[1].add(roof);
    const mini = motorbike({ scale: 0.36, y: -0.35 }); mini.setExplode(0); objs[2].add(mini.bike);
    objs.forEach((o, i) => { o.position.set(-1.9 + i * 1.9, -0.6, 0); o.scale.setScalar(0.8); g.add(o); });
    const tags = L(e).objects.map((s, i) => { const m = nameTag(s, { h: 0.34, bg: TAG_BG }); m.position.set(-1.9 + i * 1.9, 0.6, 0.5); g.add(m); return m; });
    const you = nameTag(L(e).yourName, { h: 0.38, bg: ME_BG }); you.position.set(0, 1.45, 0.5); g.add(you);
    const n = 1800, r = rng(8), A = new Float32Array(n * 3), B = new Float32Array(n * 3), P = new Float32Array(n * 3), Cc = new Float32Array(n * 3);
    const cols = [new THREE.Color(0xb07a4a), new THREE.Color(0xff8a3d), null, new THREE.Color(0xffffff)], centers = [-1.8, -0.6, 0.6, 1.8].map(x => V(x, -0.4, 0.4));
    for (let i = 0; i < n; i++) { const o = i % 3, c = i % 4;
      A.set([-1.9 + o * 1.9 + (r() - .5) * 1.1, -0.6 + (r() - .5) * 1.2, (r() - .5) * 1.0], i * 3);
      const a = r() * Math.PI * 2, b = Math.acos(2 * r() - 1), rr = Math.cbrt(r()) * (c === 3 ? 0.35 : 0.5);
      B.set([centers[c].x + Math.sin(b) * Math.cos(a) * rr, centers[c].y + Math.cos(b) * rr, centers[c].z + Math.sin(b) * Math.sin(a) * rr], i * 3);
      const col = cols[c] || new THREE.Color().setHSL(r(), 0.9, 0.6); Cc.set([col.r, col.g, col.b], i * 3); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(P, 3)); pg.setAttribute('color', new THREE.BufferAttribute(Cc, 3));
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.07, map: dotTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); g.add(pts);
    const knowing = glowSprite('#ffffff', 1.6, 0); knowing.position.copy(centers[3]); g.add(knowing);
    const clabs = L(e).clusters.map((s, i) => { const m = textPlane(s, 0.3, { color: '#fff', weight: 800, bg: 'rgba(10,12,30,.8)', radius: 24, pad: 22 }); m.position.set(centers[i].x, -1.35, 0.8); g.add(m); return m; });
    const tPeel = W(e, 3, 'peel', 6), tC = L(e).w.clusters.map((w, i) => e.wordTime(3, w) ?? tPeel + 1 + i);
    return { update(t, d, e) {
      e.setNebula(0x0a0820, 0x2a1a50, 0x1a5a7a, 0.55);
      const peel = easeInOut((t - tPeel) / 0.8), dis = easeInOut((t - tPeel - 0.3) / 1.6);
      tags.forEach((m, i) => { m.scale.setScalar(Math.max(0.001, backOut((t - 0.2 - i * 0.3) / 0.5))); m.position.y = 0.6 + peel * (1.5 + i * 0.3); m.rotation.z = peel * (i - 1) * 0.5; m.material.opacity = 1 - peel; });
      you.scale.setScalar(Math.max(0.001, backOut((t - 1.4) / 0.5))); you.position.y = 1.45 + peel * 2; you.material.opacity = 1 - peel;
      objs.forEach((o, i) => { o.scale.setScalar(Math.max(0.001, 0.8 * (1 - dis))); o.rotation.y = t * 0.2 + i; });
      pts.visible = dis > 0.01;
      for (let i = 0; i < n * 3; i += 3) { const w = Math.sin(Math.PI * dis) * 0.4;
        P[i] = lerp(A[i], B[i], dis) + Math.sin(i + t * 3) * w; P[i + 1] = lerp(A[i + 1], B[i + 1], dis) + Math.cos(i * 0.3 + t * 2) * w; P[i + 2] = lerp(A[i + 2], B[i + 2], dis); }
      pg.attributes.position.needsUpdate = true;
      knowing.material.opacity = smooth(tC[3] - 0.2, tC[3] + 0.4, t) * (0.8 + 0.2 * Math.sin(t * 5));
      clabs.forEach((m, i) => m.scale.setScalar(Math.max(0.001, backOut((t - tC[i]) / 0.45))));
      camTo(e, V(Math.sin(t * 0.2) * 0.8, 1.0, 12.5), V(0, -0.1, 0)); e.bloom.strength = 0.55;
    } };
  } },

  // 5 · "Where is I?": a bust of light whose regions keep changing, while the name tag stays still
  { build(g, e) {
    const n = 2600, r = rng(12), B = bustPoints(n, r, 1.0), Cc = new Float32Array(n * 3);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(B, 3)); pg.setAttribute('color', new THREE.BufferAttribute(Cc, 3));
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.07, map: dotTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    const bust = new THREE.Group(); bust.position.y = -1.05; bust.add(pts); g.add(bust);
    const tag = nameTag(L(e).me, { h: 0.55, bg: ME_BG }); tag.position.set(0, 1.85, 0.6); g.add(tag);
    const region = i => { const y = B[i * 3 + 1]; return y > 1.95 ? 0 : y > 1.0 ? 1 : y < 0.65 ? 2 : -1; };
    const regs = Array.from({ length: n }, (_, i) => region(i));
    const tR = [W(e, 4, 'hair', 3), W(e, 4, 'think', 6), W(e, 4, 'feel', 9)], tAll = e.sentenceStart(4, 7), base = new THREE.Color(0xcfe0ff), tmp = new THREE.Color();
    return { update(t, d, e) {
      e.setNebula(0x0a0a20, 0x30185a, 0x5a2a6a, 0.55);
      const all = smooth(tAll, tAll + 0.8, t);
      for (let i = 0; i < n; i++) { const rg = regs[i]; let k = all;
        if (rg >= 0) k = Math.max(k, smooth(tR[rg], tR[rg] + 0.4, t) * (1 - smooth(tR[rg] + 2.6, tR[rg] + 3.2, t)));
        tmp.setHSL((t * 0.25 + i * 0.0007 + rg * 0.3) % 1, 0.85, 0.62); const c = base.clone().lerp(tmp, k); Cc.set([c.r, c.g, c.b], i * 3); }
      pg.attributes.color.needsUpdate = true;
      bust.rotation.y = Math.sin(t * 0.4) * 0.25;
      tag.scale.setScalar(Math.max(0.001, backOut((t - 0.8) / 0.5)));
      camTo(e, V(Math.sin(t * 0.2) * 0.8, 0.5, 11.5), V(0, 0.05, 0)); e.bloom.strength = 0.6;
    } };
  } },

  // 6 · Precise terms: glass card (DOM) over a flame of particles ("fire is hot whatever you call it")
  { build(g, e) {
    const n = 900, r = rng(3), seeds = Float32Array.from({ length: n * 3 }, () => r()), P = new Float32Array(n * 3), Cc = new Float32Array(n * 3);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(P, 3)); pg.setAttribute('color', new THREE.BufferAttribute(Cc, 3));
    const fire = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.16, map: dotTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); g.add(fire);
    const core = glowSprite('#ff9a3c', 3, 0.5); core.position.set(0, -1.6, -1); g.add(core);
    const tmp = new THREE.Color();
    return { update(t, d, e) {
      e.setNebula(0x0e0a20, 0x2c1e4a, 0x6a3a2a, 0.55);
      for (let i = 0; i < n; i++) { const a = seeds[i * 3], b = seeds[i * 3 + 1], c = seeds[i * 3 + 2], life = (t * (0.5 + b * 0.6) + a) % 1;
        const w = (1 - life) * 0.9; P.set([Math.sin(a * 40 + t * 3) * w * c, -2.4 + life * 3.6, -1 + Math.cos(b * 30 + t * 2) * w * 0.4], i * 3);
        tmp.setHSL(0.02 + life * 0.1, 1, 0.55 - life * 0.25); Cc.set([tmp.r, tmp.g, tmp.b], i * 3); }
      pg.attributes.position.needsUpdate = true; pg.attributes.color.needsUpdate = true;
      camTo(e, V(0, 0, 10), V(0, 0, 0)); e.bloom.strength = 0.6;
    } };
  } },

  // 7 · The "MOTORBIKE" tag chained to the bike; the chain breaks, a thin thread of light remains
  { build(g, e) {
    const mb = motorbike({ scale: 0.5, y: -1.9 }); mb.setExplode(0); g.add(mb.bike);
    const tag = nameTag(L(e).bikeTag, { h: 0.5, bg: TAG_BG }); tag.position.set(0, 1.25, 0.3); g.add(tag);
    const linkMat = new THREE.MeshPhysicalMaterial({ color: 0xb8bcc8, metalness: 1, roughness: .25, emissive: new THREE.Color(TH.accentHex), emissiveIntensity: 0 });
    const links = [...Array(9)].map((_, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 10, 24), linkMat); m.scale.y = 1.5; m.position.set(0, 0.95 - i * 0.27, 0.3); m.rotation.y = i % 2 ? Math.PI / 2 : 0; g.add(m); return m; });
    const thread = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 1.0, 0.3), V(0, -1.15, 0.3)]), new THREE.LineBasicMaterial({ color: TH.coolHex, transparent: true, opacity: 0, toneMapped: false })); g.add(thread);
    const r = rng(6), dirs = links.map(() => V((r() - .5) * 6, (r() - .2) * 3, r() * 3));
    const tNo = W(e, 6, 'no', 3), tBreak = W(e, 6, 'bind', 12);
    return { update(t, d, e) {
      e.setNebula(0x0a0a20, 0x241a50, 0x2a4a7a, 0.55);
      linkMat.emissiveIntensity = smooth(tNo, tNo + 0.4, t) * 0.6;
      const br = easeOut((t - tBreak) / 1.2);
      links.forEach((m, i) => { m.position.set(dirs[i].x * br, 0.95 - i * 0.27 + dirs[i].y * br, 0.3 + dirs[i].z * br); m.rotation.x = br * (i + 1); m.visible = br < 0.98; });
      thread.material.opacity = smooth(tBreak + 0.2, tBreak + 0.8, t) * (0.7 + 0.3 * Math.sin(t * 4));
      tag.position.y = 1.25 + br * (0.2 + Math.sin(t * 1.5) * 0.1); tag.rotation.z = br * Math.sin(t) * 0.08;
      mb.bike.rotation.y = 0.4 + Math.sin(t * 0.3) * 0.3;
      camTo(e, V(Math.sin(t * 0.2) * 0.8, 0.4, 11.5), V(0, -0.2, 0)); e.bloom.strength = 0.55;
    } };
  } },

  // 8 · Look now: a glowing handprint on a wooden table; ripples; "hard, cool, smooth"
  { build(g, e) {
    const wc = document.createElement('canvas'); wc.width = 1024; wc.height = 512; const x = wc.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 1024, 0); gr.addColorStop(0, '#6b4226'); gr.addColorStop(1, '#8a5a33'); x.fillStyle = gr; x.fillRect(0, 0, 1024, 512);
    const r = rng(2); x.strokeStyle = 'rgba(40,20,8,.35)'; for (let i = 0; i < 60; i++) { x.lineWidth = 1 + r() * 2; x.beginPath(); const y = r() * 512; x.moveTo(0, y); x.bezierCurveTo(300, y + (r() - .5) * 40, 700, y + (r() - .5) * 40, 1024, y + (r() - .5) * 30); x.stroke(); }
    const wt = new THREE.CanvasTexture(wc); wt.colorSpace = THREE.SRGBColorSpace;
    const table = new THREE.Mesh(new RoundedBoxGeometry(7, 0.3, 4.4, 3, 0.08), new THREE.MeshPhysicalMaterial({ map: wt, roughness: .45, clearcoat: .5 })); table.position.y = -1.3; g.add(table);
    const hc = document.createElement('canvas'); hc.width = hc.height = 512; const h = hc.getContext('2d');
    h.fillStyle = '#ffffff'; h.shadowColor = '#ffffff'; h.shadowBlur = 24; h.beginPath(); h.roundRect(176, 250, 170, 190, 70); h.fill();
    [[165, 300, -0.75, 120, 21], [200, 175, -0.12, 150, 19], [250, 160, -0.02, 165, 19], [298, 170, 0.08, 155, 18], [338, 205, 0.2, 120, 16]].forEach(([fx, fy, a, len, w]) => { h.save(); h.translate(fx, fy); h.rotate(a); h.beginPath(); h.roundRect(-w, -len / 2, 2 * w, len, w); h.fill(); h.restore(); });
    const ht = new THREE.CanvasTexture(hc);
    const hand = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), new THREE.MeshBasicMaterial({ map: ht, color: TH.coolHex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    hand.rotation.x = -Math.PI / 2; hand.position.set(0, -1.13, 0.3); g.add(hand);
    const rings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.015, 6, 96), new THREE.MeshBasicMaterial({ color: TH.coolHex, transparent: true, toneMapped: false })); m.rotation.x = Math.PI / 2; m.position.set(0, -1.12, 0.3); g.add(m); return m; });
    const chips = L(e).feel.map((s, i) => { const m = textPlane(s, 0.42, { color: '#fff', weight: 800, bg: 'rgba(20,24,60,.85)', radius: 30, pad: 28 }); m.position.set(-1.9 + i * 1.9, 0.5 + (i === 1 ? 0.35 : 0), 0.4); g.add(m); return m; });
    const tPlace = W(e, 7, 'place', 1.5), tF = L(e).w.feels.map((w, i) => e.wordTime(7, w) ?? tPlace + 3 + i);
    return { update(t, d, e) {
      e.setNebula(0x0c0a1a, 0x2a1e40, 0x4a3a2a, 0.5);
      hand.material.opacity = smooth(tPlace, tPlace + 0.6, t) * (0.75 + 0.25 * Math.sin(t * 3));
      rings.forEach((m, i) => { const k = ((t - tPlace - 0.4) * 0.5 + i / 3) % 1; m.visible = t > tPlace + 0.4; m.scale.setScalar(0.4 + k * 3.2); m.material.opacity = (1 - k) * 0.7; });
      chips.forEach((m, i) => { m.scale.setScalar(Math.max(0.001, backOut((t - tF[i]) / 0.45))); m.position.y += Math.sin(t * 2 + i) * 0.002; });
      camTo(e, V(Math.sin(t * 0.15) * 0.8, 3.2, 8.5), V(0, -0.6, 0)); e.bloom.strength = 0.5;
    } };
  } },

  // 9 · Teaser for episode 3: four glass pillars rise; three hidden, one glows (the mind you are using now)
  { build(g, e) {
    const pillars = [0, 1, 2, 3].map(i => {
      const grp = new THREE.Group(); grp.position.set(-1.8 + i * 1.2, -0.1, 0); g.add(grp);
      grp.add(new THREE.Mesh(new RoundedBoxGeometry(0.85, 2.3, 0.85, 4, 0.12), glassMaterial(i === 3 ? 0xbfe8ff : 0xd8d0ff, 0.4)));
      const inner = glowSprite(i === 3 ? '#7fe8ff' : '#9a8cff', 1.8, i === 3 ? 0 : 0.25); grp.add(inner);
      const q = textPlane('?', 0.7, { color: '#ffffff', weight: 800, font: TH.titleFont }); q.position.z = 0.55; grp.add(q);
      return { grp, inner, q };
    });
    const tFour = W(e, 8, 'four', 3), tUse = W(e, 8, 'use', 6);
    return { update(t, d, e) {
      e.setNebula(0x061018, 0x1a2250, 0x3a2a7a, 0.55);
      const back = 0;
      pillars.forEach((p, i) => { const k = easeOut((t - tFour - i * 0.3) / 0.8); p.grp.position.y = lerp(-4.5, -0.1, k); p.grp.visible = k > 0.001;
        p.grp.rotation.y = Math.sin(t * 0.5 + i) * 0.2; });
      const glow = smooth(tUse - 0.2, tUse + 0.6, t); pillars[3].inner.material.opacity = glow * (0.85 + 0.15 * Math.sin(t * 5)); pillars[3].q.material.opacity = 1 - glow; pillars[3].inner.scale.setScalar(1.8 + glow);
      camTo(e, V(Math.sin(t * 0.2) * 1.0, 0.6, 13), V(0, 0, 0)); e.bloom.strength = 0.55;
    } };
  } },
];

export const transitions = [
  { type: 'zoom', focus: [0.5, 0.6] },                 // down to the parts on the floor
  { type: 'dissolve' },                                // reassembled -> labelled
  { type: 'whip', dir: 1 },                            // the bike joins the table and the house
  { type: 'zoom', focus: [0.73, 0.55] },               // into the "knowing" -> the bust of light
  { type: 'dissolve' },                                // the self dissolves into the terms
  { type: 'zoom', focus: [0.5, 0.5] },                 // into the name -> the chained tag
  { type: 'whip', dir: -1 },                           // over to the table
  { type: 'light', focus: [0.5, 0.62] },               // the ripples of touch -> four pillars
];

const END_AT = e => e.sentenceStart(8, 3) - 0.3;
export const hideHeadline = (idx, lt) => idx === 8 && lt > (window.__endAt ?? 99);

export function overlay(ov, t, info, engine) {
  const tl = engine.tl.scenes, big = ov.$('.big'), card = ov.$('.card'), S = L(engine);
  if (info.idx === 8 && info.lt > (window.__endAt = END_AT(engine))) {
    const k = easeOut((info.lt - window.__endAt) / 0.7);
    big.innerHTML = `<div class="endk">${S.endk}</div><div class="endt">${S.endt}</div>`;
    big.style.top = '270px'; big.style.opacity = k; big.style.transform = `translateY(${(1 - k) * 40}px)`;
  } else big.style.opacity = 0;
  if (info.idx === 5) {
    const sc = tl[5], j = sc.sentences.findIndex((s, i) => t < (sc.sentences[i + 1]?.s ?? 1e9));
    const states = engine.cfg.lang === 'en' ? [
      `<div class="g"><div class="t1">Two kinds of truth</div></div>`,
      `<div class="g"><div class="t2">The Abhidhamma divides truth in two</div><div class="t1">Concept · Ultimate</div></div>`,
      `<div class="g"><div class="t1">Concept</div><div class="t3">Paññatti</div><div class="t2">conventional truth:<br>names, shapes, ideas</div></div>`,
      `<div class="g"><div class="t1">Ultimate reality</div><div class="t3">Paramattha</div><div class="t2">what remains without names,<br>with its own nature</div></div>`,
      `<div class="g"><div class="t1">Fire is hot</div><div class="t2">whatever language you call it in</div></div>`,
      `<div class="g split"><div><div class="t2">Concept</div><div class="t3">Paññatti</div></div><div><div class="t2">studied in the Abhidhamma</div><div class="t3 hi">Paramattha</div></div></div>`,
    ] : [
      `<div class="g"><div class="t1">Hai loại sự thật</div></div>`,
      `<div class="g"><div class="t2">Vi Diệu Pháp chia sự thật làm hai</div><div class="t1">Chế định · Chân đế</div></div>`,
      `<div class="g"><div class="t1">Chế định</div><div class="t3">Paññatti</div><div class="t2">sự thật theo quy ước:<br>tên gọi, hình dáng, khái niệm</div></div>`,
      `<div class="g"><div class="t1">Chân đế</div><div class="t3">Paramattha</div><div class="t2">sự thật tối hậu, còn lại khi bỏ hết tên gọi,<br>có đặc tính riêng</div></div>`,
      `<div class="g"><div class="t1">Lửa vẫn nóng</div><div class="t2">dù bạn gọi nó bằng tiếng gì</div></div>`,
      `<div class="g split"><div><div class="t2">Chế định</div><div class="t3">Paññatti</div></div><div><div class="t2">Vi Diệu Pháp nghiên cứu</div><div class="t3 hi">Paramattha</div></div></div>`,
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
.card .t1{font-family:"Playfair Display",serif;font-weight:800;font-size:84px;color:#fff;line-height:1.12}
.card .t2{font-weight:600;font-size:42px;color:rgba(255,255,255,.85);line-height:1.4;margin:14px 0}
.card .t3{font-family:"Playfair Display",serif;font-style:italic;font-weight:700;font-size:58px;color:#ffbfd0;margin:10px 0}
.card .split{display:flex;gap:20px;justify-content:center}.card .split>div{flex:1}
.card .hi{color:#ffe3a3}
.big .endk{font-family:Montserrat,sans-serif;font-size:44px;font-weight:700;letter-spacing:.3em;color:#fff;text-shadow:none;margin-bottom:10px}
.big .endt{font-size:108px;line-height:1.05}
`;
