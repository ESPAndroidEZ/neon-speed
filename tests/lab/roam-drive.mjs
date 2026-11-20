// W5.1 Done-when: a bot drives Free Drive in Neon Harbor (dev page, software GL) and the lab samples the main scene's
// draw calls and triangles, the JS heap, live chunks and geometries. Needs `npm run dev`.
// Usage: SECS=600 node tests/lab/roam-drive.mjs [quality]   (quality low|high, default low) -> logs/roam-drive.json, ALL PASS
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const SECS = Number(process.env.SECS ?? 90);
const quality = process.argv[2] === 'high' ? 'high' : 'low';
const BUDGET = quality === 'high' ? { calls: 500, tris: 1.5e6 } : { calls: 250, tris: 6e5 };
mkdirSync('logs/shots', { recursive: true });
let failed = 0;
const check = (n, ok, info = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${info ? `  (${info})` : ''}`); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.route('**/api/*.php*', (r) => r.fulfill({ json: { keys: {}, now: Math.floor(Date.now() / 1000) } }));
// the tier lives in the save's settings (an old 'rb-quality' key was never read by the game)
await page.addInitScript((q) => { localStorage.setItem('rb-lang', 'en'); if (!localStorage.getItem('racers-blood-save-v1')) localStorage.setItem('racers-blood-save-v1', JSON.stringify({ settings: { quality: q, autoQuality: false, lang: 'en', muted: true } })); }, quality);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${BASE}/?probe&screen=main&lang=en`, { waitUntil: 'load', timeout: 90000 });
await page.locator('button', { hasText: 'Free Drive' }).waitFor({ timeout: 90000 });
await page.waitForTimeout(3000);
const menuGeos = await page.evaluate(() => window.__rbGame.d.engine.renderer.info.memory.geometries); // baseline: the menu before the city
await page.locator('button', { hasText: 'Free Drive' }).click();
await page.waitForFunction(() => window.__rbGame?.state === 'FREEROAM', null, { timeout: 60000 });
await page.evaluate(() => {
  const g = window.__rbGame, r = g.d.engine.renderer, scene = g.d.engine.scene, orig = r.render.bind(r);
  window.__roam = { calls: 0, tris: 0 };
  r.render = (s, c) => { orig(s, c); if (s === scene) { window.__roam.calls = r.info.render.calls; window.__roam.tris = r.info.render.triangles; } };
});
const sample = () => page.evaluate(() => {
  const g = window.__rbGame, st = g.rm.player.car.state, info = g.d.engine.renderer.info;
  const city = g.d.engine.scene.getObjectByName('neon-harbor');
  return { state: g.state, x: st.position.x, z: st.position.z, speed: st.speed, calls: window.__roam.calls, tris: window.__roam.tris, chunks: city ? city.children.filter((c) => c.name.startsWith('chunk')).length : 0, traffic: city?.getObjectByName('traffic')?.children[0]?.count ?? 0, cityMeshes: city ? city.children.reduce((a, c) => a + c.children.length, 0) : 0, geos: info.memory.geometries, textures: info.memory.textures, heap: performance.memory?.usedJSHeapSize ?? 0 };
});
const samples = [];
let stuck = 0, respawns = 0, dist = 0, last = await sample();
await page.keyboard.down('KeyW');
const t0 = Date.now();
for (let k = 0; Date.now() - t0 < SECS * 1000; k++) {
  const steer = ['KeyA', 'KeyD'][k % 2];
  if (k % 3 === 0) { await page.keyboard.down(steer); await page.waitForTimeout(400 + (k % 5) * 150); await page.keyboard.up(steer); }
  await page.waitForTimeout(1500);
  const s = await sample();
  dist += Math.hypot(s.x - last.x, s.z - last.z);
  stuck = Math.abs(s.speed) < 2 ? stuck + 1 : 0;
  if (stuck >= 2) { await page.keyboard.press('KeyR'); respawns++; stuck = 0; await page.keyboard.up('KeyW'); await page.keyboard.down('KeyS'); await page.waitForTimeout(600); await page.keyboard.up('KeyS'); await page.keyboard.down('KeyW'); }
  samples.push({ t: Math.round((Date.now() - t0) / 1000), ...s });
  last = s;
  if (k === 6 || k === 20) await page.screenshot({ path: `logs/shots/roam-${quality}-${k}.png`, timeout: 90000 });
}
await page.keyboard.up('KeyW');
writeFileSync('logs/roam-drive.json', JSON.stringify(samples));
const after = samples.slice(Math.floor(samples.length / 4));
const max = (k) => Math.max(...after.map((s) => s[k]));
const first = after[0], end = after[after.length - 1];
check('the menu is hidden while driving', await page.evaluate(() => ![...document.querySelectorAll('.rb-main')].some((e) => e.offsetParent !== null)));
check('race-only HUD (lap, position, timer, race map) hidden in the city', await page.evaluate(() => ['#hud .info', '#minimap'].every((q) => { const e = document.querySelector(q); return !e || getComputedStyle(e).display === 'none'; })));
check('stays in Free Drive the whole time, no page errors', samples.every((s) => s.state === 'FREEROAM') && errors.length === 0, errors.slice(0, 2).join(' | '));
check('the bot covers ground (> 1 km or 2 m/s average)', dist > Math.min(1000, SECS * 2), `${(dist / 1000).toFixed(2)} km, ${respawns} respawns`);
check(`draw calls within ${quality.toUpperCase()} budget (${BUDGET.calls})`, max('calls') <= BUDGET.calls, `max ${max('calls')}`);
check(`triangles within ${quality.toUpperCase()} budget (${BUDGET.tris / 1e3}k)`, max('tris') <= BUDGET.tris, `max ${(max('tris') / 1e3).toFixed(0)}k`);
check('40 traffic cars around the player', samples.every((x) => x.traffic === 40), `${samples[samples.length - 1].traffic}`);
check('live chunks bounded (<= 49)', max('chunks') <= 49, `max ${max('chunks')}`);
check('heap flat (end <= first + 40 MB)', !end.heap || end.heap <= first.heap + 40e6, `${(first.heap / 1e6).toFixed(0)} -> ${(end.heap / 1e6).toFixed(0)} MB`);
await page.locator('.rb-roam button', { hasText: 'Pause' }).click(); await page.locator('.rb-layer button', { hasText: /^Menu$/ }).click();
await page.waitForTimeout(1500);
check('Menu button: back to the main menu, city removed', await page.evaluate(() => window.__rbGame.state === 'MENU' && !window.__rbGame.d.engine.scene.getObjectByName('neon-harbor') && window.__rbGame.world.root.visible));
const [exitGeos, exitTex] = await page.evaluate(() => [window.__rbGame.d.engine.renderer.info.memory.geometries, window.__rbGame.d.engine.renderer.info.memory.textures]);
await page.locator('button', { hasText: 'Free Drive' }).click(); // a second visit: one-time caches are filled now, a leak would grow again
await page.waitForFunction(() => window.__rbGame?.state === 'FREEROAM', null, { timeout: 60000 });
await page.keyboard.down('KeyW'); await page.waitForTimeout(20000); await page.keyboard.press('KeyR'); await page.waitForTimeout(5000); await page.keyboard.up('KeyW');
await page.locator('.rb-roam button', { hasText: 'Pause' }).click(); await page.locator('.rb-layer button', { hasText: /^Menu$/ }).click();
await page.waitForTimeout(1500);
const [exit2, exitTex2] = await page.evaluate(() => [window.__rbGame.d.engine.renderer.info.memory.geometries, window.__rbGame.d.engine.renderer.info.memory.textures]);
check('no texture leak per visit (2nd exit within 1 of the 1st)', exitTex2 - exitTex <= 1, `${exitTex} -> ${exitTex2}`);
check('no geometry leak per visit (2nd exit within 5 of the 1st)', exit2 - exitGeos <= 5, `menu ${menuGeos}, after 1st visit ${exitGeos} (one-time caches), after 2nd ${exit2}`);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
