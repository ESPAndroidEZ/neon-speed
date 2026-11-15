// Tilt steering mapping with synthetic DeviceOrientation angles in portrait, landscape-primary (90) and
// landscape-secondary (270): no NaN, clamped to -1..1, dead zone respected, right side down = steer right (< 0),
// continuous through the gamma +-90 flip, calibration offsets, invert and smoothing.
import { defaultTilt, rollFrom, smoothSteer, steerFromRoll, wrapDeg } from '../src/input/tiltMap.ts';
import { parseControls } from '../src/input/controlPrefs.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`);
};
const DEG = Math.PI / 180;

/**
 * Orientation angles (beta, gamma; spec ranges) for a phone held as a wheel: screen pitched back `pitch` degrees
 * from vertical, turned `wheel` degrees clockwise (right side down) as seen by the player, at a screen angle.
 */
function pose(wheel: number, pitch: number, screenAngle: number): [number, number] {
  // gravity in SCREEN axes (x right, y up, z out of the screen towards the player)
  const w = wheel * DEG, p = pitch * DEG;
  const sx = Math.sin(w) * Math.cos(p), sy = -Math.cos(w) * Math.cos(p), sz = -Math.sin(p);
  // screen -> device axes (inverse of the rotation in rollFrom)
  const a = screenAngle * DEG, ca = Math.cos(a), sa = Math.sin(a);
  const dx = sx * ca + sy * sa, dy = -sx * sa + sy * ca, dz = sz;
  let beta = Math.asin(Math.max(-1, Math.min(1, -dy))) / DEG;
  let gamma = Math.atan2(dx, -dz) / DEG;
  if (gamma >= 90 || gamma < -90) { // into the spec ranges: beta [-180,180), gamma [-90,90)
    gamma = gamma >= 90 ? gamma - 180 : gamma + 180;
    beta = wrapDeg(180 - beta);
  }
  return [beta, gamma];
}

const prefs = defaultTilt();
for (const angle of [0, 90, 270]) {
  const name = angle === 0 ? 'portrait' : angle === 90 ? 'landscape-primary' : 'landscape-secondary';
  let nan = 0, out = 0, maxErr = 0, monotonic = true, prev = Infinity;
  for (let wheel = -70; wheel <= 70; wheel += 0.5) {
    for (const pitch of [0, 25, 50, 70]) {
      const [b, g] = pose(wheel, pitch, angle);
      const r = rollFrom(b, g, angle);
      const s = steerFromRoll(r.deg, prefs);
      if (!Number.isFinite(r.deg) || !Number.isFinite(s)) nan++;
      if (s < -1 || s > 1) out++;
      maxErr = Math.max(maxErr, Math.abs(wrapDeg(r.deg - wheel)));
    }
    const [b, g] = pose(wheel, 30, angle);
    const s = steerFromRoll(rollFrom(b, g, angle).deg, prefs);
    if (s > prev + 1e-9) monotonic = false; // more right turn never gives more left steer
    prev = s;
  }
  check(`${name}: no NaN, in -1..1`, nan === 0 && out === 0, `nan ${nan}, out ${out}`);
  check(`${name}: wheel angle recovered at any pitch`, maxErr < 0.01, `max error ${maxErr.toFixed(4)} deg`);
  check(`${name}: monotonic (right turn = steer right)`, monotonic);
  const [rb, rg] = pose(20, 30, angle), [lb, lg] = pose(-20, 30, angle);
  const right = steerFromRoll(rollFrom(rb, rg, angle).deg, prefs), left = steerFromRoll(rollFrom(lb, lg, angle).deg, prefs);
  check(`${name}: right side down steers right (< 0), left side down steers left (> 0)`, right < -0.3 && left > 0.3, `right ${right.toFixed(2)}, left ${left.toFixed(2)}`);
  const [db, dg] = pose(2.5, 30, angle);
  check(`${name}: inside the 3 deg dead zone = 0`, steerFromRoll(rollFrom(db, dg, angle).deg, prefs) === 0);
  const [fb, fg] = pose(35, 30, angle);
  check(`${name}: full lock at 35 deg`, Math.abs(steerFromRoll(rollFrom(fb, fg, angle).deg, prefs) + 1) < 1e-6);
}

// upright landscape is exactly where gamma flips between +90 and -90: steering must not jump
let jump = 0;
let last = steerFromRoll(rollFrom(...pose(-10, 1, 90), 90).deg, prefs);
for (let p = -10; p <= 10; p += 0.25) for (let w = -10; w <= 10; w += 0.5) {
  const s = steerFromRoll(rollFrom(...pose(w, p, 90), 90).deg, prefs);
  if (w > -10) jump = Math.max(jump, Math.abs(s - last));
  last = s;
}
check('no jump through the gamma +-90 flip (upright landscape)', jump < 0.08, `max step ${jump.toFixed(3)}`);

// calibration: a phone held 12 deg turned right is the new centre
const cal = { ...prefs, zeroDeg: rollFrom(...pose(12, 30, 90), 90).deg };
check('calibrated centre steers 0', steerFromRoll(rollFrom(...pose(12, 30, 90), 90).deg, cal) === 0);
check('calibrated: 12 deg further right steers right', steerFromRoll(rollFrom(...pose(24, 30, 90), 90).deg, cal) < -0.1);
check('invert flips the sign', steerFromRoll(20, { ...prefs, invert: true }) === -steerFromRoll(20, prefs));
check('garbage input gives 0', steerFromRoll(NaN, prefs) === 0 && rollFrom(NaN, 3, 90).deg === 0 && rollFrom(10, Infinity, 0).inPlane === 0);
check('phone flat: in-plane share tiny', rollFrom(0, 0, 90).inPlane < 0.01);

// smoothing: converges, stays clamped, calmer at speed
let a = 0, b = 0;
for (let i = 0; i < 6; i++) { a = smoothSteer(a, 1, 1 / 60, 0); b = smoothSteer(b, 1, 1 / 60, 200); }
check('smoothing: faster response standing than at 200 km/h', a > b && b > 0, `${a.toFixed(2)} vs ${b.toFixed(2)}`);
let c = 0;
for (let i = 0; i < 300; i++) c = smoothSteer(c, 1, 1 / 60, 100);
check('smoothing converges and clamps', c > 0.99 && c <= 1 && smoothSteer(0, NaN, 1 / 60, 0) === 0);

// stored prefs: corrupt and future versions fall back, values are clamped
const p1 = parseControls('{"v":1,"scheme":"tilt","autoGas":false,"tilt":{"sens":9,"maxDeg":2,"invert":true},"chosen":true}');
check('prefs parse and clamp', p1.scheme === 'tilt' && !p1.autoGas && p1.tilt.sens === 2 && p1.tilt.maxDeg === 15 && p1.tilt.invert && p1.chosen);
check('prefs: corrupt / future -> defaults', parseControls('{oops').scheme === 'wheel' && parseControls('{"v":99,"scheme":"tilt"}').scheme === 'wheel' && parseControls('{"scheme":"joystick"}').scheme === 'wheel');

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
