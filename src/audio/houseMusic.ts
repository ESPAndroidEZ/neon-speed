import type { AudioBus } from './audioBus';
import { midiToHz } from './musicPatterns';
import { HOUSE_STEP_S, HOUSE_STEPS, houseBass, houseChord, houseDrums, houseLayers, housePluck, houseStab, swingOffset } from './housePatterns';

const LOOKAHEAD = 0.2;

/**
 * Generative deep house (122 BPM): round kick, off-beat bass, warm pad and filtered chord stabs pumped by a
 * sidechain duck, swung hats, clap and shaker, a pluck on top at speed. Reverb and a dotted-8th delay are shared
 * sends. Notes come from housePatterns; layers fade in with intensity (speed).
 */
export class HouseMusic {
  private readonly bus: AudioBus;
  private step = 0;
  private next = 0;
  private started = false;
  private intensity = 0;
  private readonly out: GainNode;
  /** Bass, pad and stabs go through here; every kick ducks it (the house pump). */
  private readonly duck: GainNode;
  private readonly padLp: BiquadFilterNode;
  private readonly verb: GainNode;
  private readonly echo: GainNode;

  constructor(bus: AudioBus) {
    this.bus = bus;
    const ctx = bus.ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(bus.music);
    this.duck = ctx.createGain();
    this.duck.connect(this.out);
    this.padLp = ctx.createBiquadFilter();
    this.padLp.type = 'lowpass';
    this.padLp.frequency.value = 900;
    this.padLp.Q.value = 0.7;
    this.padLp.connect(this.duck);
    // reverb send: decaying stereo noise impulse
    this.verb = ctx.createGain();
    const conv = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 2.4);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    conv.buffer = ir;
    const verbOut = ctx.createGain();
    verbOut.gain.value = 0.32;
    this.verb.connect(conv).connect(verbOut).connect(this.out);
    // dotted-8th delay send with a darkening feedback loop
    this.echo = ctx.createGain();
    const dl = ctx.createDelay(1);
    dl.delayTime.value = HOUSE_STEP_S * 3;
    const fb = ctx.createGain();
    fb.gain.value = 0.34;
    const dark = ctx.createBiquadFilter();
    dark.type = 'lowpass';
    dark.frequency.value = 2200;
    this.echo.connect(dl).connect(dark).connect(fb).connect(dl);
    const echoOut = ctx.createGain();
    echoOut.gain.value = 0.5;
    dark.connect(echoOut).connect(this.out);
  }

  /** Call every frame. `playing` fades the music in/out; `intensity` 0..1. */
  update(playing: boolean, intensity: number): void {
    const ctx = this.bus.ctx;
    this.intensity += (intensity - this.intensity) * 0.04;
    this.out.gain.setTargetAtTime(playing ? 1 : 0, ctx.currentTime, 0.6);
    this.padLp.frequency.setTargetAtTime(700 + this.intensity * 900, ctx.currentTime, 0.4);
    if (!playing || ctx.state !== 'running') {
      this.started = false;
      return;
    }
    if (!this.started) {
      this.started = true;
      this.next = ctx.currentTime + 0.1;
    }
    while (this.next < ctx.currentTime + LOOKAHEAD) {
      this.play(this.step, this.next + swingOffset(this.step));
      this.step++;
      this.next += HOUSE_STEP_S;
    }
  }

  private play(step: number, t: number): void {
    const L = houseLayers(this.intensity);
    const d = houseDrums(step);
    if (d.kick) this.kick(t);
    if (step % HOUSE_STEPS === 0) for (const n of houseChord(step)) this.pad(midiToHz(n), t);
    const b = houseBass(step);
    if (b) this.bass(midiToHz(b[0]), t, b[1] * HOUSE_STEP_S);
    if (houseStab(step)) this.stab(houseChord(step), t, L.cutoff);
    if (d.openHat) this.noise(t, 0.16, 7500, 0.06, 'highpass', 0.1);
    if (L.hats && d.hat > 0) this.noise(t, 0.035, 9000, 0.05 * d.hat, 'highpass', 0);
    if (L.shaker && d.shaker) this.noise(t, 0.06, 5200, 0.03, 'bandpass', 0);
    if (L.clap && d.clap) this.clap(t);
    const p = L.pluck ? housePluck(step) : null;
    if (p !== null) this.pluck(midiToHz(p), t);
  }

  private kick(t: number): void {
    const ctx = this.bus.ctx;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.75, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + 0.4);
    // sidechain pump
    this.duck.gain.cancelScheduledValues(t);
    this.duck.gain.setValueAtTime(0.3, t);
    this.duck.gain.linearRampToValueAtTime(1, t + HOUSE_STEP_S * 3);
  }

  private bass(hz: number, t: number, dur: number): void {
    const ctx = this.bus.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.26, t + 0.006);
    g.gain.setTargetAtTime(0.0001, t + dur * 0.8, 0.03);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 420;
    for (const [type, mul, lvl] of [['sine', 1, 1], ['triangle', 2, 0.25]] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = hz * mul;
      const og = ctx.createGain();
      og.gain.value = lvl;
      o.connect(og).connect(f);
      o.start(t);
      o.stop(t + dur + 0.2);
    }
    f.connect(g).connect(this.duck);
  }

  private pad(hz: number, t: number): void {
    const dur = HOUSE_STEP_S * HOUSE_STEPS;
    for (const det of [-9, 9]) this.osc('sawtooth', hz, det, t, 0.5, dur, 0.018, this.padLp, true);
  }

  private stab(chord: readonly number[], t: number, cutoff: number): void {
    const ctx = this.bus.ctx;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 4;
    f.frequency.setValueAtTime(cutoff * 1.8, t);
    f.frequency.exponentialRampToValueAtTime(cutoff * 0.5, t + 0.22);
    f.connect(this.duck);
    const send = ctx.createGain();
    send.gain.value = 0.5;
    f.connect(send).connect(this.echo);
    for (const n of chord) this.osc('sawtooth', midiToHz(n), n % 2 ? 6 : -6, t, 0.004, 0.26, 0.03, f, false);
  }

  private pluck(hz: number, t: number): void {
    const ctx = this.bus.ctx;
    const g = ctx.createGain();
    g.connect(this.out);
    g.connect(this.echo);
    g.connect(this.verb);
    this.osc('triangle', hz, 0, t, 0.003, 0.32, 0.06, g, false);
  }

  /** One oscillator with an attack/decay envelope into `dest`; `send` also feeds the reverb. */
  private osc(type: OscillatorType, hz: number, det: number, t: number, att: number, dur: number, lvl: number, dest: AudioNode, send: boolean): void {
    const ctx = this.bus.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = hz;
    o.detune.value = det;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(lvl, t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    if (send) g.connect(this.verb);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private clap(t: number): void {
    for (let k = 0; k < 3; k++) this.noise(t + k * 0.011, k === 2 ? 0.16 : 0.012, 1400, 0.1, 'bandpass', 0.35);
  }

  private noise(t: number, dur: number, cutoff: number, level: number, type: BiquadFilterType, verb: number): void {
    const ctx = this.bus.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this.bus.noise;
    s.playbackRate.value = 0.9 + Math.random() * 0.2;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.out);
    if (verb > 0) {
      const v = ctx.createGain();
      v.gain.value = verb;
      g.connect(v).connect(this.verb);
    }
    s.start(t);
    s.stop(t + dur + 0.02);
  }
}
