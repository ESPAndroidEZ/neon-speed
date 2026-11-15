// Tightest racing-line radius per corner on each track (calibrates the corner guide labels).
import { TRACKS, buildTrack } from '../../src/data/tracks/index.ts';
import { racingLine } from '../../src/physics/aiLine.ts';
for (const def of TRACKS) {
  const l = racingLine(buildTrack(def).samples, 1.7);
  const out: string[] = []; let inC = false, kMax = 0;
  for (let i = 0; i < l.n; i++) {
    const c = l.k[i] > 1 / 75;
    if (c) kMax = Math.max(kMax, l.k[i]);
    if (inC && !c) { out.push((1 / kMax).toFixed(0)); kMax = 0; }
    inC = c;
  }
  console.log(def.id.padEnd(11), out.join(' '));
}
