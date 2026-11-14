import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, SphereGeometry, TorusGeometry, Color, type BufferGeometry, type Material } from 'three';
import { lookOf, type Look } from '../data/characters';

export type Pose = 'stand' | 'lean' | 'phone';

/** A small stylised person (about 2000 triangles) built from boxes and spheres, with an idle animation. */
export interface Character {
  readonly group: Group;
  readonly id: string;
  setPose(p: Pose): void;
  update(dt: number): void;
  dispose(): void;
}

const mat = (c: number, rough = 0.8): MeshStandardMaterial => new MeshStandardMaterial({ color: c, roughness: rough, metalness: 0.05 });
const darker = (c: number, k: number): number => new Color(c).multiplyScalar(k).getHex();

/**
 * Builds a figure from the same `Look` data as the 2D portraits: outfit, hair style and accessory. Feet at y = 0, facing +Z.
 * Replaced by a GLB later if one exists (see docs/assets): the Character interface stays the same.
 */
export function createCharacter(id: string): Character {
  const look: Look = lookOf(id);
  const group = new Group();
  const geos: BufferGeometry[] = [];
  const mats: Material[] = [];
  const add = (parent: Group, geo: BufferGeometry, m: Material, x = 0, y = 0, z = 0): Mesh => {
    geos.push(geo);
    mats.push(m);
    const mesh = new Mesh(geo, m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const w = look.build === 'heavy' ? 1.3 : look.build === 'slim' ? 0.9 : 1;
  const skin = mat(look.skin, 0.65);
  const outfit = mat(look.outfit);
  const pants = mat(darker(look.outfit, 0.55));
  const accent = mat(look.accent, 0.5);
  const hairM = mat(look.hair, 0.7);
  const body = new Group();
  group.add(body);
  // legs and shoes
  for (const s of [-1, 1]) {
    add(body, new BoxGeometry(0.17 * w, 0.78, 0.2), pants, s * 0.1 * w, 0.43, 0);
    add(body, new BoxGeometry(0.18 * w, 0.08, 0.3), mat(0x14141a), s * 0.1 * w, 0.04, 0.04);
  }
  // torso with an accent stripe, and the arms hanging from the shoulders
  const torso = new Group();
  torso.position.y = 0.82;
  body.add(torso);
  add(torso, new BoxGeometry(0.44 * w, 0.62, 0.25 * (w > 1 ? 1.15 : 1)), outfit, 0, 0.31, 0);
  add(torso, new BoxGeometry(0.06 * w, 0.62, 0.02), accent, 0.0, 0.31, 0.135);
  const arms: Group[] = [];
  for (const s of [-1, 1]) {
    const arm = new Group();
    arm.position.set(s * 0.28 * w, 0.58, 0);
    add(arm, new BoxGeometry(0.1 * w, 0.56, 0.11), outfit, 0, -0.27, 0);
    add(arm, new SphereGeometry(0.055, 8, 6), skin, 0, -0.58, 0);
    torso.add(arm);
    arms.push(arm);
  }
  // neck, head, face
  const head = new Group();
  head.position.y = 0.76;
  torso.add(head);
  add(head, new CylinderGeometry(0.05, 0.06, 0.1, 8), skin, 0, -0.05, 0);
  add(head, new SphereGeometry(0.125 * (w > 1 ? 1.08 : 1), 14, 10), skin, 0, 0.12, 0);
  for (const s of [-1, 1]) add(head, new SphereGeometry(0.014, 6, 4), mat(0x0a0a10), s * 0.045, 0.14, 0.115);
  // hair and accessories
  const top = 0.12;
  switch (look.hairStyle) {
    case 'short': add(head, new SphereGeometry(0.132, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, 0, top + 0.01, -0.01); break;
    case 'slick': add(head, new SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), hairM, 0, top + 0.02, -0.015); break;
    case 'long': add(head, new SphereGeometry(0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, 0, top + 0.01, -0.01); add(head, new BoxGeometry(0.26, 0.34, 0.08), hairM, 0, -0.02, -0.1); break;
    case 'bun': add(head, new SphereGeometry(0.132, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, 0, top + 0.01, -0.01); add(head, new SphereGeometry(0.06, 8, 6), hairM, 0, top + 0.16, -0.06); break;
    case 'mohawk': add(head, new BoxGeometry(0.04, 0.12, 0.26), hairM, 0, top + 0.12, 0); break;
    case 'spiky': for (let i = 0; i < 5; i++) add(head, new ConeGeometry(0.04, 0.12, 5), hairM, (i - 2) * 0.05, top + 0.13, (i % 2) * 0.04 - 0.02); break;
    case 'cap': add(head, new SphereGeometry(0.135, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), accent, 0, top + 0.02, 0); add(head, new BoxGeometry(0.2, 0.02, 0.14), accent, 0, top + 0.01, 0.15); break;
    default: break;
  }
  switch (look.accessory) {
    case 'shades': add(head, new BoxGeometry(0.22, 0.04, 0.03), new MeshBasicMaterial({ color: 0x080a10 }), 0, 0.14, 0.12); break;
    case 'glasses': for (const s of [-1, 1]) add(head, new TorusGeometry(0.035, 0.005, 5, 10), mat(0xcfd6e6), s * 0.05, 0.14, 0.125); break;
    case 'goggles': add(head, new TorusGeometry(0.13, 0.015, 5, 14), accent, 0, top + 0.05, 0).rotation.x = Math.PI / 2.4; break;
    case 'headphones': add(head, new TorusGeometry(0.14, 0.012, 6, 16, Math.PI), accent, 0, top, 0); for (const s of [-1, 1]) add(head, new CylinderGeometry(0.045, 0.045, 0.04, 10), accent, s * 0.14, 0.12, 0).rotation.z = Math.PI / 2; break;
    case 'beanie': add(head, new CylinderGeometry(0.13, 0.135, 0.1, 12), accent, 0, top + 0.07, 0); break;
    default: break;
  }
  group.scale.setScalar(look.height / 1.78);

  let pose: Pose = 'stand';
  let t = Math.random() * 10;
  return {
    group,
    id,
    setPose: (p) => (pose = p),
    update: (dt) => {
      t += dt;
      const breathe = Math.sin(t * 1.8) * 0.008;
      torso.scale.y = 1 + breathe;
      head.rotation.y = Math.sin(t * 0.6) * 0.18;
      head.rotation.x = pose === 'lean' ? 0.1 : Math.sin(t * 0.9) * 0.03;
      body.rotation.z = Math.sin(t * 0.5) * 0.015; // weight shift
      body.rotation.x = pose === 'lean' ? -0.16 : 0;
      const swing = Math.sin(t * 1.1) * 0.05;
      if (pose === 'lean') {
        arms[0].rotation.set(-1.0, 0, -0.5);
        arms[1].rotation.set(-1.0, 0, 0.5);
      } else if (pose === 'phone') {
        arms[0].rotation.set(0.1 + swing, 0, 0);
        arms[1].rotation.set(-2.55, 0, 0.35);
      } else {
        arms[0].rotation.set(swing, 0, -0.05);
        arms[1].rotation.set(-swing, 0, 0.05);
      }
    },
    dispose: () => {
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
    },
  };
}
