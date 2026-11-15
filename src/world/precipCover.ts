import type { Vec3 } from '../types/game';
import type { Track } from './track';
import { createHit, locate } from './trackQuery';

/**
 * What the sky cannot reach, for the precipitation shaders: the tunnel run near the camera (a 3-point centre-line
 * polyline with a half width and a roof height), whether the camera itself is under the roof, the road plane
 * near the camera (for splash rings) and the player's car (drops stop at the roof). Written once per display frame
 * by the game (raceFeedback), read by weatherFx. Pure data, no allocation.
 */
export interface PrecipCover {
  valid: boolean;
  /** 1 when the camera is inside a tunnel. */
  inside: number;
  /** Tunnel polyline (x, z) a -> m -> b; `tunHalf` 0 = no tunnel nearby. */
  ax: number;
  az: number;
  mx: number;
  mz: number;
  bx: number;
  bz: number;
  tunHalf: number;
  tunTop: number;
  /** Road plane at the camera's nearest sample: point, unit tangent (x, z), grade (dy per metre along), half width. */
  rx: number;
  ry: number;
  rz: number;
  tx: number;
  tz: number;
  grade: number;
  roadHalf: number;
  /** Player car (x, y, z) and kill radius (0 = none). */
  carX: number;
  carY: number;
  carZ: number;
  carR: number;
}

export const precipCover: PrecipCover = {
  valid: false, inside: 0, ax: 0, az: 0, mx: 0, mz: 0, bx: 0, bz: 0, tunHalf: 0, tunTop: 0,
  rx: 0, ry: 0, rz: 0, tx: 0, tz: 1, grade: 0, roadHalf: 0, carX: 0, carY: -1e4, carZ: 0, carR: 0,
};

const hit = createHit();
const SPAN = 18; // samples searched either side of the camera for a tunnel run
const FAR = 45; // camera further than this from the centre line: no road plane, no tunnel

/** Per display frame. `hint` = a sample index near the camera (the player's), or -1 for a full search. */
export function updatePrecipCover(track: Track, hint: number, camX: number, camZ: number, car: Vec3 | null): void {
  const c = precipCover;
  const s = track.samples;
  const n = s.length;
  if (n < 4) {
    c.valid = false;
    return;
  }
  locate(track, camX, camZ, hint >= 0 && hint < n ? hint : -1, hit);
  const i = hit.index;
  const p = s[i].position;
  const near = Math.hypot(p.x - camX, p.z - camZ) < FAR;
  c.valid = near;
  c.carR = car ? 2.6 : 0;
  if (car) {
    c.carX = car.x;
    c.carY = car.y;
    c.carZ = car.z;
  }
  if (!near) {
    c.inside = 0;
    c.tunHalf = 0;
    c.roadHalf = 0;
    return;
  }
  const t = s[i].tangent;
  const tl = Math.hypot(t.x, t.z) || 1;
  const prev = s[(i - 2 + n) % n].position;
  const next = s[(i + 2) % n].position;
  const run = Math.hypot(next.x - prev.x, next.z - prev.z) || 1;
  c.rx = p.x;
  c.ry = p.y;
  c.rz = p.z;
  c.tx = t.x / tl;
  c.tz = t.z / tl;
  c.grade = (next.y - prev.y) / run;
  c.roadHalf = s[i].width / 2;
  const half = s[i].width / 2 + 3;
  c.inside = track.zones[i] === 'tunnel' && Math.abs(hit.lateral) < half ? 1 : 0;
  // the tunnel run inside the search window
  let a = -1;
  let b = -1;
  for (let k = -SPAN; k <= SPAN; k++) {
    const j = (i + k + n) % n;
    if (track.zones[j] !== 'tunnel') continue;
    if (a < 0) a = k;
    b = k;
  }
  if (a < 0) {
    c.tunHalf = 0;
    return;
  }
  const ia = (i + a + n) % n;
  const ib = (i + b + n) % n;
  const im = (i + Math.round((a + b) / 2) + n) % n;
  c.ax = s[ia].position.x;
  c.az = s[ia].position.z;
  c.mx = s[im].position.x;
  c.mz = s[im].position.z;
  c.bx = s[ib].position.x;
  c.bz = s[ib].position.z;
  c.tunHalf = Math.max(s[ia].width, s[im].width, s[ib].width) / 2 + 3;
  c.tunTop = Math.max(s[ia].position.y, s[im].position.y, s[ib].position.y) + 9;
}
