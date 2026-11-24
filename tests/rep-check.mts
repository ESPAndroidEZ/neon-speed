import { carLevel, levelCash, MAX_REP_LEVEL, raceRep, repBar, repLevel, xpToReach } from '../src/core/rep.ts';
import { defaultSave, SaveStore, parseSave, type KeyValueStore } from '../src/core/save.ts';
import { CARS } from '../src/data/cars.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`); };
const mk = (mem: Record<string, string> = {}): SaveStore => {
  const kv: KeyValueStore = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => void (mem[k] = v) };
  return new SaveStore(kv, defaultSave('civic', 0xffffff), CARS.map((x) => x.id));
};

check('level 1 needs nothing and the steps grow', xpToReach(1) === 0 && xpToReach(2) === 60 && xpToReach(3) === 180 && xpToReach(5) === 600);
check('levels follow the thresholds exactly', repLevel(0) === 1 && repLevel(59) === 1 && repLevel(60) === 2 && repLevel(179) === 2 && repLevel(180) === 3 && repLevel(1e9) === MAX_REP_LEVEL);
const b = repBar(100);
check('the bar shows progress inside the level', b.level === 2 && b.into === 40 && b.need === 120 && Math.abs(b.frac - 1 / 3) < 1e-9 && repBar(1e9).frac === 1);
check('race REP: a win pays more than last place, story pays more than a free race', raceRep(1, 4, false) === 80 && raceRep(4, 4, false) === 35 && raceRep(1, 4, true) === 120 && raceRep(1, 1, false) === 80);
check('every car has a level, the starter needs none and the dearest needs the most', CARS.every((c) => carLevel(c.id) >= 1) && carLevel('civic') === 1 && carLevel('supra') === Math.max(...CARS.map((c) => carLevel(c.id))));
check('prices and levels rise together (a dearer car never needs a lower level)', [...CARS].sort((a, c) => a.price - c.price).every((c, i, l) => i === 0 || carLevel(c.id) >= carLevel(l[i - 1].id)), CARS.map((c) => `${c.id}:${c.price}:${carLevel(c.id)}`).join(' '));

const s = mk();
s.data.cash = 100000;
check('a new save has no REP and cannot buy a high level car even with the cash', (s.data.rep ?? 0) === 0 && !s.buy('supra', 1000) && !s.owns('supra'));
const r1 = s.addRep(70);
check('REP adds up, a level up pays cash once per level and is saved', r1.level === 2 && r1.up === 1 && s.data.rep === 70 && s.data.cash === 100000 + levelCash(2));
const r2 = s.addRep(5000);
check('several levels at once pay each level', r2.up === repLevel(5070) - 2 && r2.level === repLevel(5070));
check('once the level is reached the car can be bought', s.buy('golf', 100) && s.owns('golf'));
const copy = mk(Object.fromEntries([['racers-blood-save-v1', JSON.stringify(s.data)]]));
check('REP survives a save round trip, bad values are dropped', copy.data.rep === s.data.rep && parseSave(JSON.stringify({ ...s.data, rep: 'x' }), defaultSave('civic', 0xffffff), CARS.map((x) => x.id)).rep === undefined);
console.log(failed ? `FAILED ${failed}` : 'ALL PASS');
process.exit(failed ? 1 : 0);
