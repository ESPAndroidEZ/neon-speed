// Free Drive activities in the browser: driving into a drift zone shows its pop-up (rings drawn), and driving through a
// speed camera shows the speed (cameras drawn). Needs `npm run dev`. Usage: node tests/lab/roam-activities.mjs [es]
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const lang = process.argv[2] === 'es' ? 'es' : 'en';
const L = lang === 'es' ? { zone: 'Zona de derrape', trap: 'Radar' } : { zone: 'Drift zone', trap: 'Speed trap' };
let failed = 0;
const check = (n, ok, info = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${info ? `  (${info})` : ''}`); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.route('**/api/*.php*', (r) => r.fulfill({ json: { keys: {}, now: 1 } }));
await page.addInitScript((l) => localStorage.setItem('rb-lang', l), lang);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${BASE}/?probe&roam=1&lang=${lang}`, { waitUntil: 'load', timeout: 90000 });
await page.waitForFunction(() => window.__rbGame?.state === 'FREEROAM', null, { timeout: 90000 });
const lab = (fn, arg) => page.evaluate(async ([f, a]) => {
  const url = performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/freeDriveSetup.ts'));
  const l = (await import(url)).roamDev.lab;
  return f === 'spots' ? l.spots() : l.placeAt(a[0], a[1], a[2], a[3] ?? 0);
}, [fn, arg]);
const pops = [];
await page.exposeFunction('__pop', (s) => pops.push(s));
await page.evaluate(() => { const p = document.querySelector('.rb-pop'); new MutationObserver(() => window.__pop(p.textContent)).observe(p, { childList: true, characterData: true, subtree: true }); });
const spots = await lab('spots');
check('scene has the drift rings and the cameras', await page.evaluate(() => !!window.__rbGame.d.engine.scene.getObjectByName('drift-zones') && !!window.__rbGame.d.engine.scene.getObjectByName('speed-traps')));
const z = spots.zone; // start in the middle of the zone: the run starts on the first step
await lab('placeAt', [z.x, z.z, 0]);
await page.keyboard.down('KeyW');
for (let i = 0; i < 30 && !pops.some((p) => p.includes(L.zone)); i++) await page.waitForTimeout(500);
check('entering a drift zone shows its pop-up', pops.some((p) => p.includes(L.zone)), pops.slice(-2).join(' | '));
await page.keyboard.up('KeyW');
const tp = spots.trap; // 6 m before the camera at 25 m/s: through it in a moment (traffic cannot get in the way)
await lab('placeAt', [tp.x - tp.tx * 6, tp.z - tp.tz * 6, Math.atan2(tp.tx, tp.tz), 25]);
await page.keyboard.down('KeyW');
for (let i = 0; i < 90 && !pops.some((p) => p.includes(L.trap)); i++) await page.waitForTimeout(500);
await page.keyboard.up('KeyW');
check('driving through a speed camera shows the speed', pops.some((p) => p.includes(L.trap)), pops.slice(-2).join(' | '));
check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
