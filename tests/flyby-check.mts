import { createFlybyShots, createIntroShots } from '../src/camera/shots.ts';
import { defaultSave } from '../src/core/save.ts';
import { parseSave } from '../src/core/saveParse.ts';
import { CARS } from '../src/data/cars.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`); };
const fly = createFlybyShots(), intro = createIntroShots();
const total = fly.reduce((a, s) => a + s.duration, 0);
check('the fly-by is two takes and short (3-4 s)', fly.length === 2 && total >= 3 && total <= 4, `${total.toFixed(1)} s`);
check('it reuses the intro takes without changing them', intro.length === 4 && intro[0].duration > 1.7 && fly[0].name === intro[0].name && fly[1].name === intro[3].name);
const base = defaultSave('civic', 0xffffff), cars = CARS.map((c) => c.id);
check('the race intro is on by default and can be switched off', base.settings.raceIntro === true && parseSave(JSON.stringify({ ...base, settings: { ...base.settings, raceIntro: false } }), base, cars).settings.raceIntro === false && parseSave('{}', base, cars).settings.raceIntro === true);
console.log(failed ? `FAILED ${failed}` : 'ALL PASS');
process.exit(failed ? 1 : 0);
