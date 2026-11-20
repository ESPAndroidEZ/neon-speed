import type { AudioBus } from './audioBus';
import { midiToHz } from './musicPatterns';
import { HOUSE_STEPS, houseBass, houseChord, houseDrums, houseLayers, housePluck, houseStab, stepSeconds } from './housePatterns';
import { HOUSE_SONGS, type HouseSong } from './houseSongs';
import { createHouseSends } from './houseFx';

/** The instruments of one deep house deck (HouseMusic schedules them): one step of the song per play() call. */
export class HouseVoices {
  private readonly bus: AudioBus;
  private song: HouseSong = HOUSE_SONGS[0];
  private intensity = 0;
  private readonly delay: DelayNode;
  private readonly out: GainNode;
  /** Bass, pad and stabs go through here; every kick ducks it (the house pump). */
  private readonly duck: GainNode;
  private readonly padLp: BiquadFilterNode;
  private readonly verb: GainNode;
  private readonly echo: GainNode;

  constructor(bus: AudioBus, dest: AudioNode) {
    this.bus = bus;
    const ctx = bus.ctx;
    this.out = ctx.createGain();
    this.out.connect(dest);
    this.duck = ctx.createGain();
    this.duck.connect(this.out);
    this.padLp = ctx.createBiquadFilter();
    this.padLp.type = 'lowpass';
    this.padLp.frequency.value = 900;
    this.padLp.Q.value = 0.7;
    this.padLp.connect(this.duck);
    const fx = createHouseSends(ctx, this.out, stepSeconds(this.song) * 3);
    this.verb = fx.verb;
    this.echo = fx.echo;
    this.delay = fx.delay;
  }

  setSong(song: HouseSong): void {
    this.song = song;
    this.delay.delayTime.setTargetAtTime(stepSeconds(song) * 3, this.bus.ctx.currentTime, 0.05);
  }

  setIntensity(i: number): void {
    this.intensity = i;
    this.padLp.frequency.setTargetAtTime(700 + i * 900, this.bus.ctx.currentTime, 0.4);
  }

  play(step: number, t: number): void {
    const L = houseLayers(this.intensity);
    const d = houseDrums(step);
    if (d.kick) this.kick(t);
    const S = this.song;
    if (step % HOUSE_STEPS === 0) for (const n of houseChord(S, step)) this.pad(midiToHz(n), t);
    const b = houseBass(S, step);
    if (b) this.bass(midiToHz(b[0]), t, b[1] * stepSeconds(S));
    if (houseStab(S, step)) this.stab(houseChord(S, step), t, L.cutoff);
    if (d.openHat) this.noise(t, 0.16, 7500, 0.06, 'highpass', 0.1);
    if (L.hats && d.hat > 0) this.noise(t, 0.035, 9000, 0.05 * d.hat, 'highpass', 0);
    if (L.shaker && d.shaker) this.noise(t, 0.06, 5200, 0.03, 'bandpass', 0);
    if (L.clap && d.clap) this.clap(t);
    const p = L.pluck ? housePluck(S, step) : null;
    if (p !== null) this.pluck(midiToHz(p), t);
  }

  private kick(t: number): void {
    const ctx = this.bus.ctx;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(this.song.kickHz, t + 0.09);
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
    this.duck.gain.linearRampToValueAtTime(1, t + stepSeconds(this.song) * 3);
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
    const dur = stepSeconds(this.song) * HOUSE_STEPS;
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
    const w = this.song.stabWave, lvl = w === 'sawtooth' ? 0.03 : w === 'square' ? 0.022 : 0.05;
    for (const n of chord) this.osc(w, midiToHz(n), n % 2 ? 6 : -6, t, 0.004, w === 'triangle' ? 0.4 : 0.26, lvl, f, false);
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
