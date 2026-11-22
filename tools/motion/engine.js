// Shared motion-graphics engine (v3): deterministic 3D scene + DOM overlays, driven by window.renderAt(t).
// Look: animated nebula backdrop, environment reflections, iridescent materials, bloom, warp transitions,
// cinematic finishing pass (grade, chromatic aberration, grain, vignette).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const W = 1080, H = 1920;
export const C = { gold: 0xf5b942, amber: 0xff9a3c, lotus: 0xe98aa8, red: 0xff4d4d, cyan: 0x6fe3ff, ivory: 0xf3ead8, wood: 0x8a5a33 };
export const FONT_TITLE = '"Playfair Display", Georgia, serif';
export const FONT_UI = 'Montserrat, Arial, sans-serif';

// ---------- math ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
export const easeInOut = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const backOut = t => { t = clamp(t); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- textures ----------
export function textTexture(text, { size = 96, color = '#fff', weight = 800, pad = 30, glow = null, bg = null, radius = 40, w = null, font = FONT_UI, stroke = null } = {}) {
  const c = document.createElement('canvas'), x = c.getContext('2d');
  const f = `${weight} ${size}px ${font}`; x.font = f;
  const tw = w || Math.ceil(x.measureText(text).width) + pad * 2, th = Math.ceil(size * 1.5) + pad * 2;
  c.width = tw; c.height = th;
  if (bg) { x.fillStyle = bg; x.beginPath(); x.roundRect(0, 0, tw, th, radius); x.fill(); }
  x.font = f; x.textAlign = 'center'; x.textBaseline = 'middle';
  if (glow) { x.shadowColor = glow; x.shadowBlur = size * 0.4; }
  if (stroke) { x.lineWidth = size * 0.06; x.strokeStyle = stroke; x.strokeText(text, tw / 2, th / 2 + size * 0.05); }
  x.fillStyle = color; x.fillText(text, tw / 2, th / 2 + size * 0.05);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return { tex: t, aspect: tw / th };
}
export function textPlane(text, height, opts = {}) {
  const { tex, aspect } = textTexture(text, opts);
  return new THREE.Mesh(new THREE.PlaneGeometry(height * aspect, height),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: opts.toneMapped ?? true }));
}
function radialCanvas(stops, w = 128, h = 128) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.translate(w / 2, h / 2); x.scale(w / 2, h / 2);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, 1); stops.forEach(([o, col]) => g.addColorStop(o, col));
  x.fillStyle = g; x.fillRect(-1, -1, 2, 2); return new THREE.CanvasTexture(c);
}
export function glowSprite(color = '#ffd27a', scale = 1, opacity = 1) {
  const t = radialCanvas([[0, color], [.25, color + 'aa'], [1, color + '00']]);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity }));
  s.scale.setScalar(scale); return s;
}
// anamorphic lens streak
export function flare(color = '#ffd9a0', width = 8, height = 0.35, opacity = 0.8) {
  const t = radialCanvas([[0, '#ffffff'], [.12, color + 'cc'], [.5, color + '33'], [1, color + '00']], 256, 32);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity }));
  s.scale.set(width, height, 1); return s;
}
let _dot = null;
export function dotTexture() { return _dot || (_dot = radialCanvas([[0, 'rgba(255,255,255,1)'], [.3, 'rgba(255,255,255,.6)'], [1, 'rgba(255,255,255,0)']], 64, 64)); }

