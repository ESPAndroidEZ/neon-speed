import { createRng } from '../core/rng';
import { ObstacleField } from '../physics/obstacles';
import { curvatureAt, halfWidthAt, type Track } from './track';

export interface Placed {
  x: number;
  z: number;
  yaw: number;
  index: number;
  side: number;
}

export interface PropsLayout {
  parked: Placed[];
  cones: Placed[];
  manholes: Placed[];
  crosswalks: Placed[];
  vents: Placed[];
  /** Static circles for the parked cars, bucketed by track sample. */
  obstacles: ObstacleField;
}

const yawAt = (tr: Track, i: number): number => Math.atan2(tr.samples[i].tangent.x, tr.samples[i].tangent.z);

/** Point at lateral offset `off` from sample i (positive = left). */
function at(tr: Track, i: number, off: number, side = 1): Placed {
  const s = tr.samples[i];
  return { x: s.position.x + s.tangent.z * off, z: s.position.z - s.tangent.x * off, yaw: yawAt(tr, i), index: i, side };
}

/** Deterministic placement of parked cars (with collision circles), cones, manholes, crosswalks and steam vents. */
export function layoutProps(tr: Track, seed = 17, density = 1): PropsLayout {
  const rnd = createRng(seed);
  const n = tr.samples.length;
  const out: PropsLayout = { parked: [], cones: [], manholes: [], crosswalks: [], vents: [], obstacles: new ObstacleField(n) };
  const k = (i: number): number => Math.abs(curvatureAt(tr, (i + n) % n));
  const straight = (i: number, span: number): boolean => {
    for (let d = -span; d <= span; d++) if (k(i + d) > 0.004) return false;
    return true;
  };
  const grid = (i: number): boolean => i > n - 26 || i < 8; // keep the start grid clear

  // parked cars: groups of 1 to 3 on straights, on one side, tucked against the kerb
  let cooldown = 0;
  for (let i = 10; i < n - 26; i++) {
    if (--cooldown > 0 || tr.zones[i] !== 'street' || tr.samples[i].width < 9.5 || !straight(i, 8)) continue;
    if (rnd() > 0.1 * density) continue;
    const side = rnd() < 0.5 ? 1 : -1;
    const count = 1 + Math.floor(rnd() * 3);
    for (let c = 0; c < count; c++) {
      const j = i + c * 2;
      if (grid(j) || tr.zones[j] !== 'street' || !straight(j, 3)) break;
      const p = at(tr, j, side * (halfWidthAt(tr, j) - 0.5), side);
      p.yaw += (rnd() - 0.5) * 0.06;
      out.parked.push(p);
      const fx = Math.sin(p.yaw);
      const fz = Math.cos(p.yaw);
      for (const o of [-1.2, 1.2]) out.obstacles.add(j, { x: p.x + fx * o, z: p.z + fz * o, r: 0.95 });
    }
    cooldown = 14 + count * 2;
  }

  // cones on the inside edge of tight corners
  for (let i = 10; i < n - 26; i += 3) {
    const c = curvatureAt(tr, i);
    if (Math.abs(c) < 0.045) continue;
    const side = c > 0 ? 1 : -1;
    out.cones.push(at(tr, i, side * (halfWidthAt(tr, i) - 0.45), side));
  }

  for (let m = 0; m < Math.round(30 * density); m++) {
    const i = 12 + Math.floor(rnd() * (n - 40));
    out.manholes.push(at(tr, i, (rnd() - 0.5) * halfWidthAt(tr, i) * 1.4));
  }

  // one crosswalk on each long straight of street zone
  let runStart = -1;
  for (let i = 10; i <= n - 26; i++) {
    const ok = tr.zones[i] === 'street' && straight(i, 2);
    if (ok && runStart < 0) runStart = i;
    if ((!ok || i === n - 26) && runStart >= 0) {
      if (i - runStart > 20 && out.crosswalks.length < 6) out.crosswalks.push(at(tr, runStart + Math.floor((i - runStart) * 0.7), 0));
      runStart = -1;
    }
  }

  for (let i = 20; i < n - 26; i += 28 + Math.floor(rnd() * 10)) {
    if (tr.zones[i] !== 'street' && tr.zones[i] !== 'alley') continue;
    const side = rnd() < 0.5 ? 1 : -1;
    out.vents.push(at(tr, i, side * (halfWidthAt(tr, i) - 0.7), side));
  }
  return out;
}
