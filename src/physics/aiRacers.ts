import type { AIRacerAgent, AIWorldView, CarInput, CarState } from '../types/game';
import { DIFFICULTIES, LEVELS, RUBBER_MAX, STYLES, type Difficulty, type DriveStyle } from './aiDifficulty';
import { marginFor, racingLine, speedProfile, type RacingLine } from './aiLine';
import { createTraffic, readTraffic } from './aiTraffic';
import { HANDLING } from './assists';

/*
 * AI driver: pure policy (no physics, no three). The car it drives uses the same physics and weather grip as the player's.
 * Each AI follows a racing line computed from the track (apex-based, see aiLine), with a speed profile from the line's curvature,
 * its skill, the current grip and its personality; steers by pure pursuit; slipstreams, passes, defends and plans nitro
 * (aiTraffic); and is rubber-banded against the player by a small, documented amount that shrinks with the difficulty level
 * (aiDifficulty: Legend has none). Deterministic: all noise comes from a PRNG seeded by the id.
 */

const WINDOW = 14;
const MAX_STEER = 0.5;
const WHEELBASE = 2.6;
const V_MAX = 82;
// Handbrake cornering (same physics as the player's handbrake turn): corner speed planned this much faster per skill.
const ENV = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const HB_ALAT = Number(ENV.RB_HB_ALAT ?? 1.2), HB_SLIP = Number(ENV.RB_HB_SLIP ?? 0.7), HB_LOCK = Number(ENV.RB_HB_LOCK ?? 1);
const GRID = { A_LAT: 6.5, A_LAT_SKILL: 5.2, A_BRAKE: 6.0, A_BRAKE_SKILL: 2.3, A_ACCEL: 4.5, A_ACCEL_SKILL: 2.5 };

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export interface AIOptions {
  level?: Difficulty;
  style?: DriveStyle;
}

