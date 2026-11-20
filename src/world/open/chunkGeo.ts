import type { ChunkInfo, Footprint, RoadGraph } from '../../types/world';
import { SIDEWALK, isWater } from '../roads/grammar';
import { SEA_Y, heightAt } from '../roads/height';
import { CHUNK } from './chunkIndex';
import { cornerOf } from './footprints';

/** Triangle soup for one material: positions, normals, uvs (indexed). */
export interface Geo { pos: number[]; nrm: number[]; uv: number[]; idx: number[] }
export interface ChunkGeo { ground: Geo; water: Geo; road: Geo; walk: Geo; walls: Geo; roofs: Geo; lamps: Geo }

const geo = (): Geo => ({ pos: [], nrm: [], uv: [], idx: [] });
const GROUND_N = 8; // ground grid per chunk (16 m quads follow the hills)
const ROAD_Y = 0.04, WALK_Y = 0.16;
const LAMP_EVERY = 34, LAMP_H = 7, POOL_R = 9; // street lights: spacing along a road (m), post height, light pool radius

function quad(o: Geo, p: readonly number[], n: readonly number[], uv: readonly number[]): void {
  const b = o.pos.length / 3;
  for (let k = 0; k < 4; k++) {
    o.pos.push(p[k * 3], p[k * 3 + 1], p[k * 3 + 2]);
    o.nrm.push(n[0], n[1], n[2]);
    o.uv.push(uv[k * 2], uv[k * 2 + 1]);
  }
  // triangle (0, 2, 1): flip both triangles when its face normal points away from n (front faces are CCW)
  const ux = p[6] - p[0], uy = p[7] - p[1], uz = p[8] - p[2], vx = p[3] - p[0], vy = p[4] - p[1], vz = p[5] - p[2];
  const d = (uy * vz - uz * vy) * n[0] + (uz * vx - ux * vz) * n[1] + (ux * vy - uy * vx) * n[2];
  if (d >= 0) o.idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
  else o.idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
}

const yAt = (e: RoadGraph['edges'][number], k: number, x: number, z: number): number => (e.ys ? e.ys[k] : heightAt(x, z));

/** A strip along a road edge between lateral offsets l0 and l1 (left positive), for the segments this chunk owns. */
function strip(o: Geo, e: RoadGraph['edges'][number], own: (x: number, z: number) => boolean, l0: number, l1: number, dy: number, vTile: number): void {
  for (let k = 0; k + 1 < e.cum.length; k++) {
    const ax = e.pts[k * 2], az = e.pts[k * 2 + 1], bx = e.pts[k * 2 + 2], bz = e.pts[k * 2 + 3];
    if (!own((ax + bx) / 2, (az + bz) / 2)) continue; // each segment belongs to the chunk of its midpoint
    const len = Math.hypot(bx - ax, bz - az) || 1, nx = (bz - az) / len, nz = -(bx - ax) / len; // left normal
    const ya = yAt(e, k, ax, az) + dy, yb = yAt(e, k + 1, bx, bz) + dy;
    const v0 = e.cum[k] / vTile, v1 = e.cum[k + 1] / vTile;
    quad(o, [ax + nx * l0, ya, az + nz * l0, ax + nx * l1, ya, az + nz * l1, bx + nx * l0, yb, bz + nz * l0, bx + nx * l1, yb, bz + nz * l1],
      [0, 1, 0], [0, v0, 1, v0, 0, v1, 1, v1]);
  }
}

/** A flat disc (junction patch), 12 sides, as triangles from the centre. */
function disc(o: Geo, x: number, z: number, r: number, y: number): void {
  const b = o.pos.length / 3;
  o.pos.push(x, y, z); o.nrm.push(0, 1, 0); o.uv.push(0.5, 0.5);
  for (let k = 0; k <= 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    o.pos.push(x + Math.cos(a) * r, y, z + Math.sin(a) * r); o.nrm.push(0, 1, 0); o.uv.push(0.5 + Math.cos(a) / 2, 0.5 + Math.sin(a) / 2);
    if (k > 0) o.idx.push(b, b + k + 1, b + k);
  }
}

/** A building box: four walls (u, v in metres / 16: one facade tile) and a flat roof. */
function box(walls: Geo, roofs: Geo, f: Footprint): void {
  const y0 = heightAt(f.x, f.z) - 0.5, y1 = y0 + 0.5 + f.height;
  const c: { x: number; z: number }[] = [0, 1, 3, 2].map(() => ({ x: 0, z: 0 }));
  [0, 1, 3, 2].forEach((k, i) => cornerOf(f, k, c[i])); // ring order around the box
  for (let i = 0; i < 4; i++) {
    const p = c[i], q = c[(i + 1) % 4];
    const len = Math.hypot(q.x - p.x, q.z - p.z) || 1;
    const nx = (q.z - p.z) / len, nz = -(q.x - p.x) / len;
    const s = (nx * (p.x - f.x) + nz * (p.z - f.z)) > 0 ? 1 : -1; // outward
    const u1 = len / 16, v1 = f.height / 16;
    quad(walls, [p.x, y0, p.z, q.x, y0, q.z, p.x, y1, p.z, q.x, y1, q.z], [nx * s, 0, nz * s], s > 0 ? [0, 0, u1, 0, 0, v1, u1, v1] : [u1, 0, 0, 0, u1, v1, 0, v1]);
  }
  quad(roofs, [c[0].x, y1, c[0].z, c[1].x, y1, c[1].z, c[3].x, y1, c[3].z, c[2].x, y1, c[2].z], [0, 1, 0], [0, 0, 1, 0, 0, 1, 1, 1]);
}

