// @ts-nocheck
import { arpNote, bassNote, chordTones, drumHit, layers, leadNote, midiToHz, STEPS_PER_BAR } from '../src/audio/musicPatterns.ts';
import { EngineDsp } from '../src/audio/engineDsp.ts';
const engineHz = (rpm: number): number => EngineDsp.firingHz(rpm, 1);

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
check('A4 = 440 Hz', Math.abs(midiToHz(69) - 440) < 1e-9, '');
check('engine pitch rises with rpm', engineHz(1000) < engineHz(7500) && engineHz(1000) > 30 && engineHz(7500) < 500, `${engineHz(1000)} .. ${engineHz(7500)} Hz`);
check('pattern repeats every 4 bars', [0, 5, 17, 33, 50].every((s) => bassNote(s) === bassNote(s + STEPS_PER_BAR * 4) && arpNote(s) === arpNote(s + STEPS_PER_BAR * 4) && leadNote(s) === leadNote(s + STEPS_PER_BAR * 4)), '');
let notes = 0;
let sane = true;
for (let s = 0; s < 64; s++) {
  for (const n of [bassNote(s), leadNote(s), arpNote(s)]) {
    if (n === null) continue;
    notes++;
    if (n < 20 || n > 110) sane = false;
  }
}
check('notes in audible range', sane && notes > 60, `${notes} notes`);
check('chord changes each bar', chordTones(0)[0] !== chordTones(16)[0], '');
check('kick on every beat, snare on 2 and 4', drumHit(0).kick && drumHit(4).snare && drumHit(12).snare && !drumHit(8).snare, '');
const order = ['kick', 'hats', 'snare', 'arp', 'lead'] as const;
let monotone = true;
let prev = 0;
let prevCut = 0;
for (let i = 0; i <= 100; i++) {
  const l = layers(i / 100);
  const count = order.filter((k) => l[k]).length;
  if (count < prev || l.cutoff < prevCut) monotone = false;
  prev = count;
  prevCut = l.cutoff;
}
check('layers only get added as intensity rises', monotone && !layers(0).kick && layers(1).lead, '');
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
