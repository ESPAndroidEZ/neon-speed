import { DirectionalLight, HemisphereLight, type Group, type Scene, type Texture, type WebGLRenderer } from 'three';
import { qualityNow } from '../core/quality';
import { findTrackDef, buildTrack, type TrackDef } from '../data/tracks';
import type { ObstacleField } from '../physics/obstacles';
import { SurfaceMap } from '../physics/surfaces';
import type { Weather, WeatherProfile } from '../types/game';
import { look } from '../core/looks';
import { paletteOf } from '../data/palettes';
import { buildNeonEnvMap } from './envMap';
import { disposeVisual } from './disposeVisual';
import { buildSky } from './sky';
import { instanceProp, loadPropModel } from './propModels';
import { layoutProps } from './propsLayout';
import { RedHandWall } from './redHandWall';
import { RoadMirror } from './roadMirror';
import { Steam } from './steam';
import { SurfaceVisuals } from './surfaceVisuals';
import type { Track } from './track';
import { applyWorldLook, type LookTargets } from './worldLook';
import { buildParts } from './worldParts';

export interface World {
  def: TrackDef;
  track: Track;
  root: Group;
  env: Texture;
  /** Parked cars as collision circles; hand to every TrackContact. */
  obstacles: ObstacleField;
  /** Rain puddles, snow banks and ice shared by every car. */
  surfaces: SurfaceMap;
  /** Re-skin the world for a weather profile (road gloss, snow tint, light pools). */
  setWeather(p: WeatherProfile): void;
  /** Redraw the Red Hand Wall at the finish line with this many red hands. */
  setHandprints(n: number): void;
  /** Refresh puddle / snow bank / ice visuals (after a reseed or weather change). */
  syncSurfaces(weather: Weather): void;
  /** Swap in optional prop GLBs (public/models/props) where present. Safe to call once after build. */
  applyPropModels(): Promise<void>;
  /** Per display frame: animated bits (steam vents) and quality switches. */
  update(dt: number, camX: number, camZ: number, viewportPx: number): void;
  /** Replace the map (road, scenery, surfaces). The World object stays the same; read its fields afresh afterwards. */
  load(def: TrackDef): void;
}

type Built = Omit<World, 'load'> & { dispose(): void };

function build(scene: Scene, env: Texture, def: TrackDef): Built {
  const track = buildTrack(def);
  const layout = layoutProps(track, 17, def.propsDensity);
  const surfaces = new SurfaceMap(track);
  const parts = buildParts(track, def, layout, env);
  const { meshes, furniture, dock, details } = parts;
  const root = parts.group;
  const open = def.theme === 'cliff'; // no street lamps or buildings: lean on moonlight
  const moon = new DirectionalLight(0x8fa4ff, open ? 1.6 : 0.7);
  moon.position.set(-60, 90, -40);
  const hemi = new HemisphereLight(0x3a4a8a, 0x0a0a12, open ? 2.2 : def.theme === 'port' ? 2.0 : 1.3);
  const pal = paletteOf(def.id);
  const sky = buildSky(pal);
  sky.setLook(look, pal);
  let clock = 0;
  // coloured rim lights from the district palette: key from one side, accent from the other (what makes facades and cars read)
  const keyL = new DirectionalLight(pal.key, open ? 0.2 : def.theme === 'port' ? 1.2 : 0.6);
  keyL.position.set(-90, 38, 30);
  const accL = new DirectionalLight(pal.accent[0], open ? 0.2 : def.theme === 'port' ? 0.6 : 0.22);
  accL.position.set(70, 30, -60);
  scene.add(root, hemi, moon, sky.group, keyL, accL);
  const visuals = new SurfaceVisuals(track, surfaces, root, env);
  const wall = new RedHandWall(track);
  root.add(wall.mesh);
  const steam = new Steam(scene, layout.vents);
  const mirror = new RoadMirror(scene, meshes.roadMat);
  let wet = false;
  const targets: LookTargets = {
    roadMat: meshes.roadMat, vergeMat: meshes.vergeMat, groundMat: meshes.groundMat,
    waterMat: parts.waterMat, poolMat: parts.poolMat, streakMat: parts.streakMat, shaftMat: parts.shaftMat, glowMat: parts.glowMat, env,
  };
  const plaza = def.plaza;
  return {
    def, track, root, env, obstacles: layout.obstacles, surfaces,
    syncSurfaces: (w) => visuals.sync(w),
    setHandprints: (n) => wall.setHandprints(n),
    setWeather: (p) => {
      wet = p.name === 'RAIN';
      sky.setLook(look, pal);
      applyWorldLook(targets, p);
    },
    applyPropModels: async () => {
      const [lamp, container, kiosk, sign] = await Promise.all([loadPropModel('lamp'), loadPropModel('container'), loadPropModel('kiosk'), loadPropModel('sign')]);
      if (sign && furniture) root.add(instanceProp(sign, furniture.signSpots));
      if (lamp && furniture) {
        root.add(instanceProp(lamp, furniture.lamps.map((l) => ({ x: l.x, z: l.z, yaw: l.yaw }))));
        furniture.heads.visible = false;
      }
      if (container && dock?.boxes) {
        root.add(instanceProp(container, dock.containers));
        dock.boxes.visible = false;
      }
      if (kiosk && plaza) root.add(instanceProp(kiosk, [{ x: plaza.x + 6.5, y: 0.4, z: plaza.z, yaw: 0 }, { x: plaza.x - 6.5, y: 0.4, z: plaza.z, yaw: Math.PI }]));
    },
    update: (dt, x, z, px) => {
      const q = qualityNow();
      if (furniture) {
        furniture.shafts.visible = q.shafts;
        furniture.glow.visible = q.shafts;
      }
      mirror.setActive(q.mirror && wet && def.theme !== 'cliff');
      steam.update(dt, x, z, px);
      clock += dt;
      sky.update(x, z, clock);
      details?.update(clock);
    },
    dispose: () => {
      mirror.setActive(false);
      scene.remove(root, hemi, moon, sky.group, keyL, accL);
      sky.dispose();
      details?.dispose();
      disposeVisual(root); // geometries, materials AND their canvas textures (material.dispose() keeps textures)
    },
  };
}

/** Builds a map into `scene`. The returned World is a stable handle: `load(def)` swaps the map behind it. */
export function buildWorld(scene: Scene, renderer: WebGLRenderer, def: TrackDef = findTrackDef('kestrel')): World {
  const env = buildNeonEnvMap(renderer);
  let cur = build(scene, env, def);
  let profile: WeatherProfile | null = null;
  let weather: Weather = 'CLEAR';
  let hands = 0;
  const world = {} as World;
  const adopt = (b: Built): void => {
    cur = b;
    Object.assign(world, b, {
      setWeather: (p: WeatherProfile) => {
        profile = p;
        cur.setWeather(p);
      },
      syncSurfaces: (w: Weather) => {
        weather = w;
        cur.syncSurfaces(w);
      },
      setHandprints: (n: number) => {
        hands = n;
        cur.setHandprints(n);
      },
      load: (d: TrackDef) => {
        if (d.id === world.def.id) return;
        cur.dispose();
        adopt(build(scene, env, d));
        if (profile) cur.setWeather(profile);
        cur.setHandprints(hands);
        cur.surfaces.setConditions(weather, 'AGGRESSIVE', 1);
        cur.syncSurfaces(weather);
        void cur.applyPropModels();
      },
      applyPropModels: () => cur.applyPropModels(),
      update: (dt: number, x: number, z: number, px: number) => cur.update(dt, x, z, px),
    });
  };
  adopt(cur);
  return world;
}
