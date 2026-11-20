import type { AudioBus } from './audioBus';
import { HOUSE_STEPS, SONG_BARS, stepSeconds, swingOffset } from './housePatterns';
import { HOUSE_SONGS, type HouseSong } from './houseSongs';
import { HouseVoices } from './houseVoices';
import { DeckOut, type MusicDeck } from './musicDeck';

const LOOKAHEAD = 0.2;
const SONG_STEPS = SONG_BARS * HOUSE_STEPS;

/**
 * Generative deep house, one song at a time (a deck of MusicDirector, which picks the songs and crossfades two of
 * these). Round kick, off-beat bass, warm pad and chord stabs pumped by a sidechain duck, swung hats, clap and shaker,
 * a pluck on top at speed, shared reverb and delay sends (houseFx). Notes come from housePatterns; layers fade in
 * with intensity (speed).
 */
export class HouseMusic implements MusicDeck {
  private readonly bus: AudioBus;
  private step = 0;
  private endStep = SONG_STEPS;
  private next = 0;
  private started = false;
  private on = false;
  private intensity = 0;
  private song: HouseSong = HOUSE_SONGS[0];
  private readonly deck: DeckOut;
  private readonly v: HouseVoices;

  constructor(bus: AudioBus) {
    this.bus = bus;
    const ctx = bus.ctx;
    this.deck = new DeckOut(ctx, bus.music);
    this.v = new HouseVoices(bus, this.deck.input);
  }

  get active(): boolean { return this.on; }
  get name(): string { return this.song.name; }
  barSeconds(): number { return stepSeconds(this.song) * HOUSE_STEPS; }

  begin(item: number, fromBar: number, fadeSecs: number): void {
    this.song = HOUSE_SONGS[item] ?? HOUSE_SONGS[0];
    this.step = fromBar * HOUSE_STEPS;
    this.endStep = SONG_STEPS;
    this.on = true;
    this.started = false;
    this.v.setSong(this.song);
    this.deck.open(fadeSecs);
  }

  end(secs: number): void {
    this.deck.close(secs);
    this.endStep = Math.min(this.endStep, this.step + Math.ceil(secs / stepSeconds(this.song)));
  }

  sweep(secs: number): void { this.deck.sweep(secs); }
  extend(): void { this.endStep += SONG_STEPS; this.deck.open(0.5); }

  secondsLeft(): number {
    if (!this.on) return 0;
    return Math.max(0, (this.endStep - this.step) * stepSeconds(this.song) + (this.started ? this.next - this.bus.ctx.currentTime : 0));
  }

  update(intensity: number): void {
    const ctx = this.bus.ctx;
    this.intensity += (intensity - this.intensity) * 0.04;
    if (!this.on || ctx.state !== 'running') {
      this.started = false;
      return;
    }
    this.v.setIntensity(this.intensity);
    if (!this.started) {
      this.started = true;
      this.next = ctx.currentTime + 0.1;
    }
    const sps = stepSeconds(this.song);
    // a stalled frame (track build, GC) must not fire every late step at once: skip them silently, keep the beat
    while (this.next < ctx.currentTime - 0.02 && this.step < this.endStep) { this.step++; this.next += sps; }
    while (this.next < ctx.currentTime + LOOKAHEAD && this.step < this.endStep) {
      this.v.play(this.step, this.next + swingOffset(this.song, this.step));
      this.step++;
      this.next += sps;
    }
    if (this.step >= this.endStep) this.on = false;
  }
}
