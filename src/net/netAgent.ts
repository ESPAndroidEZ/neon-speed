import type { Racer } from '../core/raceResult';
import { createNeutralInput, type AIRacerAgent, type CarInput } from '../types/game';
import type { NetState } from './protocol';

/** Extra look-ahead for the one-way network delay (s). */
const LATENCY = 0.06;
/** Further apart than this (m) and the car jumps instead of sliding over. */
const SNAP_M = 9;
/** Share of the position / heading error removed per 1/60 s step. */
const PULL = 0.14;
/** No packet for this long (s): the player is gone or frozen, the car brakes. */
const STALE_S = 1.5;

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Drives another player's car: replays their latest input through the same physics, and every step pulls the car toward
 * where their last packet says it is now (extrapolated by the packet age). Small errors slide away; big ones snap.
 */
export class NetAgent implements AIRacerAgent {
  readonly id: string;
  readonly name: string;
  readonly skill = 1;
  racer: Racer | null = null;
  last: NetState | null = null;
  private at = 0;
  private readonly out: CarInput = createNeutralInput();

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  receive(s: NetState): void {
    this.last = s;
    this.at = performance.now();
  }

  decide(): CarInput {
    const s = this.last, r = this.racer, o = this.out;
    if (!s || !r) return o;
    const age = Math.min(0.5, (performance.now() - this.at) / 1000 + LATENCY);
    if (age > STALE_S) {
      o.throttle = 0; o.brake = 1; o.steer = 0; o.handbrake = false; o.nitro = false;
      return o;
    }
    const c = r.car, st = c.state;
    const sh = Math.sin(s.h), ch = Math.cos(s.h);
    const px = s.x + (s.u * sh + s.v * ch) * age;
    const pz = s.z + (s.u * ch - s.v * sh) * age;
    const ph = s.h + s.r * age;
    const ex = px - st.position.x, ez = pz - st.position.z;
    if (ex * ex + ez * ez > SNAP_M * SNAP_M) {
      st.position.x = c.prevX = px;
      st.position.z = c.prevZ = pz;
      st.heading = c.prevHeading = wrap(ph);
    } else {
      st.position.x += ex * PULL;
      st.position.z += ez * PULL;
      st.heading = wrap(st.heading + wrap(ph - st.heading) * PULL);
    }
    c.u = s.u;
    c.v = s.v;
    c.r = s.r;
    r.stuck = 0; // never "rescued" locally: the owner drives it
    [o.throttle, o.brake, o.steer] = [s.i[0], s.i[1], s.i[2]];
    o.handbrake = s.i[3] > 0;
    o.nitro = s.i[4] > 0;
    return o;
  }
}
