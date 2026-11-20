/* Task 067 traffic shapes (world/open/trafficShapes.ts): each variant's size matches its stated length and width, the
 * wheels touch y = 0, lamps carry colours with the white pair at the front (+z) and the red pair at the back, and the
 * triangle budgets hold (body <= 260, lamps <= 12). */
import { TRAFFIC_VARIANTS, trafficShape } from '../src/world/open/trafficShapes.ts';
import { TRAFFIC_SIZE } from '../src/physics/trafficSize.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const tris = (g: import('three').BufferGeometry): number => (g.index ? g.index.count : g.getAttribute('position').count) / 3;
for (const v of TRAFFIC_VARIANTS) {
  const s = trafficShape(v);
  s.body.computeBoundingBox();
  const b = s.body.boundingBox!;
  const L = b.max.z - b.min.z, W = b.max.x - b.min.x;
  check(`${v}: ${s.length} x ${s.width} m as stated`, Math.abs(L - s.length) <= 0.15 && Math.abs(W - s.width) <= 0.15 && Math.abs(b.min.y) < 0.01, `${L.toFixed(2)} x ${W.toFixed(2)}, bottom ${b.min.y.toFixed(3)}`);
  check(`${v}: fits the traffic lane and the collision box (<= 5.0 x 2.0 m)`, s.length <= 5.0 && s.width <= 2.05);
  const pos = s.lamps.getAttribute('position'), col = s.lamps.getAttribute('color');
  let frontWhite = true, backRed = true;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i), red = col.getX(i) > 1 && col.getY(i) < 0.2;
    if (z > 0 && red) frontWhite = false;
    if (z < 0 && !red) backRed = false;
  }
  check(`${v}: white lamps at the front, red at the back`, !!col && frontWhite && backRed);
  check(`${v}: budgets (body ${tris(s.body)} <= 260, lamps ${tris(s.lamps)} <= 12)`, tris(s.body) <= 260 && tris(s.lamps) <= 12);
}
check('collision sizes match the shapes (physics/trafficSize)', TRAFFIC_VARIANTS.every((v, i) => { const s = trafficShape(v); return TRAFFIC_SIZE[i][0] === s.width && TRAFFIC_SIZE[i][1] === s.length; }));
const taxi = trafficShape('taxi'), saloon = trafficShape('saloon');
taxi.body.computeBoundingBox(); saloon.body.computeBoundingBox();
check('the taxi has a roof sign above the saloon roof', taxi.body.boundingBox!.max.y > saloon.body.boundingBox!.max.y + 0.2);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
