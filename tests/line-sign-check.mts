// Racing-line curvature sign: ks > 0 must be a RIGHT turn on every track (the corner guide's LEFT/RIGHT relies on it).
import { TRACKS, buildTrack } from '../src/data/tracks/index.ts';
import { racingLine } from '../src/physics/aiLine.ts';
let failed = 0;
for (const def of TRACKS) {
  const t = buildTrack(def), l = racingLine(t.samples, 1.7);
  let right = 0, wrong = 0;
  for (let i = 0; i < l.n; i++) {
    const a = t.samples[i].tangent, b = t.samples[(i + 2) % l.n].tangent;
    let dh = Math.atan2(b.x, b.z) - Math.atan2(a.x, a.z); // heading grows = turning LEFT
    if (dh > Math.PI) dh -= 2 * Math.PI; else if (dh < -Math.PI) dh += 2 * Math.PI;
    if (Math.abs(dh) < 0.02 || Math.abs(l.ks[i]) < 0.01) continue;
    if (Math.sign(dh) === -Math.sign(l.ks[i])) right++; else wrong++;
  }
  const ok = wrong <= right * 0.05;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${def.id}: ks > 0 = right turn  (${right} agree, ${wrong} disagree)`);
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
