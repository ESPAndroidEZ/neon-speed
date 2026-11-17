// Perf benchmark: each track (city, mountain, coast) x CLEAR/RAIN/SNOW at night, 5 AI cars, self-driving, headless Chromium.
// Records avg/p95 frame time, the engine's CPU split (sim = physics + AI fixed steps, frame = audio/world/HUD/camera callbacks,
// render = render submit), draw calls, triangles, geometries, textures; optional heap leak run and track-switch dispose check.
// SwiftShader (software WebGL) gives RELATIVE numbers only: compare runs on this machine, never read them as phone fps.
// Usage: scripts/with-dev.sh 'node scripts/bench.mjs --base $BASE'   env: TIER=low|medium|high  THROTTLE=4  VIEW=844x390
//   GFX='{"particles":0.25}' (graphics overrides; the rest from the tier preset)  LEAK=1 (heap over 3 laps per track)  SWITCH=1 (renderer.info after 5 track switches)  ONLY=kestrel:rain  SECS=6
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('--base', process.env.BASE ?? 'http://localhost:5173/');
const TIER = process.env.TIER ?? 'high', THROTTLE = Number(process.env.THROTTLE ?? 1), SECS = Number(process.env.SECS ?? 8);
const [VW, VH] = (process.env.VIEW ?? '844x390').split('x').map(Number);
const TRACKS = ['kestrel', 'mountain', 'coast'], WEATHERS = ['clear', 'rain', 'snow'];
const only = process.env.ONLY?.split(':');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });

