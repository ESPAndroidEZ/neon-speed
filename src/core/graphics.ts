import type { Engine } from './engine';
import type { Quality } from './save';

/** Every graphics option. A preset fills all of them; the screen then lets each be changed on its own (the budgets are in docs/art-direction.md). */
export interface Graphics {
  /** Render resolution multiplier on top of the device pixel ratio (0.5 .. 1.5). */
  resScale: number;
  bloom: boolean;
  reflections: boolean;
  shadows: boolean;
  /** Multiplier on particle budgets (0.25 .. 1.5). */
  particles: number;
  /** 0 short (250 m), 1 medium (500 m), 2 far (800 m). */
  drawDistance: 0 | 1 | 2;
  /** MSAA samples: 0 off, 2, 4. */
  msaa: 0 | 2 | 4;
  /** Frame cap: 0 = the display's rate. */
  fpsCap: 0 | 30 | 60 | 120;
  /** Field of view at rest, degrees (50 .. 75). */
  fov: number;
  hudScale: number;
  /** Speed blur strength 0 .. 1. */
  motionBlur: number;
}

export const PRESETS: Record<Quality, Graphics> = {
  low: { resScale: 0.7, bloom: false, reflections: false, shadows: false, particles: 0.5, drawDistance: 0, msaa: 0, fpsCap: 0, fov: 60, hudScale: 1, motionBlur: 0 },
  medium: { resScale: 0.85, bloom: true, reflections: false, shadows: false, particles: 0.8, drawDistance: 1, msaa: 0, fpsCap: 0, fov: 60, hudScale: 1, motionBlur: 0.5 },
  high: { resScale: 1, bloom: true, reflections: true, shadows: true, particles: 1, drawDistance: 2, msaa: 4, fpsCap: 0, fov: 60, hudScale: 1, motionBlur: 1 },
  ultra: { resScale: 1.25, bloom: true, reflections: true, shadows: true, particles: 1.4, drawDistance: 2, msaa: 4, fpsCap: 0, fov: 60, hudScale: 1, motionBlur: 1 },
};

/** The live values (mutated in place; systems read them each frame). */
export const GRAPHICS: Graphics = { ...PRESETS.high };

const FAR = [250, 500, 800] as const;
const num = (v: unknown, d: number, lo: number, hi: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

/** Make stored graphics safe; anything missing comes from the preset of the saved tier. */
export function sanitizeGraphics(raw: unknown, tier: Quality): Graphics {
  const d = PRESETS[tier] ?? PRESETS.high;
  if (typeof raw !== 'object' || raw === null) return { ...d };
  const r = raw as Record<string, unknown>;
  const pick = <T extends number>(v: unknown, ok: readonly T[], def: T): T => (ok.includes(v as T) ? (v as T) : def);
  return {
    resScale: num(r.resScale, d.resScale, 0.5, 1.5), bloom: typeof r.bloom === 'boolean' ? r.bloom : d.bloom, reflections: typeof r.reflections === 'boolean' ? r.reflections : d.reflections,
    shadows: typeof r.shadows === 'boolean' ? r.shadows : d.shadows, particles: num(r.particles, d.particles, 0.25, 1.5), drawDistance: pick(r.drawDistance, [0, 1, 2] as const, d.drawDistance),
    msaa: pick(r.msaa, [0, 2, 4] as const, d.msaa), fpsCap: pick(r.fpsCap, [0, 30, 60, 120] as const, d.fpsCap), fov: num(r.fov, d.fov, 50, 75), hudScale: num(r.hudScale, 1, 0.8, 1.3), motionBlur: num(r.motionBlur, d.motionBlur, 0, 1),
  };
}

export interface GraphicsHooks {
  /** HUD and camera pieces the graphics settings touch. */
  hud: { setScale(s: number): void };
  chase: { tuning: { fovMin: number; fovMax: number } };
}

/** Push GRAPHICS into the engine and the HUD. Call after any change. */
export function applyGraphics(engine: Engine, hooks: GraphicsHooks): void {
  const g = GRAPHICS;
  engine.fpsCap = g.fpsCap || (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches ? 60 : 0); // phones never render above 60 fps
  engine.camera.far = FAR[g.drawDistance];
  engine.camera.updateProjectionMatrix();
  engine.renderer.shadowMap.enabled = g.shadows;
  engine.setSamples(g.msaa);
  engine.resScale = g.resScale; // the tier's DPR cap stays (core/quality applyQuality)
  engine.resize();
  hooks.hud.setScale(g.hudScale);
  hooks.chase.tuning.fovMin = g.fov;
  hooks.chase.tuning.fovMax = g.fov + 25;
}

/** Assign a preset to the live values. */
export const usePreset = (tier: Quality): void => void Object.assign(GRAPHICS, PRESETS[tier]);

/** "Test my device": render a few synchronous frames and pick a preset from the measured cost (under 6 ms ultra, 10 high, 18 medium). */
export function benchmark(engine: Engine, frames = 40): { tier: Quality; ms: number } {
  const ms = measureRender(engine, frames);
  return { tier: ms < 6 ? 'ultra' : ms < 10 ? 'high' : ms < 18 ? 'medium' : 'low', ms };
}

/** Mean ms per frame over `frames` synchronous renders (waits for the GPU): the "Test my device" benchmark. */
function measureRender(engine: Engine, frames: number): number {
  const gl = engine.renderer.getContext();
  engine.composer.render(0.016);
  gl.finish();
  const t0 = performance.now();
  for (let i = 0; i < frames; i++) {
    engine.composer.render(0.016);
    gl.finish();
  }
  return (performance.now() - t0) / frames;
}
