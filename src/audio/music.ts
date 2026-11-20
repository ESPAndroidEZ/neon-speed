import type { AudioBus } from './audioBus';
import { arpNote, bassNote, chordTones, drumHit, layers, leadNote, midiToHz, SECONDS_PER_STEP, STEPS_PER_BAR } from './musicPatterns';
import { DeckOut, type MusicDeck } from './musicDeck';

const LOOKAHEAD = 0.18;
/** One synthwave "song" in the playlist: 40 bars at 108 BPM, about 89 s; it then hands over or plays on. */
export const SYNTH_BARS = 40;
const SONG_STEPS = SYNTH_BARS * STEPS_PER_BAR;
export const SYNTH_NAME = 'Neon Grid';
/** Level match with the house songs (measured offline, tests/lab/music-join.mjs: synthwave was ~10 dB quieter). */
const SYNTH_TRIM = 3;

/** Generative synthwave (a deck of MusicDirector). Notes come from musicPatterns; layers fade in with intensity (speed). */
export class Music implements MusicDeck {
  private readonly bus: AudioBus;
  private step = 0;
  private endStep = SONG_STEPS;
  private next = 0;
  private started = false;
  private on = false;
  private intensity = 0;
  private readonly lp: BiquadFilterNode;
  private readonly out: GainNode;
  private readonly deck: DeckOut;

  constructor(bus: AudioBus) {
    this.bus = bus;
    this.deck = new DeckOut(bus.ctx, bus.music);
    this.lp = bus.ctx.createBiquadFilter();
    this.lp.type = 'lowpass';
    this.lp.Q.value = 3;
    this.out = bus.ctx.createGain();
    this.out.gain.value = SYNTH_TRIM;
    this.lp.connect(this.out).connect(this.deck.input);
  }

  get active(): boolean { return this.on; }
  get name(): string { return SYNTH_NAME; }
  barSeconds(): number { return SECONDS_PER_STEP * STEPS_PER_BAR; }

  begin(_item: number, fromBar: number, fadeSecs: number): void {
    this.step = fromBar * STEPS_PER_BAR;
    this.endStep = SONG_STEPS;
    this.on = true;
    this.started = false;
    this.deck.open(fadeSecs);
  }

  end(secs: number): void {
    this.deck.close(secs);
    this.endStep = Math.min(this.endStep, this.step + Math.ceil(secs / SECONDS_PER_STEP));
  }

  sweep(secs: number): void { this.deck.sweep(secs); }
  extend(): void { this.endStep += SONG_STEPS; this.deck.open(0.5); }

  secondsLeft(): number {
    if (!this.on) return 0;
    return Math.max(0, (this.endStep - this.step) * SECONDS_PER_STEP + (this.started ? this.next - this.bus.ctx.currentTime : 0));
  }

  update(intensity: number): void {
    const ctx = this.bus.ctx;
    this.intensity += (intensity - this.intensity) * 0.04;
    if (!this.on || ctx.state !== 'running') {
      this.started = false;
      return;
    }
    this.lp.frequency.setTargetAtTime(layers(this.intensity).cutoff + 800, ctx.currentTime, 0.2);
    if (!this.started) {
      this.started = true;
      this.next = ctx.currentTime + 0.1;
    }
    while (this.next < ctx.currentTime - 0.02 && this.step < this.endStep) { this.step++; this.next += SECONDS_PER_STEP; } // stalled frame
    while (this.next < ctx.currentTime + LOOKAHEAD && this.step < this.endStep) {
      this.play(this.step++, this.next);
      this.next += SECONDS_PER_STEP;
    }
    if (this.step >= this.endStep) this.on = false;
  }

  private play(step: number, t: number): void {
    const L = layers(this.intensity);
    const b = bassNote(step);
    if (b !== null) this.tone('sawtooth', midiToHz(b), t, SECONDS_PER_STEP * 1.7, 0.14, this.lp);
    if (step % STEPS_PER_BAR === 0) for (const n of chordTones(step, 2)) this.tone('sawtooth', midiToHz(n + 12), t, SECONDS_PER_STEP * 15, 0.035, this.lp, 7);
    const d = drumHit(step);
    if (L.kick && d.kick) this.kick(t);
    if (L.snare && d.snare) this.noiseHit(t, 0.16, 1800, 0.22, 'highpass');
    if (L.hats && d.hat) this.noiseHit(t, d.openHat ? 0.12 : 0.04, 7000, d.openHat ? 0.07 : 0.05, 'highpass');
    if (L.arp) this.tone('square', midiToHz(arpNote(step)), t, SECONDS_PER_STEP * 0.8, 0.05, this.lp);
    const lead = L.lead ? leadNote(step) : null;
    if (lead !== null) this.tone('sawtooth', midiToHz(lead + 12), t, SECONDS_PER_STEP * 1.8, 0.07, this.lp, 6);
  }

  private tone(type: OscillatorType, hz: number, t: number, dur: number, level: number, dest: AudioNode, detune = 0): void {
    const ctx = this.bus.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = hz;
    o.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(level, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private kick(t: number): void {
    const ctx = this.bus.ctx;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + 0.22);
  }

  private noiseHit(t: number, dur: number, cutoff: number, level: number, type: BiquadFilterType): void {
    const ctx = this.bus.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this.bus.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.out);
    s.start(t);
    s.stop(t + dur + 0.02);
  }
}
