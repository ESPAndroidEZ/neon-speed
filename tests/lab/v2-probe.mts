import { IDS, accelTo, brake100, exitGain, skidpad, slalom, understeer } from './v2.mts';
import { measureCar } from '../../src/physics/carStats.ts';
import { CARS } from '../../src/data/cars.ts';
import { HANDLING } from '../../src/physics/assists.ts';
/* Print every v2 metric per car (`npx tsx tests/lab/v2-probe.mts [ids] [what]`). */
const ids = process.argv[2] ? process.argv[2].split(',') : IDS;
const what = process.argv[3] ?? 'all';
for (const id of ids) {
  const o: string[] = [id.padEnd(6)];
  const has = (k: string): boolean => what === 'all' || what.includes(k);
  if (has('sk')) o.push(`sk ${skidpad(id).toFixed(3)} rain ${skidpad(id, 'RAIN').toFixed(3)} snow ${skidpad(id, 'SNOW').toFixed(3)}`);
  if (has('acc')) { HANDLING.model = 'v2'; const m = measureCar(CARS.find((c) => c.id === id)!.tuning); o.push(`0-100 ${m.accel.toFixed(2)} top ${m.topKph.toFixed(0)} 0-200 ${accelTo(id, 200).toFixed(1)}`); }
  if (has('br')) { const d = brake100(id, 'CLEAR'); o.push(`brk ${d.toFixed(1)} rain x${(brake100(id, 'RAIN') / d).toFixed(2)} snow x${(brake100(id, 'SNOW') / d).toFixed(2)}`); }
  if (has('sl')) o.push(`slalom ${slalom(id).toFixed(1)}`);
  if (has('us')) { const u = understeer(id); o.push(`K ${u.cruise.toFixed(2)} pow ${u.power.toFixed(2)}`); }
  if (has('ex')) { const d = exitGain(id, 'CLEAR'), r = exitGain(id, 'RAIN'), s = exitGain(id, 'SNOW'); o.push(`exit ${d.gain.toFixed(1)}/${d.lat.toFixed(2)}g rain ${(r.lat / d.lat).toFixed(2)} snow ${(s.lat / d.lat).toFixed(2)}`); }
  console.log(o.join(' | '));
}
