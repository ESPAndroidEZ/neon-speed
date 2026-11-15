/**
 * Tilt steering maths, pure (no DOM), so tests can feed synthetic orientation events.
 *
 * The phone is turned like a steering wheel. From the DeviceOrientationEvent angles (beta about the device x axis,
 * gamma about y) we rebuild the gravity direction in device axes, rotate it into SCREEN axes with the
 * screen.orientation angle (0 portrait, 90 landscape-primary, 270 landscape-secondary), and take its angle inside the
 * screen plane: the wheel angle. That stays continuous where beta/gamma flip (gamma +-90 is exactly the upright
 * landscape pose) and does not care how far the screen is pitched back. Positive roll = right side down = turn right.
 * Output follows the car contract: steer > 0 is LEFT.
 */
export interface TiltPrefs {
  /** Multiplies the curve output (0.5 .. 2). */
  sens: number;
  /** Roll in degrees that gives full lock (15 .. 60). */
  maxDeg: number;
  /** Dead zone in degrees around the calibrated centre. */
  deadDeg: number;
  /** Response curve exponent (1 linear, >1 softer around the centre). */
  curve: number;
  invert: boolean;
  /** Calibrated centre roll in degrees. */
  zeroDeg: number;
}

export const defaultTilt = (): TiltPrefs => ({ sens: 1, maxDeg: 35, deadDeg: 3, curve: 1.35, invert: false, zeroDeg: 0 });

const DEG = Math.PI / 180;

/** Below this share of gravity inside the screen plane (phone nearly flat) the wheel angle is unreliable. */
export const MIN_INPLANE = 0.2;

/** Scratch result, reused (no allocation per event). */
export interface Roll {
  /** Wheel angle in degrees, (-180, 180]. */
  deg: number;
  /** Share (0..1) of gravity lying in the screen plane: confidence. */
  inPlane: number;
}

/** Wheel angle from orientation angles (degrees) and the screen angle (degrees). Non-finite input gives deg 0, inPlane 0. */
export function rollFrom(beta: number, gamma: number, screenAngle: number, out: Roll = { deg: 0, inPlane: 0 }): Roll {
  if (!Number.isFinite(beta) || !Number.isFinite(gamma)) {
    out.deg = 0;
    out.inPlane = 0;
    return out;
  }
  const b = beta * DEG, g = gamma * DEG;
  // gravity ("down") in device axes for the Z-X'-Y'' Euler order of the spec
  const dx = Math.cos(b) * Math.sin(g);
  const dy = -Math.sin(b);
  const a = (Number.isFinite(screenAngle) ? screenAngle : 0) * DEG;
  const ca = Math.cos(a), sa = Math.sin(a);
  const sx = dx * ca - dy * sa; // screen right
  const sy = dx * sa + dy * ca; // screen up
  out.inPlane = Math.min(1, Math.hypot(sx, sy));
  out.deg = out.inPlane > 1e-6 ? Math.atan2(sx, -sy) / DEG : 0;
  return out;
}

/** Wrap degrees into (-180, 180]. */
export const wrapDeg = (d: number): number => {
  const w = ((((d + 180) % 360) + 360) % 360) - 180;
  return w === -180 ? 180 : w;
};

/** Calibrated roll (degrees) -> steer in [-1, 1] (steer > 0 is LEFT). Dead zone, curve, sensitivity, invert. */
export function steerFromRoll(rollDeg: number, p: TiltPrefs): number {
  if (!Number.isFinite(rollDeg)) return 0;
  const r = wrapDeg(rollDeg - p.zeroDeg);
  const mag = Math.abs(r);
  if (mag <= p.deadDeg) return 0;
  const span = Math.max(1, p.maxDeg - p.deadDeg);
  const x = Math.min(1, (mag - p.deadDeg) / span);
  const v = Math.min(1, Math.pow(x, Math.max(0.5, p.curve)) * Math.max(0.1, p.sens));
  const steer = -Math.sign(r) * v; // right side down turns right: negative steer
  return p.invert ? -steer : steer;
}

/**
 * Low-pass towards the target with a speed-dependent rate: quick at low speed (parking, hairpins), calmer at
 * high speed so hand tremor never twitches the car. `speedKph` >= 0.
 */
export function smoothSteer(prev: number, target: number, dt: number, speedKph: number): number {
  const fast = Math.min(1, Math.max(0, speedKph / 200));
  const rate = 16 - 9 * fast; // 16/s standing, 7/s at 200 km/h
  const k = 1 - Math.exp(-rate * Math.max(0, Math.min(0.1, dt)));
  const v = prev + (target - prev) * k;
  return Math.max(-1, Math.min(1, Number.isFinite(v) ? v : 0));
}

/** Clamp and sanitise stored prefs (anything corrupt falls back to the default value). */
export function sanitizeTilt(raw: Partial<TiltPrefs> | null | undefined): TiltPrefs {
  const d = defaultTilt();
  const n = (v: unknown, lo: number, hi: number, def: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def);
  return {
    sens: n(raw?.sens, 0.5, 2, d.sens),
    maxDeg: n(raw?.maxDeg, 15, 60, d.maxDeg),
    deadDeg: n(raw?.deadDeg, 0, 10, d.deadDeg),
    curve: n(raw?.curve, 1, 2.5, d.curve),
    invert: raw?.invert === true,
    zeroDeg: n(raw?.zeroDeg, -180, 180, d.zeroDeg),
  };
}
