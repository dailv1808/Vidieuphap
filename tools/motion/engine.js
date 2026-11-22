// Shared motion-graphics engine: deterministic 3D scene + DOM overlays, driven by window.renderAt(t).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const W = 1080, H = 1920;
export const C = {
  night: 0x070d18, deep: 0x0d1b2a, teal: 0x16384a, gold: 0xf5b942, amber: 0xff9a3c,
  lotus: 0xe98aa8, red: 0xff4d4d, cyan: 0x6fe3ff, ivory: 0xf3ead8, wood: 0x8a5a33,
};

// ---------- math helpers ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
export const easeInOut = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const backOut = t => { t = clamp(t); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// ---------- canvas textures (Vietnamese text inside 3D) ----------
export function textTexture(text, { size = 96, color = '#fff', weight = 800, pad = 30, glow = null, bg = null, radius = 40, w = null } = {}) {
  const c = document.createElement('canvas'), x = c.getContext('2d');
  x.font = `${weight} ${size}px "Be Vietnam Pro"`;
  const tw = w || Math.ceil(x.measureText(text).width) + pad * 2, th = Math.ceil(size * 1.45) + pad * 2;
  c.width = tw; c.height = th;
  if (bg) { x.fillStyle = bg; x.beginPath(); x.roundRect(0, 0, tw, th, radius); x.fill(); }
  x.font = `${weight} ${size}px "Be Vietnam Pro"`; x.textAlign = 'center'; x.textBaseline = 'middle';
  if (glow) { x.shadowColor = glow; x.shadowBlur = size * 0.35; }
  x.fillStyle = color; x.fillText(text, tw / 2, th / 2 + size * 0.04);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return { tex: t, aspect: tw / th };
}
export function textPlane(text, height, opts = {}) {
  const { tex, aspect } = textTexture(text, opts);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(height * aspect, height),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  return m;
}
export function glowSprite(color = '#ffd27a', scale = 1) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, color); g.addColorStop(.25, color + 'aa'); g.addColorStop(1, color + '00');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  s.scale.setScalar(scale); return s;
}
let _dot = null;
export function dotTexture() {
  if (_dot) return _dot;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); _dot = new THREE.CanvasTexture(c); return _dot;
}

// ---------- engine ----------
export class Engine {
  constructor(canvas, timeline, cfg) {
    this.tl = timeline; this.cfg = cfg;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    const scale = cfg.renderScale || 0.75;
    this.renderer.setPixelRatio(1); this.renderer.setSize(W * scale, H * scale, false);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(C.night, 0.035);
    this.camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 400);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W * scale / 2, H * scale / 2), 0.7, 0.5, 0.78);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.buildWorld();
    this.scenes = [];
  }
  buildWorld() {
    // gradient sky dome
    const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x0b1830) }, mid: { value: new THREE.Color(0x0a1420) }, bot: { value: new THREE.Color(0x140c10) }, tint: { value: new THREE.Color(0x000000) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform vec3 top,mid,bot,tint; varying vec3 vP; void main(){ float h=vP.y; vec3 c = h>0. ? mix(mid,top,smoothstep(0.,.8,h)) : mix(mid,bot,smoothstep(0.,-.8,h)); gl_FragColor=vec4(c+tint,1.); }',
    }));
    this.sky = sky; this.scene.add(sky);
    // floating dust
    const n = 1400, r = rng(7), pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (r() - .5) * 60; pos[i * 3 + 1] = (r() - .5) * 60; pos[i * 3 + 2] = (r() - .5) * 60; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.09, map: dotTexture(), color: 0xffe2a8, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.scene.add(this.dust);
    this.scene.add(new THREE.AmbientLight(0x8899bb, 0.55));
    const key = new THREE.DirectionalLight(0xffe0b0, 1.6); key.position.set(4, 8, 6); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x6fb8ff, 1.0); rim.position.set(-6, 3, -5); this.scene.add(rim);
  }
  add(sceneDef) {
    const group = new THREE.Group(); group.visible = false; this.scene.add(group);
    const api = sceneDef.build(group, this) || {};
    this.scenes.push({ def: sceneDef, group, api });
  }
  // timeline helpers
  sceneTL(i) { return this.tl.scenes[i]; }
  wordTime(i, needle, nth = 0) {
    let k = 0;
    for (const s of this.tl.scenes[i].sentences) for (const w of s.words)
      if (w.w.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '').startsWith(needle.toLowerCase())) { if (k++ === nth) return w.s - this.tl.scenes[i].s; }
    return null;
  }
  sentenceStart(i, j) { const sc = this.tl.scenes[i]; return (sc.sentences[j] || sc.sentences[sc.sentences.length - 1]).s - sc.s; }
  render(t) {
    const tl = this.tl.scenes;
    let idx = tl.findIndex(s => t >= s.s && t < s.e); if (idx < 0) idx = t < tl[0].s ? 0 : tl.length - 1;
    const sc = tl[idx], lt = t - sc.s, dur = sc.e - sc.s;
    this.scenes.forEach((s, i) => { s.group.visible = i === idx; });
    const cur = this.scenes[idx];
    // default camera; scenes override
    this.camera.position.set(0, 0, 12); this.camera.lookAt(0, 0, 0); this.camera.fov = 38;
    this.bloom.strength = 0.7; this.sky.material.uniforms.tint.value.setRGB(0, 0, 0);
    if (cur.api.update) cur.api.update(lt, dur, this);
    // handheld drift + transition push
    const into = clamp(lt / 0.6), out = clamp((dur - lt) / 0.45);
    this.camera.position.x += Math.sin(t * 0.7) * 0.06 + Math.sin(t * 1.9) * 0.02;
    this.camera.position.y += Math.cos(t * 0.6) * 0.05;
    this.camera.translateZ((1 - easeOut(into)) * 2.2 - (1 - out) * 1.2);
    this.camera.updateProjectionMatrix();
    this.dust.rotation.y = t * 0.02; this.dust.position.y = Math.sin(t * .1) * .5;
    this.composer.render();
    return { idx, lt, dur };
  }
}

