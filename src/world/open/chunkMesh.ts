import { AdditiveBlending, BufferGeometry, CanvasTexture, Color, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, RepeatWrapping, type Material, type Texture } from 'three';
import { DISTRICTS } from '../../types/world';
import { DISTRICT_LOOK } from '../../data/world/districtMap';
import type { ChunkInfo, Footprint, RoadGraph } from '../../types/world';
import { districtWalls } from './roamLook';
import type { DistrictId } from '../../types/world';
import { makeRoadTexture } from '../textures';
import { makeSignAtlas } from '../city/signs';
import { chunkGeo, type ChunkGeo, type Geo } from './chunkGeo';
import type { ChunkJob } from './streamer';

/** One shared material per chunk part (walls: one per district; a chunk uses its own): draw calls = parts x live chunks. */
export interface RoamMaterials { ground: MeshStandardMaterial; water: Material; road: MeshStandardMaterial; walk: MeshStandardMaterial; walls: Readonly<Record<DistrictId, Material>>; roofs: MeshStandardMaterial; lamps: Readonly<Record<DistrictId, Material>>; signs: Material }

const wrap = <T extends Texture>(t: T): T => { t.wrapS = t.wrapT = RepeatWrapping; return t; };

/** Districts with few lit windows get brighter street lights (readability: `npm run visual` city cases). */
const SPARSE: ReadonlySet<DistrictId> = new Set(['harbour', 'industrial', 'hills']);

/** Soft round light pool (white; the district's lamp colour tints it). */
function poolTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

/** Built once per free-roam session; `dispose` frees the textures. Canvas textures need a DOM (the browser). */
export function roamMaterials(): RoamMaterials & { dispose(): void } {
  const dw = districtWalls();
  const road = wrap(makeRoadTexture());
  const pool = poolTexture();
  const atlas = makeSignAtlas();
  const lamps = {} as Record<DistrictId, MeshBasicMaterial>;
  // pool colour: the district's lamp tint blended 35 % toward warm white (a tint, not a full-colour wash on the road)
  for (const d of DISTRICTS) lamps[d] = new MeshBasicMaterial({ map: pool, color: new Color(DISTRICT_LOOK[d].lamp).lerp(new Color(0xffe6c8), 0.35), transparent: true, opacity: SPARSE.has(d) ? 0.62 : 0.46, blending: AdditiveBlending, depthWrite: false });
  const m = {
    ground: new MeshStandardMaterial({ color: new Color(0x262e2c), roughness: 0.95 }),
    water: new MeshStandardMaterial({ color: new Color(0x061424), roughness: 0.12, metalness: 0.4 }),
    road: new MeshStandardMaterial({ map: road, roughness: 0.85 }),
    walk: new MeshStandardMaterial({ color: new Color(0x5d6066), roughness: 0.9 }),
    walls: dw.walls,
    roofs: new MeshStandardMaterial({ color: new Color(0x202226), roughness: 0.9, vertexColors: true }), // vertex colour: side faces darker (SIDE_SHADE)
    lamps,
    signs: new MeshBasicMaterial({ map: atlas, color: new Color(1.15, 1.15, 1.15) }), // same glow as the race maps' shop signs
  };
  return {
    ...m,
    dispose: () => {
      for (const mat of [m.ground, m.water, m.road, m.walk, m.roofs]) mat.dispose();
      dw.dispose();
      for (const l of Object.values(lamps)) l.dispose();
      road.dispose();
      pool.dispose();
      m.signs.dispose();
      atlas.dispose();
    },
  };
}

/** Roofs part: side faces (posts, furniture, roof clutter) get SIDE_SHADE so snow whitens only what faces up (qa #33). */
export const SIDE_SHADE = 0.22;

function toGeometry(o: Geo, shadeSides = false): BufferGeometry {
  const b = new BufferGeometry();
  b.setAttribute('position', new Float32BufferAttribute(o.pos, 3));
  b.setAttribute('normal', new Float32BufferAttribute(o.nrm, 3));
  b.setAttribute('uv', new Float32BufferAttribute(o.uv, 2));
  if (shadeSides) {
    const c = new Float32Array(o.pos.length);
    for (let i = 0; i < c.length; i += 3) c[i] = c[i + 1] = c[i + 2] = o.nrm[i + 1] > 0.5 ? 1 : SIDE_SHADE;
    b.setAttribute('color', new Float32BufferAttribute(c, 3));
  }
  b.setIndex(o.idx);
  b.computeBoundingSphere();
  return b;
}

const PARTS = ['ground', 'water', 'road', 'walk', 'walls', 'roofs', 'signs', 'lamps'] as const; // lamps last: additive, drawn over the road

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
        const mesh = new Mesh(toGeometry(geo[part], part === 'roofs'), part === 'walls' ? mats.walls[info.district] : part === 'lamps' ? mats.lamps[info.district] : mats[part]);
        mesh.name = part;
        mesh.matrixAutoUpdate = false;
        mesh.receiveShadow = part !== 'walls' && part !== 'lamps' && part !== 'signs';
        if (part === 'lamps') mesh.renderOrder = 2;
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
