import type { AudioBus } from './audioBus';
import { arpNote, bassNote, chordTones, drumHit, layers, leadNote, midiToHz, SECONDS_PER_STEP, STEPS_PER_BAR } from './musicPatterns';

const LOOKAHEAD = 0.18;

/** Generative synthwave. Notes come from musicPatterns; layers fade in with intensity (speed). */
export class Music {
  private readonly bus: AudioBus;
  private step = 0;
  private next = 0;
  private started = false;
  private intensity = 0;
  private readonly lp: BiquadFilterNode;
  private readonly out: GainNode;

  constructor(bus: AudioBus) {
    this.bus = bus;
    this.lp = bus.ctx.createBiquadFilter();
    this.lp.type = 'lowpass';
    this.lp.Q.value = 3;
    this.out = bus.ctx.createGain();
    this.out.gain.value = 0;
    this.lp.connect(this.out).connect(bus.music);
  }

  /** Call every frame. `playing` fades the music in/out; `intensity` 0..1. */
  update(playing: boolean, intensity: number): void {
    const ctx = this.bus.ctx;
    this.intensity += (intensity - this.intensity) * 0.04;
    this.out.gain.setTargetAtTime(playing ? 1 : 0, ctx.currentTime, 0.6);
    this.lp.frequency.setTargetAtTime(layers(this.intensity).cutoff + 800, ctx.currentTime, 0.2);
    if (ctx.state !== 'running') return;
    if (!this.started) {
      this.started = true;
      this.next = ctx.currentTime + 0.1;
    }
    while (this.next < ctx.currentTime + LOOKAHEAD) {
      this.play(this.step++, this.next);
      this.next += SECONDS_PER_STEP;
    }
  }

  private play(step: number, t: number): void {
    const L = layers(this.intensity);
    const b = bassNote(step);
    if (b !== null) this.tone('sawtooth', midiToHz(b), t, SECONDS_PER_STEP * 1.7, 0.2, this.lp);
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
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g).connect(this.bus.music);
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
    s.connect(f).connect(g).connect(this.bus.music);
    s.start(t);
    s.stop(t + dur + 0.02);
  }
}