/** Street lights along an edge (alternate sides): a thin dark post (into `posts`) and a light pool on the tarmac (`pools`). */
function lamps(pools: Geo, posts: Geo, e: RoadGraph['edges'][number], own: (x: number, z: number) => boolean): void {
  const w = e.width / 2;
  for (let s = LAMP_EVERY / 2, k = 0, side = 1; s < e.length; s += LAMP_EVERY, side = -side) {
    while (k + 2 < e.cum.length && e.cum[k + 1] < s) k++;
    const len = e.cum[k + 1] - e.cum[k] || 1, t = (s - e.cum[k]) / len;
    const tx = (e.pts[k * 2 + 2] - e.pts[k * 2]) / len, tz = (e.pts[k * 2 + 3] - e.pts[k * 2 + 1]) / len;
    const cx = e.pts[k * 2] + tx * len * t, cz = e.pts[k * 2 + 1] + tz * len * t;
    const px = cx + tz * side * (w + 0.6), pz = cz - tx * side * (w + 0.6); // post on the kerb
    if (!own(px, pz)) continue;
    const y = yAt(e, k, cx, cz), ox = cx + tz * side * (w - 2.5), oz = cz - tx * side * (w - 2.5);
    quad(pools, [ox - POOL_R, y + ROAD_Y + 0.03, oz - POOL_R, ox + POOL_R, y + ROAD_Y + 0.03, oz - POOL_R, ox - POOL_R, y + ROAD_Y + 0.03, oz + POOL_R, ox + POOL_R, y + ROAD_Y + 0.03, oz + POOL_R], [0, 1, 0], [0, 0, 1, 0, 0, 1, 1, 1]);
    const r = 0.12, py = (e.ys ? y : heightAt(px, pz)) + WALK_Y;
    for (const [ax, az, bx, bz] of [[-r, -r, r, -r], [r, -r, r, r], [r, r, -r, r], [-r, r, -r, -r]]) {
      quad(posts, [px + ax, py, pz + az, px + bx, py, pz + bz, px + ax, py + LAMP_H, pz + az, px + bx, py + LAMP_H, pz + bz], [(az + bz) === 0 ? Math.sign(ax) : 0, 0, (ax + bx) === 0 ? Math.sign(az) : 0], [0, 0, 1, 0, 0, 1, 1, 1]);
    }
  }
}

/** Every piece of one chunk as plain arrays (pure: the three.js wrapper is chunkMesh.ts; tests count triangles here). */
export function chunkGeo(g: RoadGraph, fs: readonly Footprint[], info: ChunkInfo): ChunkGeo {
  const out: ChunkGeo = { ground: geo(), water: geo(), road: geo(), walk: geo(), walls: geo(), roofs: geo(), lamps: geo() };
  const x0 = -g.half + info.cx * CHUNK, z0 = -g.half + info.cz * CHUNK;
  const own = (x: number, z: number): boolean => x >= x0 && x < x0 + CHUNK && z >= z0 && z < z0 + CHUNK;
  const step = CHUNK / GROUND_N;
  for (let j = 0; j < GROUND_N; j++) {
    for (let i = 0; i < GROUND_N; i++) {
      const ax = x0 + i * step, az = z0 + j * step, bx = ax + step, bz = az + step;
      if (isWater((ax + bx) / 2, (az + bz) / 2)) {
        quad(out.water, [ax, SEA_Y, az, bx, SEA_Y, az, ax, SEA_Y, bz, bx, SEA_Y, bz], [0, 1, 0], [ax / 32, az / 32, bx / 32, az / 32, ax / 32, bz / 32, bx / 32, bz / 32]);
        continue;
      }
      quad(out.ground, [ax, heightAt(ax, az) - 0.05, az, bx, heightAt(bx, az) - 0.05, az, ax, heightAt(ax, bz) - 0.05, bz, bx, heightAt(bx, bz) - 0.05, bz],
        [0, 1, 0], [ax / 16, az / 16, bx / 16, az / 16, ax / 16, bz / 16, bx / 16, bz / 16]);
    }
  }
  for (const id of info.edges) {
    const e = g.edges[id], w = e.width / 2;
    strip(out.road, e, own, -w, w, ROAD_Y, 16);
    if (e.kind !== 'runway') lamps(out.lamps, out.roofs, e, own);
    if (e.kind === 'bridge' || e.kind === 'runway') continue;
    strip(out.walk, e, own, w, w + SIDEWALK, WALK_Y, 4);
    strip(out.walk, e, own, -w - SIDEWALK, -w, WALK_Y, 4);
  }
  for (const n of g.nodes) if (own(n.x, n.z)) disc(out.road, n.x, n.z, n.radius, heightAt(n.x, n.z) + ROAD_Y + 0.01);
  for (const i of info.buildings) box(out.walls, out.roofs, fs[i]);
  return out;
}

export const triangles = (o: Geo): number => o.idx.length / 3;
