export type Zone = 'street' | 'alley' | 'plaza' | 'tunnel' | 'bridge' | 'dock' | 'boulevard' | 'yard' | 'cliff';

/** A corner of the street polygon. `zone` and `w` describe the leg that STARTS at this vertex. */
export interface Vertex {
  x: number;
  z: number;
  /** Corner fillet radius in metres; 0 = no rounding (collinear waypoint). */
  r: number;
  zone?: Zone;
  /** Road width of the leg starting here (default 10). */
  w?: number;
}

export interface DensePath {
  /** x, z pairs. */
  pts: [number, number][];
  zone: Zone[];
  width: number[];
  /** Smallest radius actually achieved after clamping fillets to the available leg length. */
  minRadius: number;
}

/**
 * Closed street polygon with rounded corners: each vertex with r > 0 is replaced by a circular arc tangent
 * to both legs. Returns a dense polyline (about `step` metres between points) tagged with zone and width.
 */
export function buildStreetPath(vs: readonly Vertex[], step = 1.5): DensePath {
  const n = vs.length;
  const T: number[] = new Array(n).fill(0); // tangent length per vertex
  const R: number[] = vs.map((v) => v.r);
  const dir = (a: Vertex, b: Vertex): [number, number, number] => {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const l = Math.hypot(dx, dz);
    return [dx / l, dz / l, l];
  };
  // Tangent lengths, shrinking radii where two fillets compete for one leg.
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < n; i++) {
      if (R[i] <= 0) continue;
      const [ax, az] = dir(vs[i], vs[(i + n - 1) % n]);
      const [bx, bz] = dir(vs[i], vs[(i + 1) % n]);
      const half = Math.acos(Math.max(-1, Math.min(1, ax * bx + az * bz))) / 2;
      T[i] = R[i] / Math.tan(half);
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const leg = dir(vs[i], vs[j])[2];
      if (T[i] + T[j] > leg * 0.98 && T[i] + T[j] > 0) {
        const k = (leg * 0.98) / (T[i] + T[j]);
        if (R[i] > 0) R[i] *= k;
        if (R[j] > 0) R[j] *= k;
      }
    }
  }
  const pts: [number, number][] = [];
  const zone: Zone[] = [];
  const width: number[] = [];
  let minR = Infinity;
  for (let i = 0; i < n; i++) {
    const v = vs[i];
    const prev = vs[(i + n - 1) % n];
    const next = vs[(i + 1) % n];
    const legZone = prev.zone ?? 'street';
    const legW = prev.w ?? 10;
    if (R[i] <= 0) {
      pts.push([v.x, v.z]);
      zone.push(legZone);
      width.push(legW);
    } else {
      const [ax, az] = dir(v, prev);
      const [bx, bz] = dir(v, next);
      const half = Math.acos(Math.max(-1, Math.min(1, ax * bx + az * bz))) / 2;
      const t = R[i] / Math.tan(half);
      minR = Math.min(minR, R[i]);
      const p1: [number, number] = [v.x + ax * t, v.z + az * t];
      const p2: [number, number] = [v.x + bx * t, v.z + bz * t];
      let mx = ax + bx;
      let mz = az + bz;
      const ml = Math.hypot(mx, mz);
      mx /= ml;
      mz /= ml;
      const cx = v.x + mx * (R[i] / Math.sin(half));
      const cz = v.z + mz * (R[i] / Math.sin(half));
      const a1 = Math.atan2(p1[1] - cz, p1[0] - cx);
      let da = Math.atan2(p2[1] - cz, p2[0] - cx) - a1;
      while (da > Math.PI) da -= 2 * Math.PI;
      while (da < -Math.PI) da += 2 * Math.PI;
      const steps = Math.max(4, Math.ceil((Math.abs(da) * R[i]) / step));
      for (let s = 0; s <= steps; s++) {
        const a = a1 + (da * s) / steps;
        pts.push([cx + Math.cos(a) * R[i], cz + Math.sin(a) * R[i]]);
        zone.push(legZone);
        width.push(legW);
      }
    }
    // straight run from this vertex's exit to the next vertex's entry, tagged with this vertex's leg
    const [dx, dz, len] = dir(v, next);
    const start = R[i] > 0 ? T[i] : 0;
    const end = len - (R[(i + 1) % n] > 0 ? T[(i + 1) % n] : 0);
    const m = Math.floor((end - start) / step);
    for (let s = 1; s < m; s++) {
      pts.push([v.x + dx * (start + (s * (end - start)) / m), v.z + dz * (start + (s * (end - start)) / m)]);
      zone.push(v.zone ?? 'street');
      width.push(v.w ?? 10);
    }
  }
  return { pts, zone, width, minRadius: minR === Infinity ? 0 : minR };
}