// iridescent glassy orb material, the signature look of the "cittas"
export function orbMaterial(color, glow = 0.9) {
  return new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: glow, roughness: 0.12, metalness: 0.05,
    clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 1, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 520] });
}
export function glassMaterial(tint = 0xffffff, opacity = 0.35) {
  return new THREE.MeshPhysicalMaterial({ color: tint, roughness: 0.05, metalness: 0.2, clearcoat: 1, transparent: true, opacity, iridescence: 0.6, iridescenceIOR: 1.3 });
}
// shockwave ring: expanding additive torus
export function shockwave(color = 0xffd27a) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 128), new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  m.userData.play = (k, maxR = 6) => { m.visible = k > 0 && k < 1; m.scale.setScalar(0.2 + easeOut(k) * maxR); m.material.opacity = (1 - k) * 0.9; };
  return m;
}
// GPU particle field (twinkling), animated in the vertex shader by `time`
export function particleField({ n = 2000, spread = [30, 30, 30], center = [0, 0, 0], size = 6, color = 0xffe2a8, seed = 1, drift = 0.15 } = {}) {
  const r = rng(seed), pos = new Float32Array(n * 3), rnd = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = center[0] + (r() - .5) * spread[0]; pos[i * 3 + 1] = center[1] + (r() - .5) * spread[1]; pos[i * 3 + 2] = center[2] + (r() - .5) * spread[2]; rnd[i] = r(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('rnd', new THREE.BufferAttribute(rnd, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, size: { value: size }, color: { value: new THREE.Color(color) }, map: { value: dotTexture() }, drift: { value: drift }, opacity: { value: 1 } },
    vertexShader: `attribute float rnd; uniform float time,size,drift; varying float vA;
      void main(){ vec3 p=position; p.x+=sin(time*.3+rnd*40.)*drift*3.; p.y+=mod(time*drift*(.5+rnd),12.)-6.+sin(rnd*90.)*.5; p.z+=cos(time*.25+rnd*30.)*drift*3.;
      vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; vA=.35+.65*pow(.5+.5*sin(time*(1.+rnd*3.)+rnd*60.),2.);
      gl_PointSize=min(size*(.4+rnd)*(300./-mv.z), 14.); }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 color; uniform float opacity; varying float vA; void main(){ vec4 t=texture2D(map,gl_PointCoord); gl_FragColor=vec4(color*t.a*vA*opacity, t.a*vA*opacity); }`,
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false; return p;
}

// ---------- shaders ----------
const NEBULA_FS = `
uniform float time; uniform vec2 pan; uniform vec3 c1,c2,c3; uniform float intensity; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*n(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return v; }
void main(){
  vec2 p=(vUv-.5)*vec2(1.,1.78)*2.4+pan;
  vec2 q=vec2(fbm(p+time*.02), fbm(p+vec2(5.2,1.3)-time*.015));
  float f=fbm(p+q*1.6+time*.01);
  vec3 col=mix(c1*.35, c2, smoothstep(.25,.85,f));
  col=mix(col, c3, pow(smoothstep(.55,1.,fbm(p*1.7+q*2.-time*.02)),2.)*.85);
  col*=.55+.45*smoothstep(1.4,.0,length(vUv-vec2(.5,.48))*1.6);
  float s=step(.9975,h(floor(vUv*vec2(270.,480.)*1.0)+floor(time*.5)*0.))*h(floor(vUv*vec2(270.,480.))+3.);
  col+=vec3(s)*.8;
  gl_FragColor=vec4(col*intensity,1.);
}`;
const FINAL = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, ca: { value: 0.012 }, grain: { value: 0.045 }, vig: { value: 0.9 }, flash: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time,ca,grain,vig,flash; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+time*17.)*43758.5453); }
    void main(){ vec2 c=vUv-.5; float r=dot(c*vec2(1.,1.78),c*vec2(1.,1.78)); vec2 o=c*ca*(.3+r*2.);
      vec3 col=vec3(texture2D(tDiffuse,vUv+o).r, texture2D(tDiffuse,vUv).g, texture2D(tDiffuse,vUv-o).b);
      float l=dot(col,vec3(.299,.587,.114));
      col=mix(col, col*vec3(.86,.98,1.12), (1.-smoothstep(0.,.5,l))*.45);
      col=mix(col, col*vec3(1.1,1.0,.88), smoothstep(.45,1.,l)*.35);
      col=(col-.5)*1.06+.5;
      col*=1.-vig*smoothstep(.15,1.1,r);
      col+=vec3(1.,.93,.8)*flash;
      col+=(hash(vUv*vec2(1080.,1920.))-.5)*grain;
      gl_FragColor=vec4(col,1.); }`,
};

// ---------- engine ----------
export class Engine {
  constructor(canvas, timeline, cfg) {
    this.tl = timeline; this.cfg = cfg;
    const scale = cfg.renderScale || 0.85;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1); this.renderer.setSize(W * scale, H * scale, false);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.0;
    this.renderer.localClippingEnabled = true;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x060a14, 0.022);
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.45;
    this.camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 400); this.scene.add(this.camera);
    // nebula backdrop rendered small into a texture each frame
    this.nebRT = new THREE.WebGLRenderTarget(270, 480, { type: THREE.HalfFloatType });
    this.nebRT.texture.colorSpace = THREE.LinearSRGBColorSpace;
    this.nebMat = new THREE.ShaderMaterial({ uniforms: { time: { value: 0 }, pan: { value: new THREE.Vector2() }, c1: { value: new THREE.Color(0x0a1230) }, c2: { value: new THREE.Color(0x1c2a5a) }, c3: { value: new THREE.Color(0x8a4a6a) }, intensity: { value: 0.55 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }', fragmentShader: NEBULA_FS, depthWrite: false });
    this.nebScene = new THREE.Scene(); this.nebScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.nebMat));
    this.nebCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene.background = this.nebRT.texture;
    // composer
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W * scale / 2, H * scale / 2), 0.5, 0.5, 0.86);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.final = new ShaderPass(FINAL); this.composer.addPass(this.final);
    // world: lights, dust, warp streaks
    this.scene.add(new THREE.AmbientLight(0x8899cc, 0.35));
    const key = new THREE.DirectionalLight(0xffe0b0, 1.5); key.position.set(4, 8, 6); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x7fb8ff, 1.2); rim.position.set(-6, 3, -5); this.scene.add(rim);
    this.dust = particleField({ n: 900, spread: [40, 40, 40], center: [0, 0, -8], size: 1.6, seed: 7, drift: 0.12 }); this.dust.material.uniforms.opacity.value = 0.6; this.scene.add(this.dust);
    this.warp = this.makeWarp(); this.camera.add(this.warp);
    this.scenes = [];
  }
  makeWarp() {
    const n = 380, r = rng(99), pos = new Float32Array(n * 6), base = [];
    for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, rad = 0.6 + r() * 6, z = -4 - r() * 50; base.push([Math.cos(a) * rad, Math.sin(a) * rad * 1.6, z]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xffe6b8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    l.frustumCulled = false; l.userData = { base, pos, g }; return l;
  }
  setNebula(c1, c2, c3, intensity = 0.55) { const u = this.nebMat.uniforms; u.c1.value.set(c1); u.c2.value.set(c2); u.c3.value.set(c3); u.intensity.value = intensity; }
  add(def) { const group = new THREE.Group(); group.visible = false; this.scene.add(group); this.scenes.push({ def, group, api: def.build(group, this) || {} }); }
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
    this.camera.position.set(0, 0, 14); this.camera.lookAt(0, 0, 0); this.camera.fov = 38;
    this.bloom.strength = 0.5; this.setNebula(0x0a1230, 0x1c2a5a, 0x8a4a6a, 0.55);
    this.scenes[idx].api.update?.(lt, dur, this);
    // warp transition around every scene boundary
    let w = 0;
    for (const s of tl) { const d = t - s.s; if (s.s > 0 && Math.abs(d) < 0.5) w = Math.max(w, 1 - Math.abs(d) / 0.5); }
    w = w * w * (3 - 2 * w);
    const { base, pos, g } = this.warp.userData;
    base.forEach(([x, y, z], i) => { const zz = ((z + t * 60) % 54) - 54 + 4; const len = 0.1 + w * 9;
      pos.set([x, y, zz, x * (1 + w * 0.05), y * (1 + w * 0.05), zz - len], i * 6); });
    g.attributes.position.needsUpdate = true; this.warp.material.opacity = w * 0.85; this.warp.visible = w > 0.01;
    // camera: push-in at scene start, handheld drift, fov punch on warp
    const into = clamp(lt / 0.7);
    this.camera.position.x += Math.sin(t * 0.7) * 0.05 + Math.sin(t * 1.9) * 0.015;
    this.camera.position.y += Math.cos(t * 0.6) * 0.04;
    this.camera.translateZ((1 - easeOut(into)) * 2.5);
    this.camera.fov += w * 16; this.camera.updateProjectionMatrix();
    // nebula follows camera direction for parallax
    const dir = new THREE.Vector3(); this.camera.getWorldDirection(dir);
    const u = this.nebMat.uniforms; u.time.value = t; u.pan.value.set(Math.atan2(dir.x, -dir.z) * 0.8 + t * 0.01, dir.y * 0.8);
    this.renderer.setRenderTarget(this.nebRT); this.renderer.render(this.nebScene, this.nebCam); this.renderer.setRenderTarget(null);
    this.dust.material.uniforms.time.value = t;
    this.final.uniforms.time.value = t; this.final.uniforms.flash.value = Math.pow(w, 4) * 0.25;
    this.final.uniforms.ca.value = 0.01 + w * 0.05;
    this.composer.render();
    return { idx, lt, dur };
  }
}

// ---------- DOM overlay ----------
export class Overlay {
  constructor(root, timeline, cfg) {
    this.tl = timeline; this.cfg = cfg; this.root = root;
    root.innerHTML = `<div class="vignette"></div>
      <div class="brand"><span class="logo"></span><span class="ep"></span></div>
      <div class="progress"></div><div class="headline"></div><div class="big"></div><div class="card"></div><div class="caption"></div>`;
    this.$ = s => root.querySelector(s);
    this.$('.logo').textContent = cfg.series; this.$('.ep').textContent = cfg.epLabel;
    this.$('.progress').innerHTML = timeline.scenes.map(() => '<i><b></b></i>').join('');
    this.pages = this.buildPages(); this.lastHead = -1; this.lastPage = null;
  }
  buildPages() {
    const pages = [], maxChars = this.cfg.lineChars || 22;
    const phrases = (this.cfg.keywords || []).map(p => p.toLowerCase().split(/\s+/));
    for (const sc of this.tl.scenes) for (const s of sc.sentences) {
      const ws = s.words, norm = ws.map(w => w.w.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '')), key = new Set();
      for (const ph of phrases) for (let i = 0; i + ph.length <= ws.length; i++)
        if (ph.every((p, k) => norm[i + k] === p)) for (let k = 0; k < ph.length; k++) key.add(i + k);
      const lines = []; let line = [], len = 0;
      ws.forEach((w, i) => { if (len + w.w.length + (line.length ? 1 : 0) > maxChars && line.length) { lines.push(line); line = []; len = 0; } line.push(i); len += w.w.length + 1; });
      if (line.length) lines.push(line);
      for (let p = 0; p < lines.length; p += 2) {
        const idxs = lines.slice(p, p + 2), next = p + 2 < lines.length ? ws[lines[p + 2][0]].s : s.e + 0.25;
        pages.push({ s: ws[idxs[0][0]].s - 0.06, e: next - 0.02, lines: idxs, words: ws, key });
      }
    }
    return pages;
  }
  render(t, info, engine) {
    const sc = this.tl.scenes[info.idx];
    [...this.$('.progress').children].forEach((el, i) => { const s = this.tl.scenes[i]; el.firstChild.style.width = (clamp((t - s.s) / (s.e - s.s)) * 100) + '%'; });
    const h = this.$('.headline');
    if (this.lastHead !== info.idx) { this.lastHead = info.idx; h.innerHTML = sc.text.split(' ').map(w => `<span>${[...w].map(ch => `<em>${ch}</em>`).join('')}</span>`).join(' '); }
    let ci = 0;
    h.querySelectorAll('em').forEach(el => {
      const a = easeOut((info.lt - 0.2 - ci * 0.025) / 0.55), o = clamp((info.dur - info.lt) / 0.35); ci++;
      el.style.opacity = Math.min(a, o); el.style.transform = `translateY(${(1 - a) * 50}px) rotateX(${(1 - a) * 80}deg)`;
      el.style.filter = `blur(${(1 - a) * 8}px)`;
    });
    h.style.display = this.cfg.hideHeadline?.(info.idx, info.lt) ? 'none' : '';
    const page = this.pages.find(p => t >= p.s && t < p.e), cap = this.$('.caption');
    if (page !== this.lastPage) { this.lastPage = page; cap.innerHTML = page ? page.lines.map(l => `<div>${l.map(i => `<span data-i="${i}">${page.words[i].w}</span>`).join(' ')}</div>`).join('') : ''; }
    if (page) {
      const pa = easeOut((t - page.s) / 0.2); cap.style.opacity = pa; cap.style.transform = `translateY(${(1 - pa) * 20}px)`;
      cap.querySelectorAll('span').forEach(el => {
        const i = +el.dataset.i, w = page.words[i], key = page.key.has(i), on = t >= w.s, active = on && t < w.e + 0.05;
        el.className = (key ? 'key ' : '') + (active ? 'active' : on ? 'on' : 'off');
        el.style.transform = active ? `scale(${0.92 + 0.16 * backOut((t - w.s) / 0.16)}) translateY(-4px)` : '';
      });
    }
    this.cfg.overlay?.(this, t, info, engine);
  }
}

export const CSS = `
@font-face{font-family:"Playfair Display";font-weight:400 900;src:url(/tools/fonts/PlayfairDisplay.ttf)}
@font-face{font-family:"Montserrat";font-weight:100 900;src:url(/tools/fonts/Montserrat.ttf)}
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#05080f}
#c{position:absolute;inset:0}
#ov{position:absolute;inset:0;font-family:${FONT_UI};color:#fff;pointer-events:none}
.vignette{position:absolute;inset:0;background:linear-gradient(180deg,rgba(2,4,10,.7) 0,rgba(2,4,10,.15) 20%,transparent 30%,transparent 66%,rgba(2,4,10,.55) 80%,rgba(2,4,10,.75) 100%)}
.brand{position:absolute;top:150px;left:72px;right:72px;display:flex;align-items:center;justify-content:space-between;font-weight:700;letter-spacing:.2em;font-size:25px;color:#f3d28c}
.brand .ep{font-size:23px;padding:8px 20px;border-radius:99px;border:1.5px solid rgba(243,210,140,.7);letter-spacing:.16em}
.progress{position:absolute;top:212px;left:72px;right:72px;display:flex;gap:8px}
.progress i{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,.16);overflow:hidden}
.progress b{display:block;height:100%;width:0;background:linear-gradient(90deg,#f5b942,#ffe2a0);box-shadow:0 0 10px #f5b942}
.headline{position:absolute;top:268px;left:72px;right:72px;font-family:${FONT_TITLE};font-weight:800;font-size:94px;line-height:1.08;letter-spacing:-.005em;text-wrap:balance;perspective:800px;
  filter:drop-shadow(0 6px 26px rgba(0,0,0,.7))}
.headline span{display:inline-block;white-space:nowrap}
.headline em{font-style:normal;display:inline-block;background:linear-gradient(180deg,#fffaf0 25%,#f3c773 100%);-webkit-background-clip:text;color:transparent;transform-origin:50% 100%}
.big{position:absolute;left:0;right:0;top:640px;text-align:center;font-family:${FONT_TITLE};font-weight:900;font-size:360px;line-height:1;color:#ffe7b0;text-shadow:0 0 50px rgba(245,185,66,.8),0 0 130px rgba(245,185,66,.45);opacity:0}
.card{position:absolute;left:64px;right:64px;top:600px;opacity:0}
.caption{position:absolute;left:56px;right:56px;top:1452px;text-align:center;font-weight:800;font-size:62px;line-height:1.24;letter-spacing:-.005em}
.caption div{white-space:nowrap}
.caption span{display:inline-block;text-shadow:0 3px 0 rgba(0,0,0,.6),0 0 22px rgba(0,0,0,.9);-webkit-text-stroke:1.5px rgba(0,0,0,.45)}
.caption .off{color:rgba(255,255,255,.4)} .caption .on{color:#fff} .caption .active{color:#ffd56b}
.caption .key.on{color:#ffbfd0} .caption .key.active{color:#ffa3c0} .caption .key.off{color:rgba(255,191,208,.42)}
`;
