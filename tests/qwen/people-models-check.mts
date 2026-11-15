// Contract check for Qwen task 056: src/world/peopleModels.ts must implement the people contract (src/types/people.ts).
// Run: npx tsx tests/qwen/people-models-check.mts   (not part of npm test until the file exists and is reviewed)
import { existsSync } from 'node:fs';
import { Mesh, type Object3D } from 'three';
import { JOINTS, type PersonSpec } from '../../src/types/people.ts';
let failed = 0;
const check = (n: string, ok: boolean, i: string): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`); };
if (!existsSync('src/world/peopleModels.ts')) { console.log('FAIL  src/world/peopleModels.ts does not exist yet'); process.exit(1); }
const mod = await import('../../src/world/peopleModels.ts') as { buildPerson: (s: PersonSpec) => { root: Object3D; joints: Record<string, Object3D> }; variantCount: number };
check('exports buildPerson and variantCount >= 12', typeof mod.buildPerson === 'function' && mod.variantCount >= 12, `variantCount ${mod.variantCount}`);
const spec = (seed: number): PersonSpec => ({ skin: [0x5a3a26, 0xb9805a, 0xe8c4a0][seed % 3], hair: 0x222222, hairStyle: (['short', 'long', 'spiky', 'bun', 'slick', 'bald', 'mohawk', 'curly'] as const)[seed % 8], outfit: { jacket: 0x2b3446 + seed * 4097, pants: 0x1a1c24, shoes: 0x14141a }, accessories: { cap: seed % 4 === 0, sunglasses: seed % 5 === 0, hood: seed % 6 === 0 }, body: (['slim', 'average', 'broad'] as const)[seed % 3], seed });
const sigs = new Set<string>();
let jointsOk = true, nan = 0, tris = 0, count = 0;
for (let s = 0; s < 24; s++) {
  const r = mod.buildPerson(spec(s));
  for (const j of JOINTS) if (!r.joints[j] || r.joints[j].name !== j) jointsOk = false;
  let sig = '', t = 0;
  r.root.traverse((o) => { const m = o as Mesh; if (!m.isMesh) return; const p = m.geometry.attributes.position; t += (m.geometry.index ? m.geometry.index.count : p.count) / 3; sig += m.geometry.uuid.slice(0, 4); for (let i = 0; i < p.array.length; i++) if (!Number.isFinite(p.array[i])) nan++; });
  sigs.add(sig); tris = Math.max(tris, t); count++;
}
check('every joint exists and is named for 24 specs', jointsOk, '');
check('at least 12 distinct looks from 24 seeds', sigs.size >= 12, `${sigs.size} distinct`);
check('no NaN vertices; at most 4000 triangles per person', nan === 0 && tris <= 4000, `${tris} tris max`);
const a = mod.buildPerson(spec(3)), b = mod.buildPerson(spec(3));
let ga = 0, gb = 0; a.root.traverse((o) => { if ((o as Mesh).isMesh) ga++; }); b.root.traverse((o) => { if ((o as Mesh).isMesh) gb++; });
check('same seed, same person', ga === gb, `${ga} / ${gb} meshes`);
let shared = true; const first = new Set<string>(); a.root.traverse((o) => { if ((o as Mesh).isMesh) first.add((o as Mesh).geometry.uuid); });
b.root.traverse((o) => { if ((o as Mesh).isMesh && !first.has((o as Mesh).geometry.uuid)) shared = false; });
check('geometry is shared between people (cache, no per-person geometry)', shared, '');
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
