import { curvatureAt, type Track } from './track';

export interface TrackRules {
  minLength: number;
  maxLength: number;
  /** Closest allowed ratio of corner radius to half the road width (plus a fixed margin of 2.5 m). */
  sprint: boolean;
}

export interface Problem {
  check: string;
  detail: string;
}

const segCross = (ax: number, az: number, bx: number, bz: number, cx: number, cz: number, dx: number, dz: number): boolean => {
  const d1 = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
  const d2 = (bx - ax) * (dz - az) - (bz - az) * (dx - ax);
  const d3 = (dx - cx) * (az - cz) - (dz - cz) * (ax - cx);
  const d4 = (dx - cx) * (bz - cz) - (dz - cz) * (bx - cx);
  return d1 * d2 < 0 && d3 * d4 < 0;
};

/**
 * Headless track checks: length range, valid start and end, no self-intersection or overlapping legs, corner radius
 * against road width, gradient, and checkpoint spacing. Returns a list of problems (empty = valid).
 */
export function validateTrack(tr: Track, rules: TrackRules): Problem[] {
  const out: Problem[] = [];
  const s = tr.samples;
  const n = s.length;
  const add = (check: string, detail: string): void => void out.push({ check, detail });
  if (tr.length < rules.minLength || tr.length > rules.maxLength) add('length', `${tr.length.toFixed(0)} m not in ${rules.minLength}-${rules.maxLength}`);
  if (s.some((p) => !Number.isFinite(p.position.x + p.position.z + p.width + p.position.y))) add('finite', 'NaN in samples');
  // closed loop: the last sample must sit one step before the first
  const gap = Math.hypot(s[0].position.x - s[n - 1].position.x, s[0].position.z - s[n - 1].position.z);
  if (gap > tr.spacing * 1.6) add('closed loop', `gap ${gap.toFixed(1)} m between the last and first sample`);
  // start and end
  if (rules.sprint) {
    if (tr.raceSamples >= n * 0.95 || tr.raceSamples < n * 0.4) add('sprint end', `race covers ${tr.raceSamples}/${n} samples`);
    const e = s[tr.raceSamples - 1].position;
    const b = s[0].position;
    if (Math.hypot(e.x - b.x, e.z - b.z) < 300) add('sprint end', 'finish is too close to the start line');
  } else if (tr.raceSamples !== n) add('circuit', 'a circuit must race the whole loop');
  // self-intersection and overlapping legs (anything more than 60 m apart along the path must keep its walls clear)
  const minGapSamples = Math.ceil(60 / tr.spacing);
  for (let i = 0; i < n; i++) {
    const a = s[i].position;
    const b = s[(i + 1) % n].position;
    for (let j = i + 2; j < n; j++) {
      const arc = Math.min(j - i, n - (j - i));
      if (arc < 2) continue;
      const c = s[j].position;
      const d = s[(j + 1) % n].position;
      if (segCross(a.x, a.z, b.x, b.z, c.x, c.z, d.x, d.z)) {
        add('self-intersection', `segments ${i} and ${j} cross`);
        i = n;
        break;
      }
      if (arc >= minGapSamples) {
        const dist = Math.hypot(a.x - c.x, a.z - c.z);
        if (dist < tr.wall[i] + tr.wall[j] + 1.5) {
          add('overlap', `legs at ${i} and ${j} are ${dist.toFixed(1)} m apart (walls need ${(tr.wall[i] + tr.wall[j] + 1.5).toFixed(1)})`);
          i = n;
          break;
        }
      }
    }
  }
  // corner radius against width, gradient
  let worst = Infinity;
  let worstAt = 0;
  let grade = 0;
  for (let i = 0; i < n; i++) {
    const k = Math.abs(curvatureAt(tr, i));
    const margin = k > 1e-5 ? 1 / k - s[i].width / 2 : Infinity;
    if (margin < worst) {
      worst = margin;
      worstAt = i;
    }
    grade = Math.max(grade, Math.abs(tr.heights[(i + 1) % n] - tr.heights[i]) / tr.spacing);
  }
  if (worst < 2.5) add('corner radius', `at ${worstAt} the inside edge radius is only ${worst.toFixed(1)} m`);
  if (grade > 0.14) add('gradient', `${(grade * 100).toFixed(0)} % grade`);
  if (!rules.sprint && Math.abs(tr.heights[0] - tr.heights[n - 1]) > tr.spacing * 0.14) add('gradient', 'the loop does not close in height');
  // checkpoints: eight per race distance, each 50 to 600 m apart
  const cp = (tr.raceSamples * tr.spacing) / 8;
  if (cp < 50 || cp > 600) add('checkpoints', `${cp.toFixed(0)} m apart`);
  const widths = s.map((p) => p.width);
  if (Math.min(...widths) < 6.5 || Math.max(...widths) > 22) add('width', `${Math.min(...widths).toFixed(1)}-${Math.max(...widths).toFixed(1)} m`);
  return out;
}
