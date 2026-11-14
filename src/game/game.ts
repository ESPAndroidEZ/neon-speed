import { ChaseCam } from '../camera/chaseCam';
import { CinematicCam } from '../camera/cinematicCam';
import { createIntroShots } from '../camera/shots';
import type { Engine } from '../core/engine';
import { RaceManager, type RaceResult, type Racer } from '../core/raceManager';
import type { CarSpec } from '../data/cars';
import { applyTuning, type CarTuning } from '../physics/carTuning';
import type { AIRacerAgent, CarInput, CarState, GameState, InputSource, RaceTelemetry, Weather } from '../types/game';
import { createNeutralInput } from '../types/game';
import type { Hud } from '../ui/hud';
import type { ResultsExtra, ResultsScreen } from '../ui/results';
import type { World } from '../world/world';
import { STAGE } from '../world/stage';
import { RacerViews } from './racerViews';
import { createTelemetry, createViewState } from './telemetry';
import { applyWeather } from './weatherApply';
import { ShowroomCam } from './showroomCam';

export interface RaceSetup {
  car: CarSpec;
  paint: number;
  glow?: number;
  weather: Weather;
  /** Switch weather mid-race after this many seconds of racing. */
  weatherChange?: { at: number; to: Weather };
  laps: number;
  /** Play the intro cinematic first (otherwise straight to the countdown). */
  cinematic: boolean;
  agents: { agent: AIRacerAgent; car: CarSpec; paint: number }[];
}

export interface GameDeps {
  engine: Engine;
  world: World;
  hud: Hud;
  results: ResultsScreen;
  input: InputSource;
  tuning: CarTuning;
}

/** Race orchestrator: GameState machine, race manager, car views, cameras, HUD. */
export class Game {
  state: GameState = 'MENU';
  weather: Weather = 'CLEAR';
  rm: RaceManager;
  readonly chase: ChaseCam;
  readonly views: RacerViews;
  readonly telemetry: RaceTelemetry = createTelemetry();
  /** Fires once at the finish; may return an objective verdict and buttons for the results screen. */
  onFinish: ((r: RaceResult) => ResultsExtra | void) | null = null;
  onIntroStart: (() => void) | null = null;
  onIntroEnd: (() => void) | null = null;
  onCountdown: (() => void) | null = null;
  onWeatherChange: ((w: Weather) => void) | null = null;
  private plan: { at: number; to: Weather } | null = null;
  readonly ctl: CarInput = createNeutralInput();
  readonly impact = { strength: 0, x: 0, z: 0 };
  /** Fired on every hit step with the closing speed (audio). */
  onImpact: ((strength: number) => void) | null = null;
  private readonly d: GameDeps;
  private readonly view: CarState = createViewState();
  private intro: CinematicCam | null = null;
  private setup: RaceSetup | null = null;
  readonly showroomCam = new ShowroomCam();

  constructor(d: GameDeps) {
    this.d = d;
    this.rm = new RaceManager(d.world.track, 3, d.world.obstacles);
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
    applyWeather(this.d.engine, this.d.hud, this.d.world, w);
  }

  startRace(s: RaceSetup): void {
    this.setup = s;
    this.d.results.hide();
    this.views.clear();
    this.rm = new RaceManager(this.d.world.track, s.laps, this.d.world.obstacles);
    applyTuning(this.d.tuning, s.car.tuning);
    this.rm.addRacer('player', 'You', this.d.tuning, null, true);
    s.agents.forEach((a, i) => this.rm.addRacer(`ai${i}`, a.agent.name, applyTuning({ ...this.d.tuning }, a.car.tuning), a.agent));
    // views in racer order so index lines up
    this.rm.racers.forEach((r, i) => (r.isPlayer ? this.views.add(r, s.car, s.paint, s.glow) : this.views.add(r, s.agents[i - 1].car, s.agents[i - 1].paint)));
    this.setWeather(s.weather);
    this.plan = s.weatherChange ?? null;
    this.rm.place();
    this.views.update(0, 0);
    this.syncView();
    this.chase.setTarget(this.view);
    this.telemetry.redlineRpm = this.d.tuning.redlineRpm;
    if (s.cinematic) {
      this.state = 'CINEMATIC';
      this.intro = new CinematicCam({ camera: this.d.engine.camera, subject: this.views.views[0].holder, shots: createIntroShots(), handover: () => this.chase.pose });
      this.intro.onShotChange = () => this.d.engine.kickBloom(0.7);
      this.intro.onComplete = () => {
        this.onIntroEnd?.();
        this.goRacing();
      };
      this.intro.start();
      this.onIntroStart?.();
    } else {
      this.goRacing();
    }
  }

  /** Menu / garage backdrop: one car on the grid, camera orbiting. */
  showroom(car: CarSpec, paint: number, glow?: number): void {
    this.state = 'MENU';
    this.d.results.hide();
    this.views.clear();
    this.rm = new RaceManager(this.d.world.track, 3, this.d.world.obstacles);
    applyTuning(this.d.tuning, car.tuning);
    this.rm.addRacer('player', 'You', this.d.tuning, null, true);
    this.views.add(this.rm.player, car, paint, glow);
    this.rm.place();
    this.rm.player.car.reset(STAGE.x, STAGE.z, 0.5);
    this.views.update(0, 0);
  }

  restart(): void {
    if (this.setup) this.startRace({ ...this.setup, cinematic: false });
  }

  fastForward(seconds: number): void {
    if (this.state === 'CINEMATIC') this.goRacing();
    for (let i = 0; i < seconds * 60; i++) this.fixed(1 / 60);
  }

  skipIntro(): void {
    if (this.state === 'CINEMATIC') this.intro?.skip();
  }

  resetToTrack(): void {
    const p = this.player;
    p.contact.place(p.car, p.contact.nearestIndex(p.car));
    p.laps.teleport(p.contact.hit.index);
  }

  private goRacing(): void {
    this.state = 'RACING';
    this.intro = null;
    this.rm.begin();
    this.onCountdown?.();
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
    if (this.state === 'CINEMATIC' || this.state === 'MENU') return;
    this.d.input.sample(this.ctl);
    const was = this.rm.phase;
    this.rm.step(dt, this.ctl, this.weather);
    if (this.plan && this.rm.phase === 'RACING' && this.rm.raceTime > this.plan.at) {
      const to = this.plan.to;
      this.plan = null;
      this.setWeather(to);
      this.onWeatherChange?.(to);
    }
    this.views.fixedStep(dt);
    const hit = Math.max(this.rm.player.contact.impact, this.rm.carImpact);
    if (hit > 0.8) this.onImpact?.(hit);
    const pc = this.rm.player.contact;
    if (pc.impact > this.impact.strength) {
      this.impact.strength = pc.impact;
      this.impact.x = pc.contact.x;
      this.impact.z = pc.contact.z;
    }
    if (this.rm.carImpact > this.impact.strength) {
      const ps = this.rm.player.car.state;
      this.impact.strength = this.rm.carImpact;
      this.impact.x = ps.position.x;
      this.impact.z = ps.position.z;
    }
    if (was === 'RACING' && this.rm.phase === 'FINISHED' && this.rm.result) {
      this.state = 'PODIUM';
      const extra = this.onFinish?.(this.rm.result) ?? undefined;
      this.d.results.show(this.rm.result, extra);
    }
  };

  private readonly frame = (alpha: number, frameDt: number): void => {
    this.views.update(alpha, frameDt);
    this.syncView();
    if (this.state === 'MENU') {
      const v = this.views.views[0];
      this.showroomCam.update(this.d.engine.camera, frameDt, v.x, v.z);
      return;
    }
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
