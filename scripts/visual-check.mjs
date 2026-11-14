// Visual regression: screenshots of the chase view in CLEAR / RAIN / SNOW, at the start grid and at speed, with metrics.
// Needs the dev server (npm run dev). Usage: node scripts/visual-check.mjs [--keep] [--base http://localhost:5173/]
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.argv.includes('--base') ? process.argv[process.argv.indexOf('--base') + 1] : 'http://localhost:5173/';
const OUT = 'logs/visual';
mkdirSync(OUT, { recursive: true });

// Target bands (tuned by looking at the screenshots): mean luma 0..1, share of clipped pixels, local contrast around the car.
// Clear is the neon baseline (brighter); rain and snow must be darker and calmer.
export const BANDS = { clear: { meanMin: 0.1, meanMax: 0.5 }, bad: { meanMin: 0.08, meanMax: 0.36 }, clipMax: 0.02, contrastMin: 0.08 };

const luma = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

export function metrics(png) {
  const { width: w, height: h, data } = png;
  let sum = 0;
  let clipped = 0;
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const l = luma(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    lum[i] = l;
    sum += l;
    if (l * 255 > 250) clipped++;
  }
  // local contrast: std dev of luma in the box where the car and the road around it are (middle, lower half)
  const x0 = Math.floor(w * 0.3), x1 = Math.floor(w * 0.7), y0 = Math.floor(h * 0.45), y1 = Math.floor(h * 0.9);
  let n = 0, m = 0, m2 = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const v = lum[y * w + x]; n++; m += v; m2 += v * v; }
  m /= n;
  // saturation of the brightest 5 % of pixels: neon must stay colourful, not wash out to white
  const idx = Array.from({ length: w * h }, (_, i) => i).sort((a, b) => lum[b] - lum[a]).slice(0, Math.floor(w * h * 0.05));
  let chroma = 0;
  for (const i of idx) { const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]; chroma += (Math.max(r, g, b) - Math.min(r, g, b)) / (Math.max(r, g, b) || 1); }
  return { mean: sum / (w * h), clip: clipped / (w * h), contrast: Math.sqrt(Math.max(0, m2 / n - m * m)), chroma: chroma / idx.length };
}

const CASES = [];
// look presets (docs/art-direction.md, section 6): each must pass the same bands; Neon Night must also stay saturated
for (const look of ['neon', 'dusk', 'grit']) for (const w of ['clear', 'rain']) CASES.push({ name: `${look}-${w}`, q: `?skip&ai=2&car=supra&track=neon&w=${w}&wi=1&look=${look}&ff=1`, look });
for (const w of ['clear', 'rain', 'snow']) {
  CASES.push({ name: `${w}-grid`, q: `?skip&ai=3&car=supra&w=${w}&wi=1&ff=1` });
  CASES.push({ name: `${w}-speed`, q: `?skip&demo=straight&ai=0&car=supra&w=${w}&wi=1&at=2&ff=6.5` });
}

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
if (only) for (let i = CASES.length - 1; i >= 0; i--) if (!CASES[i].name.includes(only)) CASES.splice(i, 1);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
let failed = 0;
for (const c of CASES) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE + c.q, { waitUntil: 'load' });
  await page.waitForTimeout(c.name.endsWith('grid') ? 3500 : 1500);
  const buf = await page.screenshot();
  writeFileSync(`${OUT}/${c.name}.png`, buf);
  const m = metrics(PNG.sync.read(buf));
  const band = c.name.startsWith('clear') || c.name.endsWith('-clear') ? BANDS.clear : BANDS.bad;
  const sat = c.look === 'neon' ? m.chroma >= 0.2 : true;
  const ok = sat && m.mean >= band.meanMin && m.mean <= band.meanMax && m.clip <= BANDS.clipMax && m.contrast >= BANDS.contrastMin && errors.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name.padEnd(12)} mean ${m.mean.toFixed(3)}  clipped ${(m.clip * 100).toFixed(2)}%  contrast ${m.contrast.toFixed(3)}  chroma ${m.chroma.toFixed(2)}${errors.length ? '  ERRORS ' + errors[0] : ''}`);
  await page.close();
}
await browser.close();
console.log(failed ? `\n${failed} FAILED (screenshots in ${OUT}/)` : '\nALL PASS');
process.exit(failed ? 1 : 0);
