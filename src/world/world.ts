import { DirectionalLight, Group, HemisphereLight, type Scene, type Texture, type WebGLRenderer } from 'three';
import { ObstacleField } from '../physics/obstacles';
import type { WeatherProfile } from '../types/game';
import { buildDock } from './dock';
import { buildNeonEnvMap } from './envMap';
import { buildFacades } from './facades';
import { buildFurniture } from './furniture';
import { createKestrelBay, PLAZA } from './kestrelBay';
import { buildProps } from './props';
import { layoutProps } from './propsLayout';
import { Steam } from './steam';
import type { Track } from './track';
import { buildTrackMeshes } from './trackMesh';
import { buildBridge, buildTunnel } from './tunnelBridge';
import { applyWorldLook, type LookTargets } from './worldLook';

export interface World {
  track: Track;
  root: Group;
  env: Texture;
  /** Parked cars as collision circles; hand to every TrackContact. */
  obstacles: ObstacleField;
  /** Re-skin the world for a weather profile (road gloss, snow tint, light pools). */
  setWeather(p: WeatherProfile): void;
  /** Per display frame: animated bits (steam vents). */
  update(dt: number, camX: number, camZ: number, viewportPx: number): void;
}

/** Builds Kestrel Bay Streets into `scene`: road, facades, tunnel, bridge, dock, props, signs and cables. */
export function buildWorld(scene: Scene, renderer: WebGLRenderer): World {
  const track = createKestrelBay();
  const meshes = buildTrackMeshes(track);
  const facades = buildFacades(track, PLAZA);
  const furniture = buildFurniture(track, facades.height);
  const dock = buildDock(track);
  const layout = layoutProps(track);
  const env = buildNeonEnvMap(renderer);
  const root = new Group();
  root.add(meshes.group, facades.group, furniture.group, dock.group, buildTunnel(track), buildBridge(track), buildProps(layout, PLAZA));
  const moon = new DirectionalLight(0x8fa4ff, 0.7);
  moon.position.set(-60, 90, -40);
  scene.add(root, new HemisphereLight(0x3a4a8a, 0x0a0a12, 0.9), moon);
  const steam = new Steam(scene, layout.vents);
  const targets: LookTargets = {
    roadMat: meshes.roadMat, vergeMat: meshes.vergeMat, groundMat: meshes.groundMat,
    waterMat: dock.waterMat, poolMat: furniture.poolMat, env,
  };
  return {
    track, root, env, obstacles: layout.obstacles,
    setWeather: (p) => applyWorldLook(targets, p),
    update: (dt, x, z, px) => steam.update(dt, x, z, px),
  };
}
