/**
 * Pure note logic for the procedural house music (no Web Audio), so it is deterministic per seed and unit tested.
 * A Song (tempo, key, progression, groove, motif) comes from a seed; `stepEvents` says what happens on one 16th step
 * for a given mood and intensity. audio/music turns those events into sound.
 */
export const STEPS_PER_BAR = 16;
export const SONG_BARS = 64;

export const midiToHz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** Small seeded generator (mulberry32): same seed, same song, on every machine. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Chord qualities as semitone stacks: minor 7, major 7, dominant 7. */
const QUAL: readonly (readonly number[])[] = [[0, 3, 7, 10], [0, 4, 7, 11], [0, 4, 7, 10]];
/** Seven progressions of four chords (one bar each): [root semitones above the key, quality]. */
export const PROGRESSIONS: readonly (readonly (readonly [number, number])[])[] = [
  [[0, 0], [8, 1], [3, 1], [10, 2]], [[0, 0], [5, 0], [10, 2], [3, 1]], [[0, 0], [7, 0], [8, 1], [5, 0]],
  [[8, 1], [10, 2], [0, 0], [0, 0]], [[0, 0], [3, 1], [5, 0], [10, 2]], [[0, 0], [10, 2], [8, 1], [10, 2]],
  [[0, 0], [5, 0], [0, 0], [7, 0]],
];
/** Four grooves. Characters are velocities 0-9, '-' = off. Bass: a note on every non-'-' step. */
export interface Groove { kick: string; clap: string; hat: string; open: string; bass: string; swing: number }
export const GROOVES: readonly Groove[] = [
  { kick: '9---9---9---9---', clap: '----9-------9---', hat: '3-5-3-5-3-5-3-6-', open: '--7---7---7---7-', bass: '--9---9---9---9-', swing: 0.04 },
  { kick: '9---9---9---9---', clap: '----9-------9---', hat: '4545454545454547', open: '--6---6---6---6-', bass: '-77-77-77-77-77-', swing: 0.06 },
  { kick: '9---9---9---9---', clap: '----8-------8--4', hat: '5-3-5-3-5-3-5-3-', open: '--6---6---6---7-', bass: '9--7--9-9--7--9-', swing: 0.13 },
  { kick: '9---9---9-4-9---', clap: '----9-------9-4-', hat: '3-4-3-4-3-4-3-5-', open: '--5---5---5---5-', bass: '9-7--8-7--9-7---', swing: 0.09 },
];
const STAB_PATS = ['--9---7---9---7-', '9--7--9-9--7----', '--8--8--8--8----', '9-------7---9---'];
const ARP_PATS = ['5353535353535357', '4-3-4-3-4-3-4-3-', '6-4-6-4-5-4-6-4-', '3-5-3-7-3-5-3-7-'];
/** Pentatonic degrees (semitones) the lead draws from. */
const PENTA = [0, 3, 5, 7, 10, 12, 15];

export interface Song {
  seed: number; bpm: number; keyPc: number; bassRoot: number; prog: number; groove: number; stabVar: number; arpVar: number;
  swing: number; secPerStep: number; motif: Int8Array;
}

export function makeSong(seed: number): Song {
  const r = rng(seed * 7919 + 13);
  const keyPc = [9, 0, 2, 5, 7, 10, 4][Math.floor(r() * 7)];
  let off = (keyPc + 12 - 9) % 12;
  if (off > 6) off -= 12;
  const groove = Math.floor(r() * GROOVES.length);
  const bpm = 118 + Math.floor(r() * 5) * 2; // 118..126
  const motif = new Int8Array(16).fill(-1);
  let at = Math.floor(r() * 3), deg = 2;
  while (at < 16) { deg = Math.max(0, Math.min(PENTA.length - 1, deg + Math.floor(r() * 5) - 2)); motif[at] = PENTA[deg]; at += 2 + Math.floor(r() * 3) * 2; }
  return {
    seed, bpm, keyPc, bassRoot: 33 + off, prog: Math.floor(r() * PROGRESSIONS.length), groove, stabVar: Math.floor(r() * STAB_PATS.length),
    arpVar: Math.floor(r() * ARP_PATS.length), swing: GROOVES[groove].swing, secPerStep: 60 / bpm / 4, motif,
  };
}

/** Layer bits. */
export const K = 1, HAT = 2, OH = 4, CL = 8, BS = 16, ST = 32, AR = 64, LD = 128, PD = 256;
export type SectionId = 0 | 1 | 2 | 3 | 4; // intro, build, drop, break, outro
const SECTION_AT = (bar: number): SectionId => (bar < 8 ? 0 : bar < 16 ? 1 : bar < 32 ? 2 : bar < 40 ? 3 : bar < 56 ? 2 : 4);
const FULL = K | HAT | OH | CL | BS | ST | AR | LD;

export type MoodId = 'menu' | 'race' | 'rain' | 'snow' | 'garage' | 'story';
export interface Mood { mask: number; cutoff: number; wet: number; level: number; half: boolean; gate: boolean }
/** gate: layers also wait for race intensity. cutoff: lowpass Hz at full intensity. wet: reverb send. */
export const MOODS: Record<MoodId, Mood> = {
  menu: { mask: K | HAT | OH | BS | ST | AR | PD, cutoff: 1800, wet: 0.35, level: 0.8, half: false, gate: false },
  race: { mask: FULL, cutoff: 9000, wet: 0.22, level: 1, half: false, gate: true },
  rain: { mask: FULL & ~LD | PD, cutoff: 3600, wet: 0.5, level: 0.95, half: false, gate: true },
  snow: { mask: FULL & ~LD | PD, cutoff: 2600, wet: 0.6, level: 0.9, half: false, gate: true },
  garage: { mask: K | HAT | CL | BS | ST | PD, cutoff: 1500, wet: 0.3, level: 0.8, half: true, gate: false },
  story: { mask: ST | AR | PD, cutoff: 2400, wet: 0.65, level: 0.7, half: false, gate: false },
};

