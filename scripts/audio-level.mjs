// Loudness check of the master bus (after the limiter) during a self-driving race with nitro: per 100 ms window the
// peak and RMS in dBFS. Fails on a SUSTAINED peak above -6 dBFS (more than 3 windows in a row). Needs the dev server.
// Usage: node scripts/audio-level.mjs
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
await p.goto('http://localhost:5173/?soak&skip&demo&ai=3', { waitUntil: 'load' });
await p.mouse.click(320, 180);
await p.waitForTimeout(4000);
const r = await p.evaluate(async () => {
  const bus = window.__rbBus;
  if (!bus) return { error: 'no __rbBus (needs ?soak)' };
  await bus.ctx.resume();
  const buf = new Float32Array(bus.meter.fftSize);
  const peaks = [], rmss = [];
  for (let i = 0; i < 120; i++) {
    await new Promise((res) => setTimeout(res, 100));
    bus.meter.getFloatTimeDomainData(buf);
    let pk = 0, sq = 0;
    for (const v of buf) { pk = Math.max(pk, Math.abs(v)); sq += v * v; }
    peaks.push(20 * Math.log10(Math.max(1e-9, pk)));
    rmss.push(20 * Math.log10(Math.max(1e-9, Math.sqrt(sq / buf.length))));
  }
  let run = 0, worstRun = 0;
  for (const pk of peaks) { run = pk > -6 ? run + 1 : 0; worstRun = Math.max(worstRun, run); }
  const sorted = [...peaks].sort((a, b) => a - b);
  return { state: bus.ctx.state, maxPeak: Math.max(...peaks), p95Peak: sorted[Math.floor(sorted.length * 0.95)], meanRms: rmss.reduce((a, b) => a + b, 0) / rmss.length, maxRms: Math.max(...rmss), worstRun };
});
await b.close();
if (r.error) { console.log('AUDIO LEVEL ERROR', r.error); process.exit(1); }
const f = (x) => x.toFixed(1);
console.log(`ctx ${r.state} | peak max ${f(r.maxPeak)} dBFS, p95 ${f(r.p95Peak)} | RMS mean ${f(r.meanRms)}, max ${f(r.maxRms)} dBFS | longest run above -6 dBFS: ${r.worstRun} x 100 ms`);
const ok = r.worstRun <= 3 && r.maxRms > -60;
console.log(ok ? 'AUDIO LEVEL OK' : 'AUDIO LEVEL FAILED');
process.exit(ok ? 0 : 1);
