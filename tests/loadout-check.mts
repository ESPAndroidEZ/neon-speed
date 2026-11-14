import { CARS } from '../src/data/cars.ts';
import { CALIPERS, defaultLoadout, FINISHES, FINISH_IDS, GLOW_PATTERNS, HEADLIGHTS, sanitizeLoadout, stanceEffect } from '../src/data/loadout.ts';
import { defaultSave, SaveStore, type KeyValueStore } from '../src/core/save.ts';
import { RIM_DESIGNS } from '../src/world/rims.ts';
import { VINYL_PAINTERS } from '../src/world/vinylLayer.ts';
import { getLoadout } from '../src/world/loadoutStore.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
check('six finishes, all with sane material values', FINISH_IDS.length === 6 && FINISH_IDS.every((f) => { const m = FINISHES[f]; return m.metalness >= 0 && m.metalness <= 1 && m.roughness > 0 && m.roughness <= 1 && m.clearcoat >= 0 && m.clearcoat <= 1; }), FINISH_IDS.join());
check('chrome is the shiniest, matte the roughest', FINISHES.chrome.roughness === Math.min(...FINISH_IDS.map((f) => FINISHES[f].roughness)) && FINISHES.matte.roughness === Math.max(...FINISH_IDS.map((f) => FINISHES[f].roughness)), '');
check('the default loadout is itself valid', JSON.stringify(sanitizeLoadout(defaultLoadout())) === JSON.stringify(defaultLoadout()), '');
const bad = sanitizeLoadout({ finish: 'neon-glitter', tint: 9, stance: -7, plate: 'abcdefghijkl', glowPattern: 3, headlight: 'red', vinyl: { kind: 5, scale: 99, rotation: 'x', number: '12345' }, rim: { design: 'x'.repeat(40), size: 99 }, extra: 1 });
check('garbage is clamped or replaced', bad.finish === 'metallic' && bad.tint === 0.9 && bad.stance === -1 && bad.plate === 'ABCDEFGH' && bad.glowPattern === 'solid' && bad.headlight === defaultLoadout().headlight && bad.vinyl.kind === null && bad.vinyl.scale === 2 && bad.vinyl.number === '123' && bad.rim.size === 21 && !('extra' in bad), JSON.stringify(bad).slice(0, 80));
check('non-objects give the default', sanitizeLoadout(null).finish === 'metallic' && sanitizeLoadout('x').rim.design === 'five' && sanitizeLoadout([]).tint === 0.3, '');
check('pattern, light and caliper lists are not empty', GLOW_PATTERNS.length >= 4 && HEADLIGHTS.length >= 4 && CALIPERS.length >= 4, '');
check('reference rims and vinyls exist', !!RIM_DESIGNS.five && !!RIM_DESIGNS.multi && !!VINYL_PAINTERS.stripes && !!VINYL_PAINTERS.racing && !!VINYL_PAINTERS.checker, '');
const lo = stanceEffect(1);
const hi = stanceEffect(-1);
check('slammed lowers the centre of gravity, high raises it', lo.cgDelta < 0 && hi.cgDelta > 0 && lo.grip > 1 && hi.grip < 1 && stanceEffect(0).cgDelta === 0, '');
check('stance grip effect stays under 3 %', [-1, -0.5, 0, 0.5, 1].every((s) => Math.abs(stanceEffect(s).grip - 1) < 0.03), '');
// saved with the game
const mem: Record<string, string> = {};
const kv: KeyValueStore = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => void (mem[k] = v), removeItem: (k) => void delete mem[k] };
const ids = CARS.map((c) => c.id);
const a = new SaveStore(kv, defaultSave('civic', 0xffffff), ids);
const l = defaultLoadout();
l.finish = 'chrome';
l.vinyl.kind = 'racing';
a.setLoadout('civic', l);
const b = new SaveStore(kv, defaultSave('civic', 0xffffff), ids);
check('a loadout survives a save and is live for the car factory', b.data.loadouts.civic?.finish === 'chrome' && getLoadout('civic').vinyl.kind === 'racing', '');
check('loadouts of unknown cars are dropped', (() => { mem[Object.keys(mem)[0]] = mem[Object.keys(mem)[0]].replace('"civic":{', '"ghost":{"finish":"gloss"},"civic":{'); return !new SaveStore(kv, defaultSave('civic', 0xffffff), ids).data.loadouts.ghost; })(), '');
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
