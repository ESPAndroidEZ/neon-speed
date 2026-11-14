import type { Weather } from '../types/game';
import { AUDIO } from './audioParams';
import type { AudioBus } from './audioBus';

/** Looping noise voice: filter into a gain, both set from outside each frame. */
class NoiseVoice {
  readonly filter: BiquadFilterNode;
  readonly gain: GainNode;

  constructor(bus: AudioBus, type: BiquadFilterType, freq: number, q: number, extra?: BiquadFilterNode) {
    this.filter = bus.ctx.createBiquadFilter();
    this.filter.type = type;
    this.filter.frequency.value = freq;
    this.filter.Q.value = q;
    this.gain = bus.ctx.createGain();
    this.gain.gain.value = 0;
    const src = bus.loopNoise();
    if (extra) src.connect(extra).connect(this.filter);
    else src.connect(this.filter);
    this.filter.connect(this.gain).connect(bus.sfx);
  }

  set(freq: number, gain: number, now: number): void {
    this.filter.frequency.setTargetAtTime(freq, now, 0.05);
    this.gain.gain.setTargetAtTime(gain, now, 0.06);
  }
}

/** Tyre squeal (dry, wet and snow each sound different), rain on the body, wind, nitro, crunch and splash. */
export class Sfx {
  private readonly bus: AudioBus;
  private readonly dry: NoiseVoice;
  private readonly dryHi: NoiseVoice;
  private readonly wet: NoiseVoice;
  private readonly wetHi: NoiseVoice;
  private readonly snow: NoiseVoice;
  private readonly whoosh: NoiseVoice;
  private readonly rain: NoiseVoice;
  private readonly wind: NoiseVoice;
  private readonly roar: GainNode;
  private readonly roarOsc: OscillatorNode;
  private readonly scrapeV: NoiseVoice;
  private lastHit = 0;
  private wasNitro = false;

  constructor(bus: AudioBus) {
    this.bus = bus;
    this.dry = new NoiseVoice(bus, 'bandpass', 1500, 9);
    this.dryHi = new NoiseVoice(bus, 'bandpass', 3000, 14);
    this.wet = new NoiseVoice(bus, 'highpass', 3600, 0.6);
    this.wetHi = new NoiseVoice(bus, 'bandpass', 900, 2);
    this.snow = new NoiseVoice(bus, 'lowpass', 1100, 0.8);
    this.whoosh = new NoiseVoice(bus, 'bandpass', 700, 1.2);
    this.rain = new NoiseVoice(bus, 'highpass', 2600, 0.5);
    this.wind = new NoiseVoice(bus, 'lowpass', 300, 0.7);
    this.scrapeV = new NoiseVoice(bus, 'bandpass', 1900, 1.4);
    // nitro roar: a growling distorted saw under the whoosh
    const ctx = bus.ctx;
    this.roarOsc = ctx.createOscillator();
    this.roarOsc.type = 'sawtooth';
    this.roarOsc.frequency.value = 70;
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) curve[i] = Math.tanh(((i / 255) * 2 - 1) * 5);
    shaper.curve = curve;
    this.roar = ctx.createGain();
    this.roar.gain.value = 0;
    this.roarOsc.connect(shaper).connect(this.roar).connect(bus.sfx);
    this.roarOsc.start();
  }

  /** slide 0..1, speed m/s, surface = current weather (picks the squeal voice), nitro, precipitation 0..1. */
  update(slide: number, speed: number, surface: Weather, nitro: boolean, precipitation: number, active: boolean): void {
    const t = this.bus.ctx.currentTime;
    const on = active ? 1 : 0;
    const soft = AUDIO.squealVoicing === 0;
    const v = AUDIO.tyreVolume * slide * on;
    const f = 1100 + speed * 14;
    this.dry.filter.Q.setTargetAtTime(soft ? 3.5 : 9, t, 0.1); // soft = wide and warm, sharp = narrow and shrill
    this.dryHi.filter.Q.setTargetAtTime(soft ? 5 : 14, t, 0.1);
    this.dry.set(soft ? f * 0.85 : f, surface === 'CLEAR' ? v * (soft ? 0.26 : 0.2) : 0, t);
    this.dryHi.set(f * 2.05, surface === 'CLEAR' ? v * (soft ? 0.03 : 0.12) : 0, t);
    this.wet.set(3600 + speed * 20, surface === 'RAIN' ? v * 0.16 : 0, t); // hissy spray
    this.wetHi.set(700 + speed * 8, surface === 'RAIN' ? v * 0.14 : 0, t);
    this.snow.set(700 + speed * 10, surface === 'SNOW' ? v * 0.3 * (0.7 + 0.3 * Math.sin(t * 17)) : 0, t); // crunchy
    this.whoosh.set(500 + speed * 9 + (nitro ? 900 : 0), nitro ? 0.22 * on : 0, t);
    this.roar.gain.setTargetAtTime(nitro ? 0.16 * on : 0, t, 0.08);
    this.roarOsc.frequency.setTargetAtTime(60 + speed * 0.5, t, 0.1);
    this.rain.set(2600, precipitation * 0.11 * on * AUDIO.ambienceVolume, t);
    this.wind.set(250 + speed * 7, Math.min(1, speed / 80) * 0.16 * on * AUDIO.ambienceVolume, t);
    if (nitro && !this.wasNitro) this.burst(0.3, 1800, 0.5);
    this.wasNitro = nitro;
  }

  /** Sustained scraping along a wall or another car. */
  scrape(on: boolean, speed: number): void {
    this.scrapeV.set(1500 + speed * 12, on ? Math.min(0.3, 0.08 + speed * 0.004) * AUDIO.crashVolume : 0, this.bus.ctx.currentTime);
  }

  /** Collision crunch: low thump, metallic ring and a noise burst. Rate limited. */
  crash(strength: number): void {
    const ctx = this.bus.ctx;
    const t = ctx.currentTime;
    if (t - this.lastHit < 0.12) return;
    this.lastHit = t;
    const k = Math.min(1, strength / 16);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.28);
    const g = ctx.createGain();
    const cv = AUDIO.crashVolume;
    g.gain.setValueAtTime((0.55 * k + 0.12) * cv, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    o.connect(g).connect(this.bus.sfx);
    o.start(t);
    o.stop(t + 0.35);
    for (const f of [310, 523, 811]) { // inharmonic metal ring
      const r = ctx.createOscillator();
      r.type = 'square';
      r.frequency.value = f * (0.95 + k * 0.1);
      const rg = ctx.createGain();
      rg.gain.setValueAtTime((0.05 + 0.08 * k) * cv, t);
      rg.gain.exponentialRampToValueAtTime(0.001, t + 0.25 + 0.2 * k);
      r.connect(rg).connect(this.bus.sfx);
      r.start(t);
      r.stop(t + 0.5);
    }
    this.burst((0.35 + 0.5 * k) * cv, 1200 + k * 3000, 0.3);
    if (k > 0.5) this.burst(0.18 * cv * k, 7000, 0.45); // glass and trim bits on a big hit
  }

  /** Splash of a car through a puddle. */
  splash(speed: number): void {
    this.burst(Math.min(0.5, 0.15 + speed * 0.01), 2600, 0.35);
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
