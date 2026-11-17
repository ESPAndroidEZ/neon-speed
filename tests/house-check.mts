// @ts-nocheck
import { HOUSE_STEP_S, HOUSE_STEPS, houseBass, houseChord, houseDrums, houseLayers, housePluck, houseStab, swingOffset } from '../src/audio/housePatterns.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  ${i}`); };
check('tempo is house (118-126 BPM)', Math.abs(60 / (HOUSE_STEP_S * 4) - 122) < 4);
const bar = HOUSE_STEPS * 4;
check('pattern repeats every 4 bars', [0, 3, 10, 17, 33, 50].every((s) => JSON.stringify(houseBass(s)) === JSON.stringify(houseBass(s + bar)) && houseStab(s) === houseStab(s + bar)));
check('four on the floor', [0, 4, 8, 12].every((p) => houseDrums(p).kick) && [1, 2, 3, 5, 6, 7].every((p) => !houseDrums(p).kick));
check('bass never on the kick', Array.from({ length: bar }, (_, s) => s).every((s) => !(houseDrums(s).kick && houseBass(s))));
check('clap on 2 and 4', houseDrums(4).clap && houseDrums(12).clap && !houseDrums(0).clap);
check('swing only on odd 16ths', swingOffset(0) === 0 && swingOffset(1) > 0 && swingOffset(1) < HOUSE_STEP_S * 0.3);
const all = Array.from({ length: bar }, (_, s) => [houseBass(s)?.[0], housePluck(s), ...houseChord(s)]).flat().filter((n) => n != null);
check('notes in audible range', all.every((n) => n >= 24 && n <= 96), `${Math.min(...all)}..${Math.max(...all)}`);
let mono = true, prev = houseLayers(0);
for (let i = 1; i <= 100; i++) {
  const l = houseLayers(i / 100);
  for (const k of ['clap', 'shaker', 'hats', 'pluck']) if (prev[k] && !l[k]) mono = false;
  if (l.cutoff < prev.cutoff) mono = false;
  prev = l;
}
check('layers only get added as intensity rises', mono && !houseLayers(0).clap && houseLayers(1).pluck);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
