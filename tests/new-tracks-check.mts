// Track standard since 2026-11-15 (wide, curvy, 2.5-4 min laps). Add every new track id to STANDARD.
import { CARS } from '../src/data/cars.ts';
import { TRACKS, buildTrack } from '../src/data/tracks/index.ts';
import { RaceManager } from '../src/core/raceManager.ts';
import { racingLine } from '../src/physics/aiLine.ts';
import { applyTuning, createDefaultTuning } from '../src/physics/carTuning.ts';
import { createAIRacer } from '../src/physics/aiRacers.ts';
import { validateTrack } from '../src/world/trackValidate.ts';
import { createNeutralInput } from '../src/types/game.ts';
const STANDARD = ['mountain', 'coast'];
let failed = 0;
const check = (n: string, ok: boolean, i: string): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`); };
for (const id of STANDARD) {
  const def = TRACKS.find((t) => t.id === id)!;
  const tr = buildTrack(def), s = tr.samples;
  let L = 0;
  for (let i = 0; i < s.length; i++) { const a = s[i].position, b = s[(i + 1) % s.length].position; L += Math.hypot(b.x - a.x, b.z - a.z); }
  const minW = Math.min(...s.map((x) => x.width));
  check(`${id}: road at least 14 m wide everywhere`, minW >= 13.99, `${minW.toFixed(1)} m`);
  const probs = validateTrack(tr, { minLength: 3500, maxLength: 4600, sprint: false });
  check(`${id}: valid, no self-intersection or overlap, length 3.5-4.6 km`, probs.length === 0, probs.map((p) => p.check).join(', ') || `${L.toFixed(0)} m`);
  const l = racingLine(s, 1.7);
  let corners = 0, inC = false;
  for (let i = 0; i < l.n; i++) { const c = l.k[i] > 1 / 90; if (c && !inC) corners++; inC = c; }
  check(`${id}: a significant corner about every 120-220 m`, L / corners <= 220 && L / corners >= 120, `${corners} corners, one per ${(L / corners).toFixed(0)} m`);
  const rm = new RaceManager(tr, 1);
  rm.addRacer('ai', 'AI', applyTuning(createDefaultTuning(), CARS[0].tuning), createAIRacer('ai', 'AI', 1));
  rm.addRacer('you', 'You', createDefaultTuning(), null, true);
  rm.start();
  const idle = createNeutralInput();
  let n = 0, wall = 0;
  while (!rm.racers[0].finished && n++ < 60 * 300) { rm.step(1 / 60, idle, 'CLEAR'); if (rm.racers[0].contact.impact > 1) wall++; }
  const t = rm.racers[0].finishTime;
  check(`${id}: AI finishes a lap in 2.5-4 min, never stuck on a barrier`, rm.racers[0].finished && t >= 150 && t <= 240 && wall < 60, rm.racers[0].finished ? `${t.toFixed(0)} s, ${wall} wall steps` : 'DNF');
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
