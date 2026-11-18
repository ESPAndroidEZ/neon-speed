// Two-player online smoke test (needs `npm run dev` and internet for the PeerJS broker): A creates a room, B joins
// with the code, A starts the race for everyone; both must reach RACING on the same track, and each must see the
// other's car move. Usage: node scripts/online-check.mjs
import { chromium } from 'playwright';
const BASE = process.env.BASE ?? 'http://localhost:5173/';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const open = async (name) => {
  const ctx = await b.newContext({ viewport: { width: 960, height: 540 } });
  await ctx.addInitScript((n) => { try { localStorage.setItem('rb-controls', JSON.stringify({ chosen: true, tutorialSeen: true })); localStorage.setItem('ns-online-name', n); } catch {} }, name);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log(`[${name}] pageerror ${e.message}`));
  await p.goto(BASE + '?probe&screen=online', { waitUntil: 'load', timeout: 90000 });
  await p.waitForTimeout(2500);
  return p;
};
let fail = 0;
const check = (n, ok, info = '') => { if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  ${info}`); };
const A = await open('Alice'), B = await open('Bob');
await A.getByRole('button', { name: /Create room/i }).click();
await A.waitForFunction(() => /^[A-Z]{4}$/.test(document.querySelector('.rb-logo')?.textContent ?? ''), null, { timeout: 30000 });
const code = await A.locator('.rb-logo').textContent();
check('room created', /^[A-Z]{4}$/.test(code), code);
await B.locator('input.rb-input').nth(1).fill(code);
await B.getByRole('button', { name: /^Join$/ }).click();
await A.waitForFunction(() => document.body.innerText.includes('Bob'), null, { timeout: 30000 }).catch(() => {});
check('host sees the guest', (await A.innerText('body')).includes('Bob'));
check('guest sees the host', (await B.innerText('body')).includes('Alice'));
await A.getByRole('button', { name: /Start race for everyone/i }).click();
const st = (p) => p.evaluate(() => { const g = window.__rbGame; return { paused: g.paused, cd: +g.rm.countdown.toFixed(2), rt: +g.rm.raceTime.toFixed(2), state: g.state, phase: g.rm.phase, track: g.setup?.trackId, n: g.rm.racers.length, names: g.rm.racers.map((r) => r.name), x: g.rm.racers.map((r) => +r.car.state.position.x.toFixed(1)), z: g.rm.racers.map((r) => +r.car.state.position.z.toFixed(1)) }; });
await A.waitForTimeout(9000);
const a0 = await st(A), b0 = await st(B);
check('both racing, same track, 2 cars', a0.state === 'RACING' && b0.state === 'RACING' && a0.track === b0.track && a0.n === 2 && b0.n === 2, JSON.stringify([a0.phase, b0.phase, a0.cd, b0.cd, a0.paused, b0.paused, a0.names, b0.names]));
// both drive: hold throttle on both pages
for (const p of [A, B]) { await p.mouse.click(480, 270); await p.keyboard.down('ArrowUp'); }
for (const p of [A, B]) await p.waitForFunction(() => window.__rbGame.rm.raceTime > 4, null, { timeout: 120000, polling: 500 }).catch(() => {});
const s0a = await st(A), s0b = await st(B);
Object.assign(a0, s0a); Object.assign(b0, s0b);
for (const p of [A, B]) await p.waitForFunction((t) => window.__rbGame.rm.raceTime > t + 4, s0a.rt, { timeout: 120000, polling: 500 }).catch(() => {});
const [a1, b1] = await Promise.all([st(A), st(B)]);
const moved = (s0, s1, i) => Math.hypot(s1.x[i] - s0.x[i], s1.z[i] - s0.z[i]);
console.log(JSON.stringify({a1, b1}));
check('A sees B move', moved(a0, a1, 1) > 5, moved(a0, a1, 1).toFixed(1) + ' m');
check('B sees A move', moved(b0, b1, 1) > 5, moved(b0, b1, 1).toFixed(1) + ' m');
// the remote car on A's screen is where B says its own car is (within lag)
const gap = Math.hypot(a1.x[1] - b1.x[0], a1.z[1] - b1.z[0]);
check('remote car matches its owner (< 6 m apart)', gap < 6, gap.toFixed(1) + ' m');
console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
await b.close();
process.exit(fail ? 1 : 0);
