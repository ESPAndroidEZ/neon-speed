// Screenshots of every menu screen for UI reviews (needs `npm run dev`). Usage:
//   node scripts/ui-shots.mjs [--tag before] [--sizes 1366x768,844x390] [--only main,garage]
// Writes logs/ui/<tag>/<size>-<screen>.png (max 1280 px wide) and logs/ui/<tag>/sheet-<size>.png (all screens on one sheet).
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const BASE = arg('--base', 'http://localhost:5173/');
const TAG = arg('--tag', 'now');
const SIZES = arg('--sizes', '1366x768,844x390').split(',');
const ONLY = arg('--only', '');
const OUT = `logs/ui/${TAG}`;
mkdirSync(OUT, { recursive: true });

const click = (txt) => async (p) => { await p.getByRole('button', { name: txt, exact: false }).first().click({ timeout: 8000 }); await p.waitForTimeout(900); };
const SCREENS = [
  { name: 'title', q: '?probe' },
  { name: 'main', q: '?probe', act: async (p) => { await p.locator('.rb-btn.hot').first().click(); await p.waitForTimeout(1200); } },
  { name: 'story', q: '?screen=story' },
  { name: 'maps', q: '?screen=maps' },
  { name: 'weather', q: '?screen=maps', act: async (p) => { await p.locator('.rb-card').first().click(); await p.waitForTimeout(900); } },
  { name: 'garage', q: '?screen=garage' },
  { name: 'tune', q: '?screen=tune' },
  { name: 'crew', q: '?screen=crew' },
  { name: 'settings', q: '?screen=settings' },
  { name: 'pause', q: '?skip&ai=1&pause=menu&ff=1&probe', wait: 1500 },
  { name: 'results', q: '?skip&ai=1&results&ff=1&probe', wait: 1500 },
];

function downscale(buf, max = 1280) {
  const src = PNG.sync.read(buf);
  if (src.width <= max) return { png: src, buf };
  const k = max / src.width, w = max, hh = Math.round(src.height * k);
  const out = new PNG({ width: w, height: hh });
  for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) {
    const si = (Math.floor(y / k) * src.width + Math.floor(x / k)) * 4, di = (y * w + x) * 4;
    for (let c = 0; c < 4; c++) out.data[di + c] = src.data[si + c];
  }
  return { png: out, buf: PNG.sync.write(out) };
}

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
for (const size of SIZES) {
  const [w, hgt] = size.split('x').map(Number);
  const shots = [];
  for (const s of SCREENS) {
    if (ONLY && !ONLY.split(',').includes(s.name)) continue;
    const ctx = await browser.newContext({ viewport: { width: w, height: hgt }, hasTouch: !!s.touch || w < 1000, isMobile: false });
    await ctx.addInitScript(() => { try { localStorage.setItem('rb-controls', JSON.stringify({ chosen: true, tutorialSeen: true })); } catch { /* ignore */ } });
    const p = await ctx.newPage();
    try {
      await p.goto(BASE + s.q, { waitUntil: 'load', timeout: 90000 });
      await p.waitForTimeout(s.wait ?? 3500);
      if (s.act) await s.act(p);
      const { png, buf } = downscale(await p.screenshot({ timeout: 60000 }));
      writeFileSync(`${OUT}/${size}-${s.name}.png`, buf);
      shots.push({ name: s.name, png });
      console.log(`${size} ${s.name} ok`);
    } catch (e) {
      console.log(`${size} ${s.name} FAILED ${String(e).split('\n')[0]}`);
    }
    await ctx.close();
  }
  // contact sheet: 3 columns at 1/3 scale
  if (shots.length) {
    const cw = Math.round(shots[0].png.width / 3), ch = Math.round(shots[0].png.height / 3), cols = 3, rows = Math.ceil(shots.length / cols);
    const sheet = new PNG({ width: cw * cols, height: ch * rows });
    shots.forEach(({ png }, i) => {
      const ox = (i % cols) * cw, oy = Math.floor(i / cols) * ch, k = png.width / cw;
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        const si = (Math.min(png.height - 1, Math.floor(y * k)) * png.width + Math.floor(x * k)) * 4, di = ((oy + y) * sheet.width + ox + x) * 4;
        for (let c = 0; c < 4; c++) sheet.data[di + c] = png.data[si + c];
      }
    });
    writeFileSync(`${OUT}/sheet-${size}.png`, PNG.sync.write(sheet));
    console.log(`sheet ${OUT}/sheet-${size}.png: ${shots.map((s) => s.name).join(', ')}`);
  }
}
await browser.close();
