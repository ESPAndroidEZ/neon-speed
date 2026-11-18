import { defaultSave, parseSave } from '../src/core/save.ts';
import { parseSnapshot } from '../src/core/gameSave.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const CARS = ['civic', '350z', 'supra'];
const base = defaultSave('civic', 0xe8e8ee);

// Deterministic xorshift so a failure is reproducible.
let st = 0x9e3779b9;
const rnd = (): number => {
  st ^= st << 13; st >>>= 0; st ^= st >>> 17; st ^= st << 5; st >>>= 0;
  return st / 0x100000000;
};
const JUNK: unknown[] = [null, undefined, true, false, 0, -1, 1e308, NaN, Infinity, '', 'x', '{}', [], [1, 2], {}, { a: 1 }, -0, '__proto__'];
const junk = (depth: number): unknown => {
  const r = rnd();
  if (depth > 3 || r < 0.5) return JUNK[Math.floor(rnd() * JUNK.length)];
  if (r < 0.75) return [junk(depth + 1), junk(depth + 1)];
  const o: Record<string, unknown> = {};
  for (let i = 0; i < 3; i++) o[['cash', 'owned', 'settings', 'bestLap', 'volume', 'cars', 'upgrades', 'paint', 'version', 'racers', 'v'][Math.floor(rnd() * 11)]] = junk(depth + 1);
  return o;
};
// Mutate every field of a valid save with junk, one at a time and several at once.
const good = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
const mutate = (o: Record<string, unknown>, depth: number): Record<string, unknown> => {
  const out: Record<string, unknown> = Array.isArray(o) ? ([...o] as unknown as Record<string, unknown>) : { ...o };
  for (const k of Object.keys(out)) {
    if (rnd() < 0.3) out[k] = junk(0);
    else if (depth < 3 && out[k] && typeof out[k] === 'object') out[k] = mutate(out[k] as Record<string, unknown>, depth + 1);
  }
  return out;
};

let threw = 0;
let bad = 0;
for (let i = 0; i < 3000; i++) {
  const raw = i % 3 === 0 ? JSON.stringify(junk(0)) : JSON.stringify(mutate(good, 0));
  try {
    const s = parseSave(raw ?? 'null', base, CARS);
    const okCash = Number.isFinite(s.cash) && s.cash >= 0;
    if (!okCash || !CARS.includes(s.selected) || s.owned.some((c) => !CARS.includes(c)) || !s.owned.length) bad++;
  } catch { threw++; }
}
check('parseSave never throws on 3000 junk or mutated saves', threw === 0, `${threw} threw`);
check('parseSave output keeps invariants (finite cash, known cars, one owned)', bad === 0, `${bad} bad`);

let cut = 0;
const text = JSON.stringify(good);
for (let n = 0; n < text.length; n += 7) {
  try { parseSave(text.slice(0, n), base, CARS); } catch { cut++; }
}
check('truncated save text never throws', cut === 0, `${cut}`);
for (const raw of [null, '', 'null', '[]', '"s"', '12', 'not json', '{"settings":null}', '{"owned":"civic"}']) {
  try { parseSave(raw, base, CARS); check(`parseSave(${JSON.stringify(raw)})`, true, ''); } catch (e) { check(`parseSave(${JSON.stringify(raw)})`, false, String(e)); }
}

let snapThrew = 0;
let snapAccepted = 0;
for (let i = 0; i < 3000; i++) {
  try { if (parseSnapshot(i % 2 ? junk(0) : mutate({ version: 1, race: junk(0), game: junk(0) }, 0)) !== null) snapAccepted++; } catch { snapThrew++; }
}
check('parseSnapshot never throws on junk', snapThrew === 0, `${snapThrew} threw`);
check('parseSnapshot rejects junk (none accepted)', snapAccepted === 0, `${snapAccepted} accepted`);

if (failed) { console.log(`${failed} FAILED`); process.exit(1); }
console.log('all save-fuzz checks passed');
