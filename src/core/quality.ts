import type { Engine } from './engine';
import { GRAPHICS, usePreset } from './graphics';
import { grade } from './grade';
import type { Quality } from './save';

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
 * Drops one tier when the frame rate stays low (never upgrades by itself). Judges 2 s windows of frame time;
 * two bad windows in a row trigger a downgrade, then it waits 6 s before judging again.
 */
export class AutoQuality {
  enabled = true;
  onDowngrade: ((tier: Quality) => void) | null = null;
  private acc = 0;
  private frames = 0;
  private bad = 0;
  private cooldown = 4;
  private readonly limit: number;

  constructor(minFps = 40) {
    this.limit = 1 / minFps;
  }

  update(dt: number, engine: Engine): void {
    if (!this.enabled) return;
    if (this.cooldown > 0) {
      this.cooldown -= dt;
      return;
    }
    this.acc += dt;
    this.frames++;
    if (this.acc < 2) return;
    const avg = this.acc / this.frames;
    this.acc = 0;
    this.frames = 0;
    this.bad = avg > this.limit ? this.bad + 1 : 0;
    const i = ORDER.indexOf(current);
    if (this.bad >= 2 && i > 0) {
      this.bad = 0;
      this.cooldown = 6;
      applyQuality(engine, ORDER[i - 1]);
      this.onDowngrade?.(ORDER[i - 1]);
    }
  }
}
