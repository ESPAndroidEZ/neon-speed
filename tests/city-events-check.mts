import { generateRoads } from '../src/world/roads/generate.ts';
import { placeCityEvents } from '../src/core/cityEvents.ts';
import { buildTrack } from '../src/data/tracks/index.ts';
import { validateTrack } from '../src/world/trackValidate.ts';
import { RaceManager } from '../src/core/raceManager.ts';
import { applyTuning, createDefaultTuning } from '../src/physics/carTuning.ts';
import { createAIRacer } from '../src/physics/aiRacers.ts';
import { createNeutralInput } from '../src/types/game.ts';
import { CARS } from '../src/data/cars.ts';

/* City event types (Underground round, stage 3): circuit, street sprint, drift run and the runway drag, all started from
   rings in Free Drive; outruns are covered by tests/world-flow-check. */
let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const g = generateRoads(7), ev = placeCityEvents(g);
const TYPE = { circuit: 'circuit', sprint: 'sprint', drift: 'drift', drag: 'sprint', run: 'sprint' } as const;
for (const k of ['circuit', 'sprint', 'drift', 'drag'] as const) check(`there are ${k} events`, ev.some((e) => e.kind === k), String(ev.filter((e) => e.kind === k).length));
check('ids are unique and say the kind', new Set(ev.map((e) => e.id)).size === ev.length && ev.every((e) => e.kind === 'circuit' || e.id.startsWith(`city-${e.kind}-`)));
check('start rings keep 60 m apart', ev.every((a, i) => ev.every((b, j) => i === j || Math.hypot(a.x - b.x, a.z - b.z) > 60)));
for (const e of ev) {
  const tr = buildTrack(e.def), sprint = e.def.type === 'sprint';
  const bad = validateTrack(tr, { minLength: 1000, maxLength: 3000, sprint });
  check(`${e.id}: valid ${e.def.type} map, ${Math.round(tr.length)} m`, bad.length === 0 && e.def.type === TYPE[e.kind], bad.map((b) => b.check).join(', '));
  if (sprint) check(`${e.id}: one run that ends part way`, e.def.laps === 1 && (e.def.sprintEnd ?? 1) < 0.95);
  if (e.kind === 'drift') check(`${e.id}: a drift target that grows with the length`, (e.def.driftTarget ?? 0) >= 2000 && Math.abs((e.def.driftTarget ?? 0) - e.length * 2.4) < 100, String(e.def.driftTarget));
}
const drag = ev.find((e) => e.kind === 'drag')!;
const dt = buildTrack(drag.def);
let straight = true;
for (let i = 0; i < dt.raceSamples; i++) if (Math.abs(dt.samples[i].tangent.x) > 0.02 && i > 3) straight = false;
check('the drag race is a straight line from start to finish', straight, `${Math.round(dt.raceSamples * dt.spacing)} m`);

// an AI at full skill finishes a street sprint and the drag (one run, no stalls)
const finish = (id: string): number => {
  const e = ev.find((x) => x.id === id)!;
  const rm = new RaceManager(buildTrack(e.def), 1);
  rm.addRacer('ai', 'AI', applyTuning(createDefaultTuning(), CARS[2].tuning), createAIRacer('ai', 'AI', 1));
  rm.addRacer('you', 'You', createDefaultTuning(), null, true);
  rm.start();
  const idle = createNeutralInput();
  let n = 0;
  while (!rm.racers[0].finished && n++ < 60 * 240) rm.step(1 / 60, idle, 'CLEAR');
  return rm.racers[0].finished ? rm.racers[0].finishTime : 999;
};
const sp = ev.find((e) => e.kind === 'sprint')!;
const ts = finish(sp.id), td = finish(drag.id);
check(`AI finishes ${sp.id}`, ts < 150, `${ts.toFixed(1)} s`);
check('AI finishes the drag in a drag time (15-40 s for ~900 m)', td > 15 && td < 40, `${td.toFixed(1)} s`);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
