import { BoxGeometry, CylinderGeometry, Group, Mesh, type Material } from 'three';
import type { BodyParts, BodyShape } from './carBody';

/**
 * Bolt-on details: front splitter, side skirts, rear wing or lip with end plates, hood scoop, exhaust tips,
 * door lines, side mirrors and light housings. All added to `body` (they roll and pitch with it).
 */
export function addDetails(body: Group, s: BodyShape, parts: BodyParts, paint: Material, trim: Material, metal: Material): void {
  const zf = s.length / 2;
  const w = s.width;
  const add = (g: BoxGeometry | CylinderGeometry, m: Material, x: number, y: number, z: number, rx = 0): Mesh => {
    const o = new Mesh(g, m);
    o.position.set(x, y, z);
    o.rotation.x = rx;
    o.castShadow = true;
    body.add(o);
    return o;
  };
  add(new BoxGeometry(w * 0.9, 0.04, 0.34), trim, 0, 0.2, zf - 0.1); // front splitter
  add(new BoxGeometry(w * 0.46, 0.12, 0.05), trim, 0, parts.hoodY(zf - 0.05) - 0.12, zf - 0.05); // grille
  for (const sx of [-1, 1]) {
    const x = sx * (parts.halfWidth(0) + 0.0);
    add(new BoxGeometry(0.06, 0.1, s.wheelbase - s.wheelRadius * 2.5), trim, x, 0.28, 0); // side skirt
    add(new BoxGeometry(0.014, 0.42, 0.01), trim, sx * (parts.halfWidth(parts.zWindshield - 0.9) + 0.002), s.beltHeight - 0.2, parts.zWindshield - 0.9); // door lines
    add(new BoxGeometry(0.014, 0.42, 0.01), trim, sx * (parts.halfWidth(parts.zWindshield - 1.9) + 0.002), s.beltHeight - 0.2, parts.zWindshield - 1.9);
    const mx = parts.halfWidth(parts.zWindshield) * 0.84;
    add(new BoxGeometry(0.1, 0.012, 0.04), trim, sx * (mx + 0.04), s.beltHeight + 0.06, parts.zWindshield - 0.1); // mirror stalk
    add(new BoxGeometry(0.1, 0.095, 0.17), paint, sx * (mx + 0.11), s.beltHeight + 0.1, parts.zWindshield - 0.1); // mirror
    add(new CylinderGeometry(0.052, 0.052, 0.16, 12), metal, sx * w * 0.28, 0.33, -zf - 0.04, Math.PI / 2); // exhaust tips
  }
  if (s.scoop) add(new BoxGeometry(0.55, 0.1, 0.55), trim, 0, parts.hoodY(zf - s.hoodLength * 0.55) + 0.05, zf - s.hoodLength * 0.55);
  const zRear = -zf;
  if (s.spoiler === 'wing') {
    const y = s.beltHeight + 0.34;
    add(new BoxGeometry(w * 0.94, 0.05, 0.4), paint, 0, y, zRear + 0.3);
    add(new BoxGeometry(0.04, 0.2, 0.4), paint, -w * 0.47, y, zRear + 0.3); // end plates
    add(new BoxGeometry(0.04, 0.2, 0.4), paint, w * 0.47, y, zRear + 0.3);
    for (const x of [-w * 0.28, w * 0.28]) add(new BoxGeometry(0.06, 0.34, 0.2), trim, x, s.beltHeight + 0.16, zRear + 0.34);
  } else if (s.spoiler === 'lip') add(new BoxGeometry(w * 0.82, 0.05, 0.2), paint, 0, s.beltHeight + 0.0, zRear + 0.2);
  add(new BoxGeometry(w * 0.7, 0.14, 0.1), trim, 0, 0.3, zRear + 0.02); // rear diffuser
}
