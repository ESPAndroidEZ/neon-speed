import { applyDriving } from '../physics/assists';
import { CarController } from '../physics/carController';
import { resolveField, unstick } from './raceContacts';
import type { CarTuning } from '../physics/carTuning';
import type { ObstacleField } from '../physics/obstacles';
import { TrackContact } from '../physics/trackContact';
import { WEATHER } from '../physics/weather';
import type { PhysicsEnv } from '../physics/weatherLevels';
import type { SurfaceMap } from '../physics/surfaces';
import type { Track } from '../world/track';
import type { AIRacerAgent, AIWorldView, CarInput, CarState, RaceTelemetry, Weather, WeatherProfile } from '../types/game';
import { createNeutralInput } from '../types/game';
import { LapCounter } from './lapCounter';
import { restoreRace, snapshotRace } from './raceSnapshot';
import { buildResult, positionOf, type RaceResult, type Racer } from './raceResult';

export type { RaceResult, Racer };

export type RacePhase = 'GRID' | 'COUNTDOWN' | 'RACING' | 'FINISHED';

export const COUNTDOWN_SECONDS = 3;
const GO_FLASH = 0.8;
const COAST_BRAKE = 0.6;

/**
 * Grid start, 3-2-1 countdown, laps, timing, positions and finish. Works with zero AI (time trial).
 * Steps the physics of every racer; the caller feeds the player's input. Pure TS, no rendering.
 */
export class RaceManager {
  readonly racers: Racer[] = [];
  readonly totalLaps: number;
  phase: RacePhase = 'GRID';
  /** Seconds left in the countdown (3 -> 0). */
  countdown = COUNTDOWN_SECONDS;
  /** Seconds since GO. */
  raceTime = 0;
  /** Cumulative closing speed of the latest car-car or wall hit this step, for juice and audio. */
  carImpact = 0;
  result: RaceResult | null = null;
  finishCount = 0;
  private readonly states: CarState[] = [];
  private readonly view: AIWorldView;
  private readonly track: Track;
  private readonly obstacles: ObstacleField | null;
  private readonly surfaces: SurfaceMap | null;
  private playerIdx = 0;

  constructor(track: Track, totalLaps = 3, obstacles: ObstacleField | null = null, surfaces: SurfaceMap | null = null) {
    this.track = track;
    this.obstacles = obstacles;
    this.surfaces = surfaces;
    this.totalLaps = totalLaps;
    this.view = { track: track.samples, racers: this.states, playerIndex: 0, grip: 1 };
  }

  snapshot(): ReturnType<typeof snapshotRace> {
    return snapshotRace(this);
  }

  restore(d: ReturnType<typeof snapshotRace>): void {
    restoreRace(this, d);
  }

  get player(): Racer {
    return this.racers[this.playerIdx];
  }

  /** Add a racer. Call before `start`. The player's tuning object is used as given (live-tunable). */
  addRacer(id: string, name: string, tuning: CarTuning, agent: AIRacerAgent | null, isPlayer = false): Racer {
    const car = new CarController(tuning);
    const contact = new TrackContact(this.track);
    contact.obstacles = this.obstacles;
    contact.surfaces = this.surfaces;
    const r: Racer = {
      id, name, isPlayer, car, contact, laps: new LapCounter(this.track), agent,
      input: createNeutralInput(), finished: false, finishTime: 0, lapStart: 0, bestLap: Infinity, finishRank: 0, stuck: 0, progress: 0,
    };
    if (isPlayer) {
      this.playerIdx = this.racers.length;
      this.view.playerIndex = this.playerIdx;
    }
    this.racers.push(r);
    this.states.push(car.state);
    return r;
  }

