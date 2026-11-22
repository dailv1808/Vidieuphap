// Episode 01 in the "digital lacquer" style (first three scenes for the style demo).
import * as THREE from 'three';
import { V, clamp, lerp, smooth, easeOut, easeInOut, easeInOutSine, backOut, rng, textPlane, softSprite, FONT_SERIF, FONT_SANS } from './engine.js';
import { PAL, lacquer, goldSolid, pearl } from './materials.js';
import { manuscript, pearlMandala, armillary, pedestal, lacquerBox, phone, glassCard, fridge, castAll } from './props.js';

const STR = {
  vi: { notes: ['Video bạn sẽ thích', '+99 tin nhắn', 'Xem tiếp tập 5?'], date: 'Thứ Ba, 12 tháng 11', w: { burst: 'đếm', n89: 'tám', not: 'chưa', book: 'sách' } },
  en: { notes: ['Videos you might like', '+99 messages', 'Next episode?'], date: 'Tuesday, November 12', w: { burst: 'count', n89: 'eighty', not: 'nobody', book: 'manual' } },
};
const L = e => STR[e.cfg.lang || 'vi'];
const path = (keys, t) => { // keys: [[t, pos, look], ...] eased piecewise
  let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const [t0, p0, l0] = keys[i], [t1, p1, l1] = keys[i + 1], k = easeInOutSine((t - t0) / Math.max(1e-3, t1 - t0));
  return [p0.clone().lerp(p1, k), l0.clone().lerp(l1, k)];
};

