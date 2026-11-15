/**
 * Look knobs for lights, bloom, fog and the road. Plain data: no imports, no logic.
 *
 * QWEN MAY: change any NUMBER below and the comments next to it. Defaults reproduce the approved look, so changing a
 * value is the whole job for a lighting task. QWEN MAY NOT: rename, remove or retype a field (other code reads them),
 * add imports, or touch the files that read this (core/engine.ts, core/quality.ts, game/weatherApply.ts,
 * world/proceduralCar.ts, world/worldLook.ts). Everything is read live; nothing is cached.
 *
 * Checks after a change: `npm run visual` (night luminance, clipped pixels under 2 %), `npm run nitro:check`.
 */
export const LOOK_CONFIG = {
  bloom: {
    /** Floor for the bloom luminance threshold. The effective value is max(weather grade threshold, this). HDR: lights are above 1. */
    threshold: 0,
    /** Multiplies the bloom strength of every quality tier and weather (1 = approved look). */
    strength: 1,
    /** Bloom spread (0 tight .. 1 wide). */
    radius: 0.55,
  },
  brakeLight: {
    /** Tail lamp colour multiplier with the lights on and not braking (HDR: above ~1 starts to bloom). */
    idle: 2.2,
    /** Tail lamp colour multiplier while braking (must stay clearly above idle so braking reads). */
    braking: 6,
  },
  /** Sky/ground fill light (what lifts facades and the road out of black). Multiplies the hemisphere and moon light per weather. */
  fill: {
    clear: 4,
    rain: 4,
    /** Snow on the ground bounces light: the brightest nights. */
    snow: 6,
    /** Hemisphere ground colour: dry/wet street, and the snow bounce. */
    ground: 0x1a1a26,
    groundSnow: 0x8494b4,
  },
  fog: {
    /** Multiplies the weather fog density (1 = approved). */
    densityScale: 1,
  },
  /** Street-vent mist (world/steam.ts). */
  mist: {
    /** Puffs per second per vent in range. */
    rate: 14,
    /** Multiplies the rising speed of a puff (1 = approved; lower = lazier). */
    riseScale: 1,
    /** Peak opacity of a puff (0..1). */
    opacity: 0.28,
  },
  road: {
    /** Metalness of the road by surface (higher = shinier reflections of neon). */
    metalnessDry: 0.35,
    metalnessWet: 0.55,
    metalnessSnow: 0.05,
    /** Environment-map reflection strength by surface. */
    envDry: 0.5,
    envWet: 1,
    envSnow: 0.1,
    /** Multiplies the weather road roughness (1 = approved; lower = glossier). */
    roughnessScale: 1,
  },
} as const;
