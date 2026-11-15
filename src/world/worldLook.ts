import { LOOK_CONFIG } from '../render/lookConfig';
import { Color, type MeshBasicMaterial, type PointsMaterial, type MeshStandardMaterial, type Texture } from 'three';
import type { WeatherProfile } from '../types/game';

export interface LookTargets {
  roadMat: MeshStandardMaterial;
  vergeMat: MeshStandardMaterial;
  groundMat: MeshStandardMaterial;
  waterMat: MeshStandardMaterial;
  poolMat: MeshBasicMaterial;
  streakMat: MeshBasicMaterial;
  shaftMat: MeshBasicMaterial;
  glowMat: PointsMaterial;
  env: Texture;
}

const ROAD_DRY = new Color(0xffffff);
const ROAD_SNOW = new Color(0x6f7889);

/** Pushes a WeatherProfile into the world's materials: wet = glossy and reflective, snow = pale and matte. */
export function applyWorldLook(t: LookTargets, p: WeatherProfile): void {
  const wet = p.name === 'RAIN';
  const snow = p.name === 'SNOW';
  t.roadMat.roughness = p.roadRoughness * LOOK_CONFIG.road.roughnessScale;
  t.roadMat.metalness = wet ? LOOK_CONFIG.road.metalnessWet : snow ? LOOK_CONFIG.road.metalnessSnow : LOOK_CONFIG.road.metalnessDry;
  t.roadMat.envMap = t.env;
  t.roadMat.envMapIntensity = wet ? LOOK_CONFIG.road.envWet : snow ? LOOK_CONFIG.road.envSnow : LOOK_CONFIG.road.envDry;
  t.roadMat.color.copy(snow ? ROAD_SNOW : ROAD_DRY);
  t.vergeMat.color.setHex(snow ? 0x5b6577 : 0x1d2128);
  t.groundMat.color.setHex(snow ? 0x3f4858 : 0x14161c);
  t.groundMat.roughness = snow ? 0.95 : 0.9;
  t.waterMat.envMap = t.env;
  t.poolMat.opacity = wet ? 0.5 : snow ? 0.18 : 0.34;
  t.waterMat.roughness = snow ? 0.3 : 0.08 + p.precipitation * 0.1;
  t.streakMat.opacity = wet ? 0.28 : 0;
  t.shaftMat.opacity = wet ? 0.02 : snow ? 0.014 : 0.015; // fog and falling water scatter the lamp light
  t.glowMat.opacity = wet ? 0.24 : snow ? 0.18 : 0.25;
  for (const m of [t.roadMat, t.vergeMat, t.groundMat, t.waterMat]) m.needsUpdate = true;
}
