// Best-lap ghost logic (game/ghostData): recording, best-lap choice, playback interpolation.
import { ghostPose, GhostRecorder, isGhostLap, type Pose } from '../src/game/ghostData.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`); };
const rec = new GhostRecorder();
const p: Pose = { x: 0, y: 0, z: 0, h: 0 };
const saved: number[] = [];
let t = 0, lapStart = 0;
// three laps: 60 s, 55 s (faster: new best), 58 s (slower: kept); the car drives along +x at 10 m/s within each lap
for (const lap of [60, 55, 58]) {
  for (let s = 0; s < lap * 30; s++) { // 30 fps frames
    const lt = t - lapStart;
    p.x = lt * 10; p.h = lt * 0.2;
    const fresh = rec.update(lapStart, lt, p);
    if (fresh) saved.push(fresh.t);
    t += 1 / 30;
  }
  lapStart = t;
}
rec.update(lapStart, 0, p); // the frame that sees lap 3 end
check('first lap saved, faster lap replaces it, slower lap does not', saved.length === 2 && Math.abs(saved[0] - 60) < 0.05 && Math.abs(saved[1] - 55) < 0.05, saved.join(', '));
check('stored lap is valid JSON data', isGhostLap(JSON.parse(JSON.stringify(rec.best))), `${rec.best!.f.length / 4} frames`);
const out: Pose = { x: 0, y: 0, z: 0, h: 0 };
check('playback interpolates between frames (within one 30 fps frame)', ghostPose(rec.best!, 12.34, out) && Math.abs(out.x - 123.4) < 0.34, `x ${out.x.toFixed(2)} at 12.34 s`);
check('playback ends after the lap', !ghostPose(rec.best!, 56, out), '');
// slow frames (2 fps) still give a true timeline
const slow = new GhostRecorder();
let ts = 0, fresh2 = null;
for (let s = 0; s <= 40; s++) { p.x = ts * 10; slow.update(0, ts, p); ts += 0.5; }
fresh2 = slow.update(20, 0, p);
const o2: Pose = { x: 0, y: 0, z: 0, h: 0 };
check('slow frames keep the timeline (20 s lap at 2 fps)', !!fresh2 && ghostPose(fresh2, 10, o2) && Math.abs(o2.x - 100) < 6, `x ${o2.x.toFixed(1)} at 10 s`);
// heading wrap: from +3.1 to -3.1 rad goes the short way
const wrap = { t: 1, f: [0, 0, 0, 3.1, 1, 0, 0, -3.1] };
ghostPose(wrap, 0.05, out);
check('heading interpolates across +-pi the short way', Math.abs(Math.abs(out.h) - 3.14) < 0.05, out.h.toFixed(3));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
