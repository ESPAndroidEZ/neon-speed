import { Color, Material, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, type Object3D, type Texture } from 'three';

export type MaterialKind = 'glass' | 'tyre' | 'light' | 'body' | 'trim';

const GLASS = /glass|window|windshield|windscreen|screen/i;
const TYRE = /tire|tyre|rubber|tread/i;
const LIGHT = /light|lamp|headl|taill|led/i;
const TRIM = /chrome|metal|grille|exhaust|brake|disc|rim|wheel|plastic|black|interior|seat/i;

/** Classify a material by its name (Tripo usually gives generic names, so unknown means body). */
export function classifyMaterialName(name: string): MaterialKind {
  if (GLASS.test(name)) return 'glass';
  if (TYRE.test(name)) return 'tyre';
  if (LIGHT.test(name)) return 'light';
  if (TRIM.test(name)) return 'trim';
  return 'body';
}

export interface UpgradeOptions {
  env: Texture | null;
  /** envMapIntensity for the body paint. */
  envIntensity?: number;
}

const base = (m: Material): Partial<MeshStandardMaterial> => m as MeshStandardMaterial;

/** Build a physical material carrying over the baked maps of the old one. */
function physicalFrom(old: Material, p: { color?: number; roughness: number; metalness: number; clearcoat: number; ccRough: number }): MeshPhysicalMaterial {
  const o = base(old);
  const m = new MeshPhysicalMaterial({
    map: o.map ?? null, normalMap: o.normalMap ?? null, emissiveMap: o.emissiveMap ?? null, aoMap: o.aoMap ?? null,
    roughness: p.roughness, metalness: p.metalness, clearcoat: p.clearcoat, clearcoatRoughness: p.ccRough,
  });
  m.color = p.color !== undefined ? new Color(p.color) : (o.color ?? new Color(0xffffff)).clone();
  m.name = old.name;
  if (o.emissive) m.emissive.copy(o.emissive);
  m.emissiveIntensity = o.emissiveIntensity ?? 1;
  return m;
}

/**
 * Material upgrade pass for loaded car models: body -> clearcoated MeshPhysicalMaterial (envMapIntensity ~1.5),
 * glass -> dark glossy tint, tyres -> rubber, lamps keep their emissive. A model with ONE baked material is treated
 * as body (the texture carries the paint). Returns the body materials so paint can tint them.
 */
export function upgradeCarMaterials(root: Object3D, opt: UpgradeOptions): MeshPhysicalMaterial[] {
  const bodies: MeshPhysicalMaterial[] = [];
  const cache = new Map<Material, Material>();
  const all = new Set<Material>();
  root.traverse((o) => {
    if (o instanceof Mesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) all.add(m);
  });
  const single = all.size === 1;
  const make = (old: Material): Material => {
    const kind = single ? 'body' : classifyMaterialName(old.name);
    let m: Material;
    if (kind === 'glass') {
      m = physicalFrom(old, { color: 0x0b1220, roughness: 0.04, metalness: 0.9, clearcoat: 1, ccRough: 0.02 });
      m.transparent = true;
      m.opacity = 0.82;
    } else if (kind === 'tyre') m = physicalFrom(old, { color: 0x0a0a0a, roughness: 0.95, metalness: 0, clearcoat: 0, ccRough: 1 });
    else if (kind === 'light') {
      m = physicalFrom(old, { roughness: 0.15, metalness: 0.2, clearcoat: 1, ccRough: 0.05 });
      (m as MeshPhysicalMaterial).emissive = new Color(0xffffff);
      (m as MeshPhysicalMaterial).emissiveIntensity = 0.6;
    } else if (kind === 'trim') m = physicalFrom(old, { roughness: 0.4, metalness: 0.8, clearcoat: 0.3, ccRough: 0.3 });
    else {
      const p = physicalFrom(old, { roughness: 0.32, metalness: 0.45, clearcoat: 1, ccRough: 0.04 });
      p.envMapIntensity = opt.envIntensity ?? 1.5;
      bodies.push(p);
      m = p;
    }
    if (opt.env && m instanceof MeshStandardMaterial) {
      m.envMap = opt.env;
      if (kind !== 'body') m.envMapIntensity = 1;
    }
    return m;
  };
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const swap = (old: Material): Material => {
      let n = cache.get(old);
      if (!n) cache.set(old, (n = make(old)));
      return n;
    };
    o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
  });
  return bodies;
}
