import { cityRaces } from '../../src/game/cityRaces.ts';
import { runLaps } from './laps.mts';
/* Drift points on the city drift runs (2 laps): keyboard and clumsy bots in a Civic, 350Z and Supra. npx tsx tests/lab/city-drift.mts */
for (const r of cityRaces().filter((e) => e.kind === 'drift')) {
  const pts = ['civic', '350z', 'supra'].flatMap((car) => (['keyboard', 'clumsy'] as const).map((bot) => runLaps({ car, track: r.id, weather: 'CLEAR', bot, laps: 2 }).driftPts));
  console.log(r.id.padEnd(22), Math.round(r.length), 'm target', r.def.driftTarget, 'bots', pts.map((p) => Math.round(p)).join(' '));
}
