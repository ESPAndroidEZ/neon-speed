import { duelCash, duelFlag, duelLevel, duelsFor } from '../src/core/duels.ts';
import { defaultSave, SaveStore, type KeyValueStore } from '../src/core/save.ts';
import { CARS } from '../src/data/cars.ts';
import { RIVALS, findRival } from '../src/data/rivals.ts';
import { TRACKS } from '../src/data/tracks/index.ts';
import { freeFinish } from '../src/game/freeFinish.ts';
import type { RaceResult } from '../src/core/raceResult.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`); };
const mk = (): SaveStore => {
  const mem: Record<string, string> = {};
  const kv: KeyValueStore = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => void (mem[k] = v) };
  return new SaveStore(kv, defaultSave('civic', 0xffffff), CARS.map((x) => x.id));
};
const result = (position: number, n = 2): RaceResult => ({ position, racers: Array.from({ length: n }, () => ({})), cash: 100, bestLap: 60, driftScore: 0, totalTime: 120 } as unknown as RaceResult);

const duels = duelsFor(RIVALS);
check('one duel per rival, on a real map, with a real rival', duels.length === RIVALS.length && duels.every((d) => TRACKS.some((t) => t.id === d.trackId && t.type !== 'drift') && RIVALS.some((r) => r.id === d.rival)));
check('better drivers unlock later and pay more', [...RIVALS].sort((a, b) => a.skill - b.skill).every((r, i, l) => i === 0 || (duelLevel(r.skill) >= duelLevel(l[i - 1].skill) && duelCash(r.skill) >= duelCash(l[i - 1].skill))), duels.map((d) => d.level).join(','));
check('the rain specialist races in the rain, the first duel is the easiest', duels.find((d) => d.rival === 'jinx')?.weather === 'RAIN' && Math.min(...duels.map((d) => d.level)) === duels.find((d) => d.rival === 'pixel')?.level);
check('the first duel needs a low level so a new player can try it', Math.min(...duels.map((d) => d.level)) <= 4);

const s = mk();
const cash0 = s.data.cash;
const lose = result(2);
freeFinish(s, ['dante'], 'CLEAR', lose, true);
check('losing a duel gives nothing', !s.data.career.flags[duelFlag('dante')] && !s.owns('rx7') && !lose.note?.includes('Duel'));
const win = result(1);
freeFinish(s, ['pixel'], 'CLEAR', win, true);
const px = findRival('pixel');
check('winning for the first time pays and sets the flag', s.data.career.flags[duelFlag('pixel')] === true && s.data.cash >= cash0 + duelCash(px.skill), `${s.data.cash}`);
check('the rival car is only handed out when you do not have it (pixel drives a civic: you have one)', s.owns('civic') && s.data.owned.length === 1);
const lola = findRival('lola');
freeFinish(s, ['lola'], 'CLEAR', result(1), true);
check('a car you do not own comes in the rival paint', s.owns(lola.carId) && s.data.paint[lola.carId] === lola.color);
const cash1 = s.data.cash;
freeFinish(s, ['lola'], 'CLEAR', result(1), true);
check('a second win pays no prize again', s.data.cash === cash1 + 0 || s.data.cash - cash1 < duelCash(lola.skill), `${s.data.cash - cash1}`);
const cash2 = s.data.cash;
freeFinish(s, ['vex', 'jinx', 'tank'], 'CLEAR', result(1, 4), true);
const owned2 = s.data.owned.length;
check('a race against several rivals is not a duel', !s.data.career.flags[duelFlag('vex')] && !s.data.career.flags[duelFlag('jinx')] && s.data.owned.length === owned2 && s.data.cash - cash2 < duelCash(findRival('vex').skill));
const cash3 = s.data.cash, unpaid = result(1);
unpaid.cash = 0; // the caller zeroes the prize of a race that was already paid
freeFinish(s, ['nova'], 'CLEAR', unpaid, false);
check('an already paid race (reloaded save) gives no duel prize', !s.data.career.flags[duelFlag('nova')] && s.data.cash === cash3);
console.log(failed ? `FAILED ${failed}` : 'ALL PASS');
process.exit(failed ? 1 : 0);
