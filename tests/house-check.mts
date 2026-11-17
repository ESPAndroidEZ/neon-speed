// @ts-nocheck
import { HOUSE_STEPS, houseBass, houseChord, houseDrums, houseLayers, housePluck, houseSection, houseStab, SONG_BARS, swingOffset, stepSeconds } from '../src/audio/housePatterns.ts';
import { HOUSE_SONGS } from '../src/audio/houseSongs.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  ${i}`); };
const bar4 = HOUSE_STEPS * 4, song = SONG_BARS * HOUSE_STEPS;
check('at least 5 songs, unique names', HOUSE_SONGS.length >= 5 && new Set(HOUSE_SONGS.map((s) => s.name)).size === HOUSE_SONGS.length);
for (const S of HOUSE_SONGS) {
  const steps = Array.from({ length: bar4 }, (_, s) => s + 2 * HOUSE_STEPS * 4); // inside the full section
  check(`${S.name}: house tempo`, S.bpm >= 116 && S.bpm <= 126, `${S.bpm}`);
  check(`${S.name}: 4 bars, 4-note voicings, 32-step pluck`, S.prog.length === 4 && S.prog.every((c) => c.voicing.length === 4) && S.pluck.length === 32);
  check(`${S.name}: bass never on the kick`, steps.every((s) => !(houseDrums(s).kick && houseBass(S, s))));
  check(`${S.name}: has bass, stabs and pluck`, steps.some((s) => houseBass(S, s)) && steps.some((s) => houseStab(S, s)) && steps.some((s) => housePluck(S, s) !== null));
  const notes = steps.flatMap((s) => [houseBass(S, s)?.[0], housePluck(S, s), ...houseChord(S, s)]).filter((n) => n != null);
  check(`${S.name}: notes in range`, notes.every((n) => n >= 24 && n <= 96), `${Math.min(...notes)}..${Math.max(...notes)}`);
  check(`${S.name}: swing only on odd 16ths`, swingOffset(S, 0) === 0 && swingOffset(S, 1) > 0 && swingOffset(S, 1) < stepSeconds(S) * 0.3);
  check(`${S.name}: lasts 1-2 minutes`, song * stepSeconds(S) > 60 && song * stepSeconds(S) < 120, `${(song * stepSeconds(S)).toFixed(0)} s`);
}
const full = 4 * HOUSE_STEPS;
check('four on the floor in the full section', [0, 4, 8, 12].every((p) => houseDrums(full + p).kick) && [1, 2, 3, 5].every((p) => !houseDrums(full + p).kick));
check('clap on 2 and 4', houseDrums(full + 4).clap && houseDrums(full + 12).clap && !houseDrums(full).clap);
check('intro and breakdown drop the kick', !houseDrums(0).kick && houseSection(0) === 'intro' && houseSection(25 * HOUSE_STEPS) === 'break' && !houseDrums(25 * HOUSE_STEPS).kick);
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
