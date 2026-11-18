import { BoxGeometry, CylinderGeometry, Group, Mesh, type Material, type MeshBasicMaterial } from 'three';
import type { BodyParts, BodyShape } from './carBody';

/** Which car's face, tail and flanks to draw. Pure visual data: the physics never reads it. */
export type CarLook = 'civic' | 'golf' | 'z350' | 'rx7' | 'wagon' | 'e46' | 'evo' | 'supra';

export interface SignatureMats {
  paint: Material;
  trim: Material;
  metal: Material;
  head: MeshBasicMaterial;
  tail: MeshBasicMaterial;
}

/**
 * Per-car character on top of the lofted body: light units (housing + emissive lens), roof rails, vents, gills,
 * window trim and door handles. Primitives only, all added to `body` and merged by material afterwards.
 */
export function addSignature(body: Group, s: BodyShape, p: BodyParts, m: SignatureMats): void {
  const zf = s.length / 2, w = s.width, look = s.look ?? 'civic';
  const mesh = (g: BoxGeometry | CylinderGeometry, mat: Material, x: number, y: number, z: number, rx = 0, rz = 0): Mesh => {
    const o = new Mesh(g, mat);
    o.position.set(x, y, z);
    o.rotation.set(rx, 0, rz);
    o.castShadow = true;
    body.add(o);
    return o;
  };
  const box = (bw: number, bh: number, bd: number, mat: Material, x: number, y: number, z: number, rz = 0): Mesh => mesh(new BoxGeometry(bw, bh, bd), mat, x, y, z, 0, rz);
  /** Disc facing +Z (front) or -Z (rear). */
  const disc = (r: number, d: number, mat: Material, x: number, y: number, z: number): Mesh => mesh(new CylinderGeometry(r, r, d, 14), mat, x, y, z, Math.PI / 2);
  const hy = p.hoodY(zf - 0.14) - 0.06; // headlight height
  const ty = s.beltHeight - 0.16; // tail lamp height
  const zT = -zf;
  for (const sx of [-1, 1]) {
    const hx = sx * w * 0.32;
    switch (look) {
      case 'civic': // swept wedge units
        box(0.5, 0.15, 0.06, m.trim, hx, hy, zf - 0.14, sx * 0.1);
        box(0.44, 0.09, 0.06, m.head, hx, hy, zf - 0.11, sx * 0.1);
        box(0.12, 0.34, 0.05, m.tail, sx * w * 0.35, ty + 0.02, zT - 0.01); // tall vertical lamps
        break;
      case 'golf': // round lamps in square housings, upright tail units
        box(0.42, 0.2, 0.06, m.trim, hx, hy, zf - 0.14);
        disc(0.085, 0.06, m.head, hx - sx * 0.1, hy, zf - 0.1);
        box(0.16, 0.06, 0.06, m.head, hx + sx * 0.1, hy + 0.04, zf - 0.1);
        box(0.16, 0.26, 0.05, m.tail, sx * w * 0.33, ty + 0.02, zT - 0.01);
        break;
      case 'z350': // boomerang lights: two angled bars
        box(0.34, 0.15, 0.06, m.trim, hx, hy, zf - 0.14, sx * 0.25);
        box(0.3, 0.07, 0.06, m.head, hx - sx * 0.02, hy + 0.02, zf - 0.11, sx * 0.25);
        box(0.3, 0.07, 0.05, m.tail, sx * w * 0.3, ty + 0.02, zT - 0.01, -sx * 0.28);
        box(0.18, 0.07, 0.05, m.tail, sx * w * 0.2, ty - 0.08, zT - 0.01);
        break;
      case 'rx7': // closed pop-ups: two raised paint bulges, slit lamps low in the bumper, four round tail lamps
        box(0.36, 0.07, 0.34, m.paint, hx, p.hoodY(zf - 0.45) + 0.03, zf - 0.45);
        box(0.3, 0.05, 0.06, m.head, hx, 0.42, zf - 0.04);
        disc(0.07, 0.05, m.tail, sx * w * 0.34, ty, zT - 0.01);
        disc(0.07, 0.05, m.tail, sx * w * 0.2, ty, zT - 0.01);
        break;
      case 'wagon': // angular units with an eyebrow, L-shaped tail
        box(0.52, 0.17, 0.06, m.trim, hx, hy, zf - 0.14);
        box(0.46, 0.08, 0.06, m.head, hx, hy - 0.01, zf - 0.11);
        disc(0.05, 0.06, m.head, hx + sx * 0.14, hy + 0.03, zf - 0.1);
        box(0.09, 0.4, 0.05, m.tail, sx * w * 0.41, ty + 0.16, zT + 0.05);
        box(0.28, 0.1, 0.05, m.tail, sx * w * 0.26, ty + 0.04, zT - 0.01);
        break;
      case 'e46': // quad round headlights, split tail units
        box(0.5, 0.17, 0.06, m.trim, hx, hy, zf - 0.14);
        disc(0.075, 0.06, m.head, hx - sx * 0.12, hy, zf - 0.1);
        disc(0.062, 0.06, m.head, hx + sx * 0.08, hy, zf - 0.1);
        box(0.18, 0.1, 0.05, m.tail, sx * w * 0.3, ty, zT - 0.01);
        box(0.16, 0.1, 0.05, m.tail, sx * w * 0.14, ty, zT - 0.01);
        for (let i = 0; i < 3; i++) box(0.012, 0.1, 0.07, m.trim, sx * (p.halfWidth(zf - 1.55) + 0.004), 0.58, zf - 1.5 - i * 0.07); // fender gills
        break;
      case 'evo': // angular units, big lower intake, slim angled tail
        box(0.46, 0.14, 0.06, m.trim, hx, hy, zf - 0.14, sx * 0.08);
        box(0.38, 0.08, 0.06, m.head, hx, hy, zf - 0.11, sx * 0.08);
        box(0.26, 0.1, 0.05, m.trim, hx, 0.36, zf - 0.02);
        box(0.3, 0.08, 0.05, m.tail, sx * w * 0.3, ty + 0.02, zT - 0.01, -sx * 0.1);
        box(0.14, 0.01, 0.4, m.trim, sx * 0.18, p.hoodY(zf - 1.0) + 0.02, zf - 1.0); // bonnet vents
        break;
      case 'supra': // slim low units, two round lamps per side
        box(0.52, 0.12, 0.06, m.trim, hx, hy - 0.01, zf - 0.14, sx * 0.05);
        box(0.46, 0.07, 0.06, m.head, hx, hy - 0.01, zf - 0.11, sx * 0.05);
        disc(0.075, 0.05, m.tail, sx * w * 0.34, ty, zT - 0.01);
        disc(0.075, 0.05, m.tail, sx * w * 0.2, ty, zT - 0.01);
        break;
    }
    // everyone: window trim along the beltline, B-pillar, door handles
    const zA = p.zWindshield - 0.3, zB = p.zCabinEnd + 0.3, zm = (zA + zB) / 2;
    box(0.02, 0.03, zA - zB, m.trim, sx * (p.halfWidth(zm) * 0.9 + 0.005), s.beltHeight + 0.015, zm);
    box(0.03, (s.height - s.beltHeight) * 0.8, 0.07, m.trim, sx * (p.halfWidth(zm) * 0.88 + 0.004), s.beltHeight + (s.height - s.beltHeight) * 0.42, zm);
    box(0.014, 0.025, 0.14, m.metal, sx * (p.halfWidth(zm + 0.4) + 0.006), s.beltHeight - 0.08, zm + 0.4);
  }
  if (look === 'wagon') for (const sx of [-1, 1]) { // roof rails the length of the roof
    const z0 = p.zWindshield - 0.55, z1 = p.zCabinEnd + 0.1;
    box(0.035, 0.035, z0 - z1, m.metal, sx * p.halfWidth((z0 + z1) / 2) * 0.5, s.height + 0.03, (z0 + z1) / 2);
  }
  if (look === 'e46') box(0.5, 0.045, 0.7, m.paint, 0, p.hoodY(zf - s.hoodLength * 0.5) + 0.01, zf - s.hoodLength * 0.5); // power dome
  if (look === 'supra' || look === 'evo') { // second wing element, flatter and wider, on the same uprights
    const y = s.beltHeight + (look === 'supra' ? 0.38 : 0.36);
    box(w * 0.96, 0.025, 0.2, m.paint, 0, y + 0.06, zT + 0.22);
  }
}
