import type { AudioBus } from './audioBus';

export type RaceCueKind = 'lap' | 'win' | 'finish';

/**
 * Pure: the cue earned by the player's lap count / finished flag changing between two frames.
 * A new lap chimes; crossing the final line plays the win or finish sting instead. A drop in laps is a new race: silent.
 */
export function raceCue(prevLaps: number, laps: number, wasFinished: boolean, finished: boolean, rank: number): RaceCueKind | null {
  if (finished && !wasFinished) return rank === 1 ? 'win' : 'finish';
  if (finished || laps <= prevLaps) return null;
  return 'lap';
}

/** Notes (MIDI) and spacing per cue: rising pair for a lap, major arpeggio for a win, two falling-then-settling notes otherwise. */
const NOTES: Record<RaceCueKind, readonly number[]> = { lap: [79, 84], win: [72, 76, 79, 84], finish: [76, 72] };

export function cueNotes(kind: RaceCueKind): readonly number[] {
  return NOTES[kind];
}

/** Lap chime and finish stings from simple sine/triangle pairs on the sfx bus. Synthesised, no samples. */
export function playRaceCue(bus: AudioBus, kind: RaceCueKind): void {
  const ctx = bus.ctx;
  if (ctx.state !== 'running') return;
  const notes = NOTES[kind], step = kind === 'win' ? 0.1 : 0.12, level = kind === 'lap' ? 0.07 : 0.11;
  for (let i = 0; i < notes.length; i++) {
    const t0 = ctx.currentTime + i * step;
    const o = ctx.createOscillator();
    o.type = kind === 'lap' ? 'sine' : 'triangle';
    o.frequency.value = 440 * Math.pow(2, (notes[i] - 69) / 12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(level, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (i === notes.length - 1 ? 0.7 : 0.25));
    o.connect(g).connect(bus.sfx);
    o.start(t0);
    o.stop(t0 + 0.75);
  }
}

/** Watches the player each frame and plays the matching cue. */
export class RaceCues {
  private laps = 0;
  private finished = false;
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
}
