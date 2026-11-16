import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, type Material } from 'three';
import type { BodyParts, BodyShape } from './carBody';
import type { SignatureMats } from './carSignature';

const amber = new MeshBasicMaterial({ color: 0xff9a1a });
const reflector = new MeshBasicMaterial({ color: 0x8a0c0c });

/**
 * Second detail pass (after carSignature): the things that make each car read at chase distance. Kidney grilles,
 * wide C pillars, intakes, wipers, side repeaters, rear reflectors, a hatch/tail panel and a shark-fin aerial.
 * Primitives only, added to `body` before the merge by material.
 */
export function addExtras(body: Group, s: BodyShape, p: BodyParts, m: SignatureMats): void {
  const zf = s.length / 2, w = s.width, look = s.look ?? 'civic', zT = -zf;
  const put = (g: BoxGeometry | CylinderGeometry, mat: Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): void => {
    const o = new Mesh(g, mat);
    o.position.set(x, y, z);
    o.rotation.set(rx, ry, rz);
    body.add(o);
  };
  const box = (bw: number, bh: number, bd: number, mat: Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): void => put(new BoxGeometry(bw, bh, bd), mat, x, y, z, rx, ry, rz);
  const nose = (z: number): number => p.hoodY(z);
  const zm = (p.zWindshield + p.zCabinEnd) / 2;
  const roofH = s.height - s.beltHeight;
  // side repeaters on the front wings and low rear reflectors, on every car
  for (const sx of [-1, 1]) {
    box(0.012, 0.03, 0.09, amber, sx * (p.halfWidth(zf - 0.75) + 0.004), s.beltHeight - 0.16, zf - 0.75);
    box(0.16, 0.035, 0.03, reflector, sx * w * 0.3, 0.42, zT - 0.012);
    // windscreen wipers resting at the base of the glass
    box(0.5, 0.012, 0.012, m.trim, sx * w * 0.14, s.beltHeight + 0.012, p.zWindshield - 0.05, 0, 0, sx * 0.08);
  }
  // shark-fin aerial on the roof rear
  box(0.02, 0.09, 0.14, m.trim, 0, s.height + 0.04, p.zCabinEnd + 0.35, -0.5);
  switch (look) {
    case 'civic': // blacked rear panel under the hatch, number plate recess
      box(w * 0.7, 0.2, 0.03, m.trim, 0, s.beltHeight - 0.14, zT - 0.005);
      break;
    case 'golf': // the wide, body-coloured C pillar and a roof-edge spoiler
      for (const sx of [-1, 1]) box(0.05, roofH * 0.8, 0.42, m.paint, sx * (p.halfWidth(p.zCabinEnd + 0.3) * 0.78), s.beltHeight + roofH * 0.45, p.zCabinEnd + 0.3, 0.38);
      box(w * 0.62, 0.035, 0.16, m.paint, 0, s.height - 0.01, p.zCabinEnd + 0.06, 0.1);
      break;
    case 'z350': // side air vents behind the front wheels and a long glass hatch frame
      for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) box(0.012, 0.012, 0.16, m.trim, sx * (p.halfWidth(zf - 1.3) + 0.004), 0.55 - i * 0.03, zf - 1.3);
      box(w * 0.55, 0.02, 0.03, m.trim, 0, s.beltHeight + roofH * 0.5, p.zCabinEnd - 0.01);
      break;
    case 'rx7': // three slats in the low nose intake, double roof bubble ridge
      for (let i = 0; i < 3; i++) box(w * 0.32, 0.018, 0.04, m.trim, 0, 0.34 + i * 0.04, zf - 0.02);
      for (const sx of [-1, 1]) box(0.03, 0.02, 0.5, m.paint, sx * 0.22, s.height + 0.012, zm);
      break;
    case 'wagon': // twin kidney grille, tailgate dark band and roof spoiler
      for (const sx of [-1, 1]) {
        box(0.17, 0.13, 0.03, m.metal, sx * 0.1, nose(zf - 0.03) - 0.1, zf - 0.02);
        box(0.15, 0.11, 0.035, m.trim, sx * 0.1, nose(zf - 0.03) - 0.1, zf - 0.017);
      }
      box(w * 0.78, 0.1, 0.03, m.trim, 0, s.beltHeight + 0.04, zT - 0.005);
      box(w * 0.66, 0.04, 0.14, m.paint, 0, s.height - 0.03, p.zCabinEnd + 0.04, 0.16);
      break;
    case 'e46': // twin kidney grille and a boot-lid lip
      for (const sx of [-1, 1]) {
        box(0.17, 0.13, 0.03, m.metal, sx * 0.1, nose(zf - 0.03) - 0.1, zf - 0.02);
        box(0.15, 0.11, 0.035, m.trim, sx * 0.1, nose(zf - 0.03) - 0.1, zf - 0.017);
      }
      break;
    case 'evo': // intercooler grille under the bumper, two fog lamps and a roof vortex generator
      box(w * 0.4, 0.07, 0.03, m.trim, 0, 0.3, zf - 0.015);
      for (let i = 0; i < 5; i++) box(w * 0.4, 0.008, 0.035, m.metal, 0, 0.275 + i * 0.015, zf - 0.012);
      for (const sx of [-1, 1]) put(new CylinderGeometry(0.045, 0.045, 0.05, 12), m.head, sx * w * 0.38, 0.33, zf - 0.03, Math.PI / 2);
      box(w * 0.4, 0.025, 0.07, m.trim, 0, s.height + 0.005, p.zCabinEnd + 0.1);
      break;
    case 'supra': // bonnet air-extractor slits and low centre intake
      for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) box(0.12, 0.008, 0.02, m.trim, sx * 0.22, nose(zf - 1.1) + 0.012, zf - 1.05 - i * 0.07);
      box(w * 0.34, 0.07, 0.03, m.trim, 0, 0.3, zf - 0.015);
      break;
  }
}
