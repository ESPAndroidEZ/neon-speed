// Soak test: self-driving race for N minutes in headless Chromium; samples heap, GPU resources and scene size,
// and fails on page errors, WebGL context loss or steady growth (a leak). Needs the dev server. Usage: node scripts/soak.mjs [minutes] [query]
import { chromium } from 'playwright';
const mins = Number(process.argv[2] ?? 3);
const query = process.argv[3] ?? 'skip&demo&ai=5&w=rain';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' || /context lost/i.test(t)) errors.push(t.slice(0, 300)); });
page.on('crash', () => errors.push('PAGE CRASHED'));
await page.goto(`http://localhost:5173/?soak&${query}`, { waitUntil: 'load' });
await page.waitForTimeout(8000);
const cycle = process.env.CYCLE === '1'; // switch race (car, track, weather; sometimes via the menu) every 20 s
const rows = [];
for (let t = 0; t <= mins * 60; t += 20) {
  const s = await page.evaluate(() => { globalThis.gc?.(); const m = performance.memory; return { heapMB: m ? +(m.usedJSHeapSize / 1048576).toFixed(1) : 0, ...(window.__rbStats?.() ?? {}) }; }).catch((e) => ({ error: String(e) }));
  rows.push({ t, ...s });
  console.log(JSON.stringify({ t, ...s }));
  if (cycle) await page.evaluate((n) => window.__rbCycle?.(n), t / 20).catch((e) => errors.push(String(e)));
  if (t < mins * 60) await page.waitForTimeout(20000);
}
await browser.close();
const a = rows[1] ?? rows[0], b = rows[rows.length - 1];
const grow = (k) => (b[k] ?? 0) - (a[k] ?? 0);
console.log(`growth after warm-up: heap ${grow('heapMB').toFixed(1)} MB, geometries ${grow('geometries')}, textures ${grow('textures')}, programs ${grow('programs')}, objects ${grow('objects')}`);
for (const e of [...new Set(errors)].slice(0, 10)) console.log('ERROR', e);
const leak = grow('geometries') > 50 || grow('textures') > 10 || grow('objects') > 300 || grow('heapMB') > 40;
console.log(errors.length || leak ? 'SOAK FAILED' : 'SOAK OK');
process.exit(errors.length || leak ? 1 : 0);
