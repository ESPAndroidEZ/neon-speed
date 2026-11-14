import { defaultSave, parseSave, SaveStore, type KeyValueStore } from '../src/core/save.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const CARS = ['civic', '350z', 'supra'];
const base = defaultSave('civic', 0xe8e8ee);
const mem = (): KeyValueStore & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};

const kv = mem();
const a = new SaveStore(kv, base, CARS);
check('fresh save has starter and cash', a.data.owned.join() === 'civic' && a.data.cash === 2500, '');
check('cannot buy without funds', !a.buy('supra', 40000) && !a.owns('supra'), '');
check('buy 350Z needs 12000', !a.buy('350z', 12000), '');
a.recordRace(10000, 61.5, 'CLEAR');
check('race payout banked', a.data.cash === 12500 && a.data.races === 1, `${a.data.cash}`);
check('first lap is a record', a.data.bestLap.CLEAR === 61.5, '');
check('slower lap is not a record', !a.recordRace(0, 70, 'CLEAR') && a.data.bestLap.CLEAR === 61.5, '');
check('faster lap is a record', a.recordRace(0, 58.2, 'CLEAR') && a.data.bestLap.CLEAR === 58.2, '');
check('rain record is separate', a.data.bestLap.RAIN === null, '');
check('buy 350Z now works and charges', a.buy('350z', 12000) && a.data.cash === 500 && a.owns('350z'), `${a.data.cash}`);
check('cannot buy twice', !a.buy('350z', 12000) && a.data.cash === 500, '');
a.select('350z');
a.setPaint('350z', 0xff2a9d);

const b = new SaveStore(kv, base, CARS);
check('round trip restores everything', b.data.selected === '350z' && b.data.paint['350z'] === 0xff2a9d && b.data.bestLap.CLEAR === 58.2 && b.data.owned.length === 2 && b.data.cash === 500, '');

check('corrupt JSON -> defaults', parseSave('{not json', base, CARS).cash === 2500, '');
check('null -> defaults', parseSave(null, base, CARS).owned[0] === 'civic', '');
const evil = parseSave(JSON.stringify({ cash: -5, owned: ['hacked', 'supra'], selected: 'civic', settings: { volume: 9, quality: 'turbo' }, bestLap: { CLEAR: 'x', RAIN: 3 } }), base, CARS);
check('sanitises values', evil.cash === 0 && evil.owned.join() === 'supra' && evil.selected === 'supra' && evil.settings.volume === 1 && evil.settings.quality === 'high' && evil.bestLap.CLEAR === null && evil.bestLap.RAIN === null, JSON.stringify(evil.owned));
const broken: KeyValueStore = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
const c = new SaveStore(broken, base, CARS);
c.recordRace(100, 60, 'SNOW');
check('blocked storage does not throw', c.data.cash === 2600, '');
const d = new SaveStore(null, base, CARS);
check('no storage works', d.buy('350z', 12000) === false, '');
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