async function open(query) {
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH } });
  await ctx.addInitScript(([tier, gfx]) => { try { localStorage.setItem('racers-blood-save-v1', JSON.stringify({ settings: { quality: tier, autoQuality: false, lang: 'en', muted: true, ...(gfx ? { graphics: gfx } : {}) } })); } catch {} }, [TIER, process.env.GFX ? JSON.parse(process.env.GFX) : null]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  if (THROTTLE > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE }); }
  await page.goto(`${BASE}?soak&skip&demo&ai=5&${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.__rbStats === 'function', null, { timeout: 60000 });
  return { ctx, page, errors };
}

/** Sample `secs` of frames inside the page: frame intervals plus the engine split of every frame. */
const sample = (page, secs) => page.evaluate((secs) => new Promise((res) => {
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] ?? 0; };
  const iv = [], sim = [], fr = [], rd = [], st = [], calls = [], tris = []; let last = performance.now(); const end = last + secs * 1000;
  const info = window.__rbRenderer.info; info.autoReset = false; info.reset(); // count every pass of a frame, not just the last
  const loop = (now) => {
    const s = window.__rbStats();
    if (s.calls > 0) { iv.push(now - last); last = now; sim.push(s.sim ?? 0); fr.push(s.frame ?? 0); rd.push(s.render ?? 0); st.push(s.steps ?? 1); calls.push(s.calls); tris.push(s.triangles); } // only frames that rendered (an fps cap skips ticks)
    info.reset();
    if (now < end) requestAnimationFrame(loop); else { info.autoReset = true; res({ iv: iv.slice(2), sim, fr, rd, st, calls: med(calls.slice(2)), tris: med(tris.slice(2)), stats: s, heap: performance.memory?.usedJSHeapSize ?? 0 }); }
  };
  requestAnimationFrame(loop);
}), secs);

const avg = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
const p95 = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length * 0.95)] ?? 0; };
const f1 = (v) => v.toFixed(1);
const rows = [], details = [];

for (const tr of TRACKS) for (const w of WEATHERS) {
  if (only && (only[0] !== tr || (only[1] && only[1] !== w))) continue;
  let ctx, page, errors, r, reloads = 0;
  for (;;) { // a WebGL context loss reloads the page (core/guard): note it and measure the reloaded page once
    ({ ctx, page, errors } = await open(`w=${w}&track=${tr}`));
    page.on('console', (m) => { if (/context lost/i.test(m.text())) errors.push('context lost'); });
    try { await page.waitForTimeout(7000); r = await sample(page, SECS); break; } // shaders, models and the rain/snow ramp settle
    catch (e) { await ctx.close(); if (++reloads > 1) throw e; }
  }
  const s = r.stats, cpu = avg(r.sim) + avg(r.fr) + avg(r.rd), ft = avg(r.iv);
  const row = { track: tr, weather: w, avgMs: +f1(ft), p95Ms: +f1(p95(r.iv)), simMs: +(r.sim.reduce((a, b) => a + b, 0) / Math.max(1, r.st.reduce((a, b) => a + b, 0))).toFixed(2), frameMs: +avg(r.fr).toFixed(2), renderMs: +avg(r.rd).toFixed(2), calls: r.calls, tris: r.tris, geo: s.geometries, tex: s.textures, progs: s.programs, bound: cpu > ft * 0.7 ? 'CPU' : 'GPU', errors: errors.length + reloads };
  rows.push(row); details.push({ ...row, errorsText: errors });
  await ctx.close();
}

const pad = (v, n) => String(v).padStart(n);
console.log(`tier=${TIER} throttle=${THROTTLE}x view=${VW}x${VH} (SwiftShader: relative numbers only)`);
console.log('track     weather  avg  p95 sim/st frame render calls   tris   geo tex prog bound err');
for (const r of rows) console.log(`${r.track.padEnd(9)} ${r.weather.padEnd(6)}${pad(r.avgMs, 5)}${pad(r.p95Ms, 5)}${pad(r.simMs, 6)}${pad(r.frameMs, 6)}${pad(r.renderMs, 6)}${pad(r.calls, 6)}${pad(r.tris, 7)}${pad(r.geo, 5)}${pad(r.tex, 4)}${pad(r.progs, 5)}  ${r.bound}${pad(r.errors, 4)}`);

const extra = {};
if (process.env.LEAK === '1') { // heap after GC every 15 s until the player has done 3 laps (or LEAK_SECS)
  extra.leak = [];
  for (const tr of TRACKS) {
    const { ctx, page } = await open(`w=rain&track=${tr}`);
    await page.waitForTimeout(8000);
    const pts = []; const cap = Number(process.env.LEAK_SECS ?? 300);
    for (let t = 0; t <= cap; t += 15) {
      const s = await page.evaluate(() => { globalThis.gc?.(); return { heap: performance.memory.usedJSHeapSize / 1048576, ...window.__rbStats() }; });
      pts.push({ t, heap: +s.heap.toFixed(1), lap: s.lap, geo: s.geometries, tex: s.textures });
      if (s.lap >= 3) break;
      await page.waitForTimeout(15000);
    }
    const a = pts[1] ?? pts[0], b = pts[pts.length - 1];
    const item = { track: tr, laps: b.lap, secs: b.t, heapStart: a.heap, heapEnd: b.heap, growthMB: +(b.heap - a.heap).toFixed(1), geo: `${a.geo}->${b.geo}`, tex: `${a.tex}->${b.tex}` };
    extra.leak.push({ ...item, pts }); console.log('leak', JSON.stringify(item));
    await ctx.close();
  }
}
if (process.env.SWITCH === '1') { // renderer.info after 5 race switches must come back to the first race's counts
  const { ctx, page } = await open('w=clear&track=kestrel');
  await page.waitForTimeout(8000);
  const first = await page.evaluate(() => { globalThis.gc?.(); return window.__rbStats(); });
  const seen = [];
  for (let n = 1; n <= 6; n++) { await page.evaluate((n) => window.__rbCycle(n * 3), n); await page.waitForTimeout(5000); seen.push(await page.evaluate(() => window.__rbStats())); }
  await page.evaluate(() => window.__rbCycle(0)); await page.waitForTimeout(6000); // back to the first race
  const back = await page.evaluate(() => { globalThis.gc?.(); return window.__rbStats(); });
  extra.switch = { first: { geo: first.geometries, tex: first.textures, progs: first.programs }, back: { geo: back.geometries, tex: back.textures, progs: back.programs }, during: seen.map((s) => `${s.geometries}/${s.textures}`) };
  console.log('switch', JSON.stringify(extra.switch));
  await ctx.close();
}
await browser.close();
mkdirSync('logs/bench', { recursive: true });
const file = `logs/bench/bench-${TIER}-${THROTTLE}x-${Date.now()}.json`;
writeFileSync(file, JSON.stringify({ tier: TIER, throttle: THROTTLE, view: [VW, VH], rows: details, ...extra }, null, 1));
console.log('details:', file);
