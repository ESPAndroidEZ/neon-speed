import type { AudioBus } from './audioBus';

/** Looping noise voice: bandpass/lowpass/highpass filter into a gain, both set from outside each frame. */
class NoiseVoice {
  readonly filter: BiquadFilterNode;
  readonly gain: GainNode;

  constructor(bus: AudioBus, type: BiquadFilterType, freq: number, q: number) {
    this.filter = bus.ctx.createBiquadFilter();
    this.filter.type = type;
    this.filter.frequency.value = freq;
    this.filter.Q.value = q;
    this.gain = bus.ctx.createGain();
    this.gain.gain.value = 0;
    bus.loopNoise().connect(this.filter).connect(this.gain).connect(bus.sfx);
  }

  set(freq: number, gain: number, now: number): void {
    this.filter.frequency.setTargetAtTime(freq, now, 0.05);
    this.gain.gain.setTargetAtTime(gain, now, 0.06);
  }
}

/** Tyre squeal, nitro whoosh, rain and wind beds, collision thump. */
export class Sfx {
  private readonly bus: AudioBus;
  private readonly squeal: NoiseVoice;
  private readonly whoosh: NoiseVoice;
  private readonly rain: NoiseVoice;
  private readonly wind: NoiseVoice;
  private lastThump = 0;
  private wasNitro = false;

  constructor(bus: AudioBus) {
    this.bus = bus;
    this.squeal = new NoiseVoice(bus, 'bandpass', 1500, 7);
    this.whoosh = new NoiseVoice(bus, 'bandpass', 700, 1.2);
    this.rain = new NoiseVoice(bus, 'highpass', 2200, 0.5);
    this.wind = new NoiseVoice(bus, 'lowpass', 300, 0.7);
  }

  /** slide 0..1 (tyre slip), speed m/s, precipitation 0..1, active = unmuted game audio. */
  update(slide: number, speed: number, nitro: boolean, precipitation: number, active: boolean): void {
    const t = this.bus.ctx.currentTime;
    const on = active ? 1 : 0;
    this.squeal.set(1100 + speed * 14, slide * 0.11 * on, t);
    this.whoosh.set(500 + speed * 9 + (nitro ? 900 : 0), nitro ? 0.2 * on : 0, t);
    this.rain.set(2200, precipitation * 0.07 * on, t);
    this.wind.set(250 + speed * 7, Math.min(1, speed / 80) * 0.14 * on, t);
    if (nitro && !this.wasNitro) this.burst(0.25, 1800, 0.5);
    this.wasNitro = nitro;
  }

  /** Impact thump scaled by closing speed (m/s). Rate limited. */
  thump(strength: number): void {
    const ctx = this.bus.ctx;
    const t = ctx.currentTime;
    if (t - this.lastThump < 0.12) return;
    this.lastThump = t;
    const k = Math.min(1, strength / 16);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.28);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5 * k + 0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    o.connect(g).connect(this.bus.sfx);
    o.start(t);
    o.stop(t + 0.35);
    this.burst(0.25 + 0.4 * k, 900 + k * 1500, 0.25);
  }

  private burst(level: number, cutoff: number, dur: number): void {
    const ctx = this.bus.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.bus.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.bus.sfx);
    src.start(t);
    src.stop(t + dur + 0.05);
  }
}