export const scenes = [
  // 1 · Hook: macro on a lacquered palm-leaf manuscript; at "đếm được" it opens and 89 mother-of-pearl pearls rise into a gold mandala
  { build(g, e) {
    const ms = manuscript(); ms.group.scale.setScalar(0.62); ms.group.rotation.y = -0.18; g.add(ms.group);
    const pool = new THREE.PointLight(0xffd6a0, 0, 6, 2); pool.position.set(0, 0.6, 0.4); g.add(pool);
    const shaft = softSprite('#ffdcae', 5, 0); shaft.position.set(0, 1.6, -0.6); g.add(shaft);
    const md = pearlMandala(); const mandala = md.group; mandala.scale.setScalar(0.5); mandala.position.set(0, 2.05, -0.1); mandala.rotation.set(-1.02, 0, 0); g.add(mandala);
    const halo = softSprite('#ffe0b0', 3.4, 0); halo.position.set(0, 2.05, -0.3); g.add(halo);
    const burst = e.wordTime(0, L(e).w.burst) ?? 2.6, t89 = e.wordTime(0, L(e).w.n89) ?? 6.6;
    const order = md.pearls.map((p, i) => i).sort((a, b) => md.pearls[a].userData.ring - md.pearls[b].userData.ring || a - b);
    const tArrive = new Array(md.pearls.length); order.forEach((pi, n) => { tArrive[pi] = burst + 1.5 + n * 0.024; });
    const ringT = {}; md.pearls.forEach((p, i) => { const r = p.userData.ring === 1 ? 2 : p.userData.ring; ringT[r] = Math.min(ringT[r] ?? 1e9, tArrive[i] + 1.1); });
    const src = V(0, 0.35, 0), tmp = new THREE.Vector3();
    return { update(t, d, e) {
      // the book opens: leaves fan out around the left cord, the lid lifts
      const open = easeInOut((t - burst + 0.2) / 1.6);
      ms.leaves.forEach((p, i) => { const f = (i - ms.leaves.length / 2) / ms.leaves.length; p.rotation.y = f * 0.55 * open; p.position.x = -Math.sin(f * 0.55 * open) * 1.2; p.position.y = 0.07 + 0.011 + i * 0.022 + open * i * 0.012; });
      ms.top.rotation.x = -open * 1.15;
      pool.intensity = 0.6 + open * 3.5; shaft.material.opacity = open * 0.18;
      // pearls rise in a spiral from the book and settle on the mandala
      mandala.rotation.z = t * 0.06;
      mandala.updateMatrixWorld(true);
      md.pearls.forEach((p, i) => { const k = easeInOut((t - tArrive[i] + 1.4) / 1.4), h = p.userData.home;
        const wp = tmp.copy(h).applyMatrix4(mandala.matrixWorld); const loc = mandala.worldToLocal(src.clone());
        const sw = (1 - k), a = i * 2.4 + t * 2;
        p.position.set(lerp(loc.x, h.x, k) + Math.cos(a) * sw * 0.9, lerp(loc.y, h.y, k) + Math.sin(a) * sw * 0.9, lerp(loc.z, h.z, k) + sw * Math.sin(k * Math.PI) * 1.2);
        p.visible = t > tArrive[i] - 1.4; p.scale.setScalar(0.4 + 0.6 * k); });
      md.rings.forEach(r => { const k = smooth(ringT[r.userData.ring] - 0.6, ringT[r.userData.ring] + 0.4, t); r.scale.setScalar(0.92 + 0.08 * k); r.visible = k > 0.01; r.material.opacity = k; });
      md.petals.scale.setScalar(0.9 + 0.1 * smooth(t89 - 0.6, t89 + 0.6, t)); md.petals.visible = t > t89 - 0.6;
      halo.material.opacity = smooth(burst + 1, burst + 3, t) * 0.12 + smooth(t89, t89 + 0.5, t) * 0.12;
      // camera: macro on the lacquer cover -> rises to frame the mandala above the open book
      const [p, l] = path([[0, V(1.5, 0.42, 2.9), V(0.1, 0.22, 0)], [burst - 0.2, V(0.9, 0.62, 3.6), V(0, 0.3, 0)], [burst + 2.8, V(0.3, 2.6, 10.2), V(0, 1.55, 0)], [d, V(-0.2, 2.9, 11.4), V(0, 1.6, 0)]], t);
      e.cam(p, l, 30);
      e.focus = t < burst + 1 ? p.distanceTo(V(0.2, 0.25, 0.2)) : lerp(p.distanceTo(V(0, 0.25, 0)), p.distanceTo(V(0, 2.0, 0)), smooth(burst + 1, burst + 3, t));
      e.aperture = t < burst ? 0.006 : 0.0022;
      e.bloom.strength = 0.3 + smooth(t89, t89 + 0.6, t) * 0.1;
    } };
  } },

  // 2 · One continuous tracking shot along the lacquer: a vermilion ink drop (anger), a phone at 2:00, a fridge at 23:00
  { build(g, e) {
    // A · anger: a vermilion drop falls and blooms like ink in water
    const A = new THREE.Group(); A.scale.setScalar(0.62); g.add(A);
    // a lacquer bowl of still water and a calligraphy brush with a vermilion bead at its tip
    const prof = [[0, 0], [0.62, 0], [0.86, 0.08], [0.95, 0.2], [0.97, 0.24], [0.9, 0.24], [0.84, 0.14], [0.6, 0.07], [0, 0.07]].map(([a, b]) => new THREE.Vector2(a, b));
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), [lacquer(), lacquer(PAL.cinnabar)]); bowl.castShadow = bowl.receiveShadow = true; A.add(bowl);
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.86, 96), new THREE.MeshPhysicalMaterial({ color: 0x0b0503, roughness: 0.04, clearcoat: 1, envMapIntensity: 1.2 })); water.rotation.x = -Math.PI / 2; water.position.y = 0.16; A.add(water);
    const brim = new THREE.Mesh(new THREE.TorusGeometry(0.935, 0.012, 8, 128), goldSolid(0.2)); brim.rotation.x = Math.PI / 2; brim.position.y = 0.242; A.add(brim);
    const brush = new THREE.Group(); brush.position.set(-0.3, 1.25, 0.05); brush.rotation.z = -0.5; A.add(brush);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 1.5, 32), lacquer()); handle.position.y = 0.95; brush.add(handle);
    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.12, 32), goldSolid(0.25)); ferrule.position.y = 0.2; brush.add(ferrule);
    const hair = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.34, 32), new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.8 })); hair.rotation.x = Math.PI; hair.position.y = -0.03; brush.add(hair);
    const tipRed = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 24), new THREE.MeshPhysicalMaterial({ color: PAL.vermilion, roughness: 0.15, clearcoat: 1 })); tipRed.rotation.x = Math.PI; tipRed.position.y = -0.16; brush.add(tipRed);
    castAll(brush);
    const tipWorld = () => brush.localToWorld(V(0, -0.22, 0));
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.075, 32, 24), new THREE.MeshPhysicalMaterial({ color: PAL.vermilion, roughness: 0.08, clearcoat: 1, transmission: 0 })); drop.scale.y = 1.35; drop.castShadow = true; A.add(drop);
    const ripples = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.004, 6, 160), new THREE.MeshBasicMaterial({ color: 0xffb08a, transparent: true, depthWrite: false })); m.rotation.x = Math.PI / 2; m.position.y = 0.165; A.add(m); return m; });
    const N = 700, r = rng(7), seeds = Float32Array.from({ length: N * 4 }, () => r()), P = new Float32Array(N * 3), S = new Float32Array(N), Al = new Float32Array(N);
    const ig = new THREE.BufferGeometry(); ig.setAttribute('position', new THREE.BufferAttribute(P, 3)); ig.setAttribute('size', new THREE.BufferAttribute(S, 1)); ig.setAttribute('alpha', new THREE.BufferAttribute(Al, 1));
    const inkMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { col: { value: new THREE.Color(0xb3221a) }, core: { value: new THREE.Color(0xff7a45) } },
      vertexShader: 'attribute float size; attribute float alpha; varying float vA; varying float vH; void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=size*(420./-mv.z); vA=alpha; vH=position.y; }',
      fragmentShader: 'uniform vec3 col,core; varying float vA; varying float vH; void main(){ vec2 c=gl_PointCoord-.5; float d=length(c); float a=smoothstep(.5,.0,d); vec3 k=mix(core,col,clamp(vH/1.4,0.,1.)); float s=a*a*(3.-2.*a); gl_FragColor=vec4(k*(.8+.5*s), s*vA); }' });
    const ink = new THREE.Points(ig, inkMat); ink.frustumCulled = false; A.add(ink);
    const red = new THREE.PointLight(0xff3a1a, 0, 4, 2); red.position.set(0, 0.6, 0.4); A.add(red);
    // B · phone at 2:00 with frosted notifications rising
    const B = new THREE.Group(); B.position.set(7, 0, 0); g.add(B);
    const ph = phone('02:00', L(e).date); ph.group.rotation.y = 0.35; B.add(ph.group);
    const blue = new THREE.PointLight(0x6d8cff, 0, 4, 2); blue.position.set(0, 0.5, 0); B.add(blue);
    const cards = L(e).notes.map(s => { const c = glassCard(s, { w: 1.1 }); c.group.scale.setScalar(0.72); c.group.visible = false; B.add(c.group); return c; });
    // C · fridge at 23:00, warm light spilling across the lacquer
    const C = new THREE.Group(); C.position.set(14, 0, -0.4); g.add(C);
    const fr = fridge(); fr.group.rotation.y = -0.35; fr.group.scale.setScalar(0.8); C.add(fr.group);
    const warm = new THREE.SpotLight(0xffd29a, 0, 9, 0.75, 0.6, 1.6); warm.position.set(0, 1.2, 0.2); warm.castShadow = false; fr.group.add(warm); const wt = new THREE.Object3D(); wt.position.set(0.3, 0, 4); fr.group.add(wt); warm.target = wt;
    const beam = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.2, 48, 1, true), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { o: { value: 0 } },
      vertexShader: 'varying vec2 u; void main(){ u=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform float o; varying vec2 u; void main(){ float a=(1.-u.y)*o*.12; gl_FragColor=vec4(vec3(1.,.82,.55)*a,a); }' }));
    beam.rotation.x = -Math.PI / 2 + 0.25; beam.position.set(0.25, 1.0, 2.4); fr.group.add(beam);
    const clock = textPlane('23:00', 0.36, { size: 120, color: '#ecc77c', weight: 500, font: FONT_SERIF }); clock.position.set(-0.05, 2.08, 0.3); C.add(clock);
    const ss = [0, 1, 2, 3].map(j => e.sentenceStart(1, j));
    const tImpact = ss[1] + 0.42;
    return { update(t, d, e) {
      // A
      A.updateMatrixWorld(true); const tip = tipWorld(), grow = smooth(0.2, ss[1], t);
      const fk = Math.pow(clamp((t - ss[1]) / (tImpact - ss[1])), 2);
      drop.position.set(lerp(tip.x, 0.05, fk), lerp(tip.y - 0.06 * grow, 0.17, fk), lerp(tip.z, 0.05, fk)); drop.visible = t < tImpact + 0.03;
      drop.scale.set(0.35 + 0.65 * grow, (0.35 + 0.65 * grow) * (t > ss[1] ? 1.5 : 1.15), 0.35 + 0.65 * grow);
      brush.rotation.z = -0.5 + Math.sin(t * 0.8) * 0.02 - (t > ss[1] ? 0.04 * Math.sin(clamp((t - ss[1]) * 6) * Math.PI) : 0);
      ripples.forEach((m, i) => { const k = clamp((t - tImpact - i * 0.3) / 2.2); m.visible = k > 0 && k < 1; m.scale.setScalar(0.06 + easeOut(k) * 0.78); m.material.opacity = (1 - k) * 0.8; });
      const bloom = clamp((t - tImpact) / 6);
      for (let i = 0; i < N; i++) { const a = seeds[i * 4], b = seeds[i * 4 + 1], c = seeds[i * 4 + 2], q = seeds[i * 4 + 3];
        const life = clamp((t - tImpact - q * 0.8) / (3 + b * 3)); const rr = easeOut(life) * (0.4 + a * 1.1), th = a * 40 + t * (0.2 + c * 0.3) + Math.sin(t * 0.7 + b * 9) * 0.5;
        P[i * 3] = 0.05 + Math.cos(th) * rr * 0.8 + Math.sin(t * 0.9 + q * 20) * 0.08 * life; P[i * 3 + 1] = 0.18 + easeOut(life) * (0.25 + b * 1.5) + Math.sin(th * 2) * 0.1 * life; P[i * 3 + 2] = 0.05 + Math.sin(th) * rr * 0.55;
        S[i] = (0.22 + c * 0.55) * (0.35 + life); Al[i] = life > 0 ? (0.05 + q * 0.07) * (1 - Math.pow(life, 3) * 0.6) : 0; }
      ig.attributes.position.needsUpdate = ig.attributes.size.needsUpdate = ig.attributes.alpha.needsUpdate = true;
      red.intensity = t > tImpact ? 3 * (1 - bloom * 0.5) + Math.sin(t * 9) * 0.3 : 0;
      // B
      blue.intensity = 1.6; ph.screen.material.color.setScalar(0.85);
      cards.forEach((c, i) => { const k = clamp((t - ss[2] - 0.4 - i * 0.5) / 2.6); c.group.visible = k > 0 && k < 1;
        c.group.position.set(Math.sin(i * 2.1) * 0.22, 0.22 + easeOut(k) * 0.7, 0.2 + i * 0.06); c.group.rotation.set(-0.15, 0.35, 0); c.card.material.opacity = 0.16 * Math.sin(Math.PI * k) * 1.4; c.lab.material.opacity = Math.sin(Math.PI * k); });
      // C
      const op = easeInOut((t - ss[3] - 0.3) / 1.4); fr.hinge.rotation.y = -op * 1.85; warm.intensity = op * 22; beam.material.uniforms.o.value = op; fr.inner.visible = op > 0.02;
      clock.material.opacity = smooth(ss[3] + 1.0, ss[3] + 1.6, t);
      // one continuous tracking shot
      const keys = [[0, V(0.9, 1.5, 5.2), V(0, 0.62, 0)], [ss[1], V(0.7, 1.35, 4.6), V(0, 0.55, 0)], [ss[2] - 0.35, V(0.5, 1.3, 4.4), V(0, 0.55, 0)],
        [ss[2] + 0.75, V(8.1, 3.7, 5.0), V(7, 0.35, 0.1)], [ss[3] - 0.45, V(7.9, 3.55, 4.7), V(7, 0.38, 0.1)], [ss[3] + 0.75, V(16.2, 2.0, 9.6), V(14, 0.95, -0.4)], [d, V(15.9, 1.95, 9.2), V(14, 0.95, -0.4)]];
      const [p, l] = path(keys, t); e.cam(p, l, 30);
      e.focus = p.distanceTo(t < ss[2] ? V(0, 0.45, 0) : t < ss[3] ? V(7, 0.2, 0.1) : V(14, 0.9, -0.4)); e.aperture = 0.0024;
    } };
  } },

  // 3 · "A very complex machine": a gold-leaf armillary sphere with a gear train; then an empty lacquer box (no manual)
  { build(g, e) {
    const ped = pedestal({ r: 0.62, h: 0.62 }); g.add(ped);
    const ar = armillary(); ar.group.position.set(0, 1.85, 0); ar.group.scale.setScalar(0.8); g.add(ar.group);
    const coreLight = new THREE.PointLight(0xffe4b8, 1.4, 3, 2); coreLight.position.set(0, 1.95, 0); g.add(coreLight);
    const glow = softSprite('#ffe7c2', 1.1, 0.35); glow.position.set(0, 1.95, 0); g.add(glow);
    const box = lacquerBox(); box.group.position.set(1.15, 0, 1.25); box.group.rotation.y = -0.45; g.add(box.group);
    const dust = new THREE.Group(); box.group.add(dust);
    const s1 = e.sentenceStart(2, 1), tNot = e.wordTime(2, L(e).w.not) ?? 4.2, tBook = e.wordTime(2, L(e).w.book) ?? 6.5;
    return { update(t, d, e) {
      const fast = 1 + smooth(s1, s1 + 1.5, t) * 1.2;
      ar.rings.forEach((m, i) => { m.rotation.y += 0; m.rotation.z = (i % 2 ? -1 : 1) * t * (0.08 + i * 0.03) * fast + i; });
      ar.gears.forEach(gm => { gm.rotation.z = t * 0.6 * fast * gm.userData.ratio; });
      ar.orbiters.forEach(o => { const { r, a, s, tilt } = o.userData, th = a + t * s * fast; o.position.set(Math.cos(th) * r, Math.sin(th) * r * Math.cos(tilt), Math.sin(th) * r * Math.sin(tilt)); });
      ar.group.rotation.y = t * 0.12;
      const lid = easeInOut((t - tBook + 0.3) / 1.4); box.hinge.rotation.x = -lid * 1.75;
      // camera: slow orbit; dolly closer on "complex machine"; rack focus to the empty box on "no manual"
      const toBox = smooth(tNot - 0.4, tNot + 1.2, t), close = smooth(s1, s1 + 2.2, t) * (1 - toBox);
      const pA = V(2.6 * Math.cos(0.5 + t * 0.04), 2.6, 8.4).lerp(V(1.2, 2.2, 5.9), close);
      const p = pA.lerp(V(1.0, 2.4, 9.6), toBox), l = V(0, 1.75, 0).lerp(V(0.55, 1.1, 0.6), toBox);
      e.cam(p, l, 30);
      e.focus = lerp(p.distanceTo(V(0, 1.85, 0)), p.distanceTo(V(1.15, 0.3, 1.25)), smooth(tNot, tNot + 1.0, t)); e.aperture = 0.0024;
    } };
  } },
];

// story-driven transitions: the count of minds blooms into the first mind-state (anger) as vermilion ink;
// polishing the lacquer reveals the machine underneath
export const transitions = [
  { type: 'ink', focus: [0.5, 0.42], ink: PAL.cinnabar },
  { type: 'polish' },
];
export const instantHeadline = idx => idx === 0;

export function overlay(ov, t, info, engine) {
  const big = ov.$('.big');
  if (info.idx === 0) {
    const t89 = engine.wordTime(0, L(engine).w.n89) ?? 6.6, k = easeOut((info.lt - t89 + 0.1) / 0.9);
    if (!big.firstChild) big.innerHTML = '<span>89</span>';
    big.style.opacity = clamp((info.lt - t89 + 0.1) / 0.5) * clamp((info.dur - info.lt) / 0.5);
    big.style.transform = `translateY(${(1 - k) * 30}px) scale(${0.96 + 0.04 * k})`; big.style.filter = `blur(${(1 - k) * 8}px)`;
    big.firstChild.style.backgroundPosition = `${110 - clamp((info.lt - t89) / 1.6) * 120}% 0`;
  } else big.style.opacity = 0;
}
