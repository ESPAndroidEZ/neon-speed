import type { Quality } from './save';
import type { Engine } from './engine';

/** Quality tiers: render scale and bloom. Medium suits phones, low suits weak GPUs. */
export function applyQuality(engine: Engine, q: Quality): void {
  const t = { low: { px: 1, bloom: false, s: 0.5 }, medium: { px: 1.5, bloom: true, s: 0.65 }, high: { px: 2, bloom: true, s: 0.85 } }[q];
  engine.maxPixelRatio = t.px;
  engine.setBloom({ enabled: t.bloom, strength: t.s });
  engine.resize();
}
