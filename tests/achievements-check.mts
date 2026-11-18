// Achievements (game/achievements): unlock once, sets count distinct wins, junk storage is safe, ids have strings.
import { ACHIEVEMENTS, evaluateRace, parseAch, type AchRace } from '../src/game/achievements.ts';
import { newStats } from '../src/game/driverStats.ts';
import { EN } from '../src/i18n/en.ts';
import { ES } from '../src/i18n/es.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const race = (pos: number, o: Partial<AchRace> = {}, done = true): AchRace => ({
  result: { position: pos, racers: [{ name: 'me', position: pos, time: done ? 90 : null, isPlayer: true }, { name: 'r', position: pos === 1 ? 2 : 1, time: 91, isPlayer: false }], cash: 100, totalTime: 90, bestLap: 30, driftScore: 0 } as AchRace['result'],
  weather: 'CLEAR', trackId: 'kestrel', carId: 'civic', near: 0, slip: 0, style: 0, bestCombo: 0, topKph: 180, ...o,
});
const s = parseAch(null), life = newStats();
check('a finish unlocks "finish" only', JSON.stringify(evaluateRace(s, race(3), life)) === '["finish"]');
check('a win unlocks "win" once', evaluateRace(s, race(1), life).includes('win') && !evaluateRace(s, race(1), life).includes('win'));
evaluateRace(s, race(1, { weather: 'RAIN', trackId: 'coast', carId: 'golf' }), life);
const f = evaluateRace(s, race(1, { weather: 'SNOW', trackId: 'mountain', carId: 'supra' }), life);
check('wins in 3 weathers and on 3 tracks', f.includes('weathers') && f.includes('tracks3') && f.includes('snow'), f.join(','));
check('a DNF never counts as a win', !evaluateRace(parseAch(null), race(1, {}, false), life).includes('win'));
const g = evaluateRace(parseAch(null), race(4, { near: 5, slip: 6, bestCombo: 5200, style: 21000, topKph: 251 }), life);
check('per-race skill badges', ['near5', 'tow5', 'combo5k', 'style20k', 'ton'].every((id) => g.includes(id)), g.join(','));
check('junk storage parses to empty', parseAch('{"got":[1,{"x":2}],"wonCars":"no"}').got.length === 0 && parseAch('nope').wonCars.length === 0);
const missing = ACHIEVEMENTS.flatMap((a) => [`ach.${a.id}`, `ach.${a.id}.d`]).filter((k) => !(k in EN) || !(k in ES));
check('every badge has EN and ES strings', missing.length === 0, missing.join(','));
if (failed) { console.log(`${failed} FAILED`); process.exit(1); }
console.log('ALL PASS');
