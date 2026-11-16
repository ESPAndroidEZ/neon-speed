/** One-shot cue when the car rolls onto a different surface. Pure: returns numbers, the caller makes the noise. */
export interface SurfaceCue { level: number; cutoff: number; dur: number }

const OUT: SurfaceCue = { level: 0, cutoff: 0, dur: 0 }; // reused, the caller reads it at once

/** Ice is a thin glassy hiss, a snow bank is a soft low thump. A puddle is the old splash. Null when nothing should play. */
export function surfaceCue(prev: string, next: string, speed: number): SurfaceCue | null {
  if (prev === next || speed < 6) return null;
  const k = Math.min(1, speed / 60);
  if (next === 'puddle') {
    OUT.level = Math.min(0.5, 0.15 + speed * 0.01); OUT.cutoff = 2600; OUT.dur = 0.35;
    return OUT;
  }
  if (next === 'ice') {
    OUT.level = 0.05 + 0.1 * k; OUT.cutoff = 6500 + 2500 * k; OUT.dur = 0.22 + 0.2 * k;
    return OUT;
  }
  if (next === 'snowbank') {
    OUT.level = 0.18 + 0.32 * k; OUT.cutoff = 650 + 500 * k; OUT.dur = 0.35 + 0.25 * k;
    return OUT;
  }
  return null;
}
