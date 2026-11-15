import type { AudioBus } from './audioBus';
import { makeSong, MOODS, newEvents, rng, STEPS_PER_BAR, stepEvents, type MoodId, type Song } from './musicPatterns';
import * as V from './musicVoices';

/** How far ahead of the audio clock notes are queued. update() runs every frame, so this covers ~15 slow frames. */
const LOOKAHEAD = 0.25;
/** Kick-driven pump: the instruments dip to this gain on every kick. */
const PUMP = 0.42;

/**
 * Procedural house music. musicPatterns decides what happens on each 16th; this class schedules it on the
 * AudioContext clock (sample-accurate, swing included), runs the sidechain pump, and cross-fades moods on the bar line.
 * Graph: instruments -> lp -> pump -> mix; pump -> wet -> reverb -> mix; leads -> echo; drums -> mix; mix -> bus.music.
 */
export class Music {
  private readonly bus: AudioBus;
  private readonly kit: V.VoiceKit;
  private readonly lp: BiquadFilterNode;
  private readonly pump: GainNode;
  private readonly mix: GainNode;
  private readonly wet: GainNode;
  private readonly drums: GainNode;
  private readonly leadBus: GainNode;
  private readonly echo: DelayNode;
  private song: Song;
  private pendingSeed: number | null = null;
  private mood: MoodId = 'menu';
  private want: MoodId = 'menu';
  private step = 0;
  private next = 0;
  private started = false;
  private intensity = 0;
  private lastCut = 0;
  private lastLevel = -1;
  private readonly ev = newEvents();

  constructor(bus: AudioBus, seed = 1) {
    this.bus = bus;
    const ctx = bus.ctx;
    const lite = typeof navigator !== 'undefined' && (navigator.maxTouchPoints ?? 0) > 0;
    this.kit = { ctx, noise: bus.noise, lite };
    this.song = makeSong(seed);
    this.lp = ctx.createBiquadFilter();
    this.lp.type = 'lowpass';
    this.lp.Q.value = 1.4;
    this.pump = ctx.createGain();
    this.mix = ctx.createGain();
    this.mix.gain.value = 0;
    this.drums = ctx.createGain();
    this.leadBus = ctx.createGain();
    this.wet = ctx.createGain();
    this.wet.gain.value = MOODS.menu.wet;
    const rev = ctx.createConvolver();
    rev.buffer = this.impulse(1.7);
    this.echo = ctx.createDelay(1);
    this.echo.delayTime.value = this.song.secPerStep * 3;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const echoOut = ctx.createGain();
    echoOut.gain.value = 0.3;
    this.leadBus.connect(this.lp);
    this.leadBus.connect(this.echo);
    this.echo.connect(fb).connect(this.echo);
    this.echo.connect(echoOut).connect(this.lp);
    this.lp.connect(this.pump).connect(this.mix);
    this.pump.connect(this.wet).connect(rev).connect(this.mix);
    this.drums.connect(this.mix);
    this.mix.connect(bus.music);
  }

  /** A different song (tempo, key, progression, groove), applied on the next bar line. */
  reseed(seed: number): void {
    if (seed !== this.song.seed) this.pendingSeed = seed;
  }

  get bpm(): number {
    return this.song.bpm;
  }

  /**
   * Call every frame. `playing` fades the music in/out; `intensity` 0..1 (speed, last lap); `duck` 0..1 pulls the
   * whole bed down so the engine and the voices stay clear.
   */
  update(playing: boolean, intensity: number, mood: MoodId = 'race', duck = 0): void {
    const ctx = this.bus.ctx;
    this.intensity += (intensity - this.intensity) * 0.04;
    this.want = mood;
    const m = MOODS[this.mood];
    const cut = m.gate ? m.cutoff * (0.4 + 0.6 * this.intensity) : m.cutoff;
    if (Math.abs(cut - this.lastCut) > this.lastCut * 0.02) {
      this.lastCut = cut;
      this.lp.frequency.setTargetAtTime(cut, ctx.currentTime, 0.25);
    }
    const level = playing ? m.level * (1 - 0.55 * Math.min(1, Math.max(0, duck))) : 0;
    if (Math.abs(level - this.lastLevel) > 0.01) {
      this.lastLevel = level;
      this.mix.gain.setTargetAtTime(level, ctx.currentTime, 0.5);
    }
    if (ctx.state !== 'running') return;
    if (!this.started) {
      this.started = true;
      this.next = ctx.currentTime + 0.1;
    } else if (this.next < ctx.currentTime - 0.05) this.next = ctx.currentTime + 0.05; // stalled tab: resume, don't burst
    while (this.next < ctx.currentTime + LOOKAHEAD) {
      this.play(this.step++, this.next);
      this.next += this.song.secPerStep;
    }
  }

  private play(step: number, t: number): void {
    const k = this.kit;
    if (step % STEPS_PER_BAR === 0 && this.barLine(t)) { step = 0; this.step = 1; } // new song starts at its intro
    const song = this.song, e = stepEvents(song, this.mood, this.intensity, step, this.ev), s = song.secPerStep;
    const tt = t + (step & 1 ? song.swing * s : 0); // swung 16ths; kick and clap stay on the grid
    if (e.kick > 0) {
      V.kick(k, this.drums, t, e.kick);
      this.pump.gain.setValueAtTime(PUMP, t);
      this.pump.gain.setTargetAtTime(1, t + 0.02, 0.075);
    }
    if (e.clap > 0) V.clap(k, this.drums, t, e.clap);
    if (e.hat > 0 && !(k.lite && e.hat < 0.45)) V.hat(k, this.drums, tt, e.hat, false);
    if (e.open > 0) V.hat(k, this.drums, tt, e.open, true);
    if (e.bass >= 0) V.bass(k, this.lp, tt, e.bass, e.bassLen * s, 1);
    if (e.stab) V.stab(k, this.lp, tt, e.chord, this.mood === 'story' ? s * 14 : e.sec === 3 ? s * 6 : s * 2.2, 1);
    if (e.pad) V.pad(k, this.lp, t, e.chord, s * STEPS_PER_BAR);
    if (e.arp >= 0) V.pluck(k, this.leadBus, tt, e.arp, s * 1.6, 1);
    if (e.lead >= 0) V.lead(k, this.leadBus, tt, e.lead, s * 3, 1);
    if (e.riser) V.riser(k, this.drums, t, s * 32);
    if (e.crash) V.crash(k, this.drums, t);
  }

  /** Mood and song changes land here, on the bar line, so layers swap with the beat and nothing clicks. */
  private barLine(t: number): boolean {
    const reset = this.pendingSeed !== null;
    if (this.pendingSeed !== null) {
      this.song = makeSong(this.pendingSeed);
      this.pendingSeed = null;
      this.echo.delayTime.setValueAtTime(this.song.secPerStep * 3, t);
    }
    if (this.want !== this.mood) {
      this.mood = this.want;
      this.wet.gain.setTargetAtTime(MOODS[this.mood].wet, t, 0.35);
      this.lastCut = 0; // re-aim the filter and level for the new mood
      this.lastLevel = -1;
    }
    return reset;
  }

  /** Generated room: stereo noise with a cubic decay (no downloads). */
  private impulse(seconds: number): AudioBuffer {
    const ctx = this.bus.ctx, len = Math.floor(ctx.sampleRate * seconds), r = rng(4242);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return b;
  }
}
