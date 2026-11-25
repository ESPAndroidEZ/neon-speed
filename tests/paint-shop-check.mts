import { defaultSave, parseSave, SaveStore, type KeyValueStore } from '../src/core/save.ts';
import { buyItem, GLOW_PRICE, ownsItem, VINYL_PRICE } from '../src/core/shopItems.ts';
import { defaultLoadout } from '../src/data/loadout.ts';

/* Paint shop items (Underground round, stage 4): underglow kit and vinyls bought once per car; old choices stay free. */
let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const CARS = ['civic', '350z', 'supra'];
const mem = (): KeyValueStore => { const m = new Map<string, string>(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; };
const kv = mem(), s = new SaveStore(kv, defaultSave('civic', 0xe8e8ee), CARS);
s.data.cash = 2000;

check('a new car has no underglow kit and no vinyls', !ownsItem(s, 'civic', 'glow') && !ownsItem(s, 'civic', 'vinyl:stripes'));
check('the kit is bought once and costs its price', buyItem(s, 'civic', 'glow') && s.data.cash === 2000 - GLOW_PRICE && ownsItem(s, 'civic', 'glow'));
check('a second buy is refused and costs nothing', !buyItem(s, 'civic', 'glow') && s.data.cash === 2000 - GLOW_PRICE);
s.data.cash = VINYL_PRICE - 1;
check('short of cash: refused, nothing taken', !buyItem(s, 'civic', 'vinyl:skyline') && s.data.cash === VINYL_PRICE - 1);
s.data.cash = 5000;
check('a car you do not own cannot get items', !buyItem(s, 'supra', 'glow') && s.data.cash === 5000);
check('vinyls are bought per design', buyItem(s, 'civic', 'vinyl:skyline') && ownsItem(s, 'civic', 'vinyl:skyline') && !ownsItem(s, 'civic', 'vinyl:stripes'));
check('nothing for "no vinyl"', !ownsItem(s, 'civic', 'vinyl:'));

// older saves: a chosen underglow colour and the vinyl already on the car count as owned
const old = new SaveStore(mem(), defaultSave('civic', 0xe8e8ee), CARS);
old.data.glow.civic = 0xff2a9d;
old.data.loadouts.civic = { ...defaultLoadout(), vinyl: { ...defaultLoadout().vinyl, kind: 'tiger' } };
check('an older chosen underglow stays (free)', ownsItem(old, 'civic', 'glow'));
check('the vinyl already on the car stays (free)', ownsItem(old, 'civic', 'vinyl:tiger') && !ownsItem(old, 'civic', 'vinyl:wave'));

// save round trip and junk
const back = parseSave(JSON.stringify(s.data), defaultSave('civic', 0xe8e8ee), CARS);
check('bought items survive the save', back.bought?.civic?.join() === 'glow,vinyl:skyline');
const junk = parseSave(JSON.stringify({ ...s.data, bought: { civic: ['glow', 7, null, 'x'.repeat(80)], ghost: ['glow'] } }), defaultSave('civic', 0xe8e8ee), CARS);
check('junk in bought is dropped (unknown cars, non-strings, long keys)', junk.bought?.civic?.join() === 'glow' && !junk.bought?.ghost);
const none = parseSave(JSON.stringify({ ...s.data, bought: undefined }), defaultSave('civic', 0xe8e8ee), CARS);
check('a save without the field loads (nothing bought)', none.bought === undefined);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
