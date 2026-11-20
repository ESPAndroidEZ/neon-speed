import { Color, FogExp2, MeshStandardMaterial, RepeatWrapping, type Scene } from 'three';
import type { DistrictId } from '../../types/world';
import type { Weather } from '../../types/game';
import { DISTRICTS } from '../../types/world';
import { DISTRICT_LOOK, districtAt } from '../../data/world/districtMap';
import { WEATHER } from '../../physics/weather';
import { makeFacadeSheet, type FacadeKind, type FacadeSheet } from '../city/textures';

/** Facade per district (docs/art-direction.md: downtown glass towers, old town brick, harbour and industry metal sheds). */
const KIND: Readonly<Record<DistrictId, FacadeKind>> = { downtown: 'glass', strip: 'concrete', harbour: 'metal', oldtown: 'brick', hills: 'brick', industrial: 'metal', bay: 'concrete' };
/** Window glow per district: the share of lit windows drives the strength; the strip is neon-bright. */
const GLOW: Readonly<Record<DistrictId, number>> = { downtown: 1.0, strip: 1.5, harbour: 0.6, oldtown: 0.9, hills: 0.7, industrial: 0.45, bay: 0 };

/** One walls material per district (4 facade sheets shared): a chunk's walls use its district's, so draw calls stay one per chunk. */
export function districtWalls(): { walls: Record<DistrictId, MeshStandardMaterial>; dispose(): void } {
  const sheets = new Map<FacadeKind, FacadeSheet>();
  const sheet = (k: FacadeKind): FacadeSheet => {
    let s = sheets.get(k);
    if (!s) {
      s = makeFacadeSheet(k, 11 + sheets.size);
      for (const t of [s.map, s.emissiveMap, s.normalMap, s.roughnessMap]) t.wrapS = t.wrapT = RepeatWrapping;
      sheets.set(k, s);
    }
    return s;
  };
  const walls = {} as Record<DistrictId, MeshStandardMaterial>;
  for (const d of DISTRICTS) {
    const s = sheet(KIND[d]), look = DISTRICT_LOOK[d];
    walls[d] = new MeshStandardMaterial({ map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap, emissiveMap: s.emissiveMap, emissive: new Color(look.window), emissiveIntensity: GLOW[d] * (0.4 + look.lit) });
  }
  return {
    walls,
    dispose: () => {
      for (const m of Object.values(walls)) m.dispose();
      for (const s of sheets.values()) for (const t of [s.map, s.emissiveMap, s.normalMap, s.roughnessMap]) t.dispose();
    },
  };
}

interface Surfaces { ground: MeshStandardMaterial; road: MeshStandardMaterial; walk: MeshStandardMaterial; roofs: MeshStandardMaterial }
const BASE = { ground: 0x262e2c, walk: 0x5d6066, roofs: 0x202226 };
const SNOW = { ground: 0xc9d0da, walk: 0xaab1bc, roofs: 0xd2d8e0 };

/** Wet streets in rain (glossy tarmac), snow on the ground, sidewalks and roofs. Called when the weather changes. */
export function weatherSurfaces(m: Surfaces, w: Weather): void {
  const wet = w === 'RAIN', snow = w === 'SNOW';
  m.road.roughness = wet ? 0.28 : snow ? 0.75 : 0.85;
  m.road.metalness = wet ? 0.25 : 0;
  m.road.color.setHex(snow ? 0xc4c9d2 : 0xffffff);
  m.walk.roughness = wet ? 0.45 : 0.9;
  m.ground.color.setHex(snow ? SNOW.ground : BASE.ground);
  m.walk.color.setHex(snow ? SNOW.walk : BASE.walk);
  m.roofs.color.setHex(snow ? SNOW.roofs : BASE.roofs);
}

const target = new Color(), mix = new Color();

/**
 * District mood while driving: the fog colour and thickness ease toward the district under the camera, on top of the
 * weather's own fog (same 0.55 tint as races). No allocation per frame.
 */
export function districtFog(scene: Scene, x: number, z: number, w: Weather, dt: number, lookFogK: number): void {
  const fog = scene.fog;
  if (!(fog instanceof FogExp2)) return;
  const d = DISTRICT_LOOK[districtAt(x, z)], p = WEATHER[w];
  target.setHex(p.fogColor).lerp(mix.setHex(d.fog), 0.55);
  const k = 1 - Math.exp(-dt * 0.8); // ~1.2 s to settle
  fog.color.lerp(target, k);
  const want = p.fogDensity * (d.fogDensity / 0.0022) * lookFogK;
  fog.density += (want - fog.density) * k;
  if (scene.background instanceof Color) scene.background.copy(fog.color);
}
