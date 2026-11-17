// 0-100 km/h and 0-60 km/h per car in CLEAR / RAIN / SNOW at the default weather level (full intensity), legacy model.
import { CarController } from '../../../src/physics/carController.ts';
import { applyTuning, createDefaultTuning } from '../../../src/physics/carTuning.ts';
import { applyBuild } from '../../../src/data/carBuild.ts';
import { CARS } from '../../../src/data/cars.ts';
import { fillEnv } from '../../../src/physics/weatherLevels.ts';
import { WEATHER } from '../../../src/physics/weather.ts';
import { createNeutralInput } from '../../../src/types/game.ts';
const D = 1 / 60, LEVEL = (process.env.LEVEL ?? 'AGGRESSIVE') as 'AGGRESSIVE';
const row: string[] = [];
for (const car of CARS) {
  const out: string[] = [];
  for (const w of ['CLEAR', 'RAIN', 'SNOW'] as const) {
    const env = fillEnv({ ...WEATHER[w] } as never, w, LEVEL);
    const tn = applyTuning(createDefaultTuning(), car.tuning); applyBuild(tn, car.id);
    const c = new CarController(tn); c.reset();
    const inp = createNeutralInput(); inp.throttle = 1;
    let t = 0, t60 = 0;
    while (c.u * 3.6 < 100 && t < 40) { c.step(D, inp, env); t += D; if (!t60 && c.u * 3.6 >= 60) t60 = t; }
    out.push(`${w} ${t60.toFixed(1)}/${t.toFixed(1)}`);
  }
  row.push(`${car.id.padEnd(6)} ${out.join('  ')}`);
}
console.log(`0-60 / 0-100 km/h (s), ${LEVEL}\n` + row.join('\n'));
