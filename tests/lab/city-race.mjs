// W5.5 city races in the browser: stopping in a start ring in Free Drive offers the race, Enter starts it on the GPS
// loop's map, an AI drives the player car to the finish, the cash is banked once (claimRace), the best time is kept,
// nothing goes to the online lap boards, and "Back to Free Drive" returns to the ring without offering it again.
// Needs `npm run dev` and the Chromium libs (LD_LIBRARY_PATH, docs/skills.md).
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://localhost:5173';
let failed = 0;
const check = (n, ok, info = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${info ? `  (${info})` : ''}`); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let boardPosts = 0;
await page.route('**/api/scores.php*', (r) => { boardPosts++; r.fulfill({ status: 404, body: '' }); });
await page.route('**/api/storage.php*', (r) => r.fulfill({ json: { keys: {}, now: 1 } }));
await page.addInitScript(() => localStorage.setItem('rb-lang', 'en'));
await page.goto(`${BASE}/?probe&roam=1&lang=en`, { waitUntil: 'load', timeout: 90000 });
await page.waitForFunction(() => window.__rbGame?.state === 'FREEROAM', null, { timeout: 90000 });

// module URLs as the page loaded them (Vite adds ?t= to edited files: a bare import would be a second instance)
const mod = (part) => page.evaluate((p) => performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes(p)), part);
const urls = { setup: await mod('/src/game/freeDriveSetup.ts'), races: await mod('/src/game/cityRaces.ts'), tracks: await mod('/src/data/tracks/index.ts') };
const race = await page.evaluate(async (u) => { const r = (await import(u.races)).cityRaces().find((x) => x.district === 'downtown'); return { id: r.id, x: r.x, z: r.z, h: r.heading, name: r.def.name, length: r.length }; }, urls);
const all = await page.evaluate(async (u) => (await import(u.races)).cityRaces().map((r) => r.id), urls);
check('six city races in Free Drive', all.length === 6, all.join(', '));
const cash0 = await page.evaluate(() => JSON.parse(localStorage.getItem('racers-blood-save-v1') ?? '{}').cash ?? 0);

// roll in from 16 m outside (a teleport INTO the ring does not count: that is how a return from a race works)
await page.evaluate(async ([u, r]) => (await import(u.setup)).roamDev.lab.placeAt(r.x - Math.sin(r.h) * 16, r.z - Math.cos(r.h) * 16, r.h, 7), [urls, race]);
const offer = page.locator('.rb-city-offer');
await offer.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
if (process.env.SHOT) await page.screenshot({ path: 'logs/city-race-offer.png' });
const text = (await offer.textContent().catch(() => '')) ?? '';
check('stopping in the ring offers the race', (await offer.isVisible()) && text.includes(race.name) && /2 laps/.test(text), text);

await page.keyboard.press('Enter');
await page.waitForFunction((id) => window.__rbGame.state === 'RACING' && window.__rbGame.setup?.trackId === id, race.id, { timeout: 90000 }).catch(() => {});
const started = await page.evaluate(() => { const g = window.__rbGame; return { state: g.state, track: g.setup?.trackId, def: g.d.world.def.id, len: g.d.world.track.length, rivals: g.rm.racers.length - 1, roam: g.roam === null }; });
check('Enter starts the race on the city map', started.state === 'RACING' && started.def === race.id && Math.abs(started.len - race.length) < 1, JSON.stringify(started));
check('three rivals, Free Drive put away', started.rivals === 3 && !(await offer.isVisible()), `${started.rivals} rivals`);
if (process.env.SHOT) { await page.waitForTimeout(4000); await page.screenshot({ path: 'logs/city-race-start.png' }); }
const found = await page.evaluate(async (u) => (await import(u.tracks)).findTrackDef('city-hills').id, urls);
check('a city map is found by id (saves, restarts)', found === 'city-hills', found);

// an AI agent drives the player car (same AI as the rivals), the race is fast-forwarded to the end
await page.evaluate(async () => {
  const url = performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/data/rivals.ts'));
  const agent = (await import(url)).freeRaceField(1)[0].agent, g = window.__rbGame;
  g.d.input.sample = (out) => Object.assign(out, agent.decide(1 / 60, g.rm.player.car.state, g.rm.view));
});
for (let i = 0; i < 40; i++) {
  const st = await page.evaluate(() => { const g = window.__rbGame; if (g.state === 'RACING') g.fastForward(10); return g.state; });
  if (st !== 'RACING') break;
  await page.waitForTimeout(200);
}
if (process.env.SHOT) await page.screenshot({ path: 'logs/city-race-finish.png' });
console.log('after ff', await page.evaluate(() => { const g = window.__rbGame, p = g.rm.player; return JSON.stringify({ st: g.state, laps: p.lapTimes?.length, fin: p.finished, v: p.car.state.speed.toFixed(1), idx: p.contact.hit.index }); }));
const back = page.locator('button', { hasText: 'Back to Free Drive' });
await back.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
const res = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('racers-blood-save-v1') ?? '{}'); return { cash: s.cash ?? 0, best: s.trackBest ?? {}, paid: s.paid ?? [], pos: window.__rbGame.rm.player.position ?? null, q: localStorage.getItem('ns.lbq') }; });
const bestKey = Object.keys(res.best).find((k) => k.startsWith(race.id));
check('results offer Back to Free Drive', await back.isVisible());
check('cash banked once through claimRace', res.cash > cash0 && res.paid.length >= 1, `${cash0} -> ${res.cash}, paid ${res.paid.length}`);
check('the best time on this city map is kept', !!bestKey && res.best[bestKey] > 30, `${bestKey} = ${bestKey ? res.best[bestKey].toFixed(2) : '-'} s`);
check('nothing sent or queued for the online lap boards', boardPosts === 0 && !(res.q ?? '').includes('city-'), `${boardPosts} posts`);

await back.click();
await page.waitForFunction(() => window.__rbGame.state === 'FREEROAM', null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(1500);
const ret = await page.evaluate(() => { const g = window.__rbGame, p = g.rm.player.car.state.position; return { state: g.state, x: p.x, z: p.z }; });
const dist = Math.hypot(ret.x - race.x, ret.z - race.z);
check('back in Free Drive at the start ring', ret.state === 'FREEROAM' && dist < 40, `${ret.state}, ${dist.toFixed(1)} m from the ring`);
check('the offer waits until the car has left the ring', !(await offer.isVisible()));
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
