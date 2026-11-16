import { addRace, newStats, parseStats } from '../src/game/driverStats.ts';
import type { RaceResult } from '../src/core/raceResult.ts';
let failed = 0;
const check = (n: string, ok: boolean, d = ''): void => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' - ' + d : ''}`); if (!ok) failed++; };
const res = (position: number, time: number | null, extra: Partial<RaceResult> = {}): RaceResult => ({
  position, racers: [{ name: 'You', position, time, isPlayer: true }, { name: 'Rival', position: 2, time: 99, isPlayer: false }],
  cash: 1000, totalTime: time ?? 0, bestLap: 30, driftScore: 400, ...extra,
});
const s = newStats();
addRace(s, res(1, 90, { lapTimes: [30, 30, 30] }));
check('win counts as win and podium', s.wins === 1 && s.podiums === 1 && s.races === 1);
check('laps, time, cash add up', s.laps === 3 && s.seconds === 90 && s.cash === 1000);
addRace(s, res(4, 100, { driftScore: 900 }));
check('4th place: no podium, drift best kept', s.podiums === 1 && s.bestDrift === 900 && s.laps === 4);
addRace(s, res(5, null));
check('DNF counted, adds nothing else', s.dnf === 1 && s.races === 3 && s.cash === 2000);
const p = parseStats('{"races":5,"wins":"x","cash":-3,"laps":2.5}');
check('junk fields load as 0', p.races === 5 && p.wins === 0 && p.cash === 0 && p.laps === 2.5);
check('null and garbage give an empty record', parseStats(null).races === 0 && parseStats('{{').races === 0 && parseStats('[]').wins === 0);
if (failed) process.exit(1);
