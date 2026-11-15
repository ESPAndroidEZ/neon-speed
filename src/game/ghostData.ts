/** Pure ghost-lap logic (no DOM, no three): recording at 10 Hz, best-lap choice and interpolated playback. */
export const GHOST_HZ = 10;
const MAX = 3000; // 5 min at 10 Hz

/** A stored lap: time and frames [x, y, z, heading, ...] at 10 Hz. */
export interface GhostLap { t: number; f: number[] }
export interface Pose { x: number; y: number; z: number; h: number }

export const isGhostLap = (g: unknown): g is GhostLap =>
  !!g && typeof (g as GhostLap).t === 'number' && Array.isArray((g as GhostLap).f) && (g as GhostLap).f.length >= 8 && (g as GhostLap).f.length % 4 === 0;

export class GhostRecorder {
  private readonly rec = new Float32Array(MAX * 4);
  private n = 0;
  private lapStart = -1;
  best: GhostLap | null;

  constructor(best: GhostLap | null = null) {
    this.best = best;
  }

  /**
   * Call every frame while racing. lapStart = race time the current lap began, lapTime = race time - lapStart.
   * Returns the new best lap when a lap just finished faster than the stored one (the caller saves it), else null.
   */
  update(lapStart: number, lapTime: number, p: Pose): GhostLap | null {
    let out: GhostLap | null = null;
    if (lapStart !== this.lapStart) {
      const t = lapStart - Math.max(0, this.lapStart);
      if (this.lapStart >= 0 && this.n > 8 && (!this.best || t < this.best.t)) {
        out = { t: Math.round(t * 1000) / 1000, f: Array.from(this.rec.subarray(0, this.n * 4), (x) => Math.round(x * 100) / 100) };
        this.best = out;
      }
      this.lapStart = lapStart;
      this.n = 0;
    }
    while (this.n < MAX && lapTime >= this.n / GHOST_HZ) { // fills skipped slots on slow frames: the timeline stays true
      const j = this.n * 4;
      this.rec[j] = p.x; this.rec[j + 1] = p.y; this.rec[j + 2] = p.z; this.rec[j + 3] = p.h;
      this.n++;
    }
    return out;
  }
}

/** Pose of the ghost `lapTime` s into its lap, written into `out`. False once the stored lap is over. */
export function ghostPose(g: GhostLap, lapTime: number, out: Pose): boolean {
  const frames = g.f.length / 4, fi = lapTime * GHOST_HZ, i = Math.floor(fi);
  if (i < 0 || i >= frames - 1) return false;
  const a = fi - i, f = g.f, j = i * 4;
  let dh = f[j + 7] - f[j + 3];
  if (dh > Math.PI) dh -= Math.PI * 2;
  else if (dh < -Math.PI) dh += Math.PI * 2;
  out.x = f[j] + (f[j + 4] - f[j]) * a;
  out.y = f[j + 1] + (f[j + 5] - f[j + 1]) * a;
  out.z = f[j + 2] + (f[j + 6] - f[j + 2]) * a;
  out.h = f[j + 3] + dh * a;
  return true;
}
