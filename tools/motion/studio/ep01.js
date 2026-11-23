// Episode 01 · "Porcelain & daylight" style (first three scenes for the review demo). Content unchanged.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { V, clamp, lerp, smooth, easeOut, easeInOut, easeInOutSine, rng, textPlane, FONT_SERIF, M, reskin, contactShadow } from './engine.js';
import { palmLeafTexture } from '../lux/materials.js';
import { armillary, lacquerBox, phone, glassCard, fridge, castAll } from '../lux/props.js';

const STR = {
  vi: { notes: ['Video bạn sẽ thích', '+99 tin nhắn', 'Xem tiếp tập 5?'], date: 'Thứ Ba, 12 tháng 11', w: { burst: 'đếm', n89: 'tám', not: 'chưa', book: 'sách' } },
  en: { notes: ['Videos you might like', '+99 messages', 'Next episode?'], date: 'Tuesday, November 12', w: { burst: 'count', n89: 'eighty', not: 'nobody', book: 'manual' } },
};
const L = e => STR[e.cfg.lang || 'vi'];
const path = (keys, t) => { let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const [t0, p0, l0] = keys[i], [t1, p1, l1] = keys[i + 1], k = easeInOutSine((t - t0) / Math.max(1e-3, t1 - t0)); return [p0.clone().lerp(p1, k), l0.clone().lerp(l1, k)]; };

// palm-leaf manuscript between teak covers, tied with vermilion thread
function manuscript({ n = 16, Lx = 4.2, D = 0.72, T = 0.024 } = {}) {
  const g = new THREE.Group(), leaves = [], edge = new THREE.MeshStandardMaterial({ color: 0xcaa874, roughness: 0.7 });
  for (let i = 0; i < n; i++) { const face = new THREE.MeshStandardMaterial({ map: palmLeafTexture(200 + i), roughness: 0.6 });
    const p = new THREE.Group(); p.add(new THREE.Mesh(new THREE.BoxGeometry(Lx, T, D), [edge, edge, face, face, edge, edge])); p.position.y = 0.07 + T / 2 + i * T; g.add(p); leaves.push(p); }
  const teak = M.teak(), cg = new RoundedBoxGeometry(Lx + 0.16, 0.07, D + 0.1, 2, 0.02);
  const bottom = new THREE.Mesh(cg, teak); bottom.position.y = 0.035; g.add(bottom);
  const top = new THREE.Group(); top.position.set(0, 0.07 + n * T + 0.035, -(D + 0.1) / 2); g.add(top);
  const tm = new THREE.Mesh(cg, teak); tm.position.z = (D + 0.1) / 2; top.add(tm);
  const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 48), M.vermilion()); seal.position.set(0, 0.045, (D + 0.1) / 2); top.add(seal);
  [-0.95, 0.95].forEach(cx => { const pts = [], hy = 0.07 + n * T / 2 + 0.03, ry = n * T / 2 + 0.11, rz = D / 2 + 0.08;
    for (let a = 0; a < 64; a++) { const th = a / 64 * Math.PI * 2; pts.push(V(cx, hy + Math.sin(th) * ry, Math.cos(th) * rz)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 96, 0.014, 8, true), M.vermilion())); });
  castAll(g); return { g, leaves, top };
}
// glaze palette for the 89 beads (Bát Tràng blue & white, celadon, ochre, iron red), by citta group
const GLAZES = [[8, 0xf6f4ef], [2, 0xa8402c], [2, 0x9a9893], [8, 0xc9a27a], [15, 0x6f86a8], [12, 0xe7e3da], [18, 0xa9c8ba], [24, 0xf1efe9]];