export function createAIRacer(id: string, name: string, skill: number, opts: AIOptions = {}): AIRacerAgent {
  const lv = LEVELS[opts.level && DIFFICULTIES.includes(opts.level) ? opts.level : 'STREET'];
  const st = STYLES[opts.style ?? 'clean'];
  const sk = Math.min(1, Math.max(0, skill * lv.skillMul + lv.bonus));
  let seed = hash(id);
  const rnd = (): number => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const laneBias = (rnd() - 0.5) * 1.6;
  const out: CarInput = { throttle: 0, brake: 0, steer: 0, handbrake: false, nitro: false };
  const traffic = createTraffic();
  let line!: RacingLine; // set by the first build() before any use
  let profile: Float32Array | null = null;
  let profileGrip = -1;
  let gripLat = 9; // this driver's grip-only cornering limit, m/s^2 (set in build)
  let hint = -1;
  let shift = 0;
  let confidence = 1;
  let lapse = 0; // seconds left of a small mistake
  let nitroTimer = 0;
  let stuckFor = 0;
  let reverseFor = 0;
  let pendingGrip = 0;
  let profConf = 1; // the confidence the current profile was built with (kept so a restored driver rebuilds the same one)

  function build(world: AIWorldView, grip: number, conf = confidence): void {
    profConf = conf;
    line = racingLine(world.track, marginFor(grip));
    const g = Math.max(0.12, grip), v2 = HANDLING.model === 'v2'; // v2: real tyres (~0.9-1 g), no handbrake-turn plan
    if (!profile || profile.length !== line.n) profile = new Float32Array(line.n);
    speedProfile(line, {
      aLat: (gripLat = (GRID.A_LAT + GRID.A_LAT_SKILL * Math.min(1, sk)) * g * profConf * Math.min(1, 0.55 + 0.6 * g) * st.corner * (v2 ? 0.8 : 1)) * (1 + (g > 0.6 && !v2 ? HB_ALAT * Math.min(1, sk) : 0)), // faster corner plan only where it can handbrake
      aBrake: (GRID.A_BRAKE + GRID.A_BRAKE_SKILL * Math.min(1, sk)) * Math.max(0.5, g) * st.brake,
      aAccel: (GRID.A_ACCEL + GRID.A_ACCEL_SKILL * Math.min(1, sk)) * Math.max(0.6, g),
      vMax: V_MAX,
    }, profile);
    profileGrip = grip;
  }

  function nearest(track: AIWorldView['track'], x: number, z: number, h: number): number {
    const n = track.length;
    let best = 0;
    let bd = Infinity;
    const count = h < 0 ? n : WINDOW * 2 + 1;
    for (let q = 0; q < count; q++) {
      const i = h < 0 ? q : (h - WINDOW + q + n * 2) % n;
      const dx = track[i].position.x - x;
      const dz = track[i].position.z - z;
      const d = dx * dx + dz * dz;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  }

  /** Rubber band: a fraction of speed target, never more than RUBBER_MAX and shrinking with the level. */
  function rubber(self: CarState, world: AIWorldView, line: RacingLine): number {
    const p = world.racers[world.playerIndex];
    if (lv.rubber <= 0 || !p || p === self) return 0;
    const n = line.n;
    const ph = nearest(world.track, p.position.x, p.position.z, -1);
    const diff = ((((hint - ph) * line.ds + (n * line.ds) / 2) % (n * line.ds)) + n * line.ds) % (n * line.ds) - (n * line.ds) / 2; // m ahead of the player
    const band = diff < 0 ? Math.min(1, -diff / 150) * lv.rubber : -Math.min(1, diff / 200) * lv.rubber * 1.2;
    return Math.max(-RUBBER_MAX, Math.min(RUBBER_MAX, band)) * Math.min(1, world.grip + 0.2);
  }

  return {
    id,
    name,
    skill: sk,
    snapshot: () => ({ seed, shift, confidence, lapse, hint, nitroTimer, stuckFor, reverseFor, profileGrip, profConf }),
    restore: (d) => {
      const x = d as { seed: number; shift: number; confidence: number; lapse: number; hint: number; nitroTimer: number; stuckFor: number; reverseFor: number; profileGrip: number; profConf: number };
      ({ seed, shift, confidence, lapse, hint, nitroTimer, stuckFor, reverseFor } = x);
      profConf = x.profConf ?? 1;
      profile = null;
      pendingGrip = x.profileGrip;
      profileGrip = x.profileGrip;
    },
    decide(dt: number, self: CarState, world: AIWorldView): CarInput {
      const track = world.track;
      const n = track.length;
      const speed = self.speed;
      if (!profile) build(world, pendingGrip > 0 ? pendingGrip : world.grip, pendingGrip > 0 ? profConf : confidence);
      hint = nearest(track, self.position.x, self.position.z, hint);
      const tp = track[hint];
      const lat = (self.position.x - tp.position.x) * tp.tangent.z - (self.position.z - tp.position.z) * tp.tangent.x;
      const wide = Math.abs(lat - line.off[hint]) > 3.4 && Math.abs(speed) > 4;
      const slid = !st.drifts && Math.abs(self.slipAngle) > 0.3 && Math.abs(speed) > 8;
      confidence = slid || wide ? Math.max(0.5, confidence - dt * 0.4) : Math.min(1, confidence + dt * 0.05);
      if (lapse > 0) lapse -= dt;
      else if (lv.lapse > 0 && rnd() < lv.lapse * dt) lapse = 0.8 + rnd() * 0.8;
      if (!profile || Math.abs(profileGrip - world.grip * confidence) > 0.03) build(world, world.grip * confidence);
      if (!profile) return out;

      // pace: level, skill, personality, a small capped rubber band, and the odd lapse
      let pace = (0.9 + 0.1 * sk) * lv.pace * (lapse > 0 ? 0.86 : 1) + rubber(self, world, line);
      if (Math.abs(lat) > tp.width / 2 - 0.6) pace *= 0.85; // brushing the edge: back off until it is clean
      const ahead = Math.max(1, Math.round(1 + speed * 0.08));
      const vTarget = profile[(hint + 2) % n] * pace;
      readTraffic(self, world, line, hint, Math.min(1, lv.overtake * st.overtake), Math.min(1, lv.block * st.block), vTarget, traffic);
      shift += (traffic.shift - shift) * Math.min(1, dt * 3);

      // pure pursuit on the line plus the traffic shift
      const look = Math.max(6, 5 + Math.abs(speed) * 0.28);
      const ti = (hint + Math.round(look / line.ds)) % n;
      const t = track[ti];
      const o = Math.max(-line.lim[ti], Math.min(line.lim[ti], line.off[ti] * (0.55 + 0.45 * sk) + laneBias * 0.4 + shift));
      const tx = t.position.x + t.tangent.z * o;
      const tz = t.position.z - t.tangent.x * o;
      let alpha = Math.atan2(tx - self.position.x, tz - self.position.z) - self.heading;
      alpha = Math.atan2(Math.sin(alpha), Math.cos(alpha));
      const dist = Math.max(3, Math.hypot(tx - self.position.x, tz - self.position.z));
      const delta = Math.atan((2 * WHEELBASE * Math.sin(alpha)) / dist);
      const sp = Math.abs(speed);
      const lock = HANDLING.model === 'v2' ? Math.min(1, (5.6 * 9.81) / Math.max(1, sp * sp) + 0.22) : 1 - 0.72 * Math.min(1, Math.max(0, (sp - 5) / 55));
      // handbrake turn-in: too fast to make a sharp corner on grip, so throw it in like the player does and hold it
      // until the nose points down the exit (no counter-steer meanwhile: that would cancel the rotation)
      const kIn = line.k[(hint + Math.round(8 / line.ds)) % n];
      const hbOn = HANDLING.model !== 'v2' && sk > 0.3 && world.grip > 0.6 && kIn > 1 / 40 && sp > Math.sqrt(gripLat / kIn) * 1.05 && Math.abs(alpha) > 0.08 && Math.abs(self.slipAngle) < HB_SLIP;
      out.steer = Math.max(-1, Math.min(1, delta / (MAX_STEER * lock) + (hbOn ? 0 : self.slipAngle * 0.7)));
      if (hbOn) out.steer = -Math.sign(line.ks[(hint + Math.round(8 / line.ds)) % n]) * HB_LOCK; // full lock INTO the corner (ks > 0 = right)

      // speed: the profile a little ahead, a slipstream bonus, never into the car in front
      let vt = Math.min(profile[(hint + ahead) % n] * pace * (traffic.draft ? 1.05 : 1), traffic.cap + 3);
      vt = Math.max(vt, Math.min(traffic.cap, 3));
      out.throttle = Math.max(0, Math.min(1, (vt - speed) * 0.45 + 0.1));
      out.brake = speed > vt + 1.2 ? Math.min(1, (speed - vt) * 0.22) : 0;
      if (out.brake > 0) out.throttle = 0;
      out.handbrake = hbOn;
      if (out.handbrake) { out.brake = 0; out.throttle = Math.max(out.throttle, 0.6); }

      // unstick: pinned at the road edge or against another car for a while: reverse away from the wall, then drive on
      stuckFor = Math.abs(speed) < 1.2 && out.throttle > 0.3 ? stuckFor + dt : Math.max(0, stuckFor - dt * 2);
      if (stuckFor > (Math.abs(lat) > tp.width / 2 - 2.2 || traffic.gap < 5 ? 1.2 : 2.6)) {
        reverseFor = 2;
        stuckFor = 0;
        confidence = Math.max(0.5, confidence - 0.15);
      }
      if (reverseFor > 0) {
        reverseFor -= dt;
        out.throttle = 0;
        out.brake = 1;
        out.steer = -out.steer;
        out.nitro = false;
        out.handbrake = false;
        return out;
      }

      // nitro: short bursts on long straights; the better drivers use it to chase or attack, not at random
      nitroTimer -= dt;
      const longStraight = vt > 50 && profile[(hint + 22) % n] > 48 && line.k[(hint + 12) % n] < 0.01;
      const want = lv.smartNitro ? longStraight && (traffic.gap < 70 || (world.racers[world.playerIndex]?.speed ?? 0) > speed + 2 || rnd() < 0.01) : longStraight && rnd() < 0.02;
      if (nitroTimer <= -2.5 && want && sk > 0.4) nitroTimer = 1.2;
      out.nitro = nitroTimer > 0 && longStraight;
      return out;
    },
  };
}
