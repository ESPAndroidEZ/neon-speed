import type { AudioBus } from './audioBus';

export type BeepKind = 'tick' | 'go';

/** Pure: which beep a banner change earns. A new digit ticks, GO! goes, anything else (or no change) is silent. */
export function beepFor(prev: string, cur: string): BeepKind | null {
  if (cur === prev) return null;
  if (cur === 'GO!') return 'go';
  return /^[1-9]$/.test(cur) ? 'tick' : null;
}

const SPEC: Record<BeepKind, { hz: number; dur: number; level: number }> = {
  tick: { hz: 440, dur: 0.16, level: 0.12 },
  go: { hz: 880, dur: 0.5, level: 0.16 },
};

/** Start-line beeps (3, 2, 1 low, GO high) from the centre banner text, on the sfx bus. Synthesised, no samples. */
export class CountdownBeeps {
  private last = '';
  private readonly bus: AudioBus;

  constructor(bus: AudioBus) {
    this.bus = bus;
  }

  update(banner: string): void {
    const kind = beepFor(this.last, banner);
    this.last = banner;
    if (kind) this.play(kind);
  }

  private play(kind: BeepKind): void {
    const ctx = this.bus.ctx;
    if (ctx.state !== 'running') return;
    const s = SPEC[kind], t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = s.hz;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(s.level, t0 + 0.006);
    g.gain.setValueAtTime(s.level, t0 + s.dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + s.dur);
    o.connect(f).connect(g).connect(this.bus.sfx);
    o.start(t0);
    o.stop(t0 + s.dur + 0.05);
  }
}
