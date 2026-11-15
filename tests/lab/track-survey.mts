// Track difficulty survey: clean bot vs clumsy bot on every track (Civic, CLEAR, 3 laps). Lap time, wall hits, spins.
import { TRACKS } from '../../src/data/tracks/index.ts';
import { runLaps } from './laps.mts';
const car = process.argv[2] ?? 'civic';
console.log(`track       bot     lap s   hits  spins  stuck   (${car})`);
for (const t of TRACKS) for (const bot of ['clean', 'clumsy'] as const) {
  const s = runLaps({ car, track: t.id, weather: 'CLEAR', bot, laps: 3 });
  console.log(`${t.id.padEnd(11)} ${bot.padEnd(7)} ${s.lapMean.toFixed(1).padStart(6)} ${String(s.hits).padStart(5)} ${String(s.spins).padStart(6)} ${String(s.stuck).padStart(6)}`);
}
