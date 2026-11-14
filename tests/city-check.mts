import { Box3, Group, MeshStandardMaterial } from 'three';
import { TRACKS, buildTrack } from '../src/data/tracks/index.ts';
import { PALETTES, paletteOf } from '../src/data/palettes.ts';
import { ARCHETYPES, archetypesFor, pickArchetype, validateArchetypes } from '../src/world/city/archetypes.ts';
import { DETAIL_CAPS, layoutDetails } from '../src/world/city/details.ts';
import { SIGNS } from '../src/world/city/signs.ts';
import { PARTS, PART_SLOTS, attachParts } from '../src/world/carParts.ts';
import { LOOKS, LOOK_IDS } from '../src/core/looks.ts';
import { createRng } from '../src/core/rng.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
check('archetypes are valid data', validateArchetypes(ARCHETYPES).length === 0, validateArchetypes(ARCHETYPES).join('; '));
check('a bad archetype is caught', validateArchetypes([{ ...ARCHETYPES[0], height: [50, 10], ac: 3 }]).length >= 2, '');
for (const d of ['kestrel', 'neon']) check(`${d} has archetypes to choose from`, archetypesFor(d).length >= 3, `${archetypesFor(d).length}`);
const r = createRng(3);
const tally: Record<string, number> = {};
for (let i = 0; i < 3000; i++) tally[pickArchetype(ARCHETYPES, r()).id] = (tally[pickArchetype(ARCHETYPES, r()).id] ?? 0) + 1;
check('weighted pick reaches every archetype', Object.keys(tally).length === ARCHETYPES.length, JSON.stringify(tally));

// details layout: deterministic, capped, finite, only where there are buildings
for (const def of TRACKS.filter((t) => t.theme === 'city')) {
  const tr = buildTrack(def);
  const n = tr.samples.length;
  const heights: [Float32Array, Float32Array] = [new Float32Array(n).fill(48), new Float32Array(n).fill(28)];
  const a = layoutDetails(tr, heights, paletteOf(def.id));
  const b = layoutDetails(tr, heights, paletteOf(def.id));
  const finite = Object.values(a).every((l) => l.every((p) => [p.x, p.y, p.z, p.yaw, p.sx, p.sy, p.sz].every(Number.isFinite)));
  check(`${def.id}: details are deterministic and finite`, JSON.stringify(a) === JSON.stringify(b) && finite, '');
  check(`${def.id}: details stay within the instance budget`, (Object.keys(a) as (keyof typeof a)[]).every((k) => a[k].length <= DETAIL_CAPS[k]) && a.ac.length > 20 && a.awning.length > 5 && a.beacon.length > 0, `${a.ac.length} AC, ${a.balcony.length} balconies, ${a.awning.length} awnings, ${a.tank.length} tanks`);
  const none = layoutDetails(tr, [new Float32Array(n), new Float32Array(n)], paletteOf(def.id));
  check(`${def.id}: nothing is placed without buildings`, Object.values(none).every((l) => l.length === 0), '');
}
check('every district has a palette with a skyline rule', TRACKS.every((t) => PALETTES[t.id] !== undefined), '');
check('cliff has an open horizon, cities have skylines', PALETTES.cliff.skyline.count === 0 && PALETTES.neon.skyline.count > 50, '');
check('three look presets with sane values', LOOK_IDS.length === 3 && LOOK_IDS.every((id) => { const l = LOOKS[id]; return l.exposure > 0.5 && l.exposure < 2 && l.saturation > 0.5 && l.contrast >= 1 && l.bloomK > 0 && l.streak >= 0 && l.stars >= 0 && l.stars <= 1; }), '');
check('eight fictional sign designs, none with a real brand', SIGNS.length >= 8 && SIGNS.every((s) => !/(coca|pepsi|nike|adidas|sony|mcdonald|starbucks|shell|bp |esso|toyota|nissan|honda|mazda)/i.test(s.text + (s.sub ?? ''))), SIGNS.map((s) => s.text).join(', '));

// parts: every reference part builds a sensible object at the right place for a small car and a big one
const a1 = { length: 4.25, width: 1.72, height: 1.4, belt: 0.84, wheelbase: 2.62 };
const a2 = { length: 4.6, width: 1.9, height: 1.5, belt: 0.9, wheelbase: 2.8 };
const paint = new MeshStandardMaterial();
const trim = new MeshStandardMaterial();
let partsOk = true;
for (const slot of PART_SLOTS) {
  check(`slot ${slot} has at least one part`, Object.keys(PARTS[slot]).length >= 1, Object.keys(PARTS[slot]).join());
  for (const [id, build] of Object.entries(PARTS[slot])) for (const a of [a1, a2]) {
    const g = new Group();
    g.add(build(a, paint, trim));
    const box = new Box3().setFromObject(g);
    const size = box.getSize(box.min.clone());
    const ok = Number.isFinite(size.x + size.y + size.z) && size.x > 0.1 && size.x <= a.width * 1.1 && size.z <= a.length && box.min.y >= -0.01 && box.max.y <= a.height + 0.3;
    if (!ok) { partsOk = false; console.log('   bad part', slot, id, size.toArray().map((v) => v.toFixed(2)).join(' ')); }
  }
}
check('every part fits the car it is built for', partsOk, '');
const root = new Group();
attachParts(root, a1, { spoiler: 'gt-wing', hood: 'vent', splitter: 'nope' }, paint, trim);
const first = root.getObjectByName('addon-parts')!;
attachParts(root, a1, { skirts: 'plain' }, paint, trim);
check('attaching replaces the previous parts and ignores unknown ids', first.children.length === 2 && root.children.length === 1 && root.getObjectByName('addon-parts')!.children.length === 1, '');
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
