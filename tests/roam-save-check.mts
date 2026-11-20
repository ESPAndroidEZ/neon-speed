/* Free Drive progress in the save (SaveData.roam, core/roamSaveParse.ts): round trip through SaveStore, old saves without
 * it stay valid, hostile values are dropped or clamped, never trusted. */
import { defaultSave, SaveStore, type KeyValueStore } from '../src/core/save.ts';
import { emptyRoam, parseRoam } from '../src/core/roamSaveParse.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const mem = new Map<string, string>();
const kv: KeyValueStore = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v) };
const CARS = ['civic', 'supra'], base = defaultSave('civic', 0xe8e8ee);
const a = new SaveStore(kv, base, CARS);
check('a new save has no roam progress', a.data.roam === undefined);
a.data.roam = { ...emptyRoam(), x: 812.5, z: -1200, heading: 1.2, visited: ['meet'], best: { 'trap:3': 187.4, 'zone:1': 5400 }, seen: ['24,24', '25,24'] };
a.commit();
const b = new SaveStore(kv, base, CARS);
check('round trip: position, records, visited and seen cells survive', b.data.roam?.x === 812.5 && b.data.roam.best['trap:3'] === 187.4 && b.data.roam.best['zone:1'] === 5400 && b.data.roam.visited[0] === 'meet' && b.data.roam.seen.length === 2);
const evil = parseRoam({ x: 1e9, z: Number.NaN, heading: 'left', hour: 99, seen: ['1,2', '<b>', 7, '99,99'], hands: ['ok', 'x'.repeat(500)], visited: Array.from({ length: 1000 }, (_, i) => `p${i}`), best: { 'trap:1': -5, 'zone:2': 1e12, '<script>': 3, 'trap:4': 120 }, quests: { a: 'x'.repeat(30000) } })!;
check('positions outside the city or not numbers fall back to 0', evil.x === 0 && evil.z === 0 && evil.heading === 0);
check('hour clamped to a default when out of range', evil.hour === 22);
check('only well-formed cell and place ids kept', evil.seen.join() === '1,2,99,99' && evil.hands.join() === 'ok');
check('lists capped (200 visited places)', evil.visited.length === 200);
check('records: negative, huge and odd keys dropped', JSON.stringify(evil.best) === '{"trap:4":120}', JSON.stringify(evil.best));
check('oversized quest data dropped', evil.quests === null);
check('garbage roam gives no progress, not an error', parseRoam('nope') === null && parseRoam(null) === null && parseRoam(42) === null);
mem.set([...mem.keys()][0], JSON.stringify({ ...JSON.parse([...mem.values()][0]), roam: 'broken' }));
const c = new SaveStore(kv, base, CARS);
check('a broken roam field leaves the rest of the save intact', c.data.roam === undefined && c.data.selected === 'civic');
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
