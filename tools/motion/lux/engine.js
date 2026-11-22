// "Digital lacquer" engine (sơn mài số): premium, calm, cinematic.
// - black lacquer floor with real reflections, studio soft-box environment, soft shadows
// - drifting gold-leaf flakes, shallow depth of field, restrained bloom, warm film grade with grain
// - scene-to-scene compositor: vermilion ink bloom, gold "polish" reveal, or cut
// - DOM overlay: wordmark, hairline progress, gold-leaf serif headline with a moving sheen, word-by-word captions
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { studioEnvironment, goldLeaf, PAL } from './materials.js';

export const W = 1080, H = 1920;
export const FONT_SERIF = '"Cormorant Garamond", Georgia, serif';
export const FONT_SANS = '"Be Vietnam Pro", Arial, sans-serif';
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);
export const easeInOut = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeInOutSine = t => -(Math.cos(Math.PI * clamp(t)) - 1) / 2;
export const backOut = t => { t = clamp(t); const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function textTexture(text, { size = 96, color = '#fff', weight = 600, pad = 24, font = FONT_SANS, bg = null, radius = 30, glow = null, w = null, letter = 0 } = {}) {
  const c = document.createElement('canvas'), x = c.getContext('2d'); const f = `${weight} ${size}px ${font}`; x.font = f;
  if (letter) x.letterSpacing = `${letter}px`;
  const tw = w || Math.ceil(x.measureText(text).width) + pad * 2, th = Math.ceil(size * 1.45) + pad * 2; c.width = tw; c.height = th;
  if (bg) { x.fillStyle = bg; x.beginPath(); x.roundRect(0, 0, tw, th, radius); x.fill(); }
  x.font = f; if (letter) x.letterSpacing = `${letter}px`; x.textAlign = 'center'; x.textBaseline = 'middle';
  if (glow) { x.shadowColor = glow; x.shadowBlur = size * 0.35; }
  x.fillStyle = color; x.fillText(text, tw / 2, th / 2 + size * 0.04);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { tex: t, aspect: tw / th };
}
export function textPlane(text, height, opts = {}) {
  const { tex, aspect } = textTexture(text, opts);
  return new THREE.Mesh(new THREE.PlaneGeometry(height * aspect, height), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
}
export function softSprite(color = '#ffd9a0', scale = 1, opacity = 1, blending = THREE.AdditiveBlending) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, color); g.addColorStop(.3, color + 'aa'); g.addColorStop(1, color + '00'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending, depthWrite: false, transparent: true, opacity })); s.scale.setScalar(scale); return s;
}