// ---------- DOM overlay: headline, captions, progress, transitions ----------
export class Overlay {
  constructor(root, timeline, cfg) {
    this.tl = timeline; this.cfg = cfg; this.root = root;
    root.innerHTML = `
      <div class="vignette"></div>
      <div class="brand"><span class="logo"></span><span class="ep"></span></div>
      <div class="progress"></div>
      <div class="headline"></div>
      <div class="big"></div>
      <div class="card"></div>
      <div class="caption"></div>
      <div class="sweep"></div><div class="flash"></div>`;
    this.$ = s => root.querySelector(s);
    this.$('.logo').textContent = cfg.series; this.$('.ep').textContent = cfg.epLabel;
    this.$('.progress').innerHTML = timeline.scenes.map(() => '<i><b></b></i>').join('');
    this.pages = this.buildPages();
    this.lastHead = -1; this.lastPage = null;
  }
  isKey(words, i) { return this.keyIdx.has(i); }
  buildPages() {
    const pages = [], maxChars = this.cfg.lineChars || 24;
    const phrases = (this.cfg.keywords || []).map(p => p.toLowerCase().split(/\s+/));
    for (const sc of this.tl.scenes) for (const s of sc.sentences) {
      const ws = s.words, norm = ws.map(w => w.w.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, ''));
      const key = new Set();
      for (const ph of phrases) for (let i = 0; i + ph.length <= ws.length; i++)
        if (ph.every((p, k) => norm[i + k] === p)) for (let k = 0; k < ph.length; k++) key.add(i + k);
      let lines = [], line = [], len = 0;
      ws.forEach((w, i) => {
        if (len + w.w.length + (line.length ? 1 : 0) > maxChars && line.length) { lines.push(line); line = []; len = 0; }
        line.push(i); len += w.w.length + 1;
      });
      if (line.length) lines.push(line);
      for (let p = 0; p < lines.length; p += 2) {
        const idxs = lines.slice(p, p + 2);
        const flat = idxs.flat();
        const next = p + 2 < lines.length ? ws[lines[p + 2][0]].s : s.e + 0.25;
        pages.push({ s: ws[flat[0]].s - 0.06, e: next - 0.02, lines: idxs, words: ws, key });
      }
    }
    return pages;
  }
  render(t, info, engine) {
    const sc = this.tl.scenes[info.idx];
    // progress
    [...this.$('.progress').children].forEach((el, i) => {
      const s = this.tl.scenes[i]; el.firstChild.style.width = (clamp((t - s.s) / (s.e - s.s)) * 100) + '%';
    });
    // headline: animated words
    const h = this.$('.headline');
    if (this.lastHead !== info.idx) {
      this.lastHead = info.idx;
      h.innerHTML = sc.text.split(' ').map(w => `<span>${w}</span>`).join(' ');
    }
    [...h.children].forEach((el, i) => {
      const a = easeOut((info.lt - 0.15 - i * 0.07) / 0.5), o = clamp((info.dur - info.lt) / 0.35);
      el.style.opacity = Math.min(a, o); el.style.transform = `translateY(${(1 - a) * 40}px) scale(${0.92 + a * 0.08})`;
      el.style.filter = `blur(${(1 - a) * 10}px)`;
    });
    const hide = this.cfg.hideHeadline && this.cfg.hideHeadline(info.idx, info.lt);
    h.style.display = hide ? 'none' : '';
    // captions
    const page = this.pages.find(p => t >= p.s && t < p.e);
    const cap = this.$('.caption');
    if (page !== this.lastPage) {
      this.lastPage = page;
      cap.innerHTML = page ? page.lines.map(l => `<div>${l.map(i => `<span data-i="${i}">${page.words[i].w}</span>`).join(' ')}</div>`).join('') : '';
    }
    if (page) {
      const pa = easeOut((t - page.s) / 0.18);
      cap.style.opacity = pa; cap.style.transform = `translateY(${(1 - pa) * 18}px)`;
      cap.querySelectorAll('span').forEach(el => {
        const i = +el.dataset.i, w = page.words[i], key = page.key.has(i);
        const on = t >= w.s, active = t >= w.s && t < w.e + 0.05;
        el.className = (key ? 'key ' : '') + (active ? 'active' : on ? 'on' : 'off');
        const pop = active ? backOut((t - w.s) / 0.16) : 1;
        el.style.transform = active ? `scale(${0.9 + 0.18 * pop})` : '';
      });
    }
    // transition sweep at scene boundaries
    let sweep = 0;
    for (const s of this.tl.scenes) { const d = t - s.s; if (d > -0.35 && d < 0.35 && s.s > 0) sweep = 1 - Math.abs(d) / 0.35; }
    const sw = this.$('.sweep');
    sw.style.opacity = sweep * 0.9; sw.style.transform = `translateX(${(sweep > 0 ? 1 : 0) * 0}px) rotate(-18deg) scaleX(${0.2 + sweep})`;
    this.$('.flash').style.opacity = Math.pow(sweep, 3) * 0.35;
    if (this.cfg.overlay) this.cfg.overlay(this, t, info, engine);
  }
}