export const scenes = [
  // 1 · Overhead flat-lay of the manuscript; at "đếm được" 89 glazed beads lift into a mala-like ring as the camera cranes down to eye level
  { build(g, e) {
    const ms = manuscript(); ms.g.scale.setScalar(0.6); ms.g.rotation.y = 0.5; g.add(ms.g);
    const sh = contactShadow(3.2, 1.2, 0.3); sh.rotation.z = 0.5; g.add(sh);
    const cupProf = [[0, 0], [0.16, 0], [0.2, 0.03], [0.3, 0.2], [0.34, 0.3], [0.32, 0.3], [0.27, 0.2], [0.15, 0.05], [0, 0.05]].map(([a, b]) => new THREE.Vector2(a, b));
    const cup = new THREE.Mesh(new THREE.LatheGeometry(cupProf, 96), M.celadon()); cup.position.set(1.45, 0, -1.25); cup.castShadow = true; g.add(cup);
    const tea = new THREE.Mesh(new THREE.CircleGeometry(0.28, 64), new THREE.MeshPhysicalMaterial({ color: 0x8a6a2a, roughness: 0.05, clearcoat: 1 })); tea.rotation.x = -Math.PI / 2; tea.position.set(1.45, 0.24, -1.25); g.add(tea);
    const cs = contactShadow(0.9, 0.9, 0.3); cs.position.set(1.45, 0.004, -1.25); g.add(cs);
    const ring = new THREE.Group(); ring.position.set(0, 1.7, 0); g.add(ring);
    const geo = new THREE.SphereGeometry(0.06, 32, 24), beads = [], R = 0.8;
    let idx = 0; GLAZES.forEach(([n, c]) => { const m = M.glaze(c); for (let i = 0; i < n; i++) { const b = new THREE.Mesh(geo, m); b.castShadow = true; b.userData.a = idx / 89 * Math.PI * 2; ring.add(b); beads.push(b); idx++; } });
    const thread = new THREE.Mesh(new THREE.TorusGeometry(R, 0.006, 6, 220), M.vermilion()); ring.add(thread);
    const burst = e.wordTime(0, L(e).w.burst) ?? 2.6, t89 = e.wordTime(0, L(e).w.n89) ?? 6.6;
    return { update(t, d, e) {
      const open = easeInOut((t - burst + 0.2) / 1.4);
      ms.leaves.forEach((p, i) => { const f = (i - 8) / 16; p.rotation.y = f * 0.6 * open; p.position.y = 0.07 + 0.012 + i * 0.024 + open * i * 0.01; });
      ms.top.rotation.x = -open * 1.2;
      ms.g.rotation.y = 0.5 + t * 0.03;
      // beads rise from the book in sequence and settle on the ring, which slowly turns to face the camera
      ring.rotation.set(0, -0.35 + t * 0.04, 0); ring.updateMatrixWorld(true);
      const src = ring.worldToLocal(V(0, 0.4, 0));
      beads.forEach((b, i) => { const k = easeInOut((t - burst - 0.3 - i * 0.022) / 1.3), a = b.userData.a + t * 0.12, home = V(Math.cos(a) * R, Math.sin(a) * R, 0);
        b.position.copy(src.clone().lerp(home, k)).add(V(0, 0, Math.sin(k * Math.PI) * 0.6)); b.visible = k > 0; b.scale.setScalar(0.5 + 0.5 * k); });
      thread.visible = t > burst + 1.6; thread.scale.setScalar(0.94 + 0.06 * smooth(burst + 1.6, burst + 2.6, t)); thread.material.opacity = 1;
      // camera: overhead flat-lay -> crane down to a three-quarter eye level
      const [p, l] = path([[0, V(0.0, 12.5, 1.6), V(0, 0, 0.2)], [burst - 0.1, V(0.2, 11.6, 1.8), V(0, 0, 0.2)], [burst + 3.0, V(2.6, 2.5, 9.4), V(0, 1.35, 0)], [d, V(2.0, 2.4, 8.8), V(0, 1.4, 0)]], t);
      e.cam(p, l, 28);
      e.focus = t < burst + 1.5 ? p.distanceTo(V(0, 0.2, 0)) : p.distanceTo(V(0, 1.6, 0)); e.aperture = 0.002;
    } };
  } },

  // 2 · One long glide: brush drips vermilion into a clear glass of water (ink blooms), porcelain columns wipe past,
  //     an overhead phone at 2:00, then a low hero angle on a celadon fridge opening at 23:00
  { build(g, e) {
    const A = new THREE.Group(); A.scale.setScalar(0.68); g.add(A);
    const glassMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.58, 1.5, 96, 1, true), M.glass()); glassMesh.position.y = 0.75; A.add(glassMesh);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.08, 96), M.glass()); base.position.y = 0.04; A.add(base);
    [[0.62, 1.5], [0.58, 0.08]].forEach(([rr, y]) => { const rim = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.008, 8, 128), new THREE.MeshPhysicalMaterial({ color: 0x9fb2ae, roughness: 0.1, clearcoat: 1 })); rim.rotation.x = Math.PI / 2; rim.position.y = y; A.add(rim); });
    const surface = new THREE.Mesh(new THREE.CircleGeometry(0.6, 96), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.02, clearcoat: 1, depthWrite: false })); surface.rotation.x = -Math.PI / 2; surface.position.y = 1.25; A.add(surface);
    A.add(contactShadow(1.8, 1.8, 0.22));
    const brush = new THREE.Group(); brush.position.set(-0.15, 2.05, 0.05); brush.rotation.z = -0.35; A.add(brush);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 1.3, 32), M.teak()); handle.position.y = 0.82; brush.add(handle);
    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.1, 32), M.brass()); ferrule.position.y = 0.16; brush.add(ferrule);
    const hair = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 32), M.ink()); hair.rotation.x = Math.PI; hair.position.y = -0.03; brush.add(hair);
    const tipRed = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.09, 24), M.vermilion()); tipRed.rotation.x = Math.PI; tipRed.position.y = -0.14; brush.add(tipRed);
    castAll(brush);
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.06, 32, 24), M.vermilion()); A.add(drop);
    // ink clouds in the water: soft dark-red puffs that curl downward and spread
    const N = 520, r = rng(9), seeds = Float32Array.from({ length: N * 4 }, () => r()), P = new Float32Array(N * 3), S = new Float32Array(N), Al = new Float32Array(N);
    const ig = new THREE.BufferGeometry(); ig.setAttribute('position', new THREE.BufferAttribute(P, 3)); ig.setAttribute('size', new THREE.BufferAttribute(S, 1)); ig.setAttribute('alpha', new THREE.BufferAttribute(Al, 1));
    const ink = new THREE.Points(ig, new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
      vertexShader: 'attribute float size; attribute float alpha; varying float vA; varying float vY; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=size*(420./-mv.z); vA=alpha; vY=position.y; }',
      fragmentShader: 'varying float vA; varying float vY; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,.0,d); a=a*a*(3.-2.*a); vec3 c=mix(vec3(.42,.02,.02),vec3(.66,.08,.05),clamp(vY,0.,1.)); gl_FragColor=vec4(c, a*vA); }' }));
    ink.frustumCulled = false; A.add(ink);
    // porcelain columns that wipe the frame between stations
    const cols = [3.6, 10.6].map(x => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 9, 64), M.porcelain()); c.position.set(x, 4.5, 3.1); c.castShadow = true; g.add(c); return c; });
    // B · phone, overhead
    const B = new THREE.Group(); B.position.set(7, 0, 0); g.add(B);
    const ph = phone('02:00', L(e).date); ph.group.rotation.y = 0.25; B.add(ph.group); B.add(contactShadow(1.4, 2.2, 0.3));
    const cards = L(e).notes.map(s => { const c = glassCard(s, { w: 1.2 }); c.card.material = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.6 }); c.card.castShadow = true;
      c.lab.material.map = textPlane(s, 0.15, { size: 48, color: '#1b1916', weight: 600 }).material.map; c.lab.material.needsUpdate = true; B.add(c.group); return c; });
    // C · celadon fridge, warm interior
    const C = new THREE.Group(); C.position.set(14, 0, -0.3); g.add(C);
    const fr = fridge(); reskin(fr.group, { dark: M.celadon() }); fr.group.traverse(m => { if (m.isMesh && m.material.clearcoat === 1 && m.material.color?.getHex?.() === 0xece6dc) m.material = M.celadon(); });
    fr.group.rotation.y = -0.4; fr.group.scale.setScalar(0.72); C.add(fr.group); C.add(contactShadow(2, 1.6, 0.3));
    const warm = new THREE.SpotLight(0xffc98a, 0, 8, 0.8, 0.7, 1.5); warm.position.set(0, 1.0, 0.3); fr.group.add(warm); const wt = new THREE.Object3D(); wt.position.set(0.3, 0, 3.5); fr.group.add(wt); warm.target = wt;
    const clock = textPlane('23:00', 0.34, { size: 120, color: '#1b1916', weight: 600, font: FONT_SERIF }); clock.position.set(-0.75, 1.7, 0.4); C.add(clock);
    const ss = [0, 1, 2, 3].map(j => e.sentenceStart(1, j)), tImpact = ss[1] + 0.45;
    return { update(t, d, e) {
      // A
      A.updateMatrixWorld(true); const tip = brush.localToWorld(V(0, -0.2, 0)), grow = smooth(0.2, ss[1], t), fk = Math.pow(clamp((t - ss[1]) / (tImpact - ss[1])), 2);
      drop.position.set(lerp(tip.x, 0.05, fk), lerp(tip.y - 0.05 * grow, 1.25, fk), lerp(tip.z, 0.05, fk)); drop.visible = t < tImpact + 0.02; drop.scale.setScalar(0.4 + 0.6 * grow); drop.scale.y *= t > ss[1] ? 1.4 : 1.1;
      for (let i = 0; i < N; i++) { const a = seeds[i * 4], b = seeds[i * 4 + 1], c = seeds[i * 4 + 2], q = seeds[i * 4 + 3];
        const life = clamp((t - tImpact - q * 0.6) / (2.8 + b * 2.5)), rr = easeOut(life) * (0.08 + a * 0.42), th = a * 50 + t * 0.4 * (c - 0.5) + Math.sin(t * 0.8 + b * 9) * 0.6;
        P[i * 3] = 0.05 + Math.cos(th) * rr; P[i * 3 + 1] = 1.22 - easeOut(life) * (0.25 + b * 0.95) + Math.sin(th * 3) * 0.05; P[i * 3 + 2] = 0.05 + Math.sin(th) * rr * 0.8;
        S[i] = (0.38 + c * 0.8) * (0.3 + life); Al[i] = life > 0 ? (0.13 + q * 0.2) * (1 - life * 0.35) : 0; }
      ig.attributes.position.needsUpdate = ig.attributes.size.needsUpdate = ig.attributes.alpha.needsUpdate = true;
      // B
      cards.forEach((c, i) => { const k = easeOut((t - ss[2] - 0.5 - i * 0.45) / 1.0); c.group.visible = k > 0;
        c.group.rotation.set(-Math.PI / 2, 0, 0.25 + (i - 1) * 0.16 * k); c.group.position.set(-0.62 * k + i * 0.04, 0.06 + i * 0.02, -0.5 + i * 0.38); });
      // C
      const op = easeInOut((t - ss[3] - 0.3) / 1.4); fr.hinge.rotation.y = -op * 1.85; warm.intensity = op * 26; fr.inner.visible = op > 0.02; clock.material.opacity = smooth(ss[3] + 0.9, ss[3] + 1.5, t);
      // one long glide: macro on the glass -> past a column -> overhead phone -> past a column -> low hero on the fridge
      const keys = [[0, V(0.8, 1.35, 5.4), V(0, 0.95, 0)], [ss[1], V(0.65, 1.25, 5.0), V(0, 0.85, 0)], [ss[2] - 0.6, V(0.5, 1.2, 4.9), V(0, 0.8, 0)],
        [ss[2] + 0.6, V(7.3, 7.6, 2.0), V(7, 0, 0.1)], [ss[3] - 0.6, V(7.2, 7.2, 1.8), V(7, 0, 0.1)], [ss[3] + 0.6, V(16.0, 0.9, 7.6), V(14, 1.0, -0.3)], [d, V(15.8, 0.85, 7.2), V(14, 1.05, -0.3)]];
      const [p, l] = path(keys, t); e.cam(p, l, 28);
      e.focus = p.distanceTo(t < ss[2] ? V(0, 0.7, 0) : t < ss[3] ? V(7, 0, 0) : V(14, 1.0, -0.3)); e.aperture = 0.0022;
      cols.forEach(c => { c.visible = true; });
    } };
  } },

  // 3 · Brass armillary on a porcelain plinth, slow orbit; rack focus to a celadon box that opens empty
  { build(g, e) {
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.62, 96), M.porcelain()); plinth.position.y = 0.31; plinth.castShadow = plinth.receiveShadow = true; g.add(plinth);
    const ar = armillary(); reskin(ar.group, { dark: M.porcelain(), metal: M.brass(0.3) }); ar.group.traverse(m => { if (m.isMesh && m.material.iridescence) m.material = M.porcelain(); });
    ar.group.position.set(0, 1.85, 0); ar.group.scale.setScalar(0.8); g.add(ar.group); g.add(contactShadow(2.0, 2.0, 0.28));
    const box = lacquerBox(); reskin(box.group, { dark: M.celadon(), metal: M.brass() }); box.group.traverse(m => { if (m.isMesh && Array.isArray(m.material)) m.material = m.material.map(x => x.map ? M.celadon() : x); });
    box.group.position.set(1.2, 0, 1.25); box.group.rotation.y = -0.45; g.add(box.group); const bs = contactShadow(1.8, 1.4, 0.3); bs.position.set(1.2, 0.004, 1.25); g.add(bs);
    const s1 = e.sentenceStart(2, 1), tNot = e.wordTime(2, L(e).w.not) ?? 4.2, tBook = e.wordTime(2, L(e).w.book) ?? 6.5;
    return { update(t, d, e) {
      const fast = 1 + smooth(s1, s1 + 1.5, t) * 1.2;
      ar.rings.forEach((m, i) => { m.rotation.z = (i % 2 ? -1 : 1) * t * (0.08 + i * 0.03) * fast + i; });
      ar.gears.forEach(gm => { gm.rotation.z = t * 0.6 * fast * gm.userData.ratio; });
      ar.orbiters.forEach(o => { const { r, a, s, tilt } = o.userData, th = a + t * s * fast; o.position.set(Math.cos(th) * r, Math.sin(th) * r * Math.cos(tilt), Math.sin(th) * r * Math.sin(tilt)); });
      box.hinge.rotation.x = -easeInOut((t - tBook + 0.3) / 1.4) * 1.75;
      // slow 60-degree orbit at plinth height, push in on "complex machine", then pull back and rack focus to the box
      const toBox = smooth(tNot - 0.4, tNot + 1.2, t), close = smooth(s1, s1 + 2.2, t) * (1 - toBox), a = -0.6 + t * 0.09;
      const orbit = V(Math.sin(a) * 7.8, 2.1, Math.cos(a) * 7.8), near = V(Math.sin(a) * 7.0, 2.0, Math.cos(a) * 7.0);
      const p = orbit.lerp(near, close).lerp(V(1.6, 2.5, 9.4), toBox), l = V(0, 1.8, 0).lerp(V(0.6, 1.05, 0.6), toBox);
      e.cam(p, l, 28);
      e.focus = lerp(p.distanceTo(V(0, 1.85, 0)), p.distanceTo(V(1.2, 0.3, 1.25)), smooth(tNot, tNot + 1.0, t)); e.aperture = 0.0022;
    } };
  } },
];

// motivated transitions: the bead ring overexposes into paper white (a breath) before the first drop;
// a sideways push carries us from the fridge to the machine
export const transitions = [{ type: 'white' }, { type: 'push', dir: 1 }];
export const instantHeadline = idx => idx === 0;

export function overlay(ov, t, info, engine) {
  const big = ov.$('.big');
  if (info.idx === 0) {
    const t89 = engine.wordTime(0, L(engine).w.n89) ?? 6.6, k = easeOut((info.lt - t89 + 0.1) / 0.9);
    if (!big.firstChild) big.innerHTML = '<span>89</span>';
    big.style.opacity = clamp((info.lt - t89 + 0.1) / 0.5) * clamp((info.dur - info.lt) / 0.5);
    big.style.transform = `translateY(${(1 - k) * 26}px)`; big.style.filter = `blur(${(1 - k) * 6}px)`; big.style.letterSpacing = `${-0.02 + (1 - k) * 0.08}em`;
  } else big.style.opacity = 0;
}
