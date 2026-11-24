// @ts-nocheck
// W4.1: the music changes by itself. Drives MusicDirector with the mock AudioContext for 32 unattended minutes (a whole shuffle bag)
// (Auto style): every song starts and plays notes, no song twice in a row, songs change every 80-110 s; also a 30 s pause
// (suspended context), a 2 s stalled frame (no burst of late notes), Next song, and the Synthwave-only style.
import { mockAudio } from './lab/mockAudio.mts';
const { ctx, bus, stats } = mockAudio();
const { MusicDirector } = await import('../src/audio/musicDirector.ts');
const { MUSIC_SOURCE } = await import('../src/audio/audioParams.ts');

let failed = 0;
const check = (n, ok, i = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  ${i}`); };
let seed = 3;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const starts = [];
let playTime = 0; // seconds of running (not suspended) context
MUSIC_SOURCE.style = 'auto';
MUSIC_SOURCE.onSong = (name) => starts.push({ name, t: playTime, osc: stats.osc });
const m = new MusicDirector(bus, rnd);
let maxBurst = 0;
const frames = (secs, dt = 1 / 60) => {
  for (let f = 0; f < secs / dt; f++) {
    if (ctx.state === 'running') { ctx.currentTime += dt; playTime += dt; }
    const before = stats.osc;
    m.update((f % 900) / 900);
    maxBurst = Math.max(maxBurst, stats.osc - before);
  }
};
frames(300);
ctx.state = 'suspended'; frames(30); ctx.state = 'running'; // pause / tab hidden: the platform suspends the context
frames(420);
frames(1200); // a full shuffle bag is 15 house songs and the synthwave track: about 25 minutes
const names = starts.map((s) => s.name);
console.log('  songs:', names.join(' > '));
check('6+ songs played unattended in 32 minutes', starts.length >= 7, `${starts.length} starts`);
check('never the same song twice in a row', names.every((n, i) => i === 0 || n !== names[i - 1]));
check('Auto plays house and synthwave', names.includes('Neon Grid') && names.some((n) => n !== 'Neon Grid'));
const gaps = starts.slice(1).map((s, i) => s.t - starts[i].t);
check('song to song 80-110 s (length minus the 2-bar overlap; pause does not count)', gaps.every((g) => g > 80 && g < 110), gaps.map((g) => g.toFixed(0)).join(' '));
const notes = starts.slice(0, -1).map((s, i) => starts[i + 1].osc - s.osc);
check('every song played notes', notes.every((n) => n > 500), `min ${Math.min(...notes)} oscillators`);
check('no frame starts a burst of notes', maxBurst < 40, `max ${maxBurst} per frame`);
// a stalled frame (2 s): late steps are skipped, not fired at once
const o = stats.osc; ctx.currentTime += 2; playTime += 2; m.update(0.5);
check('2 s stall: no burst of late notes', stats.osc - o < 40, `${stats.osc - o} oscillators`);
// Next song (manual extra)
const n0 = starts.length; MUSIC_SOURCE.skip++; frames(0.1);
check('Next song crossfades at once', starts.length === n0 + 1 && starts[n0].name !== starts[n0 - 1].name, starts[n0]?.name);
// Synthwave only: one track that plays on by itself
MUSIC_SOURCE.style = 'synth'; frames(0.1);
check('style Synthwave switches within a frame', MUSIC_SOURCE.song === 'Neon Grid');
const o2 = stats.osc, n1 = starts.length; frames(200); const o3 = stats.osc; frames(20);
check('Synthwave plays on past its 89 s round', stats.osc > o3 && o3 > o2 && starts.length === n1, `${starts.length - n1} restarts`);
MUSIC_SOURCE.style = 'house'; frames(0.1);
check('style Deep house leaves synthwave', MUSIC_SOURCE.song !== 'Neon Grid', MUSIC_SOURCE.song);
console.log(`  nodes created: ${stats.nodes}`);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
