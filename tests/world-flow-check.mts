import { generateRoads } from '../src/world/roads/generate.ts';
import { AREA_REP, AreaGuard, areaOpen, districtCentres } from '../src/core/areaLocks.ts';
import { placeShops, shopAt, SHOP_R } from '../src/core/shops.ts';
import { placeCityRaces } from '../src/core/cityRace.ts';
import { kindOf, placeCityEvents, planCityEvent, planOutrun } from '../src/core/cityEvents.ts';
import { findTrackDef } from '../src/data/tracks/index.ts';
import { findCityEvent } from '../src/game/cityRaces.ts';
import { buildTrack } from '../src/data/tracks/index.ts';

/* World flow (Underground round, stage 2): REP areas, shops as places, outruns from a challenger's junction. */
let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const g = generateRoads(7);

check('Downtown and the Harbour are open from the start', areaOpen('downtown', 1) && areaOpen('harbour', 1));
check('the Bay opens only at its level', !areaOpen('bay', AREA_REP.bay - 1) && areaOpen('bay', AREA_REP.bay));
check('a story district is open whatever the REP', areaOpen('hills', 1, new Set(['hills'])));
check('levels rise outward', AREA_REP.strip < AREA_REP.industrial && AREA_REP.industrial < AREA_REP.hills && AREA_REP.hills < AREA_REP.bay);
const centres = districtCentres(g);
check('every district with roads has a map centre', centres.length >= 6, centres.map((c) => c.id).join(' '));

const guard = new AreaGuard();
check('arriving inside a locked district is allowed (no safe spot yet)', guard.step(0, 0, 0, 'bay', false) === null);
guard.step(10, 20, 1, 'downtown', true);
check('driving from an open district into a locked one is caught', guard.step(11, 21, 1, 'bay', false) === 'bay' && guard.safeX === 10 && guard.safeZ === 20);

const races = placeCityRaces(g), shops = placeShops(g, races);
check('three shops: garage, parts, paint', shops.map((s) => s.kind).join() === 'garage,parts,paint');
check('shops sit in districts open from the start', shops.every((s) => areaOpen(s.district, 1)));
check('shops keep 80 m from race rings and each other', shops.every((s, i) => [...races, ...shops.filter((_, j) => j !== i)].every((p) => Math.hypot(p.x - s.x, p.z - s.z) > 80)));
check('shop ring is found inside its radius only', shopAt(shops, shops[0].x + SHOP_R * 0.9, shops[0].z) === 0 && shopAt(shops, shops[0].x + SHOP_R * 1.1, shops[0].z) === -1);

let ok = 0, n = 0, first = -1;
for (const nd of g.nodes) {
  if (nd.edges.length < 3 || n >= 40) continue;
  n++;
  const r = planOutrun(g, nd.id);
  if (r) { ok++; if (first < 0) first = nd.id; if (r.def.type !== 'sprint' || r.def.laps !== 1 || r.kind !== 'run') check(`outrun ${r.id} is a one-run sprint`, false); }
}
check('an outrun can start from most junctions', ok >= n * 0.8, `${ok}/${n}`);
const id = `city-run-${first}`, a = planOutrun(g, first)!, b = planCityEvent(g, id);
check('an outrun is rebuilt from its id alone (saves, restarts)', !!b && JSON.stringify(a.def) === JSON.stringify(b.def));
check('the map lookup finds an outrun by id', findTrackDef(id).id === id && findCityEvent(id)?.kind === 'run');
check('kind is read from the id', kindOf(id) === 'run' && kindOf('city-downtown') === 'circuit' && kindOf('city-sprint-strip') === 'sprint');
const tr = buildTrack(a.def);
check('the outrun ends part way (sprint end) and away from the start', tr.raceSamples < tr.samples.length * 0.95 && tr.raceSamples > tr.samples.length * 0.4);
const ev = placeCityEvents(g);
check('ring events: circuits, sprints and drift runs', ['circuit', 'sprint', 'drift'].every((k) => ev.some((e) => e.kind === k)), `${ev.length} events`);
check('event ids are unique', new Set(ev.map((e) => e.id)).size === ev.length);
// the locked border acts like a wall at the red gate: the car stays on the open side, facing the same way (no spin-around)
{
  const { Group } = await import('three');
  const { RoamFlow, FLOW_HOOK } = await import('../src/game/roamFlow.ts');
  const { roadCrossings } = await import('../src/world/open/lockGates.ts');
  const { CarController } = await import('../src/physics/carController.ts');
  const { applyTuning, createDefaultTuning } = await import('../src/physics/carTuning.ts');
  const { WEATHER } = await import('../src/physics/weather.ts');
  const { districtAt } = await import('../src/data/world/districtMap.ts');
  FLOW_HOOK.level = () => 1;
  const flow = new RoamFlow(g, [], new Group(), null, [], () => false);
  const cr = roadCrossings(g).find((c) => areaOpen(c.a, 1) && !areaOpen(c.b, 1))!;
  const car = new CarController(applyTuning(createDefaultTuning(), {}));
  const h0 = cr.h, sx = cr.x - Math.sin(h0) * 25, sz = cr.z - Math.cos(h0) * 25;
  car.reset(sx, sz, h0); car.nudge(0, 0, Math.sin(h0) * 15, Math.cos(h0) * 15, 0);
  flow.place(sx, sz);
  const inp = { throttle: 0.6, brake: 0, steer: 0, handbrake: false, nitro: false };
  for (let i = 0; i < 240; i++) { car.step(1 / 60, inp, WEATHER.CLEAR); flow.step(car, 1 / 60); }
  const p = car.state.position;
  check('the car stays out of the locked district at the gate', areaOpen(districtAt(p.x, p.z), 1), `${cr.a} -> ${cr.b}`);
  check('and still faces the way it drove (no spin-around)', Math.abs(Math.atan2(Math.sin(car.state.heading - h0), Math.cos(car.state.heading - h0))) < 0.35);
  const gates = (flow as unknown as { gates: { mesh: { count: number } } }).gates;
  check('red gates stand on the roads into locked districts', gates.mesh.count > 10, String(gates.mesh.count));
  FLOW_HOOK.level = () => 30;
  flow.step(car, 1 / 60);
  check('all open: no gates', gates.mesh.count === 0);
  car.reset(cr.x + Math.sin(h0) * 30, cr.z + Math.cos(h0) * 30, h0); FLOW_HOOK.level = () => 1;
  flow.place(car.state.position.x, car.state.position.z);
  for (let i = 0; i < 3; i++) { car.step(1 / 60, inp, WEATHER.CLEAR); flow.step(car, 1 / 60); }
  check('a respawn inside a locked district is pulled back to the open side', areaOpen(districtAt(car.state.position.x, car.state.position.z), 1));
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
