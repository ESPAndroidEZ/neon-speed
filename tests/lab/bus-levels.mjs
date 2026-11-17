// RMS of the engine bus and the music bus (after their gains) during a self-driving race. Needs `npm run dev`.
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
await p.goto('http://localhost:5173/?soak&skip&demo&ai=3', { waitUntil: 'load' });
await p.mouse.click(320, 180);
await p.waitForTimeout(5000);
const r = await p.evaluate(async () => {
  const bus = window.__rbBus;
  await bus.ctx.resume();
  const tap = (node) => { const a = bus.ctx.createAnalyser(); a.fftSize = 4096; node.connect(a); return a; };
  const taps = { engine: tap(bus.engine), music: tap(bus.music), sfx: tap(bus.sfx) };
  const sum = { engine: 0, music: 0, sfx: 0 }, buf = new Float32Array(4096);
  const N = 80;
  for (let i = 0; i < N; i++) {
    await new Promise((res) => setTimeout(res, 100));
    for (const k of Object.keys(taps)) { taps[k].getFloatTimeDomainData(buf); let sq = 0; for (const v of buf) sq += v * v; sum[k] += sq / buf.length; }
  }
  const db = (x) => (10 * Math.log10(x / N + 1e-12)).toFixed(1);
  return { engine: db(sum.engine), music: db(sum.music), sfx: db(sum.sfx), gains: { engine: bus.engine.gain.value, music: bus.music.gain.value } };
});
console.log(JSON.stringify(r));
await b.close();
