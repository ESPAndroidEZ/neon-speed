import type { AudioBus } from './audioBus';

/** Engine frequency for a given rpm: firing frequency of a 6-cylinder four-stroke (3 events per revolution). */
export const engineHz = (rpm: number): number => (rpm / 60) * 3;

/** Engine note + turbo whistle + blow-off. Driven by rpm and throttle each frame. */
export class EngineSynth {
  private readonly bus: AudioBus;
  private readonly oscs: OscillatorNode[] = [];
  private readonly filter: BiquadFilterNode;
  private readonly gain: GainNode;
  private readonly turboFilter: BiquadFilterNode;
  private readonly turboGain: GainNode;
  private boost = 0;
  private lastThrottle = 0;

  constructor(bus: AudioBus) {
    this.bus = bus;
    const ctx = bus.ctx;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.Q.value = 2.5;
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) curve[i] = Math.tanh(((i / 255) * 2 - 1) * 2.2);
    shaper.curve = curve;
    const mix: [OscillatorType, number, number][] = [['sawtooth', 1, 0.5], ['square', 0.5, 0.35], ['triangle', 2, 0.25]];
    for (const [type, mul, lvl] of mix) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = 60 * mul;
      o.detune.value = (mul - 1) * 4;
      const g = ctx.createGain();
      g.gain.value = lvl;
      o.connect(g).connect(shaper);
      o.start();
      this.oscs.push(o);
    }
    shaper.connect(this.filter).connect(this.gain).connect(bus.sfx);
    this.turboFilter = ctx.createBiquadFilter();
    this.turboFilter.type = 'bandpass';
    this.turboFilter.Q.value = 9;
    this.turboGain = ctx.createGain();
    this.turboGain.gain.value = 0;
    bus.loopNoise().connect(this.turboFilter).connect(this.turboGain).connect(bus.sfx);
  }

  update(dt: number, rpm: number, redline: number, throttle: number, active: boolean): void {
    const t = this.bus.ctx.currentTime;
    const hz = engineHz(rpm);
    const mul = [1, 0.5, 2];
    this.oscs.forEach((o, i) => o.frequency.setTargetAtTime(hz * mul[i], t, 0.03));
    const load = Math.max(0.2, throttle);
    this.filter.frequency.setTargetAtTime(350 + rpm * 0.45 + load * 1300, t, 0.05);
    this.gain.gain.setTargetAtTime(active ? 0.1 + load * 0.12 : 0, t, 0.08);

    const target = throttle * Math.min(1, rpm / redline);
    this.boost += (target - this.boost) * Math.min(1, dt * 1.6);
    this.turboFilter.frequency.setTargetAtTime(2200 + this.boost * 5200, t, 0.05);
    this.turboGain.gain.setTargetAtTime(active ? this.boost * this.boost * 0.05 : 0, t, 0.08);
    if (this.lastThrottle > 0.6 && throttle < 0.15 && this.boost > 0.45 && active) this.blowOff();
    this.lastThrottle = throttle;
  }

  private blowOff(): void {
    const ctx = this.bus.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.bus.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2500;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    src.connect(hp).connect(g).connect(this.bus.sfx);
    src.start(t);
    src.stop(t + 0.45);
    this.boost *= 0.3;
  }

  dispose(): void {
    for (const o of this.oscs) o.stop();
  }
}
