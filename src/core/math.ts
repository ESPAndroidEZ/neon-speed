export const TAU = Math.PI * 2;

/** Easing: maps t in [0, 1] to eased progress in [0, 1]. */
export type Ease = (t: number) => number;

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** 0 below a, 1 above b, smooth in between. */
export const smoothstep = (a: number, b: number, x: number): number => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Frame-rate independent exponential smoothing toward `target`. Higher lambda = snappier. */
export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

/** Wrap an angle to (-PI, PI]. */
export const wrapAngle = (a: number): number => {
  const w = ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
  return w === -Math.PI ? Math.PI : w;
};

export const linear: Ease = (t) => t;
export const easeInCubic: Ease = (t) => t * t * t;
export const easeOutCubic: Ease = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutSine: Ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeInOutCubic: Ease = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
