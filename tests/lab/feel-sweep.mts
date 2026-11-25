import { measure } from './feel.mts';
import { STREET_FEEL, streetTuning } from '../../src/physics/drivingStyle.ts';
/* Sweep Street multipliers: npx tsx tests/lab/feel-sweep.mts gripRear=1.1,powerSlide=1.05 ... (each arg = one variant). */
for (const arg of process.argv.slice(2)) {
  const f = STREET_FEEL as unknown as Record<string, number>, keep = { ...f };
  for (const kv of arg.split(',')) { const [k, v] = kv.split('='); f[k] = Number(v); }
  const rows = ['civic', '350z', 'rx7', 'm3', 'supra'].map((id) => measure(id, streetTuning));
  console.log(arg.padEnd(40), rows.map((r) => `${r.car} R60 ${r.r60.toFixed(0)} R100 ${r.r100.toFixed(0)}/${(r.slip100 * 57.3).toFixed(0)} pw ${(r.powerSlip * 57.3).toFixed(0)}`).join(' | '));
  Object.assign(f, keep);
}
