/** One song player the MusicDirector can start, extend, sweep and fade (HouseMusic, Music). */
export interface MusicDeck {
  /** Schedules notes while true; turns false by itself when the song (or a forced end) is over. */
  readonly active: boolean;
  /** Title of the song this deck plays. */
  readonly name: string;
  /** Starts `item` from `fromBar`, fading in over `fadeSecs` (0 = at once). */
  begin(item: number, fromBar: number, fadeSecs: number): void;
  /** Fades out over `secs` and stops scheduling after that time (or at the song's end, if sooner). */
  end(secs: number): void;
  /** Closes the outro filter over `secs`. */
  sweep(secs: number): void;
  /** Plays the same song one more round (a playlist of one). */
  extend(): void;
  /** Seconds until the last scheduled step of the song; 0 when inactive. */
  secondsLeft(): number;
  /** Length of one bar in seconds. */
  barSeconds(): number;
  /** Call every frame; `intensity` 0..1 (speed). */
  update(intensity: number): void;
}

/**
 * Output stage of a deck: source -> outro lowpass -> fade gain -> music bus. Only setTargetAtTime is used (it starts
 * from whatever value the parameter has), so a fade or sweep that interrupts another never jumps (no clicks).
 */
export class DeckOut {
  /** Connect the deck's mix here. */
  readonly input: BiquadFilterNode;
  private readonly fade: GainNode;
  private readonly ctx: BaseAudioContext;

  constructor(ctx: BaseAudioContext, dest: AudioNode) {
    this.ctx = ctx;
    this.input = ctx.createBiquadFilter();
    this.input.type = 'lowpass';
    this.input.frequency.value = 20000;
    this.input.Q.value = 0.9;
    this.fade = ctx.createGain();
    this.fade.gain.value = 0;
    this.input.connect(this.fade).connect(dest);
  }

  /** Filter open, fade in over `secs` (about 98 % there at `secs`). */
  open(secs: number): void {
    const t = this.ctx.currentTime;
    this.input.frequency.setTargetAtTime(20000, t, 0.03);
    this.fade.gain.setTargetAtTime(1, t, Math.max(0.01, secs / 4));
  }

  /** Fade to silence over `secs` (-35 dB at `secs`). */
  close(secs: number): void {
    this.fade.gain.setTargetAtTime(0, this.ctx.currentTime, Math.max(0.01, secs / 4));
  }

  /** Outro filter sweep down to a muffled 300 Hz. */
  sweep(secs: number): void {
    this.input.frequency.setTargetAtTime(300, this.ctx.currentTime, Math.max(0.05, secs / 3));
  }
}
