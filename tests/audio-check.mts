// @ts-nocheck
import { EngineDsp } from '../src/audio/engineDsp.ts';
import { GROOVES, makeSong, midiToHz, MOODS, newEvents, PROGRESSIONS, SONG_BARS, STEPS_PER_BAR, stepEvents } from '../src/audio/musicPatterns.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const engineHz = (rpm: number): number => EngineDsp.firingHz(rpm, 3);
check('A4 = 440 Hz', Math.abs(midiToHz(69) - 440) < 1e-9, '');
check('engine pitch rises with rpm', engineHz(1000) < engineHz(7500) && engineHz(1000) > 30 && engineHz(7500) < 500, `${engineHz(1000)} .. ${engineHz(7500)} Hz`);

// Render a whole song as a list of event snapshots.
const render = (seed: number, mood: string, intensity: number, bars = SONG_BARS) => {
  const ev = newEvents(), song = makeSong(seed), out: string[] = [];
  let bad = 0, notes = 0, kicks = 0, beatKicks = 0, maxVel = 0;
  const secs = new Set<number>();
  for (let s = 0; s < bars * STEPS_PER_BAR; s++) {
    stepEvents(song, mood, intensity, s, ev);
    out.push([ev.kick, ev.clap, ev.hat, ev.open, ev.bass, ev.stab, ev.arp, ev.lead, ev.pad].join(','));
    secs.add(ev.sec);
    for (const v of [ev.kick, ev.clap, ev.hat, ev.open, ev.stab, ev.pad]) { if (!(v >= 0 && v <= 1)) bad++; maxVel = Math.max(maxVel, v); }
    for (const n of [ev.bass, ev.arp, ev.lead, ...ev.chord]) {
      if (n < 0 && n !== -1) bad++;
      if (n >= 0) { notes++; if (n < 20 || n > 100 || !Number.isFinite(midiToHz(n))) bad++; }
    }
    if (ev.kick > 0) { kicks++; if (s % 4 === 0) beatKicks++; }
  }
  return { out: out.join('|'), bad, notes, kicks, beatKicks, maxVel, secs: secs.size, song };
};

const a = render(5, 'race', 1), b = render(5, 'race', 1), c = render(6, 'race', 1);
check('same seed gives the same song', a.out === b.out, '');
check('different seeds give different songs', a.out !== c.out, '');
check('no NaN, velocities 0..1, notes in range', a.bad === 0 && a.maxVel <= 1 && a.notes > 500, `${a.notes} notes`);
check('race: kick is four-on-the-floor in the drops', a.beatKicks > 0 && a.kicks === a.beatKicks, `${a.kicks} kicks, ${a.beatKicks} on beats`);
check('song has intro, build, drop, break, outro', a.secs === 5, `${a.secs} sections over ${SONG_BARS} bars`);
check('tempo 118..126 BPM', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].every((s) => { const bp = makeSong(s).bpm; return bp >= 118 && bp <= 126; }), '');
const progs = new Set(), grooves = new Set(), keys = new Set();
for (let s = 1; s <= 60; s++) { const so = makeSong(s); progs.add(so.prog); grooves.add(so.groove); keys.add(so.keyPc); }
check('pool: >=6 progressions, >=4 grooves, several keys', PROGRESSIONS.length >= 6 && GROOVES.length >= 4 && progs.size >= 6 && grooves.size >= 4 && keys.size >= 4, `${progs.size}/${grooves.size}/${keys.size} used`);
check('intensity adds layers in the drop', render(5, 'race', 0, 24).out !== render(5, 'race', 1, 24).out, '');
const menu = render(5, 'menu', 0.5), garage = render(5, 'garage', 0.5), story = render(5, 'story', 0.5);
check('moods differ', new Set([menu.out, garage.out, story.out, a.out]).size === 4, '');
check('menu has no drop crash / no clap-heavy build', menu.kicks <= a.kicks, `${menu.kicks} vs ${a.kicks} kicks`);
let levelsOk = true;
for (const m of Object.values(MOODS)) if (!(m.level > 0 && m.level <= 1 && m.cutoff > 200 && m.wet >= 0 && m.wet <= 1)) levelsOk = false;
check('mood levels sane (music bus gain <= 1)', levelsOk, '');
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
