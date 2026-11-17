import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, Object3D, SphereGeometry, type BufferGeometry } from 'three';
import type { Look } from '../data/characters';
import { noReflect } from './layers';
import { JOINTS, PARENT, REST, type JointName, type PersonRig, type PersonSpec } from '../types/people';

/**
 * Default `buildPerson` (the people contract, src/types/people.ts) in the existing simple style: rounded limbs on real
 * joint pivots, so the animator can bend them. Geometry is shared by everyone and materials are cached per colour
 * (no per-person allocation beyond the joint groups). Qwen's src/world/peopleModels.ts will replace the looks.
 */
const geo = new Map<string, BufferGeometry>();
const g = (key: string, make: () => BufferGeometry): BufferGeometry => geo.get(key) ?? (geo.set(key, make()), geo.get(key)!);
const mats = new Map<number, MeshStandardMaterial>();
const mat = (c: number): MeshStandardMaterial => mats.get(c) ?? (mats.set(c, new MeshStandardMaterial({ color: c, roughness: 0.75, flatShading: true })), mats.get(c)!);
const limb = (r0: number, r1: number, len: number): BufferGeometry => g(`limb${r0}${r1}${len}`, () => new CylinderGeometry(r0, r1, len, 7).translate(0, -len / 2, 0));

const WIDTH = { slim: 0.9, average: 1, broad: 1.15 } as const;

export function buildPerson(spec: PersonSpec): PersonRig {
  const root = new Group();
  const joints = {} as Record<JointName, Object3D>;
  for (const j of JOINTS) {
    const o = new Group();
    o.name = j;
    o.position.set(REST[j][0], REST[j][1], REST[j][2]);
    (PARENT[j] === 'root' ? root : joints[PARENT[j] as JointName]).add(o);
    joints[j] = o;
  }
  const w = WIDTH[spec.body];
  const add = (j: JointName, gm: BufferGeometry, c: number, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1): Mesh => {
    const m = new Mesh(gm, mat(c));
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    joints[j].add(m);
    return m;
  };
  const { jacket, pants, shoes } = spec.outfit;
  // torso: pelvis, belly, chest with shoulders
  add('hips', g('pelvis', () => new BoxGeometry(0.3, 0.16, 0.2)), pants, 0, 0, 0, w, 1, w);
  add('spine', g('belly', () => new BoxGeometry(0.3, 0.22, 0.19)), jacket, 0, 0.1, 0, w, 1, w);
  add('chest', g('chest', () => new BoxGeometry(0.38, 0.24, 0.21)), jacket, 0, 0.08, 0, w, 1, w);
  add('neck', limb(0.05, 0.055, 0.1), spec.skin, 0, 0.1, 0);
  add('head', g('head', () => new SphereGeometry(0.11, 12, 9)), spec.skin, 0, 0.11, 0.01, 1, 1.12, 1);
  // arms: sleeve, forearm, hand
  for (const s of ['L', 'R'] as const) {
    add(`upperArm${s}`, limb(0.055, 0.05, 0.29), jacket, 0, 0, 0, w, 1, w);
    add(`foreArm${s}`, limb(0.048, 0.04, 0.26), jacket);
    add(`hand${s}`, g('hand', () => new BoxGeometry(0.07, 0.1, 0.035).translate(0, -0.05, 0)), spec.skin);
    add(`thigh${s}`, limb(0.085, 0.065, 0.44), pants, 0, 0, 0, w, 1, w);
    add(`shin${s}`, limb(0.06, 0.05, 0.43), pants);
    add(`foot${s}`, g('shoe', () => new BoxGeometry(0.1, 0.07, 0.24).translate(0, -0.015, 0.05)), shoes);
  }
  // hair and accessories on the head
  const top = 0.2;
  if (spec.hairStyle !== 'bald') add('head', g(`hair${spec.hairStyle}`, () => new SphereGeometry(0.118, 12, 8, 0, Math.PI * 2, 0, spec.hairStyle === 'long' ? Math.PI * 0.7 : Math.PI * 0.5)), spec.hair, 0, top - 0.08, -0.01);
  if (spec.hairStyle === 'mohawk') add('head', g('mohawk', () => new BoxGeometry(0.03, 0.1, 0.22)), spec.hair, 0, top + 0.02, 0);
  if (spec.hairStyle === 'bun') add('head', g('bun', () => new SphereGeometry(0.05, 8, 6)), spec.hair, 0, top - 0.02, -0.1);
  if (spec.accessories.cap) { add('head', g('cap', () => new SphereGeometry(0.121, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45)), jacket, 0, top - 0.07, 0); add('head', g('brim', () => new BoxGeometry(0.18, 0.015, 0.1)), jacket, 0, top - 0.06, 0.12); }
  if (spec.accessories.sunglasses) add('head', g('shades', () => new BoxGeometry(0.2, 0.035, 0.025)), 0x080a10, 0, 0.14, 0.11);
  if (spec.accessories.hood) add('chest', g('hood', () => new SphereGeometry(0.14, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5).rotateX(-0.5)), jacket, 0, 0.22, -0.08);
  root.scale.setScalar((spec.height ?? 1.75) / 1.75);
  noReflect(root); // the rain mirror skips people (world/layers)
  return { root, joints, spec, dispose: () => root.removeFromParent() };
}

/** The existing story looks (data/characters) as a PersonSpec, so the cast keeps their faces and colours. */
export function lookToSpec(l: Look, seed: number): PersonSpec {
  const hairStyle = l.hairStyle === 'cap' ? 'short' : l.hairStyle;
  return {
    skin: l.skin, hair: l.hair, hairStyle, outfit: { jacket: l.outfit, pants: 0x1a1c24, shoes: 0x14141a },
    accessories: { cap: l.hairStyle === 'cap' || l.accessory === 'beanie', sunglasses: l.accessory === 'shades' || l.accessory === 'goggles' },
    body: l.build === 'heavy' ? 'broad' : l.build, height: l.height, seed,
  };
}
