import type { AudioBus } from './audioBus';
import { HouseMusic } from './houseMusic';
import { HOUSE_SONGS } from './houseSongs';
import { Music } from './music';
import type { MusicDeck } from './musicDeck';
import { MUSIC_SOURCE, type MusicStyle } from './audioParams';
import { Playlist } from './playlist';

/** Playlist item of the synthwave track (house songs are their index in HOUSE_SONGS). */
export const SYNTH_ITEM = 100;
/** Bars of filter sweep before a song ends, and bars the next song overlaps it (its drumless intro). */
const SWEEP_BARS = 4, OVERLAP_BARS = 2;
/** Crossfade length when the player presses Next song or changes the style. */
const SKIP_FADE = 1.2;

const HOUSE_ITEMS: readonly number[] = HOUSE_SONGS.map((_, i) => i);
const AUTO_ITEMS: readonly number[] = [...HOUSE_ITEMS, SYNTH_ITEM];
const SYNTH_ITEMS: readonly number[] = [SYNTH_ITEM];
export const styleItems = (s: MusicStyle): readonly number[] => (s === 'house' ? HOUSE_ITEMS : s === 'synth' ? SYNTH_ITEMS : AUTO_ITEMS);

/**
 * Background music that changes by itself (owner, 2026-11-20: "I never want to press Next song"). A shuffle bag
 * (Playlist) picks the next song; 4 bars before the end the old song's filter closes, 2 bars before the end the next
 * song starts its drumless intro on the other deck and the two crossfade, so the new kick lands as the old song
 * ends. Two house decks let house follow house; the synthwave deck joins in the Auto style. MUSIC_SOURCE.skip
 * (Settings > Next song) still works as an extra and crossfades in SKIP_FADE seconds.
 */
export class MusicDirector {
  private readonly bus: AudioBus;
  private readonly houseA: HouseMusic;
  private readonly houseB: HouseMusic;
  private readonly synth: Music;
  readonly playlist: Playlist;
  private cur: MusicDeck | null = null;
  private curItem = -1;
  private style: MusicStyle | '' = '';
  private skip = MUSIC_SOURCE.skip;
  private swept = false;

  constructor(bus: AudioBus, rnd: () => number = Math.random) {
    this.bus = bus;
    this.houseA = new HouseMusic(bus);
    this.houseB = new HouseMusic(bus);
    this.synth = new Music(bus);
    this.playlist = new Playlist(rnd);
  }

  /** Call every frame; `intensity` 0..1 (speed). Allocation-free except when a song starts. */
  update(intensity: number): void {
    if (this.bus.ctx.state === 'running') this.direct();
    this.houseA.update(intensity);
    this.houseB.update(intensity);
    this.synth.update(intensity);
  }

  /** Starts `item` from `fromBar` right now (lab renders; also the first song). */
  play(item: number, fromBar: number, fadeSecs: number): void {
    const deck = item === SYNTH_ITEM ? this.synth : this.cur === this.houseA ? this.houseB : this.houseA;
    if (this.cur && this.cur !== deck) this.cur.end(fadeSecs);
    deck.begin(item, fromBar, fadeSecs);
    this.cur = deck;
    this.curItem = item;
    this.swept = false;
    this.playlist.markPlayed(item);
    MUSIC_SOURCE.song = deck.name;
    MUSIC_SOURCE.onSong?.(deck.name);
  }

  private direct(): void {
    if (this.style !== MUSIC_SOURCE.style) {
      this.style = MUSIC_SOURCE.style;
      this.playlist.setItems(styleItems(this.style));
      if (this.cur && !this.playlist.has(this.curItem)) this.handOver(SKIP_FADE);
    }
    if (this.skip !== MUSIC_SOURCE.skip) {
      this.skip = MUSIC_SOURCE.skip;
      this.handOver(SKIP_FADE);
    }
    const c = this.cur;
    if (!c || !c.active) {
      this.handOver(c ? 0.3 : 1.5); // first song, or the deck ran out (should not happen: handed over earlier)
      return;
    }
    const left = c.secondsLeft(), bar = c.barSeconds();
    if (!this.swept && left < SWEEP_BARS * bar) {
      this.swept = true;
      c.sweep(left);
    }
    if (left < OVERLAP_BARS * bar) this.handOver(left);
  }

  /** The next song from the bag takes over within `secs`; a playlist of one plays the same song on. */
  private handOver(secs: number): void {
    const item = this.playlist.next();
    if (item < 0) return;
    if (item === this.curItem && this.cur?.active) {
      this.cur.extend();
      this.swept = false;
      return;
    }
    this.play(item, 0, secs);
  }
}
