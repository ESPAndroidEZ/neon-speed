import { runLaps } from './laps.mts';
import type { BotKind } from './bots.mts';
import type { Weather } from '../../src/types/game.ts';
/* npx tsx tests/lab/trace.mts <car> <track> <weather> <bot>: prints the 2.4 s before each spin (5 samples/s). */
const [car, track, weather, bot] = process.argv.slice(2);
const trace: string[] = [];
const r = runLaps({ car, track, weather: weather as Weather, bot: bot as BotKind, trace, laps: 2 });
console.log(JSON.stringify(r));
for (const l of trace.slice(0, Number(process.argv[6] ?? 6))) console.log(l + '\n');
