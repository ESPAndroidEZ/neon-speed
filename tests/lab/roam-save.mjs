// Free Drive progress survives a reload (game/roamProgress.ts): a speed-camera record and the car meet visit are saved
// at once, the spot on leaving is saved, and the next Free Drive starts there. Needs `npm run dev`.
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5173';
let failed = 0;
const check = (n, ok, info = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${info ? `  (${info})` : ''}`); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.route('**/api/*.php*', (r) => r.fulfill({ json: { keys: {}, now: 1 } }));
await page.addInitScript(() => localStorage.setItem('rb-lang', 'en'));
const open = async () => {
  await page.goto(`${BASE}/?probe&roam=1&lang=en`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => window.__rbGame?.state === 'FREEROAM', null, { timeout: 90000 });
};
const lab = (fn, arg) => page.evaluate(async ([f, a]) => {
  const url = performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/freeDriveSetup.ts'));
  const l = (await import(url)).roamDev.lab;
  return f === 'spots' ? l.spots() : l.placeAt(a[0], a[1], a[2], a[3] ?? 0);
}, [fn, arg]);
const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('racers-blood-save-v1') ?? '{}').roam ?? null);
await open();
const sp = await lab('spots');
await lab('placeAt', [sp.trap.x - sp.trap.tx * 6, sp.trap.z - sp.trap.tz * 6, Math.atan2(sp.trap.tx, sp.trap.tz), 25]);
await page.waitForTimeout(4000);
await lab('placeAt', [sp.meet.x, sp.meet.z, 0, 0]);
let r = await saved();
for (let i = 0; i < 40 && !(r && r.visited.includes('meet')); i++) { await page.waitForTimeout(500); r = await saved(); } // software GL: game time runs slow
check('a camera record is saved at once', r && r.best && r.best['trap:0'] > 60, JSON.stringify(r?.best));
check('the car meet visit is saved', r && r.visited.includes('meet'), JSON.stringify(r?.visited));
await page.keyboard.press('Escape');
await page.locator('.rb-layer button', { hasText: /^Menu$/ }).click();
await page.waitForTimeout(1500);
r = await saved();
const d = r ? Math.hypot(r.x - sp.meet.x, r.z - sp.meet.z) : 1e9;
check('leaving saves the spot (the car meet)', d < 30, `${d.toFixed(1)} m from the meet`);
check('cells driven through are remembered', r && r.seen.length >= 1, String(r?.seen.length));
await open(); // reload: a new page load reads the save
const pos = await page.evaluate(() => { const p = window.__rbGame.rm.player.car.state.position; return { x: p.x, z: p.z }; });
const d2 = Math.hypot(pos.x - sp.meet.x, pos.z - sp.meet.z);
check('the next Free Drive starts where the last one ended (snapped to the road)', d2 < 60, `${d2.toFixed(1)} m from the meet`);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
