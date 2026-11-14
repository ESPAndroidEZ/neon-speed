import { Color, type MeshBasicMaterial, type MeshStandardMaterial, type Texture } from 'three';
import type { WeatherProfile } from '../types/game';

export interface LookTargets {
  roadMat: MeshStandardMaterial;
  vergeMat: MeshStandardMaterial;
  groundMat: MeshStandardMaterial;
  waterMat: MeshStandardMaterial;
  poolMat: MeshBasicMaterial;
  env: Texture;
}

const ROAD_DRY = new Color(0xffffff);
const ROAD_SNOW = new Color(0xc9d2e4);

/** Pushes a WeatherProfile into the world's materials: wet = glossy and reflective, snow = pale and matte. */
export function applyWorldLook(t: LookTargets, p: WeatherProfile): void {
  const wet = p.name === 'RAIN';
  const snow = p.name === 'SNOW';
  t.roadMat.roughness = p.roadRoughness;
  t.roadMat.metalness = wet ? 0.55 : snow ? 0.05 : 0.35;
  t.roadMat.envMap = t.env;
  t.roadMat.envMapIntensity = wet ? 1.6 : snow ? 0.15 : 0.5;
  t.roadMat.color.copy(snow ? ROAD_SNOW : ROAD_DRY);
  t.vergeMat.color.setHex(snow ? 0xaab4c8 : 0x1d2128);
  t.groundMat.color.setHex(snow ? 0x8f99ad : 0x14161c);
  t.groundMat.roughness = snow ? 0.95 : 0.9;
  t.waterMat.envMap = t.env;
  t.poolMat.opacity = wet ? 0.8 : snow ? 0.25 : 0.38;
  t.waterMat.roughness = snow ? 0.3 : 0.08 + p.precipitation * 0.1;
  for (const m of [t.roadMat, t.vergeMat, t.groundMat, t.waterMat]) m.needsUpdate = true;
}
