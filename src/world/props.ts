import { BoxGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, TorusGeometry } from 'three';
import { createRng } from '../core/rng';
import type { Plaza } from './facades';
import type { Placed, PropsLayout } from './propsLayout';

const CAR_COLORS = [0x8a1c1c, 0x1f3f7a, 0x303236, 0xb9b9bf, 0x2d5a3a, 0x6a3d7a, 0xb8872a, 0x14141a];

function instanced(geo: ConstructorParameters<typeof InstancedMesh>[0], mat: ConstructorParameters<typeof InstancedMesh>[1], list: readonly Placed[], y: number, rotX = 0, color?: (i: number) => Color): InstancedMesh {
  const m = new InstancedMesh(geo, mat, Math.max(1, list.length));
  const d = new Object3D();
  list.forEach((p, i) => {
    d.position.set(p.x, y, p.z);
    d.rotation.set(rotX, p.yaw, 0);
    d.updateMatrix();
    m.setMatrixAt(i, d.matrix);
    if (color) m.setColorAt(i, color(i));
  });
  m.count = list.length;
  return m;
}

/** Visible props: parked cars, cones, manhole covers, zebra crossings, steam-vent grates, plaza fountain. */
export function buildProps(layout: PropsLayout, plaza: Plaza | null): Group {
  const rnd = createRng(5);
  const g = new Group();
  const c = new Color();
  const pick = (): Color => c.clone().setHex(CAR_COLORS[Math.floor(rnd() * CAR_COLORS.length)]);
  const paints = layout.parked.map(pick);

  const body = instanced(new BoxGeometry(1.8, 0.7, 4.2), new MeshStandardMaterial({ roughness: 0.35, metalness: 0.6 }), layout.parked, 0.6, 0, (i) => paints[i]);
  const cabin = instanced(new BoxGeometry(1.55, 0.55, 2.1), new MeshStandardMaterial({ color: 0x0a0d16, roughness: 0.1, metalness: 0.9 }), layout.parked, 1.2, 0);
  const tail = instanced(new BoxGeometry(1.4, 0.12, 0.06), new MeshBasicMaterial({ color: new Color(0xff1010).multiplyScalar(1.6) }), layout.parked.map((p) => ({ ...p, x: p.x - Math.sin(p.yaw) * 2.12, z: p.z - Math.cos(p.yaw) * 2.12 })), 0.75);
  g.add(body, cabin, tail);

  g.add(instanced(new ConeGeometry(0.22, 0.7, 10), new MeshStandardMaterial({ color: 0xff6a1a, emissive: 0xff3a00, emissiveIntensity: 0.5, roughness: 0.6 }), layout.cones, 0.35));
  g.add(instanced(new CircleGeometry(0.46, 14).rotateX(-Math.PI / 2), new MeshStandardMaterial({ color: 0x0c0d11, roughness: 0.3, metalness: 0.8 }), layout.manholes, 0.032));
  g.add(instanced(new BoxGeometry(0.9, 0.5, 0.3), new MeshStandardMaterial({ color: 0x15161b, roughness: 0.5, metalness: 0.7 }), layout.vents, 0.25));
  g.add(instanced(new BoxGeometry(0.5, 0.02, 0.1), new MeshBasicMaterial({ color: new Color(0xff8a30).multiplyScalar(1.5) }), layout.vents, 0.51));

  // zebra crossings: stripes parallel to travel, spaced across the road
  const zebra = new InstancedMesh(new BoxGeometry(0.5, 0.012, 3.2), new MeshStandardMaterial({ color: 0xcfd2da, roughness: 0.7, emissive: 0x303238 }), layout.crosswalks.length * 11);
  const d = new Object3D();
  let n = 0;
  for (const p of layout.crosswalks) {
    for (let k = -5; k <= 5; k++) {
      d.position.set(p.x + Math.cos(p.yaw) * k * 0.95, 0.034, p.z - Math.sin(p.yaw) * k * 0.95);
      d.rotation.set(0, p.yaw, 0);
      d.updateMatrix();
      zebra.setMatrixAt(n++, d.matrix);
    }
  }
  zebra.count = n;
  g.add(zebra);

  if (!plaza) return g;
  // fountain: stone basin, glowing rim, water disc and a lit column in the island of the plaza hairpin
  const basin = new Mesh(new CylinderGeometry(plaza.r - 6.2, plaza.r - 6.0, 0.4, 28), new MeshStandardMaterial({ color: 0x3a3e48, roughness: 0.8 }));
  basin.position.set(plaza.x, 0.2, plaza.z);
  const pool = new Mesh(new CircleGeometry(plaza.r - 6.5, 28).rotateX(-Math.PI / 2), new MeshStandardMaterial({ color: 0x0a2a40, roughness: 0.05, metalness: 0.9, emissive: 0x0a3a60, emissiveIntensity: 0.6 }));
  pool.position.set(plaza.x, 0.42, plaza.z);
  const ring = new Mesh(new TorusGeometry(plaza.r - 6.3, 0.07, 6, 48).rotateX(Math.PI / 2), new MeshBasicMaterial({ color: new Color(0x18d8ff).multiplyScalar(1.4) }));
  ring.position.set(plaza.x, 0.45, plaza.z);
  const column = new Mesh(new CylinderGeometry(0.4, 0.6, 5, 10), new MeshBasicMaterial({ color: new Color(0xff2a9d).multiplyScalar(1.5) }));
  column.position.set(plaza.x, 2.5, plaza.z);
  g.add(basin, pool, ring, column);
  return g;
}
