import type { AudioBus } from './audioBus';

export type RaceCueKind = 'lap' | 'win' | 'finish' | 'near' | 'slip' | 'clean';

/**
 * Pure: the cue earned by the player's lap count / finished flag changing between two frames.
 * A new lap chimes; crossing the final line plays the win or finish sting instead. A drop in laps is a new race: silent.
 */
export function raceCue(prevLaps: number, laps: number, wasFinished: boolean, finished: boolean, rank: number): RaceCueKind | null {
  if (finished && !wasFinished) return rank === 1 ? 'win' : 'finish';
  if (finished || laps <= prevLaps) return null;
  return 'lap';
}

/** Notes (MIDI) per cue: rising pair for a lap, major arpeggio for a win, falling pair otherwise; one short ping for a near miss or slipstream, a rising pair for a clean corner. */
const NOTES: Record<RaceCueKind, readonly number[]> = { lap: [79, 84], win: [72, 76, 79, 84], finish: [76, 72], near: [91], slip: [76], clean: [81, 86] };

export function cueNotes(kind: RaceCueKind): readonly number[] {
  return NOTES[kind];
}

/** Lap chime and finish stings from simple sine/triangle pairs on the sfx bus. Synthesised, no samples. */
export function playRaceCue(bus: AudioBus, kind: RaceCueKind): void {
  const ctx = bus.ctx;
  if (ctx.state !== 'running') return;
  const notes = NOTES[kind], step = kind === 'win' ? 0.1 : 0.12, level = kind === 'win' || kind === 'finish' ? 0.11 : 0.06;
  for (let i = 0; i < notes.length; i++) {
    const t0 = ctx.currentTime + i * step;
    const o = ctx.createOscillator();
    o.type = kind === 'lap' ? 'sine' : 'triangle';
    o.frequency.value = 440 * Math.pow(2, (notes[i] - 69) / 12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(level, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (kind === 'near' || kind === 'slip' ? 0.14 : i === notes.length - 1 ? 0.7 : 0.25));
    o.connect(g).connect(bus.sfx);
    o.start(t0);
    o.stop(t0 + 0.75);
  }
}

/** Pure: the cue for a reward kind from the race rewards (null for anything unknown). */
export function rewardCue(kind: string | null): RaceCueKind | null {
  if (kind === 'NEAR MISS') return 'near';
  if (kind === 'SLIPSTREAM') return 'slip';
  return kind ? 'clean' : null;
}

/** Watches the player each frame and plays the matching cue. */
export class RaceCues {
  private laps = 0;
  private finished = false;
  private seq = 0;
  private readonly bus: AudioBus;

  constructor(bus: AudioBus) {
    this.bus = bus;
  }

  update(laps: number, finished: boolean, rank: number): void {
    const kind = raceCue(this.laps, laps, this.finished, finished, rank);
    this.laps = laps;
    this.finished = finished;
    if (kind) playRaceCue(this.bus, kind);
  }

  /** Rewards: a ping each time the reward counter goes up (a drop is a new race). */
  reward(seq: number, kind: string | null): void {
    const up = seq > this.seq;
    this.seq = seq;
    const c = up ? rewardCue(kind) : null;
    if (c) playRaceCue(this.bus, c);
  }
}
