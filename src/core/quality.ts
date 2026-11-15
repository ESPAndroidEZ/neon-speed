import type { Engine } from './engine';
import { GRAPHICS, PRESETS, usePreset } from './graphics';
import { grade } from './grade';
import type { Quality } from './save';
import type { Graphics } from './graphics';

/** Everything a quality tier switches. Systems read `qualityNow()` each frame, so changes apply instantly. */
export interface QualityParams {
  pixelRatio: number;
  bloom: boolean;
  bloomStrength: number;
  /** Vignette, chromatic aberration, grain and speed blur pass. */
  fx: boolean;
  /** Light cones and glow sprites around lamps. */
  shafts: boolean;
  /** Real-time planar road mirror in the rain (High only). */
  mirror: boolean;
  /** Pooled headlight spot lights (0, 1 or 2). */
  spotLights: number;
  /** Anamorphic light streaks in the final pass (14 extra taps). */
  streaks: boolean;
  /** Multiplier on particle budgets and emission rates. */
  particles: number;
}

const TIERS: Record<Quality, QualityParams> = {
  low: { pixelRatio: 1, bloom: false, bloomStrength: 0.5, fx: false, shafts: false, mirror: false, streaks: false, spotLights: 0, particles: 0.5 },
  medium: { pixelRatio: 1.5, bloom: true, bloomStrength: 0.65, fx: true, shafts: true, mirror: false, streaks: false, spotLights: 1, particles: 0.8 },
  high: { pixelRatio: 2, bloom: true, bloomStrength: 0.85, fx: true, shafts: true, mirror: true, streaks: true, spotLights: 2, particles: 1 },
  ultra: { pixelRatio: 2.5, bloom: true, bloomStrength: 0.95, fx: true, shafts: true, mirror: true, streaks: true, spotLights: 2, particles: 1.4 },
};

let current: Quality = 'high';

const merged: QualityParams = { ...TIERS.high };
/** The tier's parameters with the graphics screen's overrides applied (bloom, reflections, particles, resolution). */
export function qualityNow(): QualityParams {
  const t = TIERS[current];
  Object.assign(merged, t, { bloom: GRAPHICS.bloom, mirror: GRAPHICS.reflections && t.mirror, particles: GRAPHICS.particles });
  return merged;
}
export const qualityTier = (): Quality => current;

/** Switch tier. `keepCustom` leaves the graphics screen's own values alone (startup); otherwise they follow the tier's preset. */
export function applyQuality(engine: Engine, q: Quality, keepCustom = false): void {
  current = q;
  if (!keepCustom) usePreset(q);
  const t = qualityNow();
  engine.maxPixelRatio = t.pixelRatio * GRAPHICS.resScale;
  engine.setBloom({ enabled: t.bloom, strength: t.bloomStrength * grade.bloomK });
  engine.resize();
}

const ORDER: Quality[] = ['low', 'medium', 'high', 'ultra'];

/**
 * Keeps the frame rate up: first lowers the render resolution in 10 % steps (down to 60 %, and raises it again when
 * there is headroom), and only when that is not enough drops one tier (never upgrades a tier by itself).
 */
/** Frame work (ms) above which dynamic resolution steps down. */
export const WORK_LIMIT_MS = 14;

export class AutoQuality {
  enabled = true;
  onDowngrade: ((tier: Quality) => void) | null = null;
  private acc = 0;
  private frames = 0;
  private bad = 0;
  private cooldown = 4;
  private readonly limit: number;

  constructor(minFps = isPhone() ? 50 : 40) { // phones: a jerky 45 fps must count as low too
    this.limit = 1 / minFps;
  }

  /** Dynamic resolution on top of the tier: 1 = full, down to 0.6. Cheap first step before losing effects. */
  dyn = 1;
  private good = 0;

  private setDyn(engine: Engine, v: number): void {
    this.dyn = Math.round(Math.min(1, Math.max(0.6, v)) * 100) / 100;
    engine.dynScale = this.dyn;
    engine.resize();
  }

  update(dt: number, engine: Engine): void {
    if (!this.enabled) return;
    if (this.cooldown > 0) {
      this.cooldown -= dt;
      return;
    }
    this.acc += dt;
    this.frames++;
    if (this.acc < 1.5) return;
    const avg = this.acc / this.frames;
    this.acc = 0;
    this.frames = 0;
    const busy = engine.workMs > WORK_LIMIT_MS; // a frame costing more than 14 ms leaves no headroom on a 60 Hz phone
    if (avg > this.limit || busy) {
      this.good = 0;
      if (this.dyn > 0.6) { this.setDyn(engine, this.dyn - 0.1); this.cooldown = 1.5; return; } // resolution first
      this.bad++;
    } else {
      this.bad = 0;
      if (avg < this.limit * 0.72 && engine.workMs < WORK_LIMIT_MS * 0.6 && ++this.good >= 3 && this.dyn < 1) { this.good = 0; this.setDyn(engine, this.dyn + 0.1); this.cooldown = 1.5; }
      return;
    }
    const i = ORDER.indexOf(current);
    if (this.bad >= 2 && i > 0) { // still slow at 60 % resolution: drop a tier (and give resolution back)
      this.bad = 0;
      this.cooldown = 6;
      applyQuality(engine, ORDER[i - 1]);
      this.setDyn(engine, 0.8);
      this.onDowngrade?.(ORDER[i - 1]);
    }
  }
}

/** Touch-first device (phone or tablet). */
export const isPhone = (): boolean => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

/**
 * Once per device: phones start on MEDIUM (no rain mirror, 1.5x resolution, no streaks), also for saves made
 * before this existed (they defaulted to HIGH). The player can still pick HIGH afterwards. Returns true if it changed.
 */
export function phoneDefaults(s: { quality: Quality; graphics: Graphics }): boolean {
  if (!isPhone()) return false;
  try {
    if (localStorage.getItem('rb-phone-defaults') === '1') return false;
    localStorage.setItem('rb-phone-defaults', '1');
  } catch {
    return false;
  }
  if (s.quality === 'high' || s.quality === 'ultra') {
    s.quality = 'medium';
    s.graphics = { ...PRESETS.medium };
  }
  return true;
}
