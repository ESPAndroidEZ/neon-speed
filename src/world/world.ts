import { DirectionalLight, Group, HemisphereLight, type Scene, type Texture, type WebGLRenderer } from 'three';
import { qualityNow } from '../core/quality';
import type { ObstacleField } from '../physics/obstacles';
import { SurfaceMap } from '../physics/surfaces';
import type { Weather, WeatherProfile } from '../types/game';
import { buildDock } from './dock';
import { buildNeonEnvMap } from './envMap';
import { buildFacades } from './facades';
import { buildFurniture } from './furniture';
import { createKestrelBay, PLAZA } from './kestrelBay';
import { buildProps } from './props';
import { buildStage } from './stage';
import { layoutProps } from './propsLayout';
import { RedHandWall } from './redHandWall';
import { RoadMirror } from './roadMirror';
import { instanceProp, loadPropModel } from './propModels';
import { SurfaceVisuals } from './surfaceVisuals';
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
  /** Rain puddles, snow banks and ice shared by every car. */
  surfaces: SurfaceMap;
  /** Re-skin the world for a weather profile (road gloss, snow tint, light pools). */
  setWeather(p: WeatherProfile): void;
  /** Per display frame: animated bits (steam vents). */
  /** Redraw the Red Hand Wall at the finish line with this many red hands. */
  setHandprints(n: number): void;
  /** Refresh puddle / snow bank / ice visuals (after a reseed or weather change). */
  syncSurfaces(weather: Weather): void;
  /** Swap in optional prop GLBs (public/models/props) where present. Safe to call once after build. */
  applyPropModels(): Promise<void>;
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
  const surfaces = new SurfaceMap(track);
  const env = buildNeonEnvMap(renderer);
  const root = new Group();
  root.add(meshes.group, facades.group, furniture.group, dock.group, buildTunnel(track), buildBridge(track), buildProps(layout, PLAZA), buildStage(env));
  const moon = new DirectionalLight(0x8fa4ff, 0.7);
  moon.position.set(-60, 90, -40);
  scene.add(root, new HemisphereLight(0x3a4a8a, 0x0a0a12, 0.9), moon);
  const visuals = new SurfaceVisuals(track, surfaces, root, env);
  const wall = new RedHandWall(track);
  root.add(wall.mesh);
  const steam = new Steam(scene, layout.vents);
  const mirror = new RoadMirror(scene, meshes.roadMat);
  let wet = false;
  const targets: LookTargets = {
    roadMat: meshes.roadMat, vergeMat: meshes.vergeMat, groundMat: meshes.groundMat,
    waterMat: dock.waterMat, poolMat: furniture.poolMat, streakMat: furniture.streakMat, shaftMat: furniture.shaftMat, glowMat: furniture.glowMat, env,
  };
  return {
    track, root, env, obstacles: layout.obstacles, surfaces,
    syncSurfaces: (w) => visuals.sync(w),
    setHandprints: (n) => wall.setHandprints(n),
    setWeather: (p) => {
      wet = p.name === 'RAIN';
      applyWorldLook(targets, p);
    },
    applyPropModels: async () => {
      const [lamp, container, kiosk, sign] = await Promise.all([loadPropModel('lamp'), loadPropModel('container'), loadPropModel('kiosk'), loadPropModel('sign')]);
      if (sign) root.add(instanceProp(sign, furniture.signSpots));
      if (lamp) {
        root.add(instanceProp(lamp, furniture.lamps.map((l) => ({ x: l.x, z: l.z, yaw: l.yaw }))));
        furniture.heads.visible = false;
      }
      if (container && dock.boxes) {
        root.add(instanceProp(container, dock.containers));
        dock.boxes.visible = false;
      }
      if (kiosk) root.add(instanceProp(kiosk, [{ x: PLAZA.x + 6.5, y: 0.4, z: PLAZA.z, yaw: 0 }, { x: PLAZA.x - 6.5, y: 0.4, z: PLAZA.z, yaw: Math.PI }]));
    },
    update: (dt, x, z, px) => {
      const q = qualityNow();
      furniture.shafts.visible = q.shafts;
      furniture.glow.visible = q.shafts;
      mirror.setActive(q.mirror && wet);
      steam.update(dt, x, z, px);
    },
  };
}
