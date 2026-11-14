import { smoothstep } from '../core/math';
import type { Game } from '../game/game';
import { EV_BACKFIRE, EV_CUT, EV_DOWNSHIFT, EV_LIFT, EV_UPSHIFT, EventReader } from '../physics/driveEvents';
import { WEATHER } from '../physics/weather';
import { AudioBus } from './audioBus';
import { AUDIO } from './audioParams';
import { createOscillatorVoice, createWorkletVoice, type EngineVoice } from './engineVoice';
import { Music } from './music';
import { RivalEngines } from './rivalEngines';
import { Sfx } from './sfx';
import { TurboSound } from './turboSound';

const LAYOUT = { i4: 0, v6: 1, i6: 2, rotary: 3 } as const;

/** Things the K panel can trigger without driving. */
export type AudioTest = 'sweep' | 'upshift' | 'lift' | 'backfire' | 'squeal' | 'nitro' | 'flutter' | 'crash';

/** Owns all procedural audio and feeds it from the game each frame. M toggles mute. */
export class AudioManager {
  readonly bus = new AudioBus();
  private voice: EngineVoice | null = null;
  private readonly sfx: Sfx;
  private readonly turbo: TurboSound;
  private readonly music: Music;
  private readonly rivals: RivalEngines;
  private readonly game: Game;
  private level = 0;
  private reader = new EventReader();
  private lastDtn: unknown = null;
  private lastPedal = 0;
  private lastSurface = 'dry';
  private testT = 0;
  private test: AudioTest | null = null;
  private lastPos = { x: 0, z: 0 };
  private readonly vel = { x: 0, z: 0 };
  /** Which engine implementation is running (for the K panel). */
  engineKind: 'worklet' | 'oscillator' | 'loading' = 'loading';

  constructor(game: Game) {
    this.game = game;
    this.sfx = new Sfx(this.bus);
    this.turbo = new TurboSound(this.bus);
    this.music = new Music(this.bus);
    this.rivals = new RivalEngines(this.bus);
    game.onImpact = (s) => this.sfx.crash(s);
    void this.initEngine();
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM' && !e.repeat) this.bus.toggleMute();
    });
  }

  private async initEngine(): Promise<void> {
    const w = await createWorkletVoice(this.bus.ctx);
    this.voice = w ?? createOscillatorVoice(this.bus.ctx);
    this.engineKind = w ? 'worklet' : 'oscillator';
    console.info(`[audio] engine voice: ${this.engineKind}`);
    this.voice.out.connect(this.bus.sfx);
  }

  /** Trigger a test sound (K panel). */
  play(kind: AudioTest): void {
    void this.bus.ctx.resume();
    if (kind === 'upshift') {
      this.turbo.bov(0.9);
      this.turbo.clunk();
      this.turbo.pop(0.6);
    } else if (kind === 'lift') this.turbo.bov(1);
    else if (kind === 'backfire') this.turbo.pop(0.9);
    else if (kind === 'flutter') this.turbo.flutter(1);
    else if (kind === 'crash') this.sfx.crash(14);
    else {
      this.test = kind;
      this.testT = 0;
    }
  }

  /** Per display frame. */
  update(dt: number): void {
    const g = this.game;
    const t = g.telemetry;
    const racer = g.rm.player;
    const car = racer.car;
    const dtn = car.drivetrain;
    const view = g.views.views.find((v) => v.racer.isPlayer);
    const spec = view?.spec;
    const speed = Math.abs(car.state.speed);
    const inGame = g.state !== 'MENU' && !g.paused;
    const pedal = g.state === 'RACING' && g.rm.phase !== 'COUNTDOWN' ? g.ctl.throttle : 0;

    // camera velocity for Doppler
    const cam = this.game.chase.camera.position;
    if (dt > 0) {
      this.vel.x = (cam.x - this.lastPos.x) / dt;
      this.vel.z = (cam.z - this.lastPos.z) / dt;
    }
    this.lastPos.x = cam.x;
    this.lastPos.z = cam.z;
    if (Math.hypot(this.vel.x, this.vel.z) > 150) this.vel.x = this.vel.z = 0; // teleports

    // test overrides
    let rpm = t.rpm;
    let load = pedal;
    let slide = Math.max(smoothstep(0.15, 0.6, Math.abs(car.state.slipAngle)) * smoothstep(4, 12, speed), car.flags.wheelspin ? 0.5 : 0, car.flags.handbrake && speed > 6 ? 0.8 : 0);
    let nitro = t.nitroActive;
    let boost = dtn.boost;
    if (this.test) {
      this.testT += dt;
      if (this.test === 'sweep') {
        rpm = 1000 + Math.min(1, this.testT / 4) * 6500;
        load = 1;
        boost = Math.min(1, this.testT / 2.5);
      } else if (this.test === 'squeal') slide = 1;
      else if (this.test === 'nitro') nitro = true;
      if (this.testT > (this.test === 'sweep' ? 4.5 : 2)) this.test = null;
    }

    if (this.voice) {
      const layout = spec ? LAYOUT[spec.sound.layout] : 0;
      this.voice.set(rpm, load, layout, rpm >= t.redlineRpm * 0.995 && load > 0.5, pedal < 0.05 && speed > 8 ? 1 : 0, (inGame ? 1 : 0) * AUDIO.engineVolume);
    }
    this.turbo.setKind(spec?.sound.turbo ?? 'none');
    this.turbo.update(boost, rpm, inGame);

    // drivetrain events -> turbo and exhaust sounds
    if (this.lastDtn !== dtn) {
      this.lastDtn = dtn;
      this.reader = dtn.events.createReader(); // only events from now on
    }
    const hasTurbo = (spec?.sound.turbo ?? 'none') !== 'none';
    dtn.events.drain((type, value) => {
      if (!inGame) return;
      if (type === EV_UPSHIFT) {
        this.turbo.clunk();
        if (hasTurbo) this.turbo.bov(Math.max(0.35, value));
        else this.turbo.pop(0.2);
      } else if (type === EV_DOWNSHIFT) this.turbo.clunk();
      else if (type === EV_LIFT) {
        if (hasTurbo) this.turbo.bov(value);
      } else if (type === EV_BACKFIRE) this.turbo.pop(value);
      else if (type === EV_CUT) this.turbo.pop(0.5);
    }, this.reader);
    // partial lift with boost: compressor flutter
    if (hasTurbo && this.lastPedal > 0.75 && pedal > 0.15 && pedal < 0.6 && dtn.boost > 0.5) this.turbo.flutter(dtn.boost);
    this.lastPedal = pedal;

    // surface sounds
    const surf = racer.contact.surface.kind;
    if (surf === 'puddle' && this.lastSurface !== 'puddle' && speed > 6) this.sfx.splash(speed);
    this.lastSurface = surf;
    this.sfx.update(slide, speed, g.weather, nitro, WEATHER[g.weather].precipitation * g.weatherIntensity, inGame);
    this.rivals.update(g.views.views, this.game.chase.camera, this.vel, g.state === 'RACING' || g.state === 'PODIUM');
    this.bus.setChaseCutoff(g.state === 'RACING' ? 8500 - smoothstep(20, 80, speed) * 1500 : 16000);

    this.level += (smoothstep(5, 70, speed) + (nitro ? 0.25 : 0) - this.level) * Math.min(1, dt * 0.8);
    this.music.update(true, this.level);
  }
}
