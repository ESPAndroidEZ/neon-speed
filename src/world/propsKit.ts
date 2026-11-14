import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, type Material } from 'three';

/** A street prop: a small Group at ground level, facing +Z, built from primitives and a few materials (no textures, no allocation after the call). */
export type PropBuilder = () => Group;

const metal = (c: number, m = 0.6): Material => new MeshStandardMaterial({ color: c, roughness: 0.55, metalness: m });

/**
 * Reference implementation of a prop ('trash-can'): a dented bin with a lid and two glowing bits of litter. New props
 * (docs/tasks: 25 props) add keys in their own files; `allProps` merges them. Keep each under 12 lines and about 60 triangles.
 */
export const PROPS: Record<string, PropBuilder> = {
  'trash-can': () => {
    const g = new Group();
    const body = new Mesh(new CylinderGeometry(0.34, 0.28, 0.9, 10), metal(0x4a4f58));
    body.position.y = 0.45;
    const lid = new Mesh(new CylinderGeometry(0.37, 0.37, 0.06, 10), metal(0x2b2f38));
    lid.position.y = 0.93;
    const litter = new Mesh(new BoxGeometry(0.12, 0.02, 0.1), new MeshStandardMaterial({ color: 0xff2a9d, emissive: 0xff2a9d, emissiveIntensity: 1.5 }));
    litter.position.set(0.2, 0.01, 0.35);
    g.add(body, lid, litter);
    return g;
  },
};
