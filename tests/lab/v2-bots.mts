import { CARS } from '../../src/data/cars.ts';
import { DRIVING, HANDLING, type StabilityLevel } from '../../src/physics/assists.ts';
import { runLaps, WEATHERS } from './laps.mts';
/* v2 keyboard-bot stability per car (args: [ids] [stability]). Same tracks and weathers as tests/handling-bots-check. */
HANDLING.model = 'v2';
DRIVING.stability = (process.argv[3] as StabilityLevel) ?? 'LIGHT';
const ids = process.argv[2] ? process.argv[2].split(',') : CARS.map((c) => c.id);
export const TRACKS3 = ['kestrel', 'neon', 'cliff'];
for (const id of ids) {
  let spins = 0, laps = 0, stuck = 0;
  const per: string[] = [];
  for (const track of TRACKS3) for (const weather of WEATHERS) {
    const r = runLaps({ car: id, track, weather, bot: 'keyboard', laps: 2 });
    spins += r.spins; laps += r.laps; stuck += r.stuck;
    per.push(`${track[0]}${weather[0]}:${r.spins}/${r.laps}${r.stuck ? 'S' + r.stuck : ''} ${r.lapMean.toFixed(0)}s`);
  }
  console.log(`${id.padEnd(6)} spins ${spins} stuck ${stuck} laps ${laps} | ${per.join(' ')}`);
}