export const CSS = `
@font-face{font-family:"Be Vietnam Pro";font-weight:500;src:url(/tools/fonts/BeVietnamPro-Medium.ttf)}
@font-face{font-family:"Be Vietnam Pro";font-weight:600;src:url(/tools/fonts/BeVietnamPro-SemiBold.ttf)}
@font-face{font-family:"Be Vietnam Pro";font-weight:800;src:url(/tools/fonts/BeVietnamPro-ExtraBold.ttf)}
@font-face{font-family:"Be Vietnam Pro";font-weight:900;src:url(/tools/fonts/BeVietnamPro-Black.ttf)}
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#070d18}
#c{position:absolute;inset:0}
#ov{position:absolute;inset:0;font-family:"Be Vietnam Pro",sans-serif;color:#fff;pointer-events:none}
.vignette{position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 45%,transparent 55%,rgba(3,6,12,.75) 100%),linear-gradient(180deg,rgba(3,6,12,.55) 0,transparent 22%,transparent 60%,rgba(3,6,12,.7) 100%)}
.brand{position:absolute;top:150px;left:72px;right:72px;display:flex;align-items:center;justify-content:space-between;font-weight:800;letter-spacing:.14em;font-size:30px;color:#f5c96a}
.brand .ep{font-size:26px;padding:8px 22px;border-radius:99px;border:2px solid rgba(245,201,106,.7);letter-spacing:.1em}
.progress{position:absolute;top:220px;left:72px;right:72px;display:flex;gap:8px}
.progress i{flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.18);overflow:hidden}
.progress b{display:block;height:100%;width:0;background:linear-gradient(90deg,#f5b942,#ffdf8f)}
.headline{position:absolute;top:290px;left:72px;right:72px;font-weight:900;font-size:92px;line-height:1.08;letter-spacing:-.01em;text-wrap:balance;
  background:linear-gradient(180deg,#fff 30%,#ffd88a 100%);-webkit-background-clip:text;color:transparent;filter:drop-shadow(0 6px 24px rgba(0,0,0,.6))}
.headline span{display:inline-block;background:inherit;-webkit-background-clip:text}
.big{position:absolute;left:0;right:0;top:620px;text-align:center;font-weight:900;font-size:340px;line-height:1;color:#ffe3a3;text-shadow:0 0 60px rgba(245,185,66,.8),0 0 140px rgba(245,185,66,.5);opacity:0}
.card{position:absolute;left:64px;right:64px;top:560px;opacity:0}
.caption{position:absolute;left:60px;right:60px;top:1235px;text-align:center;font-weight:800;font-size:68px;line-height:1.22}
.caption div{white-space:nowrap}
.caption span{display:inline-block;transition:none;text-shadow:0 4px 0 rgba(0,0,0,.55),0 0 24px rgba(0,0,0,.85);-webkit-text-stroke:2px rgba(0,0,0,.5)}
.caption .off{color:rgba(255,255,255,.42)}
.caption .on{color:#fff}
.caption .active{color:#ffd56b}
.caption .key.on{color:#ffb4c8}
.caption .key.active{color:#ff9fbb}
.caption .key.off{color:rgba(255,180,200,.45)}
.sweep{position:absolute;left:-40%;top:40%;width:180%;height:240px;opacity:0;background:linear-gradient(90deg,transparent,rgba(255,214,140,.0) 20%,rgba(255,226,170,.85) 50%,rgba(255,214,140,0) 80%,transparent);filter:blur(30px)}
.flash{position:absolute;inset:0;background:#ffe9bf;opacity:0}
`;