  /** Reset everyone onto the grid (player last). The countdown does not run yet: see begin(). */
  place(seed = 1): void {
    this.surfaces?.reseed(seed);
    const n = this.track.samples.length;
    const order = this.racers.filter((r) => !r.isPlayer);
    order.push(...this.racers.filter((r) => r.isPlayer));
    order.forEach((r, slot) => {
      const row = Math.floor(slot / 2);
      const idx = (n - 3 - row * 3 + n) % n;
      r.contact.place(r.car, idx, slot % 2 === 0 ? -2.6 : 2.6);
      r.laps.reset(idx);
      r.progress = r.laps.total;
      r.stuck = 0;
      r.finished = false;
      r.finishTime = 0;
      r.finishRank = 0;
      r.lapStart = 0;
      r.bestLap = Infinity;
    });
    this.phase = 'GRID';
    this.countdown = COUNTDOWN_SECONDS;
    this.raceTime = 0;
    this.finishCount = 0;
    this.result = null;
  }

  /** Start the 3-2-1 countdown. */
  begin(): void {
    this.phase = 'COUNTDOWN';
    this.countdown = COUNTDOWN_SECONDS;
  }

  /** place() + begin(). */
  start(): void {
    this.place();
    this.begin();
  }

  /** Text for the big centre banner ('' when nothing to show). */
  get banner(): string {
    if (this.phase === 'COUNTDOWN') return String(Math.ceil(this.countdown));
    if (this.phase === 'RACING' && this.raceTime < GO_FLASH) return 'GO!';
    return '';
  }

  /** `weather` is a name (full-strength profile) or a ready physics environment (level, ramp-in). */
  step(dt: number, playerInput: CarInput, weather: Weather | WeatherProfile | PhysicsEnv): void {
    this.carImpact = 0;
    if (this.phase === 'GRID') return;
    const w = typeof weather === 'string' ? WEATHER[weather] : weather;
    this.view.grip = w.grip;
    if (this.phase === 'COUNTDOWN') {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.phase = 'RACING';
        this.raceTime = 0;
      }
    } else this.raceTime += dt;
    const live = this.phase !== 'COUNTDOWN';

    for (const r of this.racers) {
      const inp = r.input;
      if (!live) continue; // locked on the grid: nobody moves until GO
      if (r.finished) {
        // coast to a stop (no brake once stopped, or the car would reverse)
        inp.throttle = 0; inp.brake = r.car.state.speed > 1.5 ? COAST_BRAKE : 0; inp.steer = 0; inp.handbrake = false; inp.nitro = false;
      } else if (r.isPlayer) {
        Object.assign(inp, playerInput);
        applyDriving(r.car);
      } else if (r.agent) {
        Object.assign(inp, r.agent.decide(dt, r.car.state, this.view));
      }
      r.car.step(dt, inp, w);
      r.contact.update(r.car);
      if (!r.isPlayer && !r.finished) unstick(r, dt);
      this.carImpact = Math.max(this.carImpact, r.contact.impact);
    }
    this.carImpact = Math.max(this.carImpact, resolveField(this.racers));
    if (live) this.updateLaps();
  }

  private updateLaps(): void {
    for (const r of this.racers) {
      if (r.finished) continue;
      const before = r.laps.laps;
      r.laps.update(r.contact.hit.index);
      if (r.laps.laps > before) {
        r.bestLap = Math.min(r.bestLap, this.raceTime - r.lapStart);
        r.lapStart = this.raceTime;
      }
      if (r.laps.laps >= this.totalLaps) {
        r.finished = true;
        r.finishTime = this.raceTime;
        r.finishRank = ++this.finishCount;
      }
    }
    if (this.player.finished && this.phase === 'RACING') {
      this.phase = 'FINISHED';
      this.result = buildResult(this.racers, this.player, this.totalLaps);
    }
  }

  /** 1-based race position of a racer: finishers by finish order, then by distance driven. */
  positionOf(r: Racer): number {
    return positionOf(this.racers, r);
  }

  /** Lap currently being driven (1-based, capped at totalLaps) for the player. */
  get playerLap(): number {
    return Math.min(this.totalLaps, this.player.laps.laps + 1);
  }

  fillTelemetry(t: RaceTelemetry): void {
    t.lap = this.playerLap;
    t.totalLaps = this.totalLaps;
    t.position = this.positionOf(this.player);
    t.racerCount = this.racers.length;
    t.raceTime = this.raceTime;
  }
}
