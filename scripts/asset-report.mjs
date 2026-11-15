// Asset budget report for the release bundle (dist/): totals per kind, raw and gzip, against budgets. Prints only
// totals plus the largest file of each kind (no long listings). Warns above a budget; --strict exits 1 then.
// Usage: node scripts/asset-report.mjs [--strict]   (after npm run build or build:prod)
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
if (!existsSync(DIST)) {
  console.log('asset report: no dist/ (run npm run build first)');
  process.exit(0);
}
const KB = 1024;
// budgets in KB (gzip for code, raw for binaries); the menu must start fast on a phone over 4G
const BUDGET = { code: 700, css: 60, models: 6000, textures: 4000, audio: 3000, other: 600, total: 12000 };
const kind = (f) => (/\.(js|mjs)$/.test(f) ? 'code' : /\.css$/.test(f) ? 'css' : /\.(glb|gltf|bin)$/.test(f) ? 'models' : /\.(png|jpe?g|webp|ktx2|avif)$/.test(f) ? 'textures' : /\.(ogg|mp3|wav|m4a|opus)$/.test(f) ? 'audio' : 'other');
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const sums = {};
for (const f of walk(DIST)) {
  if (/\.(gz|br)$/.test(f)) continue;
  const k = kind(f), raw = statSync(f).size;
  const gz = k === 'code' || k === 'css' || k === 'other' ? gzipSync(readFileSync(f)).length : raw;
  const s = (sums[k] ??= { n: 0, raw: 0, gz: 0, big: '', bigSize: 0 });
  s.n++; s.raw += raw; s.gz += gz;
  if (raw > s.bigSize) { s.bigSize = raw; s.big = relative(DIST, f); }
}
let warn = 0, total = 0;
for (const [k, s] of Object.entries(sums)) {
  const measured = k === 'code' || k === 'css' ? s.gz : s.raw;
  total += s.gz;
  const over = measured > BUDGET[k] * KB;
  if (over) warn++;
  console.log(`${over ? 'WARN' : 'ok  '} ${k.padEnd(8)} ${String(s.n).padStart(3)} files  ${(s.raw / KB).toFixed(0).padStart(6)} KB raw  ${(s.gz / KB).toFixed(0).padStart(6)} KB gz  (budget ${BUDGET[k]} KB)  largest ${s.big}`);
}
const overTotal = total > BUDGET.total * KB;
if (overTotal) warn++;
console.log(`${overTotal ? 'WARN' : 'ok  '} total transfer ~${(total / KB).toFixed(0)} KB (budget ${BUDGET.total} KB)`);
process.exit(warn && process.argv.includes('--strict') ? 1 : 0);
