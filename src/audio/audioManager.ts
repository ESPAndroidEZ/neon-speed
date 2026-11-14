import { smoothstep } from '../core/math';
import type { Game } from '../game/game';
import { WEATHER } from '../physics/weather';
import { AudioBus } from './audioBus';
import { EngineSynth } from './engineSynth';
import { Music } from './music';
import { Sfx } from './sfx';

/** Owns all procedural audio and feeds it from the game each frame. M toggles mute. */
export class AudioManager {
  readonly bus = new AudioBus();
  private readonly engine: EngineSynth;
  private readonly sfx: Sfx;
  private readonly music: Music;
  private readonly game: Game;
  private level = 0;

  constructor(game: Game) {
    this.game = game;
    this.engine = new EngineSynth(this.bus);
    this.sfx = new Sfx(this.bus);
    this.music = new Music(this.bus);
    game.onImpact = (s) => this.sfx.thump(s);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM' && !e.repeat) this.bus.toggleMute();
    });
  }

  /** Per display frame. */
  update(dt: number): void {
    const g = this.game;
    const t = g.telemetry;
    const car = g.rm.player.car;
    const speed = Math.abs(car.state.speed);
    const throttle = g.state === 'CINEMATIC' ? 0 : g.ctl.throttle;
    this.engine.update(dt, t.rpm, t.redlineRpm, throttle, g.state !== 'CINEMATIC');
    const slide = Math.max(smoothstep(0.15, 0.6, Math.abs(car.state.slipAngle)) * smoothstep(4, 12, speed), car.flags.wheelspin ? 0.5 : 0, car.flags.handbrake && speed > 6 ? 0.8 : 0);
    this.sfx.update(slide, speed, t.nitroActive, WEATHER[g.weather].precipitation, true);
    this.level += (smoothstep(5, 70, speed) + (t.nitroActive ? 0.25 : 0) - this.level) * Math.min(1, dt * 0.8);
    this.music.update(true, this.level);
  }
}
