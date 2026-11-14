import { lerp } from '../core/math';
import type { Weather, WeatherProfile } from '../types/game';
import { WEATHER } from './weather';

export type PhysicsLevel = 'NORMAL' | 'AGGRESSIVE' | 'EXTREME';
export const LEVELS: readonly PhysicsLevel[] = ['NORMAL', 'AGGRESSIVE', 'EXTREME'];

/** Tyre grip per level (also scales braking): [NORMAL, AGGRESSIVE, EXTREME]. */
const GRIP: Record<Weather, readonly number[]> = { CLEAR: [1, 1, 1], RAIN: [0.72, 0.6, 0.5], SNOW: [0.45, 0.34, 0.26] };
/** Snow lets the tail swing: less yaw damping. Slides also recover more slowly (weaker counter-steer assist). */
const YAW_DAMP: Record<Weather, readonly number[]> = { CLEAR: [1, 1, 1], RAIN: [1, 0.9, 0.8], SNOW: [1, 0.72, 0.55] };
/** Rear axle grip relative to the front: in bad weather the tail lets go first. */
const REAR: Record<Weather, readonly number[]> = { CLEAR: [1, 1, 1], RAIN: [1, 0.96, 0.92], SNOW: [1, 0.92, 0.85] };
const ASSIST: Record<Weather, readonly number[]> = { CLEAR: [1, 1, 1], RAIN: [1, 0.9, 0.8], SNOW: [1, 0.8, 0.65] };

/** WeatherProfile plus the extra knobs the car physics reads. */
export interface PhysicsEnv {
  name: Weather;
  grip: number;
  fogDensity: number;
  fogColor: number;
  precipitation: number;
  roadRoughness: number;
  level: PhysicsLevel;
  yawDampMul: number;
  assistMul: number;
  rearGripMul: number;
  /** 0..1 how far the weather has built up (rain ramps in over ~20 s). */
  intensity: number;
}

const li = (l: PhysicsLevel): number => LEVELS.indexOf(l);

/** Grip multiplier for a weather and level at full intensity. */
export const gripFor = (w: Weather, level: PhysicsLevel): number => GRIP[w][li(level)];

/**
 * Physics environment for a weather at a given level and build-up. Grip, yaw damping and assist ease from their dry
 * values to the full-weather values as `intensity` goes 0 -> 1, so dynamic weather changes feel gradual.
 */
export function fillEnv(out: PhysicsEnv, w: Weather, level: PhysicsLevel, intensity = 1): PhysicsEnv {
  const base: WeatherProfile = WEATHER[w];
  const k = Math.min(1, Math.max(0, intensity));
  const i = li(level);
  out.name = w;
  out.fogDensity = base.fogDensity;
  out.fogColor = base.fogColor;
  out.roadRoughness = base.roadRoughness;
  out.grip = lerp(1, GRIP[w][i], k);
  out.precipitation = base.precipitation * k;
  out.level = level;
  out.yawDampMul = lerp(1, YAW_DAMP[w][i], k);
  out.assistMul = lerp(1, ASSIST[w][i], k);
  out.rearGripMul = lerp(1, REAR[w][i], k);
  out.intensity = k;
  return out;
}

/** Allocating convenience wrapper (tests, one-off use). Per-step code should reuse an object with `fillEnv`. */
export const envFor = (w: Weather, level: PhysicsLevel, intensity = 1): PhysicsEnv =>
  fillEnv({ name: w, grip: 1, fogDensity: 0, fogColor: 0, precipitation: 0, roadRoughness: 0, level, yawDampMul: 1, assistMul: 1, rearGripMul: 1, intensity: 1 }, w, level, intensity);
