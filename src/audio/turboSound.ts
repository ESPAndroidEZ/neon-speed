import { AUDIO } from './audioParams';
import type { AudioBus } from './audioBus';

export type TurboKind = 'none' | 'single' | 'twin' | 'sequential';

/** Per-kind whistle character: base pitch multiplier and the level of a second, higher whistle. */
const KIND: Record<Exclude<TurboKind, 'none'>, { pitch: number; second: number }> = {
  single: { pitch: 1.0, second: 0 },
  twin: { pitch: 1.22, second: 0.55 },
  sequential: { pitch: 1.1, second: 0.35 },
};

/** Turbo spool whistle, blow-off valve, compressor flutter, gear clunk and backfire pops. All procedural. */
export class TurboSound {
  private readonly bus: AudioBus;
  private readonly w1: OscillatorNode;
  private readonly w2: OscillatorNode;
  private readonly g1: GainNode;
  private readonly g2: GainNode;
  private readonly hiss: GainNode;
  private readonly hissF: BiquadFilterNode;
  private kind: TurboKind = 'none';

  constructor(bus: AudioBus) {
    this.bus = bus;
    const ctx = bus.ctx;
    this.w1 = ctx.createOscillator();
    this.w2 = ctx.createOscillator();
    this.w1.type = 'sine';
    this.w2.type = 'sine';
    this.g1 = ctx.createGain();
    this.g2 = ctx.createGain();
    this.g1.gain.value = 0;
    this.g2.gain.value = 0;
    this.w1.connect(this.g1).connect(bus.sfx);
    this.w2.connect(this.g2).connect(bus.sfx);
    this.w1.start();
    this.w2.start();
    // breathy compressor noise riding on the whistle
    this.hissF = ctx.createBiquadFilter();
    this.hissF.type = 'bandpass';
    this.hissF.Q.value = 6;
    this.hiss = ctx.createGain();
    this.hiss.gain.value = 0;
    bus.loopNoise().connect(this.hissF).connect(this.hiss).connect(bus.sfx);
  }

  setKind(k: TurboKind): void {
    this.kind = k;
  }

  /** Call every frame. Whistle pitch and volume follow boost; louder than subtle on purpose. */
  update(boost: number, rpm: number, active: boolean): void {
    const t = this.bus.ctx.currentTime;
    const k = this.kind === 'none' ? null : KIND[this.kind];
    const on = active && k !== null && boost > 0.02;
    const f = (1300 + boost * 3600 + rpm * 0.14) * AUDIO.whistlePitch * (k?.pitch ?? 1);
    const level = on ? Math.pow(boost, 1.3) * 0.2 * AUDIO.turboVolume : 0;
    this.w1.frequency.setTargetAtTime(f, t, 0.04);
    this.w2.frequency.setTargetAtTime(f * 1.51, t, 0.04);
    this.g1.gain.setTargetAtTime(level, t, 0.05);
    this.g2.gain.setTargetAtTime(level * (k?.second ?? 0), t, 0.05);
    this.hissF.frequency.setTargetAtTime(f * 1.9, t, 0.05);
    this.hiss.gain.setTargetAtTime(on ? Math.pow(boost, 2) * 0.09 * AUDIO.turboVolume : 0, t, 0.06);
  }

  private noise(dur: number, build: (src: AudioBufferSourceNode, g: GainNode, t: number) => void, level: number, shape: 'decay' | 'flat' = 'decay'): void {
    const ctx = this.bus.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.bus.noise;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    if (shape === 'decay') g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    else g.gain.setValueAtTime(level, t + dur * 0.8);
    g.gain.linearRampToValueAtTime(0, t + dur);
    build(src, g, t);
    src.connect(g);
    g.connect(this.bus.sfx);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  /** Blow-off valve "pssh": loudness from the boost that was built up, length from AUDIO.bovLength. */
  bov(strength: number): void {
    const s = Math.min(1, Math.max(0.15, strength));
    const dur = (0.22 + 0.4 * s) * AUDIO.bovLength;
    this.noise(dur, (src, g) => {
      const hp = this.bus.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1500;
      const bp = this.bus.ctx.createBiquadFilter();
      bp.type = 'peaking';
      bp.frequency.value = 3200;
      bp.gain.value = 9;
      src.connect(hp).connect(bp);
      bp.connect(g);
      void g;
    }, 0.55 * s * AUDIO.turboVolume);
    // the characteristic "tsss" chirp of the valve closing
    const ctx = this.bus.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(2600, t);
    o.frequency.exponentialRampToValueAtTime(900, t + dur * 0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12 * s * AUDIO.turboVolume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.8);
    o.connect(g).connect(this.bus.sfx);
    o.start(t);
    o.stop(t + dur);
  }

  /** Compressor surge flutter on a partial lift: rapid chattering. */
  flutter(strength: number): void {
    const ctx = this.bus.ctx;
    const t = ctx.currentTime;
    const s = Math.min(1, strength);
    const dur = 0.45;
    const am = ctx.createOscillator();
    am.frequency.value = 24;
    const amg = ctx.createGain();
    amg.gain.value = 0.5;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    am.connect(amg).connect(g.gain);
    const src = ctx.createBufferSource();
    src.buffer = this.bus.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400;
    bp.Q.value = 2;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.4 * s * AUDIO.turboVolume, t);
    env.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(bp).connect(g).connect(env).connect(this.bus.sfx);
    src.start(t);
    am.start(t);
    src.stop(t + dur);
    am.stop(t + dur);
  }

  /** Mechanical gear clunk: a low knock and a metallic click. */
  clunk(): void {
    const ctx = this.bus.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5 * AUDIO.clunkVolume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g).connect(this.bus.sfx);
    o.start(t);
    o.stop(t + 0.14);
    this.noise(0.04, (_s, _g) => undefined, 0.22 * AUDIO.clunkVolume);
  }

  /** Exhaust backfire pop: a dull crack with a low thump. */
  pop(strength: number): void {
    const ctx = this.bus.ctx;
    const t = ctx.currentTime;
    const s = Math.min(1, Math.max(0.1, strength));
    this.noise(0.09 + 0.08 * s, (src, g) => {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1400 + 1800 * s;
      src.connect(lp);
      lp.connect(g);
    }, (0.3 + 0.5 * s) * AUDIO.popVolume);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.07);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35 * s * AUDIO.popVolume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(g).connect(this.bus.sfx);
    o.start(t);
    o.stop(t + 0.1);
  }
}
