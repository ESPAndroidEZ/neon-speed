// Daily challenge: deterministic per day, valid map/weather, never the same map two days running, covers everything over a year.
import { dailyChallenge, dayNumber } from '../src/data/dailyChallenge.ts';
import { findTrackDef, TRACKS } from '../src/data/tracks/index.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`);
};
const START = 20400;
const days = Array.from({ length: 365 }, (_, i) => dailyChallenge(START + i));
check('same day gives the same challenge', JSON.stringify(dailyChallenge(START)) === JSON.stringify(dailyChallenge(START)));
check('every challenge uses a real map and weather', days.every((c) => TRACKS.some((t) => t.id === c.trackId) && ['CLEAR', 'RAIN', 'SNOW'].includes(c.weather)));
check('never the same map two days running', days.every((c, i) => i === 0 || c.trackId !== days[i - 1].trackId));
check('rivals only on circuits, 3 or 5', days.every((c) => (findTrackDef(c.trackId).type === 'circuit' ? c.rivals === 3 || c.rivals === 5 : c.rivals === 0)));
check('a year visits every map', new Set(days.map((c) => c.trackId)).size === TRACKS.length);
check('a year has all three weathers', new Set(days.map((c) => c.weather)).size === 3);
const rain = days.filter((c) => c.weather === 'RAIN').length;
check('weather mix is sane', rain > 60 && rain < 200 && days.filter((c) => c.weather === 'SNOW').length > 30, `rain ${rain}`);
check('dayNumber follows the local date', dayNumber(new Date(2026, 10, 16, 0, 5)) === dayNumber(new Date(2026, 10, 16, 23, 55)) && dayNumber(new Date(2026, 10, 17, 0, 5)) === dayNumber(new Date(2026, 10, 16, 12)) + 1);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
