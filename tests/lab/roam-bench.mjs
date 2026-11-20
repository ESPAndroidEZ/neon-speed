// W5.7 bench: Free Drive in every district with streets x CLEAR/RAIN/SNOW, looking four ways at the district's middle,
// on LOW and HIGH. Records main-scene draw calls and triangles (budget LOW 250 / 600k, HIGH 500 / 1.5M) and the frame
// time (SwiftShader: RELATIVE numbers only, never phone fps). One screenshot per district and weather for the QA review.
// Usage (dev server running, LD_LIBRARY_PATH as in docs/skills.md): node tests/lab/roam-bench.mjs [low|high|both]
//   -> logs/roam-bench.json, logs/roam-bench/<quality>-<district>-<weather>.png, PASS/FAIL per quality
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const WAIT = Number(process.env.WAIT ?? 2500);
const which = process.argv[2] ?? 'both';
const QUALITIES = which === 'both' ? ['low', 'high'] : [which];
const DISTRICTS = ['downtown', 'harbour', 'oldtown', 'strip', 'hills', 'industrial'];
const WEATHERS = ['CLEAR', 'RAIN', 'SNOW'];
const BUDGET = { low: { calls: 250, tris: 6e5 }, high: { calls: 500, tris: 1.5e6 } };
mkdirSync('logs/roam-bench', { recursive: true });
let failed = 0;
const check = (n, ok, info = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${info ? `  (${info})` : ''}`); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-precise-memory-info'] });
const rows = [];

for (const quality of QUALITIES) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.route('**/api/*.php*', (r) => r.fulfill({ json: { keys: {}, now: 1 } }));
  // the tier lives in the save's settings (an old 'rb-quality' key was never read by the game)
  await page.addInitScript((q) => { localStorage.setItem('rb-lang', 'en'); if (!localStorage.getItem('racers-blood-save-v1')) localStorage.setItem('racers-blood-save-v1', JSON.stringify({ settings: { quality: q, autoQuality: false, lang: 'en', muted: true } })); }, quality);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}/?probe&roam=1&lang=en`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => window.__rbGame?.state === 'FREEROAM', null, { timeout: 90000 });
  const tier = await page.evaluate(() => JSON.parse(localStorage.getItem('racers-blood-save-v1') ?? '{}').settings?.quality);
  check(`${quality}: the page runs at that tier`, tier === quality, String(tier));
  const setup = await page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/freeDriveSetup.ts')));
  await page.evaluate(() => { // main-scene numbers (the composer's passes would add their own calls) and frame times
    const g = window.__rbGame, r = g.d.engine.renderer, scene = g.d.engine.scene, orig = r.render.bind(r);
    window.__b = { calls: 0, tris: 0, dts: [], last: performance.now() };
    r.render = (s, c) => { orig(s, c); if (s === scene) { window.__b.calls = r.info.render.calls; window.__b.tris = r.info.render.triangles; } };
    const tick = (t) => { window.__b.dts.push(t - window.__b.last); window.__b.last = t; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  for (const d of DISTRICTS) {
    for (const w of WEATHERS) {
      await page.evaluate(async ([u, dist, wx]) => { const m = await import(u); window.__rbGame.setWeather(wx); m.roamDev.travel(dist); }, [setup, d, w]);
      let calls = 0, tris = 0;
      const dts = [];
      for (let k = 0; k < 4; k++) {
        await page.evaluate(async ([u, k]) => { const m = await import(u), p = window.__rbGame.rm.player.car.state.position; m.roamDev.lab.placeAt(p.x, p.z, (k * Math.PI) / 2, 0); window.__b.dts.length = 0; }, [setup, k]);
        await page.waitForTimeout(WAIT);
        const s = await page.evaluate(() => ({ calls: window.__b.calls, tris: window.__b.tris, dts: window.__b.dts.slice(2) }));
        calls = Math.max(calls, s.calls); tris = Math.max(tris, s.tris); dts.push(...s.dts);
      }
      dts.sort((a, b) => a - b);
      const avg = dts.reduce((a, b) => a + b, 0) / Math.max(1, dts.length), p95 = dts[Math.floor(dts.length * 0.95)] ?? 0;
      rows.push({ quality, district: d, weather: w, calls, tris, avgMs: +avg.toFixed(1), p95Ms: +p95.toFixed(1) });
      console.log(`${quality.padEnd(4)} ${d.padEnd(10)} ${w.padEnd(5)} calls ${String(calls).padStart(3)}  tris ${(tris / 1000).toFixed(0).padStart(4)}k  frame avg ${avg.toFixed(0)} ms p95 ${p95.toFixed(0)} ms`);
      if (quality === 'low' || process.env.SHOTS_HIGH) await page.screenshot({ path: `logs/roam-bench/${quality}-${d}-${w.toLowerCase()}.png`, timeout: 90000 });
    }
  }
  const mine = rows.filter((r) => r.quality === quality), b = BUDGET[quality];
  const worst = mine.reduce((a, r) => (r.calls > a.calls ? r : a), mine[0]), worstT = mine.reduce((a, r) => (r.tris > a.tris ? r : a), mine[0]);
  check(`${quality}: draw calls within ${b.calls} everywhere`, worst.calls <= b.calls, `worst ${worst.calls} in ${worst.district} ${worst.weather}`);
  check(`${quality}: triangles within ${(b.tris / 1e6).toFixed(1)}M everywhere`, worstT.tris <= b.tris, `worst ${(worstT.tris / 1000).toFixed(0)}k in ${worstT.district} ${worstT.weather}`);
  check(`${quality}: no page errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.close();
}
writeFileSync('logs/roam-bench.json', JSON.stringify(rows, null, 1));
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
