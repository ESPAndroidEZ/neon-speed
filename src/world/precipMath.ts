/**
 * CPU side of the precipitation volume (pure TS, no three, no allocation). Particles never move with the camera:
 * each one has a fixed world-space seed; the vertex shader places it at `lo + mod(seed * box + drift - lo, box)`,
 * where `lo` is the corner of a box centred just ahead of the camera. A camera cut only changes which world
 * positions fall inside the box, so nothing pops and nothing is glued to the screen.
 */

export interface PrecipBox {
  sx: number;
  sy: number;
  sz: number;
  /** Box centre this far ahead of the camera (horizontal), metres: fewer particles wasted behind the lens. */
  ahead: number;
  /** Box centre this far above the camera, metres. */
  lift: number;
}

export interface PrecipState {
  /** Box centre (world). */
  cx: number;
  cy: number;
  cz: number;
  /** Smoothed camera velocity (m/s), cut-safe. */
  vx: number;
  vy: number;
  vz: number;
  /** Last camera position. */
  px: number;
  py: number;
  pz: number;
  has: boolean;
  /** Accumulated fall + wind drift, wrapped into [0, box). */
  dx: number;
  dy: number;
  dz: number;
  /** Shader clock, wrapped at TIME_WRAP (every shader frequency is a multiple of 0.02 so the wrap is seamless). */
  time: number;
  /** True for the frame on which a camera cut was detected. */
  cut: boolean;
  cuts: number;
}

export const TIME_WRAP = Math.PI * 100;
/** A camera moving faster than this between two frames has been cut, not driven. */
export const CUT_SPEED = 120;
const MAX_VEL = 90;

export const wrapN = (v: number, n: number): number => v - n * Math.floor(v / n);

export function createPrecipState(): PrecipState {
  return { cx: 0, cy: 0, cz: 0, vx: 0, vy: 0, vz: 0, px: 0, py: 0, pz: 0, has: false, dx: 0, dy: 0, dz: 0, time: 0, cut: false, cuts: 0 };
}

/**
 * Advance one display frame. `fx, fz` = camera forward (any length), `fallX..Z` = particle velocity in the world
 * (fall + wind). Camera velocity is estimated from movement and ignored across cuts (no one-frame giant streaks).
 */
export function stepPrecip(s: PrecipState, box: PrecipBox, dt: number, camX: number, camY: number, camZ: number, fx: number, fz: number, fallX: number, fallY: number, fallZ: number): void {
  const d = dt > 0 && dt < 0.25 ? dt : 1 / 60;
  s.cut = false;
  if (s.has) {
    const mx = camX - s.px;
    const my = camY - s.py;
    const mz = camZ - s.pz;
    const dist = Math.sqrt(mx * mx + my * my + mz * mz);
    if (!(dist <= CUT_SPEED * d)) {
      s.cut = true;
      s.cuts++;
    } else {
      const k = 1 - Math.exp(-10 * d);
      s.vx += (mx / d - s.vx) * k;
      s.vy += (my / d - s.vy) * k;
      s.vz += (mz / d - s.vz) * k;
      const sp = Math.sqrt(s.vx * s.vx + s.vy * s.vy + s.vz * s.vz);
      if (sp > MAX_VEL) {
        s.vx *= MAX_VEL / sp;
        s.vy *= MAX_VEL / sp;
        s.vz *= MAX_VEL / sp;
      }
    }
  }
  s.px = camX;
  s.py = camY;
  s.pz = camZ;
  s.has = true;
  s.dx = wrapN(s.dx + fallX * d, box.sx);
  s.dy = wrapN(s.dy + fallY * d, box.sy);
  s.dz = wrapN(s.dz + fallZ * d, box.sz);
  s.time = wrapN(s.time + d, TIME_WRAP);
  const fl = Math.sqrt(fx * fx + fz * fz);
  const ux = fl > 1e-4 ? fx / fl : 0;
  const uz = fl > 1e-4 ? fz / fl : 0;
  s.cx = camX + ux * box.ahead;
  s.cy = camY + box.lift;
  s.cz = camZ + uz * box.ahead;
}

/** Forget the last camera position (new race, scene change): the next frame is treated as a cut. */
export function resetPrecip(s: PrecipState): void {
  s.has = false;
  s.vx = 0;
  s.vy = 0;
  s.vz = 0;
}

export interface P3 {
  x: number;
  y: number;
  z: number;
}

/** World position of the particle with this seed (0..1 per axis): the exact formula of the vertex shader. */
export function particleWorld(s: PrecipState, box: PrecipBox, seedX: number, seedY: number, seedZ: number, out: P3): P3 {
  const lx = s.cx - box.sx / 2;
  const ly = s.cy - box.sy / 2;
  const lz = s.cz - box.sz / 2;
  out.x = lx + wrapN(seedX * box.sx + s.dx - lx, box.sx);
  out.y = ly + wrapN(seedY * box.sy + s.dy - ly, box.sy);
  out.z = lz + wrapN(seedZ * box.sz + s.dz - lz, box.sz);
  return out;
}
