import { TRACKS, buildTrack } from '../src/data/tracks/index.ts';
import { validateTrack } from '../src/world/trackValidate.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
check('five maps, unique ids', TRACKS.length >= 5 && new Set(TRACKS.map((t) => t.id)).size === TRACKS.length, `${TRACKS.length}`);
check('all three event types are present', ['circuit', 'sprint', 'drift'].every((k) => TRACKS.some((t) => t.type === k)), '');
for (const def of TRACKS) {
  const tr = buildTrack(def);
  const sprint = def.type === 'sprint';
  const problems = validateTrack(tr, { minLength: sprint ? 1800 : 1000, maxLength: sprint ? 4500 : 3200, sprint });
  check(`${def.id}: valid (${tr.length.toFixed(0)} m, ${tr.samples.length} samples, climb ${Math.max(...tr.heights).toFixed(0)} m)`, problems.length === 0, problems.map((p) => `${p.check}: ${p.detail}`).join('; '));
  check(`${def.id}: rules for its event type`, (def.type === 'drift' ? def.driftTarget! > 0 : true) && (sprint ? !!def.sprintEnd && def.laps === 1 : def.laps >= 2) && def.recommendedWeather.length > 0, def.type);
}
// elevation: the car's visual height follows the road and pitches up on a climb
import { CarController } from '../src/physics/carController.ts';
import { createDefaultTuning } from '../src/physics/carTuning.ts';
import { TrackContact } from '../src/physics/trackContact.ts';
import { WEATHER } from '../src/physics/weather.ts';
import { createNeutralInput } from '../src/types/game.ts';
{
  const cliff = TRACKS.find((t) => t.id === 'cliff')!;
  const tr = buildTrack(cliff);
  const car = new CarController(createDefaultTuning());
  const tc = new TrackContact(tr);
  tc.place(car, 0);
  const inp = createNeutralInput();
  inp.throttle = 1;
  let maxErr = 0;
  let maxPitch = 0;
  let minPitch = 0;
  for (let i = 0; i < 60 * 14; i++) {
    car.step(1 / 60, inp, WEATHER.CLEAR);
    tc.update(car);
    maxErr = Math.max(maxErr, Math.abs(car.state.position.y - tr.heights[tc.hit.index]));
    maxPitch = Math.max(maxPitch, tc.pitch);
    minPitch = Math.min(minPitch, tc.pitch);
  }
  check('car height follows the road surface', maxErr < 1.0 && car.state.position.y > 5, `max error ${maxErr.toFixed(2)} m, now at ${car.state.position.y.toFixed(1)} m`);
  check('car pitches up on climbs and down on descents', maxPitch > 0.03 && minPitch < -0.01, `pitch ${minPitch.toFixed(2)}..${maxPitch.toFixed(2)} rad`);
  check('flat maps stay flat', Math.max(...buildTrack(TRACKS[0]).heights) === 0, '');
}

// the validator must catch bad maps
import { buildStreetPath } from '../src/world/streetPath.ts';
import { createTrackFromPath } from '../src/world/track.ts';
const mkTrack = (vs: Parameters<typeof buildStreetPath>[0], opts = {}) => createTrackFromPath('bad', buildStreetPath(vs), 3, undefined, opts);
const rules = { minLength: 1000, maxLength: 3200, sprint: false };
const figure8 = mkTrack([{ x: 0, z: 0, r: 20, w: 10 }, { x: 400, z: 300, r: 20, w: 10 }, { x: 400, z: 0, r: 20, w: 10 }, { x: 0, z: 300, r: 20, w: 10 }]);
check('catches a figure-eight crossing', validateTrack(figure8, rules).some((p) => p.check === 'self-intersection' || p.check === 'overlap'), '');
const tight = mkTrack([{ x: 0, z: 0, r: 4, w: 14 }, { x: 500, z: 0, r: 4, w: 14 }, { x: 500, z: 300, r: 4, w: 14 }, { x: 0, z: 300, r: 4, w: 14 }]);
check('catches corners tighter than the road is wide', validateTrack(tight, rules).some((p) => p.check === 'corner radius'), '');
const tiny = mkTrack([{ x: 0, z: 0, r: 20, w: 10 }, { x: 150, z: 0, r: 20, w: 10 }, { x: 150, z: 100, r: 20, w: 10 }, { x: 0, z: 100, r: 20, w: 10 }]);
check('catches a track that is too short', validateTrack(tiny, rules).some((p) => p.check === 'length'), '');
const close = mkTrack([{ x: 0, z: 0, r: 30, w: 10 }, { x: 600, z: 0, r: 30, w: 10 }, { x: 600, z: 25, r: 8, w: 10 }, { x: 0, z: 25, r: 8, w: 10 }]);
check('catches two legs that touch', validateTrack(close, rules).some((p) => p.check === 'overlap' || p.check === 'corner radius'), '');
const steep = mkTrack([{ x: 0, z: 0, r: 40, w: 10 }, { x: 500, z: 0, r: 40, w: 10 }, { x: 500, z: 300, r: 40, w: 10 }, { x: 0, z: 300, r: 40, w: 10 }], { elevation: [{ at: 0, h: 0 }, { at: 0.5, h: 120 }] });
check('catches a road that is too steep', validateTrack(steep, rules).some((p) => p.check === 'gradient'), '');
check('catches a sprint that ends at the start', validateTrack(mkTrack([{ x: 0, z: 0, r: 40, w: 10 }, { x: 500, z: 0, r: 40, w: 10 }, { x: 500, z: 300, r: 40, w: 10 }, { x: 0, z: 300, r: 40, w: 10 }], { sprintEnd: 0.99 }), { ...rules, sprint: true }).some((p) => p.check === 'sprint end'), '');
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
