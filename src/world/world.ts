import { DirectionalLight, Group, HemisphereLight, type Scene, type Texture, type WebGLRenderer } from 'three';
import type { WeatherProfile } from '../types/game';
import { buildCity, placeBuildings } from './city';
import { buildNeonEnvMap } from './envMap';
import { buildHarbor } from './harbor';
import { createHarborLoop } from './harborLoop';
import { buildFurniture } from './streetFurniture';
import type { Track } from './track';
import { buildTrackMeshes } from './trackMesh';
import { applyWorldLook, type LookTargets } from './worldLook';

export interface World {
  track: Track;
  root: Group;
  env: Texture;
  /** Re-skin the world for a weather profile (road gloss, snow tint, light pools). */
  setWeather(p: WeatherProfile): void;
}

/** Builds the Harbor Loop world into `scene`: road, barriers, city, lamps, signs and harbour. */
export function buildWorld(scene: Scene, renderer: WebGLRenderer): World {
  const track = createHarborLoop();
  const meshes = buildTrackMeshes(track);
  const buildings = placeBuildings(track);
  const furniture = buildFurniture(track, buildings);
  const harbor = buildHarbor();
  const env = buildNeonEnvMap(renderer);
  const root = new Group();
  root.add(meshes.group, buildCity(buildings), furniture.group, harbor.group);
  const moon = new DirectionalLight(0x8fa4ff, 0.7);
  moon.position.set(-60, 90, -40);
  scene.add(root, new HemisphereLight(0x3a4a8a, 0x0a0a12, 0.9), moon);
  const targets: LookTargets = {
    roadMat: meshes.roadMat, vergeMat: meshes.vergeMat, groundMat: meshes.groundMat,
    waterMat: harbor.waterMat, poolMat: furniture.poolMat, env,
  };
  return { track, root, env, setWeather: (p) => applyWorldLook(targets, p) };
}
