import { wrapAngle } from '../../src/core/math.ts';
import { CARS } from '../../src/data/cars.ts';
import { TRACKS, buildTrack, findTrackDef } from '../../src/data/tracks/index.ts';
import '../../src/game/cityRaces.ts';
import { applyDriving, DRIVING, type AssistLevel } from '../../src/physics/assists.ts';
import { CarController } from '../../src/physics/carController.ts';
import { applyTuning, createDefaultTuning, type CarTuning } from '../../src/physics/carTuning.ts';
import { SurfaceMap } from '../../src/physics/surfaces.ts';
import { TrackContact } from '../../src/physics/trackContact.ts';
import { envFor } from '../../src/physics/weatherLevels.ts';
import type { Weather } from '../../src/types/game.ts';
import { layoutProps } from '../../src/world/propsLayout.ts';
import type { Track } from '../../src/world/track.ts';
import { Bot, type BotKind } from './bots.mts';

const D = 1 / 60;
export const WEATHERS: readonly Weather[] = ['CLEAR', 'RAIN', 'SNOW'];
const built = new Map<string, { track: Track; layout: ReturnType<typeof layoutProps> }>();
function world(id: string): { track: Track; layout: ReturnType<typeof layoutProps> } {
  let w = built.get(id);
  if (!w) {
    const def = findTrackDef(id); // fixed maps, and city maps through the resolver (game/cityRaces)
    const track = buildTrack(def);
    built.set(id, (w = { track, layout: layoutProps(track, 17, def.propsDensity) }));
  }
  return w;
}

export interface LapStats {
  laps: number; spins: number; stuck: number; hits: number;
  lapMean: number; lapSd: number;
  /** Share of moving time with |slip| above 0.15 rad, and slip percentiles (rad). */
  driftShare: number; slip90: number; slip99: number;
  /** Drift points banked plus the open chain at the end (drift maps). */
  driftPts: number;
}

export interface RunOpts { car: string; track: string; weather: Weather; bot: BotKind; laps?: number; seed?: number; assist?: AssistLevel; tune?: Partial<CarTuning>; mod?: (t: CarTuning, id: string) => void; trace?: string[] }

/** Drive `laps` laps with a bot and count what went wrong. Same step order as the race manager (car, then contact). */
export function runLaps(o: RunOpts): LapStats {
  const { track, layout } = world(o.track);
  const spec = CARS.find((c) => c.id === o.car)!;
  const tuning = applyTuning(createDefaultTuning(), { ...spec.tuning, ...o.tune });
  o.mod?.(tuning, o.car);
  const car = new CarController(tuning);
  const contact = new TrackContact(track);
  const surfaces = new SurfaceMap(track);
  surfaces.reseed(o.seed ?? 1);
  surfaces.setConditions(o.weather, 'AGGRESSIVE', 1);
  contact.obstacles = layout.obstacles;
  contact.surfaces = surfaces;
  const env = envFor(o.weather, 'AGGRESSIVE');
  const n = track.samples.length;
  contact.place(car, n - 3, 0);
  DRIVING.level = o.assist ?? 'STANDARD';
  const bot = new Bot(o.bot, track, car, env.grip, o.seed ?? 1);
  const want = o.laps ?? 4;
  const times: number[] = [];
  const hist = new Uint32Array(160); // |slip| in 0.01 rad bins
  let moving = 0;
  const log: string[] = [];
  let t = 0, lapStart = 0, spins = 0, stuck = 0, hits = 0, spinCool = 0, slow = 0, hitCool = 0, prev = contact.hit.index, armed = false, inSpin = false;
  while (times.length < want && t < want * 400) {
    const inp = bot.decide(D, car, contact.hit.index);
    applyDriving(car);
    car.step(D, inp, env);
    contact.update(car);
    t += D;
    if (o.trace && Math.round(t * 60) % 12 === 0) { log.push(`[s${inp.steer.toFixed(1)} t${inp.throttle.toFixed(0)}b${inp.brake.toFixed(0)}${inp.handbrake ? 'H' : ''}${car.flags.wheelspin ? 'W' : ''} ${(car.u * 3.6).toFixed(0)} a${car.state.slipAngle.toFixed(2)} g${car.surfaceGrip.toFixed(1)}${contact.impact > 2 ? '!' : ''}]`); if (log.length > 12) log.shift(); }
    const st = car.state;
    const sp = Math.abs(st.speed);
    const i = contact.hit.index;
    if (i > n * 0.4 && i < n * 0.6) armed = true;
    if (armed && prev > n * 0.9 && i < n * 0.1) { times.push(t - lapStart); lapStart = t; armed = false; }
    prev = i;
    const tg = track.samples[i].tangent;
    const off = Math.abs(wrapAngle(st.heading - Math.atan2(tg.x, tg.z)));
    const vel = Math.hypot(st.velocity.x, st.velocity.z);
    const slip = vel > 6 ? Math.abs(Math.atan2(car.v, Math.abs(car.u) + 0.01)) : 0;
    if (vel > 6) { moving++; hist[Math.min(159, Math.floor(slip * 100))]++; }
    hitCool -= D;
    // One event per loss of control: latched until the car has been pointing down the road again for half a second.
    const lost = (vel > 6 && slip > 1.2) || off > 1.75;
    if (lost && !inSpin && t > 3) { spins++; inSpin = true; o.trace?.push(`t${t.toFixed(1)} i${i} v${(vel * 3.6).toFixed(0)} ${log.join(' ')}`); }
    spinCool = off < 0.6 && slip < 0.3 ? spinCool + D : 0;
    if (inSpin && spinCool > 0.5) inSpin = false;
    if (hitCool <= 0 && contact.impact > 4) { hits++; hitCool = 1; }
    slow = sp < 1.5 && t > 4 ? slow + D : 0;
    if (slow > 3) { stuck++; slow = 0; o.trace?.push(`STUCK t${t.toFixed(1)} i${contact.nearestIndex(car)} ${log.join(' ')}`); contact.place(car, contact.nearestIndex(car), 0); }
  }
  const pct = (p: number): number => { let acc = 0; for (let k = 0; k < 160; k++) { acc += hist[k]; if (acc >= moving * p) return k / 100; } return 1.6; };
  let drift = 0;
  for (let k = 15; k < 160; k++) drift += hist[k];
  const mean = times.reduce((a, b) => a + b, 0) / Math.max(1, times.length);
  const sd = Math.sqrt(times.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, times.length));
  DRIVING.level = 'STANDARD';
  return { laps: times.length, spins, stuck, hits, lapMean: mean || 999, lapSd: sd, driftShare: drift / Math.max(1, moving), slip90: pct(0.9), slip99: pct(0.99), driftPts: car.drift.bank + car.drift.chain };
}
