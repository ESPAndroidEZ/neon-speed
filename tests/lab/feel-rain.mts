import { CARS } from '../../src/data/cars.ts';
import { TRACKS } from '../../src/data/tracks/index.ts';
import { runLaps } from './laps.mts';
import { STREET_FEEL, streetTuning } from '../../src/physics/drivingStyle.ts';
/* Clumsy bot in RAIN, Classic vs Street variants (spins per lap, DNFs): npx tsx tests/lab/feel-rain.mts powerFloor=0.85 ... */
const f = STREET_FEEL as unknown as Record<string, number>;
const run = (label: string, mod?: typeof streetTuning): void => {
  let laps = 0, spins = 0, dnf = 0;
  for (const c of CARS) for (const tr of TRACKS) { const r = runLaps({ car: c.id, track: tr.id, weather: 'RAIN', bot: 'clumsy', mod }); laps += r.laps; spins += r.spins; if (r.laps < 4) dnf++; }
  console.log(label.padEnd(36), `spins/lap ${(spins / laps).toFixed(2)} dnf ${dnf}`);
};
run('classic');
for (const arg of ['', ...process.argv.slice(2)]) {
  const keep = { ...f };
  for (const kv of arg.split(',').filter(Boolean)) { const [k, v] = kv.split('='); f[k] = Number(v); }
  run('street ' + arg, streetTuning);
  Object.assign(f, keep);
}
