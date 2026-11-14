import { BoxGeometry, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial } from 'three';
import { classifyMaterialName, upgradeCarMaterials } from '../src/world/materialUpgrade.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
check('classifies names', classifyMaterialName('Windshield_Glass') === 'glass' && classifyMaterialName('tire_rubber') === 'tyre' && classifyMaterialName('headlight') === 'light' && classifyMaterialName('chrome_trim') === 'trim' && classifyMaterialName('mat_0') === 'body', '');
const mk = (name: string): Mesh => new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ name }));
const g = new Group();
const first = mk('mat_body');
g.add(first, mk('glass'), mk('tyre'), new Mesh(new BoxGeometry(1, 1, 1), first.material));
const bodies = upgradeCarMaterials(g, { env: null });
const mats = g.children.map((c) => (c as Mesh).material as MeshPhysicalMaterial);
check('body is clearcoated physical, envMapIntensity 1.5', mats[0] instanceof MeshPhysicalMaterial && mats[0].clearcoat === 1 && mats[0].clearcoatRoughness <= 0.05 && mats[0].envMapIntensity === 1.5, '');
check('glass is dark, glossy, translucent', mats[1].roughness < 0.1 && mats[1].opacity < 1 && mats[1].transparent, '');
check('tyre is rubber', mats[2].roughness > 0.9 && mats[2].clearcoat === 0, '');
check('shared materials are converted once', mats[0] === mats[3] && bodies.length === 1, `${bodies.length} body mat`);
const one = new Group();
one.add(mk('baked'), mk('baked'));
const only = new Group();
const sharedMat = new MeshStandardMaterial({ name: 'Material.001' });
only.add(new Mesh(new BoxGeometry(1, 1, 1), sharedMat), new Mesh(new BoxGeometry(1, 1, 1), sharedMat));
check('a single baked material is the body', upgradeCarMaterials(only, { env: null }).length === 1, '');
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
