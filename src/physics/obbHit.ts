/**
 * Box against box on the ground plane (separating axis test): the car's box (centre, heading, half width / length) and
 * an obstacle box (centre, rotation, half width / depth, same axis convention as footprints: local +Z = (sin r, cos r),
 * local +X = (cos r, -sin r)). Writes the least push that separates them: depth `pen`, unit normal (nx, nz) pointing
 * from the obstacle toward the car, and the contact point (the car corner pressed deepest). Pure, no allocation.
 * Replaces the 8-point test in the city (2026-11-25): building corners between the points went up to 3.6 m into the car.
 */
export interface ObbOut { pen: number; nx: number; nz: number; px: number; pz: number }

export function obbHit(cx: number, cz: number, ch: number, cw: number, cl: number, bx: number, bz: number, br: number, bw: number, bd: number, out: ObbOut): boolean {
  const cxx = Math.cos(ch), cxz = -Math.sin(ch), czx = Math.sin(ch), czz = Math.cos(ch); // car local X and Z axes
  const bxx = Math.cos(br), bxz = -Math.sin(br), bzx = Math.sin(br), bzz = Math.cos(br);
  const dx = cx - bx, dz = cz - bz;
  let best = Infinity, nx = 0, nz = 0;
  for (let k = 0; k < 4; k++) {
    const ux = k === 0 ? cxx : k === 1 ? czx : k === 2 ? bxx : bzx;
    const uz = k === 0 ? cxz : k === 1 ? czz : k === 2 ? bxz : bzz;
    const rc = cw * Math.abs(cxx * ux + cxz * uz) + cl * Math.abs(czx * ux + czz * uz);
    const rb = bw * Math.abs(bxx * ux + bxz * uz) + bd * Math.abs(bzx * ux + bzz * uz);
    const d = dx * ux + dz * uz;
    const o = rc + rb - Math.abs(d);
    if (o <= 0) return false;
    if (o < best) { best = o; const s = d >= 0 ? 1 : -1; nx = ux * s; nz = uz * s; }
  }
  // contact: the car corner furthest against the normal (pressed into the obstacle)
  let px = cx, pz = cz, low = Infinity;
  for (let k = 0; k < 4; k++) {
    const sx = k & 1 ? 1 : -1, sz = k & 2 ? 1 : -1;
    const qx = cx + cxx * cw * sx + czx * cl * sz, qz = cz + cxz * cw * sx + czz * cl * sz;
    const p = qx * nx + qz * nz;
    if (p < low) { low = p; px = qx; pz = qz; }
  }
  out.pen = best; out.nx = nx; out.nz = nz; out.px = px; out.pz = pz;
  return true;
}
