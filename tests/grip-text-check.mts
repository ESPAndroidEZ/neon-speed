// The grip percentages in the weather blurbs and the weather-physics hints (EN and ES) must match physics/weatherLevels.
// (Snow went 0.45 -> 0.63 on 2026-11-17 and the menus kept saying 45 %.)
import { gripFor, LEVELS } from '../src/physics/weatherLevels.ts';
import { EN_MENU } from '../src/i18n/enMenu.ts';
import { ES_MENU } from '../src/i18n/esMenu.ts';

let failed = 0;
const pc = (v: number): number => Math.round(v * 100);
for (const [lang, d] of [['en', EN_MENU], ['es', ES_MENU]] as const) {
  const dict = d as Record<string, string>;
  const nums = (k: string): number[] => (dict[k].match(/\d+/g) ?? []).map(Number);
  for (const [i, lv] of LEVELS.entries()) {
    const n = nums(`hint.wphys.${lv}`), want = [pc(gripFor('RAIN', lv)), pc(gripFor('SNOW', lv))];
    const ok = n[0] === want[0] && n[1] === want[1];
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${lang} hint.wphys.${lv}  text ${n.slice(0, 2).join('/')}  physics ${want.join('/')}${i ? '' : ''}`);
  }
  for (const w of ['RAIN', 'SNOW'] as const) {
    const n = nums(`weather.${w}.blurb`)[0], want = pc(gripFor(w, 'NORMAL')), ok = n === want;
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${lang} weather.${w}.blurb  text ${n}  physics ${want}`);
  }
}
if (failed) { console.log(`${failed} FAILED`); process.exit(1); }
console.log('ALL PASS');
