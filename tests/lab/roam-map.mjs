// Free Drive maps (ui/roamMap.ts): the minimap shows in the city, Pause > Map opens the full map, a tap sets a waypoint
// and the GPS finds a route, Esc closes everything and resumes. Needs `npm run dev`. Usage: node tests/lab/roam-map.mjs [es]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const lang = process.argv[2] === 'es' ? 'es' : 'en';
const L = lang === 'es' ? { map: 'Mapa' } : { map: 'Map' };
mkdirSync('logs/shots', { recursive: true });
let failed = 0;
const check = (n, ok, info = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${info ? `  (${info})` : ''}`); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.route('**/api/*.php*', (r) => r.fulfill({ json: { keys: {}, now: 1 } }));
await page.addInitScript((l) => localStorage.setItem('rb-lang', l), lang);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${BASE}/?probe&roam=downtown&lang=${lang}`, { waitUntil: 'load', timeout: 90000 });
await page.waitForFunction(() => window.__rbGame?.state === 'FREEROAM', null, { timeout: 90000 });
await page.waitForTimeout(1500);
check('minimap shows in the city', await page.locator('.rb-roam-mini').isVisible());
await page.screenshot({ path: `logs/shots/roam-mini-${lang}.png`, timeout: 90000 });
await page.keyboard.press('Escape');
await page.locator('button', { hasText: new RegExp(`^${L.map}$`) }).click();
const cv = page.locator('.rb-layer canvas').last();
await cv.waitFor({ timeout: 10000 });
const box = await cv.boundingBox();
await page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.3); // a place in the north-east
await page.waitForTimeout(500);
await page.screenshot({ path: `logs/shots/roam-map-${lang}.png`, timeout: 90000 });
const len = await page.evaluate(async () => {
  const url = performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/freeDriveSetup.ts'));
  return (await import(url)).roamDev.routeLength();
});
check('a tap on the full map sets a waypoint and a GPS route', len > 300, `${(len / 1000).toFixed(2)} km`);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const st = await page.evaluate(() => ({ paused: window.__rbGame.paused, mapOpen: [...document.querySelectorAll('.rb-layer canvas')].some((c) => c.offsetParent !== null) }));
check('Esc closes the map and resumes driving', !st.paused && !st.mapOpen, JSON.stringify(st));
check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
