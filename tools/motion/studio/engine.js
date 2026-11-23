// "Porcelain & daylight" engine: bright seamless studio, soft shadows, porcelain/celadon/brass materials,
// editorial typography in ink. Camera language: overhead flat-lays, crane moves, long glides, rack focus.
// Transitions: soft white bloom, directional push with motion blur, or in-camera foreground wipes.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { W, H, V, clamp, easeInOutSine, FONT_SERIF, FONT_SANS } from '../lux/engine.js';
export { Overlay } from '../lux/engine.js';
export * from '../lux/engine.js';

export const PAPER = 0xecebe8;

// ---------------------------------------------------------------- materials
export const M = {
  porcelain: () => new THREE.MeshPhysicalMaterial({ color: 0xf7f5f0, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.3, sheenColor: new THREE.Color(0xffffff) }),
  celadon: () => new THREE.MeshPhysicalMaterial({ color: 0x9cc7b5, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 }),
  brass: (r = 0.32) => new THREE.MeshPhysicalMaterial({ color: 0xc9a467, metalness: 1, roughness: r }),
  vermilion: () => new THREE.MeshPhysicalMaterial({ color: 0xbe3a22, roughness: 0.25, clearcoat: 0.8 }),
  ink: () => new THREE.MeshStandardMaterial({ color: 0x1b1916, roughness: 0.55 }),
  teak: () => { const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = '#8a5a35'; x.fillRect(0, 0, 512, 128);
    for (let i = 0; i < 70; i++) { x.strokeStyle = `rgba(${50 + Math.random() * 40},${28 + Math.random() * 20},12,${0.15 + Math.random() * 0.25})`; x.lineWidth = 1 + Math.random() * 2; x.beginPath(); const y = Math.random() * 128; x.moveTo(0, y); x.bezierCurveTo(170, y + 6, 340, y - 6, 512, y + 3); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.5, clearcoat: 0.4 }); },
  glass: () => new THREE.MeshPhysicalMaterial({ color: 0xcfdcda, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.32, clearcoat: 1, envMapIntensity: 3.0, depthWrite: false, side: THREE.DoubleSide }),
  glaze: (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 }),
};
// re-skin props built for the lacquer style: metals -> brass, near-black surfaces -> the given glaze
export function reskin(obj, { dark = M.celadon(), metal = M.brass() } = {}) {
  obj.traverse(m => { if (!m.isMesh) return;
    const sw = mat => { if (!mat) return mat; if (mat.metalness >= 0.9) return metal; const c = mat.color; if (c && c.r + c.g + c.b < 0.2 && !mat.map) return dark; if (c && c.r + c.g + c.b < 0.2 && mat.map) return dark; return mat; };
    m.material = Array.isArray(m.material) ? m.material.map(sw) : sw(m.material); });
  return obj;
}
// soft contact shadow blob under an object
let _blob = null;
export function contactShadow(w = 1, d = 1, opacity = 0.35) {
  if (!_blob) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(40,30,20,1)'); g.addColorStop(0.5, 'rgba(40,30,20,.45)'); g.addColorStop(1, 'rgba(40,30,20,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); _blob = new THREE.CanvasTexture(c); }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: _blob, transparent: true, opacity, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.004; return m;
}
function brightStudio(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.53, 0.5), side: THREE.BackSide })));
  const box = (w, h, pos, rot, rgb) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb), side: THREE.DoubleSide })); m.position.set(...pos); m.rotation.set(...rot); s.add(m); };
  box(40, 16, [0, 24, 0], [Math.PI / 2, 0, 0], [3.0, 2.9, 2.7]);
  box(6, 28, [-22, 6, 4], [0, Math.PI / 2, 0], [2.4, 2.35, 2.25]);
  box(4, 26, [22, 6, -4], [0, -Math.PI / 2, 0], [1.6, 1.7, 1.8]);
  box(60, 30, [0, -16, 0], [-Math.PI / 2, 0, 0], [1.0, 0.95, 0.9]);
  return new THREE.PMREMGenerator(renderer).fromScene(s, 0.04).texture;
}

