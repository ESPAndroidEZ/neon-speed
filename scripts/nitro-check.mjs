// Nitro brightness check (bug A1): night race, demo car holding nitro, chase view. Measures the share of fully clipped
// pixels (any channel >= 254) and mean luminance on screenshots downscaled to <= 1280 px wide; compares with a no-nitro run.
// Needs the dev server (npm run dev). Usage: node scripts/nitro-check.mjs [--base http://localhost:5173/]
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.argv.includes('--base') ? process.argv[process.argv.indexOf('--base') + 1] : 'http://localhost:5173/';
const OUT = 'logs/nitro';
const CLIP_MAX = 0.02;
mkdirSync(OUT, { recursive: true });

function metrics(png) {
  const { width: w, height: h, data } = png;
  let sum = 0, clipped = 0;
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    sum += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (r >= 254 || g >= 254 || b >= 254) clipped++;
  }
  return { mean: sum / (w * h), clip: clipped / (w * h) };
}

// demo=nitro drives straight holding nitro from t = 1 s (tank lasts ~4.5 s); ff=4 lands mid-burn. (Plain ?demo scrapes a
// wall by then, and the sparks / storefront glare would be measured instead of the nitro.)
// demo=straight never fires nitro (the baseline for the same view).
const Q = '&ai=0&car=supra&track=neon&wi=1&at=2&ff=4';
const CASES = [
  { name: 'nitro-clear', q: `?skip&demo=nitro${Q}&w=clear`, nitro: true },
  { name: 'nitro-rain', q: `?skip&demo=nitro${Q}&w=rain`, nitro: true },
  { name: 'base-clear', q: `?skip&demo=straight${Q}&w=clear`, nitro: false },
];

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
let failed = 0;
for (const c of CASES) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE + c.q, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  // several frames: the ignition kick and flame flicker vary, so judge the worst one
  let worst = null;
  for (let k = 0; k < 3; k++) {
    const png = PNG.sync.read(await page.screenshot());
    const m = metrics(png);
    if (!worst || m.clip > worst.clip) { worst = m; writeFileSync(`${OUT}/${c.name}.png`, PNG.sync.write(png)); }
    await page.waitForTimeout(350);
  }
  const ok = (!c.nitro || worst.clip <= CLIP_MAX) && errors.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name.padEnd(12)} mean ${worst.mean.toFixed(3)}  clipped ${(worst.clip * 100).toFixed(2)}%${errors.length ? '  ERRORS ' + errors[0] : ''}`);
  await page.close();
}
await browser.close();
console.log(failed ? `\n${failed} FAILED (screenshots in ${OUT}/)` : '\nALL PASS');
process.exit(failed ? 1 : 0);
