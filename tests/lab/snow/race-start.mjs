// Real race start in the game (dev server): full throttle from GO, no steering; speed at 1..5 s of race time per weather.
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const w of ['clear', 'rain', 'snow']) {
  const ctx = await b.newContext({ viewport: { width: 640, height: 360 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('rb-controls', JSON.stringify({ chosen: true, tutorialSeen: true })); } catch {} });
  const p = await ctx.newPage();
  await p.goto(`http://localhost:5173/?skip&probe&w=${w}&car=${process.env.CAR ?? 'civic'}`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__rbGame?.rm.phase === 'RACING', null, { timeout: 120000, polling: 100 });
  await p.mouse.click(320, 180);
  await p.keyboard.down('ArrowUp');
  const out = [];
  for (const T of [1, 2, 3, 4, 5]) {
    await p.waitForFunction((T) => window.__rbGame.rm.raceTime >= T, T, { timeout: 120000, polling: 50 });
    out.push(await p.evaluate(() => { const g = window.__rbGame, c = g.player.car; return `${(c.u * 3.6).toFixed(0)}km/h(g${(g.weatherIntensity).toFixed(2)},lvl ${g.physicsLevel},surf ${c.surfaceGrip.toFixed(2)})`; }));
  }
  console.log(w.padEnd(6), out.join('  '));
  await ctx.close();
}
await b.close();
