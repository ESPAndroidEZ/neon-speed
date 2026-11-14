import type { AIRacerAgent, AIWorldView, CarInput, CarState, TrackSample } from '../types/game';

/*
 * AI driver: pure policy (no physics, no three). Each AI owns a speed profile along the track computed from
 * curvature, its skill and the current grip (accelerating and braking limits are propagated both ways round the
 * loop), steers by pure pursuit on a personal lane offset, spreads away from cars ahead, and is rubber-banded
 * gently against the player. Deterministic: noise comes from a PRNG seeded by the id.
 */

const WINDOW = 14; // nearest-sample search half window
const MAX_STEER = 0.5; // rad, approx full lock
const WHEELBASE = 2.6;
const V_MAX = 82;

/** Per-track curvature (1/m, absolute, smoothed over +/-4 samples taking the max), shared by every AI. */
const curvCache = new WeakMap<readonly TrackSample[], { k: Float32Array; ds: number }>();

function curvatureOf(track: readonly TrackSample[]): { k: Float32Array; ds: number } {
  let c = curvCache.get(track);
  if (c) return c;
  const n = track.length;
  const ds = Math.hypot(track[1].position.x - track[0].position.x, track[1].position.z - track[0].position.z);
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = track[(i + n - 1) % n].tangent;
    const b = track[(i + 1) % n].tangent;
    raw[i] = Math.abs(Math.atan2(a.x * b.z - a.z * b.x, a.x * b.x + a.z * b.z)) / (2 * ds);
  }
  const k = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let d = -4; d <= 4; d++) m = Math.max(m, raw[(i + d + n) % n]);
    k[i] = m;
  }
  c = { k, ds };
  curvCache.set(track, c);
  return c;
}

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export function createAIRacer(id: string, name: string, skill: number): AIRacerAgent {
  const sk = Math.min(1, Math.max(0, skill));
  let seed = hash(id);
  const rnd = (): number => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const laneBias = (rnd() - 0.5) * 3; // personal line within +/-1.5 m
  const out: CarInput = { throttle: 0, brake: 0, steer: 0, handbrake: false, nitro: false };
  let profile: Float32Array | null = null;
  let profileGrip = -1;
  let hint = -1;
  let playerHint = -1;
  let offset = laneBias;
  let confidence = 1; // drops when the car slides, recovers slowly
  let nitroTimer = 0;
  let stuckFor = 0;
  let reverseFor = 0;
  let pendingGrip = 0; // after a restore: rebuild the speed profile with the saved grip so the driver behaves identically

  function buildProfile(track: readonly TrackSample[], grip: number): void {
    const { k, ds } = curvatureOf(track);
    const n = track.length;
    const aLat = (7.4 + 5.2 * sk) * grip * confidence * Math.min(1, 0.55 + 0.6 * grip); // extra margin when grip is very low
    const aBrake = (6.5 + 3.5 * sk) * Math.max(0.5, grip);
    const aAccel = (4.5 + 2.5 * sk) * Math.max(0.6, grip);
    if (!profile || profile.length !== n) profile = new Float32Array(n);
    for (let i = 0; i < n; i++) profile[i] = Math.min(V_MAX, Math.sqrt(aLat / Math.max(k[i], 1e-4)));
    for (let pass = 0; pass < 2; pass++) {
      for (let i = n * 2 - 1; i >= 0; i--) { // braking: slow down before slow bits
        const a = i % n;
        const b = (i + 1) % n;
        profile[a] = Math.min(profile[a], Math.sqrt(profile[b] * profile[b] + 2 * aBrake * ds));
      }
      for (let i = 0; i < n * 2; i++) { // acceleration limit out of corners
        const a = i % n;
        const b = (i + 1) % n;
        profile[b] = Math.min(profile[b], Math.sqrt(profile[a] * profile[a] + 2 * aAccel * ds + 25));
      }
    }
    profileGrip = grip;
  }

  function nearest(track: readonly TrackSample[], x: number, z: number, h: number): number {
    const n = track.length;
    let best = 0;
    let bd = Infinity;
    const full = h < 0;
    const count = full ? n : WINDOW * 2 + 1;
    for (let q = 0; q < count; q++) {
      const i = full ? q : (h - WINDOW + q + n * 2) % n;
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

  return {
    id,
    name,
    skill: sk,
    snapshot: () => ({ seed, offset, confidence, hint, playerHint, nitroTimer, stuckFor, reverseFor, profileGrip }),
    restore: (d) => {
      const x = d as { seed: number; offset: number; confidence: number; hint: number; playerHint: number; nitroTimer: number; stuckFor: number; reverseFor: number; profileGrip: number };
      ({ seed, offset, confidence, hint, playerHint, nitroTimer, stuckFor, reverseFor } = x);
      profile = null;
      pendingGrip = x.profileGrip;
      profileGrip = x.profileGrip;
    },
    decide(dt: number, self: CarState, world: AIWorldView): CarInput {
      const track = world.track;
      const n = track.length;
      const speed = self.speed;
      hint = nearest(track, self.position.x, self.position.z, hint);
      // the profile is recomputed when the weather grip or the driver's confidence changed noticeably
      const slid = Math.abs(self.slipAngle) > 0.3 && Math.abs(speed) > 8;
      // lateral offset from the centre line: running wide means the front tyres are not turning the car (understeer)
      const tp = track[hint];
      const lat = (self.position.x - tp.position.x) * tp.tangent.z - (self.position.z - tp.position.z) * tp.tangent.x;
      const wide = Math.abs(lat) > tp.width / 2 - 1.8 && Math.abs(speed) > 4;
      confidence = slid || wide ? Math.max(0.5, confidence - dt * 0.6) : Math.min(1, confidence + dt * 0.05);
      if (!profile && pendingGrip > 0) buildProfile(track, pendingGrip);
      if (!profile || Math.abs(profileGrip - world.grip * confidence) > 0.03) buildProfile(track, world.grip * confidence);
      if (!profile) return out;

      // pace: skill, plus a rubber band against the player (behind: a little faster, far ahead: a little slower)
      const p = world.racers[world.playerIndex];
      let pace = 0.9 + 0.1 * sk;
      if (p && p !== self) {
        playerHint = nearest(track, p.position.x, p.position.z, playerHint);
        const ds = curvatureOf(track).ds;
        const lap = n * ds;
        const diff = ((((hint - playerHint) * ds + lap / 2) % lap) + lap) % lap - lap / 2; // metres ahead of the player (negative = behind)
        const band = diff < 0 ? Math.min(1, -diff / 150) * 0.06 : -Math.min(1, diff / 200) * 0.08;
        pace += band * (0.4 + 0.6 * sk) * Math.min(1, world.grip + 0.2); // weaker help when the road is slick
      }

      // spread away from a car just ahead
      let want = laneBias;
      const fx = Math.sin(self.heading);
      const fz = Math.cos(self.heading);
      for (let r = 0; r < world.racers.length; r++) {
        const o = world.racers[r];
        if (o === self) continue;
        const dx = o.position.x - self.position.x;
        const dz = o.position.z - self.position.z;
        const ahead = dx * fx + dz * fz;
        if (ahead < 1 || ahead > 11) continue;
        const side = dx * fz - dz * fx; // +: other car is to the right of us (left normal = (fz,-fx))
        if (Math.abs(side) < 2.4) want = side > 0 ? 1.8 : -1.8;
      }
      offset += (want - offset) * Math.min(1, dt * 2.5);
      const hw = track[hint].width / 2;
      const lim = Math.min(1.9, hw - 3);
      const off = Math.max(-lim, Math.min(lim, offset));

      // pure pursuit toward a point on the personal line ahead
      const look = Math.max(6, 5 + Math.abs(speed) * 0.28);
      const ti = (hint + Math.round(look / curvatureOf(track).ds)) % n;
      const t = track[ti];
      const tx = t.position.x + t.tangent.z * off;
      const tz = t.position.z - t.tangent.x * off;
      let alpha = Math.atan2(tx - self.position.x, tz - self.position.z) - self.heading;
      alpha = Math.atan2(Math.sin(alpha), Math.cos(alpha));
      const dist = Math.max(3, Math.hypot(tx - self.position.x, tz - self.position.z));
      const delta = Math.atan((2 * WHEELBASE * Math.sin(alpha)) / dist);
      const sp = Math.abs(speed);
      const lock = 1 - 0.72 * Math.min(1, Math.max(0, (sp - 5) / 55));
      out.steer = Math.max(-1, Math.min(1, delta / (MAX_STEER * lock) + self.slipAngle * 0.7));

      // speed from the profile a little ahead (the profile already brakes early enough)
      const si = (hint + 2) % n;
      const vt = profile[si] * pace;
      out.throttle = Math.max(0, Math.min(1, (vt - speed) * 0.45 + 0.1));
      out.brake = speed > vt + 1.2 ? Math.min(1, (speed - vt) * 0.22) : 0;
      if (out.brake > 0) out.throttle = 0;
      out.handbrake = false;

      // unstick: if the car is pinned at the road edge for a while, reverse away from the wall, then drive on
      stuckFor = Math.abs(speed) < 1.2 && out.throttle > 0.3 && Math.abs(lat) > tp.width / 2 - 1.5 ? stuckFor + dt : Math.max(0, stuckFor - dt * 2);
      if (stuckFor > 1.2) {
        reverseFor = 2;
        stuckFor = 0;
        confidence = Math.max(0.5, confidence - 0.15);
      }
      if (reverseFor > 0) {
        reverseFor -= dt;
        out.throttle = 0;
        out.brake = 1;
        out.steer = -out.steer; // reversing: steer the other way
        out.nitro = false;
        return out;
      }

      // nitro in short bursts on long straights for the better drivers
      nitroTimer -= dt;
      const straight = vt > 55 && profile[(hint + 20) % n] > 50;
      if (nitroTimer <= -2.5 && straight && sk > 0.4 && rnd() < 0.02) nitroTimer = 1.2;
      out.nitro = nitroTimer > 0 && straight;
      return out;
    },
  };
}