// ---------------------------------------------------------------- shaders
const FINAL = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, grain: { value: 0.035 }, vig: { value: 0.85 }, fade: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time,grain,vig,fade; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+time*13.)*43758.5453); }
    void main(){ vec2 c=vUv-.5; float r=dot(c*vec2(1.,1.78),c*vec2(1.,1.78)); vec2 o=c*.004*(.3+r*2.);
      vec3 col=vec3(texture2D(tDiffuse,vUv+o).r, texture2D(tDiffuse,vUv).g, texture2D(tDiffuse,vUv-o).b);
      float l=dot(col,vec3(.299,.587,.114));
      col=mix(col, col*vec3(1.02,.98,.93), (1.-smoothstep(0.,.35,l))*.6);   // warm lacquer blacks
      col=mix(col, col*vec3(1.07,1.0,.88), smoothstep(.5,1.,l)*.4);         // gold highlights
      col=(col-.5)*1.04+.5;
      col*=1.-vig*smoothstep(.2,1.15,r);
      col+=(hash(vUv*vec2(1080.,1920.))-.5)*grain;
      gl_FragColor=vec4(col*fade,1.); }`,
};
const BLEND = {
  uniforms: { tA: { value: null }, tB: { value: null }, k: { value: 0 }, mode: { value: 0 }, focus: { value: new THREE.Vector2(.5, .5) }, ink: { value: new THREE.Color(PAL.cinnabar) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
  fragmentShader: `uniform sampler2D tA,tB; uniform float k,mode; uniform vec2 focus; uniform vec3 ink; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
    float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*n(p); p=p*2.03+1.7; a*=.5; } return v; }
    void main(){ vec2 uv=vUv; vec3 a=texture2D(tA,uv).rgb, b=texture2D(tB,uv).rgb;
      if (mode < .5) { // vermilion ink bloom spreading from the focus point, organic edge
        vec2 d=(uv-focus)*vec2(1.,1.78); float dist=length(d);
        float edgeN=fbm(uv*vec2(4.,7.)+k*.8)*.55+fbm(d*9.)*.25;
        float front=k*1.9-.15;                       // radius of the bloom
        float m=smoothstep(front+.04, front-.04, dist+edgeN*.45);
        float rim=smoothstep(.0,.06, abs(dist+edgeN*.45-front)); // ink rim
        vec3 c=mix(a,b,m);
        c=mix(ink*.55, c, rim) ;                     // dark vermilion rim
        c+=vec3(1.,.8,.45)*(1.-smoothstep(.0,.015, abs(dist+edgeN*.45-front)))*.35*(1.-k); // gold filament on the rim
        gl_FragColor=vec4(c,1.); return; }
      if (mode < 1.5) { // gold polish: a diagonal band of light sweeps and reveals the next scene beneath
        float p=(uv.x*.7+(1.-uv.y)*.55); float front=k*1.6-.2; float m=smoothstep(front-.03, front+.03, p); m=1.-m;
        float band=exp(-pow((p-front)/.06,2.));
        vec3 c=mix(a,b,m)+vec3(1.,.82,.5)*band*.8;
        gl_FragColor=vec4(c,1.); return; }
      gl_FragColor=vec4(k<.5?a:b,1.); }`,
};

// ---------------------------------------------------------------- engine
export class Engine {
  constructor(canvas, timeline, cfg) {
    this.tl = timeline; this.cfg = cfg;
    const scale = cfg.renderScale || 0.8; this.scale = scale;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.setSize(W * scale, H * scale, false); canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; r.localClippingEnabled = true;
    const s = this.scene = new THREE.Scene();
    s.environment = studioEnvironment(r); s.environmentIntensity = 1.0;
    s.background = new THREE.Color(0x040302); s.fog = new THREE.Fog(0x050403, 16, 40);
    this.wall = new THREE.Mesh(new THREE.PlaneGeometry(90, 40), new THREE.MeshBasicMaterial({ map: this.backdrop(), fog: false, depthWrite: false })); this.wall.position.set(0, 12, -30); s.add(this.wall);
    this.camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 200); s.add(this.camera);
    // lights: one warm key with soft shadows, a cool rim, low ambient
    s.add(new THREE.HemisphereLight(0x3a2c20, 0x050403, 0.35));
    const key = this.key = new THREE.DirectionalLight(0xffe3c0, 2.2); key.position.set(3, 9, 5); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -8; key.shadow.camera.right = 8; key.shadow.camera.top = 8; key.shadow.camera.bottom = -8; key.shadow.radius = 6; key.shadow.bias = -0.0005;
    s.add(key, key.target);
    const rim = new THREE.DirectionalLight(0xbcd0ff, 0.9); rim.position.set(-6, 4, -6); s.add(rim);
    // lacquer floor: mirror reflections, darkened and sheened by a clear-coated black layer, plus a shadow catcher
    this.floor = new THREE.Group(); s.add(this.floor);
    const refl = new Reflector(new THREE.PlaneGeometry(160, 160), { color: 0x463c32, textureWidth: Math.round(W * scale * 0.5), textureHeight: Math.round(H * scale * 0.5), clipBias: 0.003, multisample: 0 });
    refl.rotation.x = -Math.PI / 2; this.floor.add(refl);
    const sheen = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ color: 0x050302, roughness: 0.9, metalness: 0, transparent: true, opacity: 0.66, envMapIntensity: 0.05 }));
    sheen.rotation.x = -Math.PI / 2; sheen.position.y = 0.002; sheen.receiveShadow = true; this.floor.add(sheen);
    const catcher = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.ShadowMaterial({ opacity: 0.55 })); catcher.rotation.x = -Math.PI / 2; catcher.position.y = 0.004; catcher.receiveShadow = true; this.floor.add(catcher);
    // gold-leaf flakes drifting through the air (signature element)
    this.flakes = this.makeFlakes(); s.add(this.flakes);
    // post chain
    const comp = this.composer = new EffectComposer(r);
    comp.addPass(new RenderPass(s, this.camera));
    this.bokeh = new BokehPass(s, this.camera, { focus: 10, aperture: 0.0016, maxblur: 0.009 }); comp.addPass(this.bokeh);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W * scale / 2, H * scale / 2), 0.32, 0.55, 0.92); comp.addPass(this.bloom);
    comp.addPass(new OutputPass());
    this.final = new ShaderPass(FINAL); comp.addPass(this.final);
    const rtOpt = { type: THREE.HalfFloatType };
    this.rtA = new THREE.WebGLRenderTarget(W * scale, H * scale, rtOpt); this.rtB = new THREE.WebGLRenderTarget(W * scale, H * scale, rtOpt);
    this.copy = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: { t: { value: null } }, vertexShader: BLEND.vertexShader, fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor=texture2D(t,vUv); }', depthTest: false, depthWrite: false }));
    this.blend = new FullScreenQuad(new THREE.ShaderMaterial({ ...BLEND, uniforms: THREE.UniformsUtils.clone(BLEND.uniforms), depthTest: false, depthWrite: false }));
    this.transitions = cfg.transitions || [];
    this.scenes = [];
  }
  backdrop() {
    const c = document.createElement('canvas'); c.width = 270; c.height = 480; const x = c.getContext('2d');
    const g = x.createRadialGradient(135, 200, 10, 135, 220, 330); g.addColorStop(0, '#20160d'); g.addColorStop(0.5, '#0b0806'); g.addColorStop(1, '#040302');
    x.fillStyle = g; x.fillRect(0, 0, 270, 480); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  makeFlakes(n = 240) {
    const geo = new THREE.PlaneGeometry(0.05, 0.04), mat = goldLeaf(11, { cells: 2 }); mat.side = THREE.DoubleSide; mat.emissive = new THREE.Color(0x5a3a10); mat.envMapIntensity = 2.2;
    const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; const r = rng(42);
    m.userData.seeds = [...Array(n)].map(() => [r() * 12 - 6, r() * 9 - 3, r() * 12 - 7, r(), r(), r()]); return m;
  }
  updateFlakes(t, center) {
    const m = this.flakes, d = new THREE.Object3D(), wrap = (v, a, b) => a + ((((v - a) % (b - a)) + (b - a)) % (b - a));
    m.userData.seeds.forEach(([x, y, z, a, b, c], i) => {
      d.position.set(center.x + wrap(x + Math.sin(t * 0.3 + a * 9) * 0.6, -6, 6), wrap(y - t * (0.08 + b * 0.1), -1, 6) + 0.2, center.z + wrap(z + Math.cos(t * 0.25 + c * 7) * 0.5, -7, 5));
      d.rotation.set(t * (0.6 + a) + a * 9, t * (0.4 + b) + b * 9, t * (0.5 + c) * 0.7); d.scale.setScalar(0.6 + c * 0.9); d.updateMatrix(); m.setMatrixAt(i, d.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }
  add(def) { const group = new THREE.Group(); group.visible = false; this.scene.add(group); this.scenes.push({ def, group, api: def.build(group, this) || {} }); }
  wordTime(i, needle, nth = 0) {
    let k = 0;
    for (const s of this.tl.scenes[i].sentences) for (const w of s.words)
      if (w.w.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '').startsWith(needle.toLowerCase())) { if (k++ === nth) return w.s - this.tl.scenes[i].s; }
    return null;
  }
  sentenceStart(i, j) { const sc = this.tl.scenes[i]; return (sc.sentences[j] || sc.sentences[sc.sentences.length - 1]).s - sc.s; }
  // a scene's update sets: camera (via e.cam), e.focus (distance), e.aperture; defaults below
  cam(pos, look, fov = 30) { this.camera.position.copy(pos); this.camera.lookAt(look); this.camera.fov = fov; this._look = look.clone(); }
  renderScene(i, t, target) {
    const sc = this.tl.scenes[i], lt = t - sc.s, dur = sc.e - sc.s;
    this.scenes.forEach((s, j) => { s.group.visible = j === i; });
    this.cam(V(0, 2, 12), V(0, 1, 0)); this.focus = null; this.aperture = 0.0016; this.bloom.strength = 0.32; this.flakesOn = 1; this.floor.visible = true;
    this.scenes[i]?.api.update?.(Math.max(0, lt), dur, this);
    this.camera.position.x += Math.sin(t * 0.37) * 0.015; this.camera.position.y += Math.sin(t * 0.29) * 0.012;  // breath-like micro drift
    this.camera.updateProjectionMatrix();
    const look = this._look || V(0, 1, 0);
    this.wall.position.x = look.x;
    this.key.position.copy(look).add(V(3, 9, 5)); this.key.target.position.copy(look); this.key.target.updateMatrixWorld();
    const u = this.bokeh.uniforms; u.focus.value = this.focus ?? this.camera.position.distanceTo(look); u.aperture.value = this.aperture; u.maxblur.value = 0.01;
    this.flakes.visible = this.flakesOn > 0; this.updateFlakes(t, look);
    this.final.uniforms.time.value = t;
    const end = this.cfg.endAt ?? this.tl.duration; this.final.uniforms.fade.value = clamp((end - t) / 0.8);
    this.composer.renderToScreen = !target; this.composer.render();
    if (target) { this.copy.material.uniforms.t.value = this.composer.readBuffer.texture; this.renderer.setRenderTarget(target); this.copy.render(this.renderer); this.renderer.setRenderTarget(null); }
    return { idx: i, lt, dur };
  }
  render(t) {
    const tl = this.tl.scenes, HALF = 0.6;
    let idx = tl.findIndex(s => t >= s.s && t < s.e); if (idx < 0) idx = t < tl[0].s ? 0 : tl.length - 1;
    const b = tl.findIndex((s, i) => i > 0 && Math.abs(t - s.s) < HALF && this.transitions[i - 1] && this.transitions[i - 1].type !== 'cut');
    if (b < 0) return this.renderScene(idx, t, null);
    const tr = this.transitions[b - 1], k = clamp((t - (tl[b].s - HALF)) / (2 * HALF));
    this.renderScene(b - 1, t, this.rtA); const info = this.renderScene(b, t, this.rtB);
    const bu = this.blend.material.uniforms; bu.tA.value = this.rtA.texture; bu.tB.value = this.rtB.texture; bu.k.value = easeInOutSine(k);
    bu.mode.value = { ink: 0, polish: 1 }[tr.type] ?? 2; bu.focus.value.set(...(tr.focus || [0.5, 0.5])); bu.ink.value.set(tr.ink ?? PAL.cinnabar);
    this.renderer.setRenderTarget(null); this.blend.render(this.renderer);
    return idx === b ? info : { idx, lt: t - tl[idx].s, dur: tl[idx].e - tl[idx].s };
  }
}

// ---------------------------------------------------------------- overlay
export class Overlay {
  constructor(root, timeline, cfg) {
    this.tl = timeline; this.cfg = cfg;
    root.innerHTML = `<div class="shade"></div>
      <div class="brand"><i></i><span class="logo"></span><i></i></div>
      <div class="progress"></div><div class="headline"></div><div class="big"></div><div class="card"></div><div class="caption"></div>`;
    this.$ = s => root.querySelector(s);
    this.$('.logo').textContent = `${cfg.series} · ${cfg.epLabel}`;
    this.$('.progress').innerHTML = timeline.scenes.map(() => '<i><b></b></i>').join('');
    this.pages = this.buildPages(); this.lastHead = -1; this.lastPage = null;
  }
  buildPages() {
    const pages = [], maxChars = this.cfg.lineChars || 24;
    const phrases = (this.cfg.keywords || []).map(p => p.toLowerCase().split(/\s+/));
    for (const sc of this.tl.scenes) for (const s of sc.sentences) {
      const ws = s.words, norm = ws.map(w => w.w.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '')), key = new Set();
      for (const ph of phrases) for (let i = 0; i + ph.length <= ws.length; i++) if (ph.every((p, k) => norm[i + k] === p)) for (let k = 0; k < ph.length; k++) key.add(i + k);
      const lines = []; let line = [], len = 0;
      ws.forEach((w, i) => { if (len + w.w.length + (line.length ? 1 : 0) > maxChars && line.length) { lines.push(line); line = []; len = 0; } line.push(i); len += w.w.length + 1; });
      if (line.length) lines.push(line);
      for (let p = 0; p < lines.length; p += 2) { const idxs = lines.slice(p, p + 2), next = p + 2 < lines.length ? ws[lines[p + 2][0]].s : s.e + 0.25;
        pages.push({ s: ws[idxs[0][0]].s - 0.06, e: next - 0.02, lines: idxs, words: ws, key }); }
    }
    return pages;
  }
  render(t, info, engine) {
    const sc = this.tl.scenes[info.idx];
    [...this.$('.progress').children].forEach((el, i) => { const s = this.tl.scenes[i]; el.firstChild.style.width = (clamp((t - s.s) / (s.e - s.s)) * 100) + '%'; });
    const h = this.$('.headline');
    if (this.lastHead !== info.idx) { this.lastHead = info.idx; h.innerHTML = sc.text.split(' ').map(w => `<span>${w}</span>`).join(' '); }
    const inst = this.cfg.instantHeadline?.(info.idx);
    [...h.children].forEach((el, i) => { const a = inst ? 1 : easeOut((info.lt - 0.25 - i * 0.09) / 0.8), o = clamp((info.dur - info.lt) / 0.45);
      el.style.opacity = Math.min(a, o); el.style.transform = `translateY(${(1 - a) * 24}px)`; el.style.filter = `blur(${(1 - a) * 6}px)`;
      el.style.backgroundPosition = `${(120 - ((t * 22 + i * 9) % 160))}% 0`; });
    h.style.display = this.cfg.hideHeadline?.(info.idx, info.lt) ? 'none' : '';
    const page = this.pages.find(p => t >= p.s && t < p.e), cap = this.$('.caption');
    if (page !== this.lastPage) { this.lastPage = page; cap.innerHTML = page ? page.lines.map(l => `<div>${l.map(i => `<span data-i="${i}">${page.words[i].w}</span>`).join(' ')}</div>`).join('') : ''; }
    if (page) { const pa = easeOut((t - page.s) / 0.22); cap.style.opacity = pa; cap.style.transform = `translateY(${(1 - pa) * 14}px)`;
      cap.querySelectorAll('span').forEach(el => { const i = +el.dataset.i, w = page.words[i], on = t >= w.s, active = on && t < w.e + 0.05;
        el.className = (page.key.has(i) ? 'key ' : '') + (active ? 'active' : on ? 'on' : 'off'); }); }
    const end = this.cfg.endAt ?? this.tl.duration; this.$('.shade').style.opacity = 1 - clamp((end - t) / 0.8);
    this.cfg.overlay?.(this, t, info, engine);
  }
}

export const CSS = `
@font-face{font-family:"Cormorant Garamond";font-weight:300 700;src:url(/tools/fonts/CormorantGaramond.ttf)}
@font-face{font-family:"Cormorant Garamond";font-style:italic;font-weight:300 700;src:url(/tools/fonts/CormorantGaramond-Italic.ttf)}
@font-face{font-family:"Be Vietnam Pro";font-weight:400;src:url(/tools/fonts/BeVietnamPro-Regular.ttf)}
@font-face{font-family:"Be Vietnam Pro";font-weight:500;src:url(/tools/fonts/BeVietnamPro-Medium.ttf)}
@font-face{font-family:"Be Vietnam Pro";font-weight:600;src:url(/tools/fonts/BeVietnamPro-SemiBold.ttf)}
@font-face{font-family:"Be Vietnam Pro";font-weight:700;src:url(/tools/fonts/BeVietnamPro-Bold.ttf)}
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#030202}
#c{position:absolute;inset:0}
#ov{position:absolute;inset:0;font-family:${FONT_SANS};color:#fff;pointer-events:none}
.shade{position:absolute;inset:0;background:#000;opacity:0}
.brand{position:absolute;top:150px;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:22px;font-weight:600;letter-spacing:.32em;font-size:20px;color:#d9b46a}
.brand i{display:block;width:56px;height:1.5px;background:linear-gradient(90deg,transparent,#d9b46a)} .brand i:last-child{transform:scaleX(-1)}
.progress{position:absolute;top:196px;left:200px;right:200px;display:flex;gap:6px}
.progress i{flex:1;height:2px;background:rgba(217,180,106,.18);overflow:hidden}
.progress b{display:block;height:100%;width:0;background:#e8c77f}
.headline{position:absolute;top:262px;left:70px;right:70px;text-align:center;font-family:${FONT_SERIF};font-weight:700;font-size:100px;line-height:1.02;letter-spacing:-.005em;text-wrap:balance;filter:drop-shadow(0 4px 18px rgba(0,0,0,.75))}
.headline span{display:inline-block;color:transparent;-webkit-background-clip:text;background-clip:text;background-image:linear-gradient(100deg,#b07f2c 0%,#e9c77e 30%,#fff3cf 46%,#f2d38f 54%,#b07f2c 80%);background-size:260% 100%}
.big{position:absolute;left:0;right:0;top:600px;text-align:center;font-family:${FONT_SERIF};font-weight:600;font-size:430px;line-height:1;opacity:0}
.big span{color:transparent;-webkit-background-clip:text;background-clip:text;background-image:linear-gradient(100deg,#9a6d24 0%,#e4c072 30%,#fff4d2 46%,#efcf88 56%,#9a6d24 82%);background-size:260% 100%;filter:drop-shadow(0 10px 40px rgba(0,0,0,.6))}
.card{position:absolute;left:64px;right:64px;top:600px;opacity:0}
.caption{position:absolute;left:60px;right:60px;top:1452px;text-align:center;font-weight:600;font-size:58px;line-height:1.28;letter-spacing:-.003em}
.caption div{white-space:nowrap}
.caption span{display:inline-block;text-shadow:0 2px 3px rgba(0,0,0,.65),0 0 26px rgba(0,0,0,.85)}
.caption .off{color:rgba(255,255,255,.42)} .caption .on{color:#fbf6ec} .caption .active{color:#f1cf86}
.caption .key.on,.caption .key.active{color:#f1cf86;font-style:normal} .caption .key.off{color:rgba(241,207,134,.45)}
`;
