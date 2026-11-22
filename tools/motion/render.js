// Render an episode page to video frames with headless Chromium, piping JPEGs into ffmpeg.
// node tools/motion/render.js --ep ep01 --tl out/ep01_vi_work/timeline.json --out out/ep01_vi_work/video.mp4 [--workers 3] [--fps 30]
// node tools/motion/render.js ... --stills 2,10,30 --out out/preview   (writes PNG stills)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1]]]) : a), []));
const ROOT = path.resolve(__dirname, '..', '..');
// per-episode defaults (keywords, label) from tools/motion/<ep>.meta.json
const META_PATH = path.join(__dirname, `${args.ep}.meta.json`);
const META = fs.existsSync(META_PATH) ? JSON.parse(fs.readFileSync(META_PATH, 'utf8')) : {};
const LANG = args.lang || 'vi';
if (!args.kw && META.keywords) args.kw = JSON.stringify(META.keywords[LANG] || []);
if (!args.label && META.label) args.label = META.label[LANG];
if (!args.series) args.series = LANG === 'en' ? 'INSIDE A THOUGHT' : 'BÊN TRONG MỘT Ý NGHĨ';
// GPU on Windows/macOS desktops; software rendering (SwiftShader) in containers or with --cpu 1
const USE_GPU = !args.cpu && (process.platform === 'win32' || process.platform === 'darwin');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = +(args.fps || 30), WORKERS = +(args.workers || 3);
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.ttf': 'font/ttf' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p)) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rsp);
    }).listen(0, () => res(srv));
  });
}

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.error('page error:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  const q = new URLSearchParams({ theme: args.theme || 'aurora', lang: LANG, clean: args.clean || '', ep: args.ep, tl: '/' + args.tl, series: args.series || 'BÊN TRONG MỘT Ý NGHĨ', label: args.label || 'TẬP 01', kw: args.kw || '[]', scale: args.scale || (USE_GPU ? '1' : '0.75') });
  if (args.end) q.set('end', args.end);
  await page.goto(`http://localhost:${port}/${args.page || 'tools/motion/episode.html'}?${q}`);
  await page.waitForFunction('window.ready === true', null, { timeout: 120000 });
  return page;
}

(async () => {
  const srv = await serve(), port = srv.address().port;
  const launch = () => chromium.launch({ args: USE_GPU ? ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=' + (process.platform === 'win32' ? 'd3d11' : 'metal')]
    : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  { const b = await launch(), p = await b.newPage();
    const gpu = await p.evaluate(() => { const g = document.createElement('canvas').getContext('webgl2'); const d = g && g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
    console.log('WebGL renderer:', gpu); await b.close(); }
  if (args.stills) {
    const b = await launch(), page = await openPage(b, port);
    fs.mkdirSync(args.out, { recursive: true });
    for (const s of args.stills.split(',').map(Number)) {
      await page.evaluate(t => window.renderAt(t), s);
      await page.screenshot({ path: path.join(args.out, `still_${String(s).padStart(6, '0')}.png`) });
    }
    await b.close(); srv.close(); return;
  }
  const tl = JSON.parse(fs.readFileSync(path.join(ROOT, args.tl)));
  const F0 = Math.round((+args.start || 0) * FPS), total = Math.ceil((args.end ? +args.end : tl.duration) * FPS) - F0, per = Math.ceil(total / WORKERS);
  const segs = [], t0 = Date.now();
  await Promise.all([...Array(WORKERS)].map(async (_, w) => {
    const a = F0 + w * per, z = Math.min(F0 + total, a + per); if (a >= z) return;
    const seg = args.out.replace(/\.mp4$/, `_seg${w}.mp4`); segs[w] = seg;
    const ff = spawn(FFMPEG, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', seg], { stdio: ['pipe', 'ignore', 'inherit'] });
    const b = await launch(), page = await openPage(b, port), cdp = await page.context().newCDPSession(page);
    for (let f = a; f < z; f++) {
      await page.evaluate(t => window.renderAt(t), f / FPS);
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, optimizeForSpeed: true });
      if (!ff.stdin.write(Buffer.from(data, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
      if (w === 0 && (f - a) % 60 === 0) console.log(`worker0 ${f - a}/${z - a}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
  }));
  const list = args.out.replace(/\.mp4$/, '_segs.txt');
  fs.writeFileSync(list, segs.filter(Boolean).map(s => `file '${path.resolve(s).replace(/\\/g, '/')}'\n`).join(''));
  await new Promise((res, rej) => spawn(FFMPEG, ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', args.out], { stdio: 'inherit' }).on('close', c => c ? rej(c) : res()));
  segs.forEach(s => s && fs.unlinkSync(s)); fs.unlinkSync(list);
  console.log(`done ${total} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  srv.close();
})();