/** Intensity needed (race and weather moods) before a layer joins in a drop. */
const GATE: readonly (readonly [number, number])[] = [[OH, 0.15], [CL, 0.25], [ST, 0.35], [AR, 0.5], [LD, 0.7]];

/** Layers wanted by the song structure alone. */
function sectionMask(sec: SectionId, inBar: number): number {
  if (sec === 0) return K | HAT | (inBar >= 4 ? OH : 0);
  if (sec === 1) return K | HAT | OH | CL | ST | AR | (inBar >= 4 ? BS : 0);
  if (sec === 2) return FULL;
  if (sec === 3) return PD | ST | AR | LD;
  return K | HAT | OH | (inBar < 4 ? BS : 0);
}

export interface StepEvents {
  step: number; bar: number; sec: SectionId; mask: number;
  kick: number; clap: number; hat: number; open: number;
  bass: number; bassLen: number; stab: number; arp: number; lead: number; pad: number;
  riser: number; crash: number; chord: Int16Array;
}
export const newEvents = (): StepEvents => ({ step: 0, bar: 0, sec: 0, mask: 0, kick: 0, clap: 0, hat: 0, open: 0, bass: -1, bassLen: 1, stab: 0, arp: -1, lead: -1, pad: 0, riser: 0, crash: 0, chord: new Int16Array(4) });

const vel = (s: string, i: number): number => { const c = s.charCodeAt(i); return c >= 48 && c <= 57 ? (c - 48) / 9 : 0; };

/** Active layers for a bar of the song, given mood and race intensity. */
export function activeMask(mood: MoodId, intensity: number, sec: SectionId, inBar: number): number {
  const m = MOODS[mood];
  if (mood === 'story') return m.mask; // sparse and constant: pad, a stab per bar, a quiet arp
  let mask = sectionMask(sec, inBar) & m.mask;
  if (m.gate && sec === 2) for (const [bit, need] of GATE) if (intensity < need) mask &= ~bit;
  if (!m.gate) mask |= m.mask & PD; // calm moods keep their pad under every section
  return mask;
}

/** Fill `ev` with what happens on absolute 16th step `step`. No allocation. */
export function stepEvents(song: Song, mood: MoodId, intensity: number, step: number, ev: StepEvents): StepEvents {
  const p = step % STEPS_PER_BAR, bar = Math.floor(step / STEPS_PER_BAR) % SONG_BARS;
  const sec = SECTION_AT(bar), inBar = sec === 0 ? bar : sec === 1 ? bar - 8 : sec === 3 ? bar - 32 : sec === 4 ? bar - 56 : (bar < 40 ? bar - 16 : bar - 40);
  const m = MOODS[mood], g = GROOVES[song.groove], mask = activeMask(mood, intensity, sec, inBar);
  const half = m.half;
  ev.step = step; ev.bar = bar; ev.sec = sec; ev.mask = mask;
  ev.kick = mask & K ? (half ? (p === 0 || p === 10 ? 1 : 0) : vel(g.kick, p)) : 0;
  ev.clap = mask & CL ? (half ? (p === 8 ? 0.9 : 0) : vel(g.clap, p)) : 0;
  ev.hat = mask & HAT ? vel(g.hat, half ? p & ~1 : p) : 0;
  ev.open = mask & OH ? (half ? 0 : vel(g.open, p)) : 0;
  const rootOff = PROGRESSIONS[song.prog][bar % 4], q = QUAL[rootOff[1]];
  ev.bass = -1; ev.bassLen = 1;
  if (mask & BS && (half ? p === 0 || p === 6 || p === 10 : vel(g.bass, p) > 0)) { ev.bass = song.bassRoot + rootOff[0] + (p % 8 === 6 ? 12 : 0); ev.bassLen = half ? 3 : 1.4; }
  const stabOn = mask & ST && (sec === 2 || (sec === 3 ? p === 0 || p === 8 : p === 0)) && (sec !== 2 || vel(STAB_PATS[song.stabVar], p) > 0 || mood === 'story');
  ev.stab = stabOn && (mood !== 'story' || p === 0) ? 1 : 0;
  for (let i = 0; i < 4; i++) { let n = song.bassRoot + 24 + rootOff[0] + q[i]; if (n > 74) n -= 12; ev.chord[i] = n; }
  ev.pad = mask & PD && p === 0 ? 1 : 0;
  ev.arp = -1;
  if (mask & AR && vel(ARP_PATS[song.arpVar], p) > 0) ev.arp = ev.chord[[0, 1, 2, 3, 2, 1, 3, 2][(p >> 1) & 7]] + 12;
  ev.lead = mask & LD && song.motif[p] >= 0 ? song.keyPc + 60 + song.motif[p] : -1;
  ev.riser = sec === 1 && inBar === 6 && p === 0 ? 1 : 0;
  ev.crash = sec === 2 && (bar === 16 || bar === 40) && p === 0 ? 1 : 0;
  return ev;
}
