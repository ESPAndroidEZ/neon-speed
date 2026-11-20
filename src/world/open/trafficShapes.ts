import { BoxGeometry, BufferGeometry, CylinderGeometry, Float32BufferAttribute, PlaneGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Traffic vehicle shapes for Neon Harbor (task 067, built by Claude): saloon, hatch, van, taxi and pickup as low-poly
 * merged boxes with four wheels. Car space: +Z nose, +X left, wheels on y = 0. `lamps` are white front / red rear quads
 * with vertex colours (as the traffic lamps); `lampY` is their height, so one shared lamp mesh can be scaled per car.
 */
export const TRAFFIC_VARIANTS = ['saloon', 'hatch', 'van', 'taxi', 'pickup'] as const;
export type TrafficVariant = (typeof TRAFFIC_VARIANTS)[number];
export interface TrafficShape { body: BufferGeometry; lamps: BufferGeometry; length: number; width: number; lampY: number }

const WHEEL_R = 0.33;
/** Box [width, height, length] with its bottom at y0 and centre at z. */
const box = (w: number, h: number, l: number, y0: number, z = 0): BufferGeometry => new BoxGeometry(w, h, l).translate(0, y0 + h / 2, z);

function wheels(width: number, length: number): BufferGeometry[] {
  const out: BufferGeometry[] = [];
  for (const sx of [1, -1]) for (const sz of [1, -1]) out.push(new CylinderGeometry(WHEEL_R, WHEEL_R, 0.25, 8).rotateZ(Math.PI / 2).translate(sx * (width / 2 - 0.1), WHEEL_R, sz * (length / 2 - 0.8)));
  return out;
}

function lampQuads(width: number, length: number, y: number): BufferGeometry {
  const quad = (z: number, ry: number, r: number, g: number, b: number): BufferGeometry => {
    const q = new PlaneGeometry(width - 0.3, 0.22).rotateY(ry).translate(0, y, z);
    q.setAttribute('color', new Float32BufferAttribute(new Array(q.getAttribute('position').count).fill(0).flatMap(() => [r, g, b]), 3));
    return q;
  };
  return mergeGeometries([quad(length / 2 + 0.01, 0, 1.4, 1.35, 1.2), quad(-length / 2 - 0.01, Math.PI, 1.6, 0.08, 0.08)]) as BufferGeometry;
}

/** Body parts per variant (without wheels) and the lamp height. */
function parts(kind: TrafficVariant): { p: BufferGeometry[]; length: number; width: number; lampY: number } {
  switch (kind) {
    case 'hatch': return { length: 3.9, width: 1.75, lampY: 0.72, p: [box(1.75, 0.7, 3.9, 0.22), box(1.58, 0.58, 2.1, 0.92, -0.45)] };
    case 'van': return { length: 5.0, width: 2.0, lampY: 0.85, p: [box(2.0, 1.95, 4.1, 0.25, -0.45), box(2.0, 0.85, 0.9, 0.25, 2.05)] };
    case 'pickup': {
      const L = 5.0, bedZ = -L / 4;
      return { length: L, width: 1.9, lampY: 0.8, p: [box(1.9, 0.75, L, 0.3), box(1.75, 0.65, 1.7, 1.05, 0.55), box(0.08, 0.5, L / 2 - 0.2, 1.05, bedZ).translate(0.9, 0, 0), box(0.08, 0.5, L / 2 - 0.2, 1.05, bedZ).translate(-0.9, 0, 0), box(1.9, 0.5, 0.08, 1.05, -L / 2 + 0.04)] };
    }
    default: { // saloon and taxi (the taxi adds a roof sign)
      const p = [box(1.8, 0.7, 4.4, 0.2), box(1.6, 0.55, 2.2, 0.875, -0.2)];
      if (kind === 'taxi') p.push(box(0.8, 0.3, 0.25, 1.425, -0.2));
      return { length: 4.4, width: 1.8, lampY: 0.7, p };
    }
  }
}

export function trafficShape(kind: TrafficVariant): TrafficShape {
  const s = parts(kind);
  const body = mergeGeometries([...s.p, ...wheels(s.width, s.length)]) as BufferGeometry;
  for (const g of s.p) g.dispose();
  return { body, lamps: lampQuads(s.width, s.length, s.lampY), length: s.length, width: s.width, lampY: s.lampY };
}
