// Track design check for a candidate waypoint list (JSON file of Vertex[]): length, width, corner spacing,
// validator problems (self-intersection, overlap, fillets). npx tsx tests/lab/track-design.mts file.json
import { readFileSync } from 'node:fs';
import { buildStreetPath } from '../../src/world/streetPath.ts';
import { createTrackFromPath } from '../../src/world/track.ts';
import { validateTrack } from '../../src/world/trackValidate.ts';
import { racingLine } from '../../src/physics/aiLine.ts';
const v = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const tr = createTrackFromPath('candidate', buildStreetPath(v), 3, [v[0].x + 20, v[0].z]);
const s = tr.samples; let L = 0;
for (let i = 0; i < s.length; i++) { const a = s[i].position, b = s[(i + 1) % s.length].position; L += Math.hypot(b.x - a.x, b.z - a.z); }
const w = s.map((x) => x.width);
const l = racingLine(s, 1.7);
let corners = 0, inC = false; const gaps: number[] = []; let last = -1, gapAt = '';
for (let i = 0; i < l.n; i++) { const c = l.k[i] > 1 / 90; if (c && !inC) { corners++; if (last >= 0) { const g = (i - last) * l.ds; if (!gaps.length || g > Math.max(...gaps)) gapAt = `from (${s[last].position.x.toFixed(0)}, ${s[last].position.z.toFixed(0)}) to (${s[i].position.x.toFixed(0)}, ${s[i].position.z.toFixed(0)})`; gaps.push(g); } last = i; } inC = c; }
const probs = validateTrack(tr, { minLength: 1000, maxLength: 9000, sprint: false });
console.log(`length ${L.toFixed(0)} m | width ${Math.min(...w).toFixed(1)}-${Math.max(...w).toFixed(1)} m | corners ${corners} (one per ${(L / Math.max(1, corners)).toFixed(0)} m, longest gap ${Math.max(...gaps).toFixed(0)} m ${gapAt}) | problems: ${probs.map((p) => p.check + ': ' + (p as { detail?: string }).detail?.slice(0, 80)).join(' | ') || 'none'}`);