// ---------------------------------------------------------------- post
const FINAL = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, fade: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time,fade; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+time*13.)*43758.5453); }
    void main(){ vec3 col=texture2D(tDiffuse,vUv).rgb; vec2 c=vUv-.5; float r=dot(c*vec2(1.,1.78),c*vec2(1.,1.78));
      col*=vec3(1.0,1.0,.99);                            // neutral paper
      col*=1.-.28*smoothstep(.35,1.3,r);                  // gentle vignette
      col+=(hash(vUv*vec2(1080.,1920.))-.5)*.018;         // fine grain
      gl_FragColor=vec4(mix(vec3(.96,.95,.93),col,fade),1.); }`,
};
const BLEND = {
  uniforms: { tA: { value: null }, tB: { value: null }, k: { value: 0 }, mode: { value: 0 }, dir: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }',
  fragmentShader: `uniform sampler2D tA,tB; uniform float k,mode,dir; varying vec2 vUv;
    void main(){ vec2 uv=vUv;
      if (mode < .5) { // soft white bloom: the image overexposes into paper white and resolves into the next shot
        vec3 a=texture2D(tA,uv).rgb, b=texture2D(tB,uv).rgb; float w=sin(3.14159*k);
        vec3 c=mix(a,b,smoothstep(.35,.65,k)); c=mix(c, vec3(.985,.975,.955), w*w*.85); gl_FragColor=vec4(c,1.); return; }
      // push: both frames slide with directional motion blur
      float s=k*k*(3.-2.*k); vec3 acc=vec3(0.); float bl=.10*sin(3.14159*k);
      for(int i=0;i<12;i++){ float o=(float(i)/11.-.5)*bl; vec2 ua=uv+vec2(dir*(s+o),0.), ub=uv+vec2(dir*(s-1.+o),0.);
        acc+= (ua.x>=0.&&ua.x<=1.) ? texture2D(tA,ua).rgb : texture2D(tB,ub).rgb; }
      gl_FragColor=vec4(acc/12.,1.); }`,
};

export class Engine {
  constructor(canvas, timeline, cfg) {
    this.tl = timeline; this.cfg = cfg; const scale = cfg.renderScale || 0.8;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.setSize(W * scale, H * scale, false); canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    r.toneMapping = THREE.NeutralToneMapping; r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.VSMShadowMap;
    const s = this.scene = new THREE.Scene();
    s.background = new THREE.Color(PAPER); s.fog = new THREE.Fog(PAPER, 14, 34);
    s.environment = brightStudio(r); s.environmentIntensity = 0.9;
    this.camera = new THREE.PerspectiveCamera(28, W / H, 0.1, 200); s.add(this.camera);
    s.add(new THREE.HemisphereLight(0xffffff, 0xdcdad6, 1.1));
    const key = this.key = new THREE.DirectionalLight(0xfff6ec, 2.0); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 40 });
    key.shadow.radius = 14; key.shadow.blurSamples = 20; key.shadow.bias = -0.0004; s.add(key, key.target);
    const floor = this.floor = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: PAPER, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; s.add(floor);
    const comp = this.composer = new EffectComposer(r);
    comp.addPass(new RenderPass(s, this.camera));
    this.bokeh = new BokehPass(s, this.camera, { focus: 10, aperture: 0.0015, maxblur: 0.009 }); comp.addPass(this.bokeh);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W * scale / 2, H * scale / 2), 0.12, 0.6, 0.97); comp.addPass(this.bloom);
    comp.addPass(new OutputPass()); this.final = new ShaderPass(FINAL); comp.addPass(this.final);
    const rtOpt = { type: THREE.HalfFloatType };
    this.rtA = new THREE.WebGLRenderTarget(W * scale, H * scale, rtOpt); this.rtB = new THREE.WebGLRenderTarget(W * scale, H * scale, rtOpt);
    this.copy = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: { t: { value: null } }, vertexShader: BLEND.vertexShader, fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor=texture2D(t,vUv); }', depthTest: false, depthWrite: false }));
    this.blend = new FullScreenQuad(new THREE.ShaderMaterial({ ...BLEND, uniforms: THREE.UniformsUtils.clone(BLEND.uniforms), depthTest: false, depthWrite: false }));
    this.transitions = cfg.transitions || []; this.scenes = [];
  }
  add(def) { const group = new THREE.Group(); group.visible = false; this.scene.add(group); this.scenes.push({ def, group, api: def.build(group, this) || {} }); }
  wordTime(i, needle, nth = 0) { let k = 0;
    for (const s of this.tl.scenes[i].sentences) for (const w of s.words) if (w.w.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '').startsWith(needle.toLowerCase())) { if (k++ === nth) return w.s - this.tl.scenes[i].s; }
    return null; }
  sentenceStart(i, j) { const sc = this.tl.scenes[i]; return (sc.sentences[j] || sc.sentences[sc.sentences.length - 1]).s - sc.s; }
  cam(pos, look, fov = 28) { this.camera.position.copy(pos); this.camera.lookAt(look); this.camera.fov = fov; this._look = look.clone(); }
  renderScene(i, t, target) {
    const sc = this.tl.scenes[i], lt = t - sc.s, dur = sc.e - sc.s;
    this.scenes.forEach((s, j) => { s.group.visible = j === i; });
    this.cam(V(0, 2, 12), V(0, 1, 0)); this.focus = null; this.aperture = 0.0015;
    this.scenes[i]?.api.update?.(Math.max(0, lt), dur, this);
    this.camera.updateProjectionMatrix();
    const look = this._look;
    this.key.position.copy(look).add(V(4, 10, 6)); this.key.target.position.copy(look); this.key.target.updateMatrixWorld();
    const u = this.bokeh.uniforms; u.focus.value = this.focus ?? this.camera.position.distanceTo(look); u.aperture.value = this.aperture; u.maxblur.value = 0.01;
    this.final.uniforms.time.value = t; const end = this.cfg.endAt ?? this.tl.duration; this.final.uniforms.fade.value = clamp((end - t) / 0.8);
    this.composer.renderToScreen = !target; this.composer.render();
    if (target) { this.copy.material.uniforms.t.value = this.composer.readBuffer.texture; this.renderer.setRenderTarget(target); this.copy.render(this.renderer); this.renderer.setRenderTarget(null); }
    return { idx: i, lt, dur };
  }
  render(t) {
    const tl = this.tl.scenes, HALF = 0.55;
    let idx = tl.findIndex(s => t >= s.s && t < s.e); if (idx < 0) idx = t < tl[0].s ? 0 : tl.length - 1;
    const b = tl.findIndex((s, i) => i > 0 && Math.abs(t - s.s) < HALF && this.transitions[i - 1] && this.transitions[i - 1].type !== 'cut');
    if (b < 0) return this.renderScene(idx, t, null);
    const tr = this.transitions[b - 1], k = clamp((t - (tl[b].s - HALF)) / (2 * HALF));
    this.renderScene(b - 1, t, this.rtA); const info = this.renderScene(b, t, this.rtB);
    const bu = this.blend.material.uniforms; bu.tA.value = this.rtA.texture; bu.tB.value = this.rtB.texture; bu.k.value = easeInOutSine(k);
    bu.mode.value = tr.type === 'push' ? 1 : 0; bu.dir.value = tr.dir || 1;
    this.renderer.setRenderTarget(null); this.blend.render(this.renderer);
    return idx === b ? info : { idx, lt: t - tl[idx].s, dur: tl[idx].e - tl[idx].s };
  }
}

export const CSS = `
@font-face{font-family:"Cormorant Garamond";font-weight:300 700;src:url(/tools/fonts/CormorantGaramond.ttf)}
@font-face{font-family:"Cormorant Garamond";font-style:italic;font-weight:300 700;src:url(/tools/fonts/CormorantGaramond-Italic.ttf)}
@font-face{font-family:"Be Vietnam Pro";font-weight:400;src:url(/tools/fonts/BeVietnamPro-Regular.ttf)}
@font-face{font-family:"Be Vietnam Pro";font-weight:500;src:url(/tools/fonts/BeVietnamPro-Medium.ttf)}
@font-face{font-family:"Be Vietnam Pro";font-weight:600;src:url(/tools/fonts/BeVietnamPro-SemiBold.ttf)}
@font-face{font-family:"Be Vietnam Pro";font-weight:700;src:url(/tools/fonts/BeVietnamPro-Bold.ttf)}
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#ecebe8}
#c{position:absolute;inset:0}
#ov{position:absolute;inset:0;font-family:${FONT_SANS};color:#1b1916;pointer-events:none}
.shade{position:absolute;inset:0;background:#f4f2ee;opacity:0}
.brand{position:absolute;top:150px;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:22px;font-weight:600;letter-spacing:.34em;font-size:20px;color:#3a332b}
.brand i{display:block;width:56px;height:1.5px;background:linear-gradient(90deg,transparent,#3a332b)} .brand i:last-child{transform:scaleX(-1)}
.progress{position:absolute;top:196px;left:200px;right:200px;display:flex;gap:6px}
.progress i{flex:1;height:2px;background:rgba(27,25,22,.12);overflow:hidden}
.progress b{display:block;height:100%;width:0;background:#b8321e}
.headline{position:absolute;top:258px;left:70px;right:70px;text-align:center;font-family:${FONT_SERIF};font-weight:600;font-size:104px;line-height:1.0;letter-spacing:-.01em;text-wrap:balance;color:#1b1916}
.headline span{display:inline-block}
.big{position:absolute;left:0;right:0;top:560px;text-align:center;font-family:${FONT_SERIF};font-weight:500;font-size:440px;line-height:1;color:#1b1916;opacity:0;letter-spacing:-.02em}
.big span{display:inline-block}
.card{position:absolute;left:64px;right:64px;top:600px;opacity:0}
.caption{position:absolute;left:60px;right:60px;top:1452px;text-align:center;font-weight:600;font-size:56px;line-height:1.28}
.caption div{white-space:nowrap}
.caption span{display:inline-block;text-shadow:0 0 18px rgba(244,240,233,.95),0 0 4px rgba(244,240,233,.9)}
.caption .off{color:rgba(27,25,22,.32)} .caption .on{color:#1b1916} .caption .active{color:#b8321e}
.caption .key.on,.caption .key.active{color:#b8321e} .caption .key.off{color:rgba(184,50,30,.4)}
`;
