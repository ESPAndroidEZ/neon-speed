import { SPOILER_MORE } from './partsSpoilers';
import { SPLITTER_MORE } from './partsSplitters';
import { SKIRTS_MORE } from './partsSkirts';
import { HOOD_MORE } from './partsHoods';
import { BoxGeometry, Group, Mesh, type Material, type Object3D } from 'three';

/** Body parts a car can wear. Procedural cars and GLB cars take the same add-on parts at anchors computed from their size. */
export type PartSlot = 'spoiler' | 'splitter' | 'skirts' | 'hood';
export const PART_SLOTS: readonly PartSlot[] = ['spoiler', 'splitter', 'skirts', 'hood'];

/** The measurements a part builder needs, in metres: bounding box of the body, beltline (door top) and wheelbase. */
export interface PartAnchors {
  length: number;
  width: number;
  height: number;
  belt: number;
  wheelbase: number;
}

/**
 * A part builder returns an object in CAR space (origin on the ground at the centre, nose +Z, +X left) placed using only `a`.
 * `paint` is the body paint material (shared, so the part follows colour and finish), `trim` a dark plastic/carbon material.
 * Reference implementations: 'gt-wing', 'blade', 'plain', 'vent'. Add a part by adding a key to its slot (docs/tasks: spoilers,
 * splitters, side skirts, hoods): one function of about 10 lines, primitives only, no allocation outside the builder.
 */
export type PartBuilder = (a: PartAnchors, paint: Material, trim: Material) => Object3D;

const box = (w: number, h: number, d: number, m: Material, x: number, y: number, z: number): Mesh => {
  const b = new Mesh(new BoxGeometry(w, h, d), m);
  b.position.set(x, y, z);
  return b;
};

export const PARTS: Record<PartSlot, Record<string, PartBuilder>> = {
  spoiler: {
    /** Tall GT wing on two uprights. */
    'gt-wing': (a, paint, trim) => {
      const g = new Group();
      const z = -a.length / 2 + 0.28;
      const y = a.belt + 0.34;
      g.add(box(a.width * 0.94, 0.05, 0.34, paint, 0, y, z), box(0.05, 0.3, 0.16, trim, a.width * 0.3, y - 0.17, z), box(0.05, 0.3, 0.16, trim, -a.width * 0.3, y - 0.17, z));
      return g;
    },
  },
  splitter: {
    /** Flat carbon blade under the nose. */
    blade: (a, _paint, trim) => box(a.width * 0.96, 0.04, 0.32, trim, 0, 0.1, a.length / 2 - 0.02),
  },
  skirts: {
    /** Plain side skirts between the wheels. */
    plain: (a, paint) => {
      const g = new Group();
      for (const s of [1, -1]) g.add(box(0.07, 0.12, a.wheelbase * 0.62, paint, s * (a.width / 2 - 0.04), 0.2, 0));
      return g;
    },
  },
  hood: {
    /** A raised vent block on the bonnet. */
    vent: (a, _paint, trim) => box(a.width * 0.34, 0.05, 0.5, trim, 0, a.belt - 0.02, a.length * 0.24),
  },
};
Object.assign(PARTS.spoiler, SPOILER_MORE);
Object.assign(PARTS.splitter, SPLITTER_MORE);
Object.assign(PARTS.skirts, SKIRTS_MORE);
Object.assign(PARTS.hood, HOOD_MORE);

export type PartChoice = Partial<Record<PartSlot, string>>;

/** Replace the add-on parts of a car root with the chosen ones (unknown ids are ignored). Cheap: call on every garage click. */
export function attachParts(root: Group, a: PartAnchors, choice: PartChoice, paint: Material, trim: Material): void {
  const old = root.getObjectByName('addon-parts');
  if (old) {
    root.remove(old);
    old.traverse((o) => void (o as Mesh).geometry?.dispose());
  }
  const g = new Group();
  g.name = 'addon-parts';
  for (const slot of PART_SLOTS) {
    const id = choice[slot];
    const build = id ? PARTS[slot][id] : undefined;
    if (build) g.add(build(a, paint, trim));
  }
  root.add(g);
}
