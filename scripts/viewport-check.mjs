// Responsive check at ten viewports: no horizontal scroll, every visible UI element inside the screen, buttons at least
// 44 px on touch screens, and in the chase view the car in the lower centre with the road ahead reaching up the screen.
// Needs the dev server (npm run dev). Usage: node scripts/viewport-check.mjs [--base URL] [--only 390x844] [--shots]
// Screenshots (downscaled to max 1280 px wide) go to logs/viewport/ with --shots.
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const BASE = arg('--base', 'http://localhost:5173/');
const SHOTS = process.argv.includes('--shots');
const OUT = 'logs/viewport';
mkdirSync(OUT, { recursive: true });
import { VIEWPORTS } from './viewport-check-list.mjs';
const TOUCH = new Set(['360x640', '390x844', '844x390', '932x430', '768x1024', '1024x768']);
const SCREENS = [
  { name: 'race', q: '?skip&ai=2&probe&ff=1', wait: 2500 },
  { name: 'title', q: '?probe', wait: 3600 },
  { name: 'chooser', q: '?chooser', wait: 3600 },
  { name: 'garage', q: '?screen=garage', wait: 3600 },
  { name: 'settings', q: '?screen=settings', wait: 3600 },
  { name: 'tune', q: '?screen=tune', wait: 3600 },
  { name: 'pause', q: '?skip&ai=1&pause=menu&ff=1&probe', wait: 1500 },
  { name: 'results', q: '?skip&ai=1&results&ff=1&probe', wait: 1500 },
];

/** Nearest-neighbour downscale to at most `max` px wide. */
function downscale(buf, max = 1280) {
  const src = PNG.sync.read(buf);
  if (src.width <= max) return buf;
  const k = src.width / max, w = max, h = Math.round(src.height / k), dst = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const si = (Math.floor(y * k) * src.width + Math.floor(x * k)) * 4, di = (y * w + x) * 4;
    for (let c = 0; c < 4; c++) dst.data[di + c] = src.data[si + c];
  }
  return PNG.sync.write(dst);
}

/** In-page audit: scroll, elements out of the screen, small touch targets. */
function audit(touch) {
  const W = innerWidth, H = innerHeight, bad = [], small = [];
  const se = document.scrollingElement;
  const scroll = se.scrollWidth > W + 1 || se.scrollHeight > H + 1;
  for (const el of document.body.querySelectorAll('*')) {
    if (el.tagName === 'CANVAS' || el.tagName === 'STYLE' || el.closest('[data-offscreen-ok]')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    let p = el, hidden = false;
    while (p && p !== document.body) { const s = getComputedStyle(p); if (s.display === 'none' || Number(s.opacity) === 0 || s.visibility === 'hidden') { hidden = true; break; } if (s.overflow !== 'visible' && p !== el) break; p = p.parentElement; }
    if (hidden) continue;
    const text = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || el.tagName === 'BUTTON' || el.matches('.b,[role=button],input');
    if (!text) continue;
    // clipped by a scrolling parent is fine (lists scroll); only judge against the screen when no parent clips it
    let clip = el.parentElement, clipped = false;
    while (clip && clip !== document.body) { const s = getComputedStyle(clip); if (/(auto|scroll|hidden)/.test(s.overflow + s.overflowX + s.overflowY)) { clipped = true; break; } clip = clip.parentElement; }
    const out = r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1;
    if (out && !clipped) bad.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} "${(el.textContent || '').trim().slice(0, 18)}" [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]`);
    const clickable = el.tagName === 'BUTTON' || el.matches('.rb-tc .b') || (cs.cursor === 'pointer' && !el.parentElement?.closest('button,.b,label'));
    if (touch && clickable && (r.width < 43.5 || r.height < 43.5) && !out) small.push(`${String(el.className).split(' ')[0] || el.tagName} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  return { scroll, bad, small: [...new Set(small)] };
}

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
const only = arg('--only', null);
let failed = 0;
const JOBS = Number(arg('--jobs', 2));
async function runViewport(vp) {
  const [width, height] = vp.split('x').map(Number);
  const touch = TOUCH.has(vp);
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch && width < 1000, deviceScaleFactor: 1 });
  // the first-run control chooser has its own case; everywhere else it is answered already
  await ctx.addInitScript(() => { if (!location.search.includes('chooser')) localStorage.setItem('rb-controls', JSON.stringify({ v: 1, scheme: 'wheel', chosen: true, seen: ['tilt', 'wheel', 'buttons'] })); });
  const pick = arg('--screens', null);
  for (const s of SCREENS.filter((x) => !pick || pick.split(',').includes(x.name))) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
    let a = null;
    for (let tries = 0; tries < 3 && !a; tries++) { // a dev-server reload mid-check destroys the page context: retry
      if (!(await page.goto(BASE + s.q, { waitUntil: 'load', timeout: 90000 }).catch(() => null))) continue;
      await page.waitForTimeout(s.wait);
      for (let t = 0; t < 30 && s.q.includes('skip'); t++) { // dev start loads lazily: wait until the race runs
        if (await page.evaluate(() => !!window.__rbProbe && window.__rbProbe().state !== 'MENU').catch(() => false)) break;
        await page.waitForTimeout(500);
      }
      if (s.q.includes('skip')) await page.waitForTimeout(1200);
      a = await page.evaluate(audit, touch).catch(() => null);
    }
    if (!a) a = { scroll: false, bad: ['page kept reloading'], small: [] };
    const issues = [];
    if (a.scroll) issues.push('page scrolls');
    if (a.bad.length) issues.push(`outside: ${a.bad.slice(0, 4).join('; ')}`);
    if (a.small.length) issues.push(`small targets: ${a.small.slice(0, 4).join(', ')}`);
    if (errors.length) issues.push(`error: ${errors[0]}`);
    if (s.name === 'race') {
      let p = null;
      for (let t = 0; t < 20 && !p; t++) { // the dev start module loads lazily: wait for the race
        p = await page.evaluate(() => (window.__rbProbe && window.__rbProbe().state !== 'MENU' ? window.__rbProbe() : null)).catch(() => null);
        if (!p) await page.waitForTimeout(500);
      }
      if (p) { await page.waitForTimeout(1500); p = await page.evaluate(() => window.__rbProbe()).catch(() => p); }
      if (!p) issues.push('no probe');
      else {
        const [cx, cy] = p.car, [, ay] = p.ahead60;
        if (cx < width * 0.3 || cx > width * 0.7 || cy < height * 0.45 || cy > height * 0.95) issues.push(`car at ${cx},${cy}`);
        if (!(ay < height * 0.5)) issues.push(`road ahead only reaches y=${ay}`);
        issues.push(`(fov ${p.fov.toFixed(0)}, car y ${(cy / height).toFixed(2)}, road ${(ay / height).toFixed(2)})`);
      }
    }
    if (SHOTS) { const shot = await page.screenshot({ timeout: 120000 }).catch(() => null); if (shot) writeFileSync(`${OUT}/${vp}-${s.name}.png`, downscale(shot)); else issues.push('(no screenshot)'); }
    const real = issues.filter((i) => !i.startsWith('('));
    if (real.length) failed++;
    console.log(`${real.length ? 'FAIL' : 'ok  '} ${vp.padEnd(10)} ${s.name.padEnd(9)} ${issues.join(' | ')}`);
    await page.close();
  }
  await ctx.close();
}
const queue = VIEWPORTS.filter((v) => !only || only.split(',').includes(v));
await Promise.all(Array.from({ length: JOBS }, async () => { while (queue.length) await runViewport(queue.shift()); }));
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
