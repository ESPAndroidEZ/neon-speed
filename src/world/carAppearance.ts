import { Color, MeshBasicMaterial, MeshPhysicalMaterial, type Group, type Object3D } from 'three';
import { FINISHES, stanceEffect, type GlowPattern, type Loadout } from '../data/loadout';
import { makeVinylMap } from './vinylLayer';
import type { WheelMats } from './carWheels';

/** The pieces of a procedural car the appearance system drives. */
export interface AppearanceTargets {
  paint: MeshPhysicalMaterial;
  glass: MeshPhysicalMaterial;
  headMat: MeshBasicMaterial;
  glowMat: MeshBasicMaterial;
  wheels: WheelMats;
  body: Group;
  pivots: readonly { pivot: Object3D; side: number }[];
}

/** Apply a loadout to a car: finish, vinyl map, tint, headlights, calipers, stance. Cheap enough to run on every garage click. */
export function applyAppearance(t: AppearanceTargets, l: Loadout, paintHex: number): void {
  const f = FINISHES[l.finish];
  const p = t.paint;
  p.metalness = f.metalness;
  p.roughness = f.roughness;
  p.clearcoat = f.clearcoat;
  p.clearcoatRoughness = f.ccRough;
  p.iridescence = l.finish === 'shift' ? 1 : 0;
  p.iridescenceIOR = 1.7;
  p.iridescenceThicknessRange = [200, 520];
  p.sheen = l.finish === 'pearl' ? 1 : 0;
  p.sheenColor.set(0xffffff);
  p.bumpScale = l.finish === 'chrome' || l.finish === 'matte' ? 0 : 0.35;
  const vinyl = l.vinyl.kind || l.vinyl.number;
  p.map?.dispose();
  if (vinyl) {
    p.map = makeVinylMap(l.finish === 'chrome' ? 0xdfe4ee : paintHex, l.vinyl);
    p.color.setHex(0xffffff);
  } else {
    p.map = null;
    p.color.setHex(l.finish === 'chrome' ? 0xdfe4ee : paintHex);
  }
  p.needsUpdate = true;
  // glass: tint darkens, clear shows the interior
  t.glass.color.setHex(0x0a101c).multiplyScalar(1 - l.tint * 0.75);
  t.glass.opacity = 1;
  t.headMat.color.setHex(l.headlight).multiplyScalar(2.4);
  t.wheels.caliper.color.setHex(l.caliper);
  t.wheels.rim.color.setHex(l.rim.color);
  // stance: lower body, negative camber on the wheels
  t.body.position.y = -0.05 * l.stance - 0.02 * Math.max(0, l.stance);
  for (const w of t.pivots) w.pivot.rotation.z = -w.side * 0.12 * Math.max(0, l.stance) + w.side * 0.04 * Math.min(0, l.stance);
  void stanceEffect;
}

/** Underglow animation: returns the colour multiplier for a pattern at time `t` (seconds) and the base colour hue shift. */
export function glowAt(pattern: GlowPattern, t: number, base: number, out: Color): Color {
  out.setHex(base);
  if (pattern === 'pulse') out.multiplyScalar(0.55 + 0.45 * Math.sin(t * 3.2));
  else if (pattern === 'rainbow') out.setHSL((t * 0.2) % 1, 1, 0.55);
  else if (pattern === 'chase') out.multiplyScalar(0.4 + 0.6 * Math.max(0, Math.sin(t * 9)));
  return out;
}
