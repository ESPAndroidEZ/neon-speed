import { completeEvent, nextEvent, nextEvent3, nextEvent4, nextEvent5 } from '../src/core/career.ts';
import { defaultSave, SaveStore, type KeyValueStore } from '../src/core/save.ts';
import { CARS } from '../src/data/cars.ts';
import { CREW } from '../src/data/lore.ts';
import { LOOKS } from '../src/data/characters.ts';
import { EVERY_EVENT, findAnyEvent } from '../src/data/story2.ts';
import { placeOf, STORY_PLACES } from '../src/data/world/storyPlaces.ts';
import { greeter, pinStates, placeStoryPins } from '../src/core/storyPins.ts';
import { placeCityRaces } from '../src/core/cityRace.ts';
import { placeDriftZones } from '../src/core/driftZones.ts';
import { placeCarMeet } from '../src/core/carMeet.ts';
import { generateRoads } from '../src/world/roads/generate.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`); };
const mk = (): SaveStore => {
  const mem: Record<string, string> = {};
  const kv: KeyValueStore = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => void (mem[k] = v) };
  return new SaveStore(kv, defaultSave('civic', 0xffffff), CARS.map((x) => x.id));
};

const g = generateRoads(7);
const races = placeCityRaces(g), zones = placeDriftZones(g), meet = placeCarMeet(g, zones);
const avoid = [...races, ...zones, ...(meet ? [meet] : [])];
const pins = placeStoryPins(g, STORY_PLACES, avoid);
check('every event has exactly one place and one pin', STORY_PLACES.length === EVERY_EVENT.length && EVERY_EVENT.every((e) => placeOf(e.id)) && pins.length === STORY_PLACES.length && new Set(pins.map((p) => p.event)).size === pins.length, `${pins.length} pins`);
check('pins sit in their district', pins.every((p, i) => p.district === STORY_PLACES[i].district && g.nodes[p.node].district === p.district));
let minGap = 1e9;
for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) minGap = Math.min(minGap, Math.hypot(pins[i].x - pins[j].x, pins[i].z - pins[j].z));
check('pins are at least 130 m apart', minGap >= 130, `closest ${minGap.toFixed(0)} m`);
let minAvoid = 1e9;
for (const p of pins) for (const a of avoid) minAvoid = Math.min(minAvoid, Math.hypot(p.x - a.x, p.z - a.z));
check('pins keep clear of race rings, drift zones and the meet', minAvoid >= 40, `closest ${minAvoid.toFixed(0)} m`);
check('pins are not on tunnels, bridges or the highway ring', pins.every((p) => g.nodes[p.node].edges.every((e) => !g.edges[e].tunnel && !['highway', 'bridge', 'runway', 'coast'].includes(g.edges[e].kind))));
const again = placeStoryPins(generateRoads(7), STORY_PLACES, avoid);
check('placement is deterministic', again.every((p, i) => p.node === pins[i].node));

// who greets you
const names = new Set(CREW.map((c) => c.id));
check('every greeter is a known person with a portrait and a crew entry', EVERY_EVENT.every((e) => { const w = greeter(e, placeOf(e.id)?.who); return names.has(w) && w in LOOKS; }), EVERY_EVENT.map((e) => greeter(e, placeOf(e.id)?.who)).join(','));
check('the radio voice and the narrator never stand at a place', EVERY_EVENT.every((e) => !['switch', 'narrator', 'rookie'].includes(greeter(e, placeOf(e.id)?.who))));

// states follow the story: one place lit at a time, the rest locked, finished ones done
const s = mk();
const st = new Uint8Array(pins.length);
pinStates(s.data.career, pins, st);
check('a new career has only the first place lit', st.filter((x) => x === 1).length === 1 && st[0] === 1 && st.filter((x) => x === 2).length === 0);
const next = (c: typeof s.data.career) => nextEvent(c) ?? nextEvent3(c) ?? nextEvent4(c) ?? nextEvent5(c);
let ok = true, steps = 0;
for (let e = next(s.data.career); e && steps < 40; e = next(s.data.career)) {
  pinStates(s.data.career, pins, st);
  const lit = pins.filter((_, i) => st[i] === 1);
  ok &&= lit.length === 1 && lit[0].event === e.id;
  completeEvent(s.data, e);
  steps++;
  if (e.id === 'c2-final') s.data.career.epilogueSeen = true;
  if (e.id === 'c3-final') s.data.career.flags.c3Seen = true;
  if (e.id === 'c4-broker') s.data.career.flags.c4Seen = true;
}
pinStates(s.data.career, pins, st);
check('the lit place is always the next event; at the end everything is done', ok && steps === EVERY_EVENT.length && st.every((x) => x === 2), `${steps} events`);
check('all events are findable', EVERY_EVENT.every((e) => findAnyEvent(e.id).id === e.id));
console.log(failed ? `FAILED ${failed}` : 'ALL PASS');
process.exit(failed ? 1 : 0);
