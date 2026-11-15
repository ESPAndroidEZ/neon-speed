import { Mesh, Raycaster, Vector3, type Object3D } from 'three';

/* Number plates stay ON the bodywork and visible from a chase camera at full body roll/pitch and slip angles 0..1 rad (bug A2). */
// node has no canvas: a no-op 2D context is enough (textures are never looked at here)
const ctx2d: unknown = new Proxy({}, { get: (_t, k) => (k === 'measureText' ? () => ({ width: 0 }) : k === 'getImageData' || k === 'createImageData' ? () => ({ data: new Uint8ClampedArray(4 * 512 * 512) }) : () => ctx2d), set: () => true });
(globalThis as { document?: unknown }).document ??= { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => ctx2d }) };
const { CARS } = await import('../src/data/cars.ts');
const { buildProceduralCar } = await import('../src/world/proceduralCar.ts');
const { withPlates } = await import('../src/world/carFactory.ts');
const { defaultLoadout } = await import('../src/data/loadout.ts');

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => {
  if (!ok) failed++;
  if (!ok || process.argv.includes('-v')) console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const ray = new Raycaster();
const EPS = 0.003;
/** First solid body hit along a ray (plates and see-through helpers excluded). */
function bodyHit(targets: Object3D[], from: Vector3, to: Vector3): number {
  const d = to.clone().sub(from);
  const len = d.length();
  ray.set(from, d.normalize());
  ray.far = len + 0.5;
  const h = ray.intersectObjects(targets, false)[0];
  return h ? h.distance : Infinity;
}
const GRID: [number, number][] = [[0, 0]]; // centre first, then a 5 x 3 grid over the plate face (0.52 x 0.114 m)
for (const x of [-0.23, -0.115, 0, 0.115, 0.23]) for (const y of [-0.045, 0, 0.045]) if (x || y) GRID.push([x, y]);
let total = 0;
for (const spec of CARS) {
  const v = withPlates(buildProceduralCar(spec.shape, spec.color), spec, defaultLoadout());
  const plates = v.root.getObjectByName('plates')!;
  const [front, rear] = plates.children as Mesh[];
  const targets: Object3D[] = [];
  v.root.traverse((o) => {
    const m = o as Mesh;
    const mat = Array.isArray(m.material) ? m.material[0] : m.material;
    if (m.isMesh && o.visible && o.parent !== plates && !mat?.transparent) targets.push(o);
  });
  let worst = '';
  let bad = 0;
  for (const lat of [-40, 0, 40]) for (const lon of [-40, 0, 40]) {
    for (let k = 0; k < 120; k++) v.update(1 / 30, 30, 0, lon < 0, lon, lat); // saturate pitch/roll
    v.root.updateMatrixWorld(true);
    for (const [plate, sign] of [[front, 1], [rear, -1]] as const) {
      const name = sign > 0 ? 'front' : 'rear';
      const out = new Vector3(0, 0, 1).transformDirection(plate.matrixWorld); // plate face normal (world)
      const pts = GRID.map(([cx, cy]) => new Vector3(cx, cy, 0).applyMatrix4(plate.matrixWorld));
      // 1) outside the body: coming in along the plate normal, nothing solid in front of any part of the plate
      for (const p of pts) {
        const d = bodyHit(targets, p.clone().addScaledVector(out, 0.4), p);
        total++;
        if (d < 0.4 - EPS) { bad++; worst ||= `${name} buried ${((0.4 - d) * 100).toFixed(1)} cm lat ${lat} lon ${lon}`; }
      }
      // 2) chase camera (ChaseCam 6.2 m back, 2.3 m up) swung by the slip angle; the front plate seen the same way
      // (look-back, a rival behind). The centre must be seen; at grazing angles the tail-light bar may cover an edge.
      for (let s = -1; s <= 1.0001; s += 0.125) {
        const cam = new Vector3(Math.sin(s) * 6.2, 2.3, Math.cos(s) * 6.2 * sign);
        v.root.localToWorld(cam);
        let seen = 0;
        pts.forEach((p, i) => {
          const ok = bodyHit(targets, cam, p) >= cam.distanceTo(p) - EPS;
          seen += ok ? 1 : 0;
          total++;
          if (!ok && i === 0) { bad++; worst ||= `${name} centre occluded at slip ${s.toFixed(2)} lat ${lat} lon ${lon}`; }
        });
        if (seen < pts.length * 0.75) { bad++; worst ||= `${name} ${pts.length - seen}/${pts.length} hidden at slip ${s.toFixed(2)} lat ${lat} lon ${lon}`; }
      }
    }
  }
  check(`${spec.id}: both plates on the surface and visible at full roll/pitch, slip 0..1 rad`, bad === 0, bad ? `${bad} bad, e.g. ${worst}` : 'ok');
}
console.log(`plates-check: ${total} samples, ${failed ? `${failed} FAILED` : 'all passed'}`);
process.exit(failed ? 1 : 0);
