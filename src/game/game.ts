import { aiTuning } from '../data/rivals';
import { ChaseCam } from '../camera/chaseCam';
import { CinematicCam } from '../camera/cinematicCam';
import { createIntroShots } from '../camera/shots';
import { RaceManager, type RaceResult, type Racer } from '../core/raceManager';
import type { CarSpec } from '../data/cars';
import { applyTuning } from '../physics/carTuning';
import { fillEnv, LEVELS, type PhysicsEnv, type PhysicsLevel } from '../physics/weatherLevels';
import type { CarInput, CarState, GameState, RaceTelemetry, Weather } from '../types/game';
import { createNeutralInput } from '../types/game';
import type { ResultsExtra } from '../ui/results';
import { STAGE } from '../world/stage';
import type { GameDeps, RaceSetup } from './gameTypes';
import { RacerViews } from './racerViews';
import { createTelemetry, createViewState, recordImpact } from './telemetry';
import { findTrackDef } from '../data/tracks';
import { applyBuild } from '../data/carBuild';
import { applyWeather } from './weatherApply';
import { ShowroomCam } from './showroomCam';

/** Race orchestrator: GameState machine, race manager, car views, cameras, HUD. */
export class Game {
  state: GameState = 'MENU';
  weather: Weather = 'CLEAR';
  weatherIntensity = 1;
  physicsLevel: PhysicsLevel = 'AGGRESSIVE';
  private readonly env: PhysicsEnv = fillEnv({ name: 'CLEAR', grip: 1, fogDensity: 0, fogColor: 0, precipitation: 0, roadRoughness: 0, level: 'AGGRESSIVE', yawDampMul: 1, assistMul: 1, rearGripMul: 1, intensity: 1 }, 'CLEAR', 'AGGRESSIVE');
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
  onStartRace: (() => void) | null = null;
  plan: { at: number; to: Weather } | null = null;
  readonly ctl: CarInput = createNeutralInput();
  readonly impact = { strength: 0, x: 0, z: 0 };
  onImpact: ((strength: number) => void) | null = null;
  private readonly d: GameDeps;
  private readonly view: CarState = createViewState();
  private intro: CinematicCam | null = null;
  setup: RaceSetup | null = null;
  paused = false;
  readonly showroomCam = new ShowroomCam();

  constructor(d: GameDeps) {
    this.d = d;
    this.rm = new RaceManager(d.world.track, 3, d.world.obstacles, d.world.surfaces);
    this.chase = new ChaseCam(d.engine.camera);
    this.chase.setTarget(this.view);
    this.views = new RacerViews(d.engine.scene, d.world.env);
    d.engine.onFixedUpdate(this.fixed);
    d.engine.onFrame(this.frame);
  }

  get player(): Racer {
    return this.rm.player;
  }

  get world(): GameDeps['world'] {
    return this.d.world;
  }

  setWeather(w: Weather): void {
    this.weather = w;
    if (this.state === 'RACING' || this.state === 'CINEMATIC') this.weatherIntensity = w === 'CLEAR' ? 1 : 0.2; // build-up restarts
    applyWeather(this.d.engine, this.d.hud, this.d.world, w);
    this.d.world.surfaces.setConditions(w, this.physicsLevel, this.weatherIntensity);
    this.d.world.syncSurfaces(w);
  }

  startRace(s: RaceSetup): void {
    this.paused = false;
    this.onStartRace?.();
    this.setup = s;
    this.d.results.hide();
    this.views.clear();
    this.d.world.load(findTrackDef(s.trackId ?? 'kestrel'));
    this.rm = new RaceManager(this.d.world.track, s.laps, this.d.world.obstacles, this.d.world.surfaces);
    applyTuning(this.d.tuning, s.car.tuning);
    applyBuild(this.d.tuning, s.car.id);
    this.rm.addRacer('player', 'You', this.d.tuning, null, true);
    s.agents.forEach((a, i) => this.rm.addRacer(`ai${i}`, a.agent.name, aiTuning(a.car, a.upgrades), a.agent)); // own car + its upgrades, nothing inherited from the player
    // views in racer order so index lines up
    this.rm.racers.forEach((r, i) => (r.isPlayer ? this.views.add(r, s.car, s.paint, s.glow) : this.views.add(r, s.agents[i - 1].car, s.agents[i - 1].paint, s.agents[i - 1].glow)));
    this.setWeather(s.weather);
    this.weatherIntensity = s.weather === 'CLEAR' ? 1 : 0.25; // rain and snow build up over ~20 s
    this.plan = s.weatherChange ?? null;
    this.rm.place((Math.random() * 65535) | 0);
    this.d.world.surfaces.setConditions(this.weather, this.physicsLevel, this.weatherIntensity);
    this.d.world.syncSurfaces(this.weather);
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
    this.rm = new RaceManager(this.d.world.track, 3, this.d.world.obstacles, this.d.world.surfaces);
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

  /** Copy the player pose to the camera target; `snap` jumps the camera there (after a restore). */
  syncView(snap = false): void {
    const v = this.views.views[0];
    const s = v.racer.car.state;
    this.view.position.x = v.x;
    this.view.position.z = v.z;
    this.view.position.y = v.holder.position.y;
    this.view.heading = v.heading;
    this.view.speed = s.speed;
    this.view.slipAngle = s.slipAngle;
    if (snap) this.chase.setTarget(this.view);
  }

  private readonly fixed = (dt: number): void => {
    if (this.state === 'CINEMATIC' || this.state === 'MENU' || this.paused) return;
    this.d.input.sample(this.ctl);
    const was = this.rm.phase;
    this.weatherIntensity = Math.min(1, this.weatherIntensity + dt / 20);
    this.d.world.surfaces.setConditions(this.weather, this.physicsLevel, this.weatherIntensity);
    this.rm.step(dt, this.ctl, fillEnv(this.env, this.weather, this.physicsLevel, this.weatherIntensity));
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
    const ps = this.rm.player.car.state;
    recordImpact(this.impact, pc.impact, pc.contact.x, pc.contact.z);
    recordImpact(this.impact, this.rm.carImpact, ps.position.x, ps.position.z);
    if (was === 'RACING' && this.rm.phase === 'FINISHED' && this.rm.result) {
      this.state = 'PODIUM';
      const extra = this.onFinish?.(this.rm.result) ?? undefined;
      this.d.results.show(this.rm.result, extra);
    }
  };

  private readonly frame = (alpha: number, frameDt: number): void => {
    this.views.rollScale = this.weather === 'CLEAR' ? 1 : 1.3 + 0.35 * LEVELS.indexOf(this.physicsLevel);
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

export type { GameDeps, RaceSetup };
