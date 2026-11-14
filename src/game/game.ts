import { Color, FogExp2 } from 'three';
import { ChaseCam } from '../camera/chaseCam';
import { CinematicCam } from '../camera/cinematicCam';
import { createIntroShots } from '../camera/shots';
import type { Engine } from '../core/engine';
import { RaceManager, type RaceResult, type Racer } from '../core/raceManager';
import type { CarSpec } from '../data/cars';
import { applyTuning, type CarTuning } from '../physics/carTuning';
import { WEATHER } from '../physics/weather';
import type { AIRacerAgent, CarInput, CarState, GameState, InputSource, RaceTelemetry, Weather } from '../types/game';
import { createNeutralInput } from '../types/game';
import type { Hud } from '../ui/hud';
import type { ResultsScreen } from '../ui/results';
import type { World } from '../world/world';
import { RacerViews } from './racerViews';

export interface RaceSetup {
  car: CarSpec;
  paint: number;
  weather: Weather;
  laps: number;
  /** Play the intro cinematic first (otherwise straight to the countdown). */
  cinematic: boolean;
  /** Opponents. Empty = time trial. */
  agents: { agent: AIRacerAgent; car: CarSpec; paint: number }[];
}

export interface GameDeps {
  engine: Engine;
  world: World;
  hud: Hud;
  results: ResultsScreen;
  input: InputSource;
  /** The player's live tuning object (shared with the dev panel). */
  tuning: CarTuning;
}

/** Race orchestrator: GameState machine, race manager, car views, cameras, HUD. */
export class Game {
  state: GameState = 'CINEMATIC';
  weather: Weather = 'CLEAR';
  rm: RaceManager;
  readonly chase: ChaseCam;
  readonly views: RacerViews;
  readonly telemetry: RaceTelemetry = {
    speedKph: 0, rpm: 0, redlineRpm: 7500, gear: 1, nitroLevel: 1, nitroActive: false, drifting: false,
    driftScore: 0, lap: 1, totalLaps: 3, position: 1, racerCount: 1, raceTime: 0,
  };
  /** Fires once when the player finishes. */
  onFinish: ((r: RaceResult) => void) | null = null;
  readonly ctl: CarInput = createNeutralInput();
  private readonly d: GameDeps;
  private readonly view: CarState = { position: { x: 0, y: 0, z: 0 }, heading: 0, velocity: { x: 0, y: 0, z: 0 }, speed: 0, yawRate: 0, slipAngle: 0 };
  private intro: CinematicCam | null = null;
  private setup: RaceSetup | null = null;
  private readonly bg = new Color();

  constructor(d: GameDeps) {
    this.d = d;
    this.rm = new RaceManager(d.world.track, 3);
    this.chase = new ChaseCam(d.engine.camera);
    this.chase.setTarget(this.view);
    this.views = new RacerViews(d.engine.scene, d.world.env);
    d.engine.onFixedUpdate(this.fixed);
    d.engine.onFrame(this.frame);
  }

  get player(): Racer {
    return this.rm.player;
  }

  setWeather(w: Weather): void {
    this.weather = w;
    const p = WEATHER[w];
    const fog = this.d.engine.scene.fog;
    if (fog instanceof FogExp2) {
      fog.density = p.fogDensity;
      fog.color.setHex(p.fogColor);
    }
    this.d.engine.scene.background = this.bg.setHex(p.fogColor);
    this.d.hud.setWeather(w);
    this.d.world.setWeather(p);
  }

  startRace(s: RaceSetup): void {
    this.setup = s;
    this.d.results.hide();
    this.views.clear();
    this.rm = new RaceManager(this.d.world.track, s.laps);
    applyTuning(this.d.tuning, s.car.tuning);
    this.rm.addRacer('player', 'You', this.d.tuning, null, true);
    s.agents.forEach((a, i) => this.rm.addRacer(`ai${i}`, a.agent.name, applyTuning({ ...this.d.tuning }, a.car.tuning), a.agent));
    // views in racer order so index lines up
    this.rm.racers.forEach((r, i) => (r.isPlayer ? this.views.add(r, s.car, s.paint) : this.views.add(r, s.agents[i - 1].car, s.agents[i - 1].paint)));
    this.setWeather(s.weather);
    this.rm.place();
    this.views.update(0, 0);
    this.syncView();
    this.chase.setTarget(this.view);
    this.telemetry.redlineRpm = this.d.tuning.redlineRpm;
    if (s.cinematic) {
      this.state = 'CINEMATIC';
      this.intro = new CinematicCam({ camera: this.d.engine.camera, subject: this.views.views[0].holder, shots: createIntroShots(), handover: () => this.chase.pose });
      this.intro.onShotChange = () => this.d.engine.kickBloom(0.7);
      this.intro.onComplete = () => this.goRacing();
      this.intro.start();
    } else {
      this.goRacing();
    }
  }

  restart(): void {
    if (this.setup) this.startRace({ ...this.setup, cinematic: false });
  }

  skipIntro(): void {
    if (this.state === 'CINEMATIC') this.intro?.skip();
  }

  /** Reset-to-track: put the player on the nearest centre-line point, stopped. */
  resetToTrack(): void {
    const p = this.player;
    p.contact.place(p.car, p.contact.nearestIndex(p.car));
    p.laps.teleport(p.contact.hit.index);
  }

  private goRacing(): void {
    this.state = 'RACING';
    this.intro = null;
    this.rm.begin();
  }

  private syncView(): void {
    const v = this.views.views[0];
    const s = v.racer.car.state;
    this.view.position.x = v.x;
    this.view.position.z = v.z;
    this.view.heading = v.heading;
    this.view.speed = s.speed;
    this.view.slipAngle = s.slipAngle;
  }

  private readonly fixed = (dt: number): void => {
    if (this.state === 'CINEMATIC') return;
    this.d.input.sample(this.ctl);
    const was = this.rm.phase;
    this.rm.step(dt, this.ctl, this.weather);
    this.views.fixedStep(dt);
    if (was === 'RACING' && this.rm.phase === 'FINISHED' && this.rm.result) {
      this.state = 'PODIUM';
      this.d.results.show(this.rm.result);
      this.onFinish?.(this.rm.result);
    }
  };

  private readonly frame = (alpha: number, frameDt: number): void => {
    this.views.update(alpha, frameDt);
    this.syncView();
    const p = this.rm.player;
    this.chase.setNitro(p.car.drivetrain.nitroActive);
    if (this.state === 'CINEMATIC') {
      this.chase.step(frameDt);
      this.intro?.update(frameDt);
    } else this.chase.update(frameDt);
    p.car.fillTelemetry(this.telemetry);
    this.rm.fillTelemetry(this.telemetry);
    this.d.hud.setBanner(this.rm.banner);
    this.d.hud.update(this.telemetry);
  };
}
