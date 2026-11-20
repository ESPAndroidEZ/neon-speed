import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, RepeatWrapping, type Material, type Texture } from 'three';
import type { ChunkInfo, Footprint, RoadGraph } from '../../types/world';
import { makeFacadeSheet } from '../city/textures';
import { makeRoadTexture } from '../textures';
import { chunkGeo, type ChunkGeo, type Geo } from './chunkGeo';
import type { ChunkJob } from './streamer';

/** One shared material per chunk part (every chunk uses the same six: draw calls = parts x live chunks). */
export interface RoamMaterials { ground: Material; water: Material; road: Material; walk: Material; walls: Material; roofs: Material }

const wrap = <T extends Texture>(t: T): T => { t.wrapS = t.wrapT = RepeatWrapping; return t; };

/** Built once per free-roam session; `dispose` frees the textures. Canvas textures need a DOM (the browser). */
export function roamMaterials(): RoamMaterials & { dispose(): void } {
  const sheet = makeFacadeSheet('concrete', 5);
  const road = wrap(makeRoadTexture());
  for (const t of [sheet.map, sheet.emissiveMap, sheet.normalMap, sheet.roughnessMap]) wrap(t);
  const m = {
    ground: new MeshStandardMaterial({ color: new Color(0x1c2422), roughness: 0.95 }),
    water: new MeshStandardMaterial({ color: new Color(0x061424), roughness: 0.12, metalness: 0.4 }),
    road: new MeshStandardMaterial({ map: road, roughness: 0.85 }),
    walk: new MeshStandardMaterial({ color: new Color(0x5d6066), roughness: 0.9 }),
    walls: new MeshStandardMaterial({ map: sheet.map, normalMap: sheet.normalMap, roughnessMap: sheet.roughnessMap, emissiveMap: sheet.emissiveMap, emissive: new Color(0xffd9a0), emissiveIntensity: 0.9 }),
    roofs: new MeshStandardMaterial({ color: new Color(0x202226), roughness: 0.9 }),
  };
  return {
    ...m,
    dispose: () => {
      for (const mat of Object.values(m)) mat.dispose();
      for (const t of [road, sheet.map, sheet.emissiveMap, sheet.normalMap, sheet.roughnessMap]) t.dispose();
    },
  };
}

function toGeometry(o: Geo): BufferGeometry {
  const b = new BufferGeometry();
  b.setAttribute('position', new Float32BufferAttribute(o.pos, 3));
  b.setAttribute('normal', new Float32BufferAttribute(o.nrm, 3));
  b.setAttribute('uv', new Float32BufferAttribute(o.uv, 2));
  b.setIndex(o.idx);
  b.computeBoundingSphere();
  return b;
}

const PARTS = ['ground', 'water', 'road', 'walk', 'walls', 'roofs'] as const;

/**
 * Streaming job for one chunk: slice 1 computes the arrays, then one slice per part turns them into a mesh (so a frame
 * never does a whole chunk at once). The finished Group is static (matrixAutoUpdate off) and holds no shared state.
 */
export function chunkJob(g: RoadGraph, fs: readonly Footprint[], info: ChunkInfo, mats: RoamMaterials): ChunkJob<Group> {
  let geo: ChunkGeo | null = null;
  let k = 0;
  const group = new Group();
  group.name = `chunk ${info.cx},${info.cz}`;
  return {
    next: () => {
      if (!geo) { geo = chunkGeo(g, fs, info); return { done: false, value: undefined }; }
      while (k < PARTS.length && geo[PARTS[k]].idx.length === 0) k++;
      if (k < PARTS.length) {
        const part = PARTS[k++];
        const mesh = new Mesh(toGeometry(geo[part]), mats[part]);
        mesh.name = part;
        mesh.matrixAutoUpdate = false;
        mesh.receiveShadow = part !== 'walls';
        group.add(mesh);
        return { done: false, value: undefined };
      }
      group.matrixAutoUpdate = false;
      return { done: true, value: group };
    },
  };
}

/** Free a chunk's geometry (materials are shared and stay). */
export function disposeChunk(group: Group): void {
  group.removeFromParent();
  for (const c of group.children) (c as Mesh).geometry.dispose();
}
