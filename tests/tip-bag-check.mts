import { TipBag } from '../src/core/tipBag.ts';
import { createRng } from '../src/core/rng.ts';
let failed = 0;
const check = (n: string, ok: boolean, d = ''): void => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' - ' + d : ''}`); if (!ok) failed++; };
for (const seed of [1, 7, 99, 12345]) {
  const size = 23;
  const b = new TipBag(size, createRng(seed));
  const seq: number[] = [];
  for (let i = 0; i < size * 6; i++) seq.push(b.next());
  let allRounds = true;
  for (let r = 0; r < 6; r++) if (new Set(seq.slice(r * size, (r + 1) * size)).size !== size) allRounds = false;
  check(`seed ${seed}: every round shows each tip once`, allRounds);
  check(`seed ${seed}: never the same tip twice in a row`, seq.every((v, i) => i === 0 || v !== seq[i - 1]));
}
const one = new TipBag(1, createRng(3));
check('single tip repeats safely', one.next() === 0 && one.next() === 0);
const none = new TipBag(0, createRng(3));
check('empty bag returns 0', none.next() === 0);
const two = new TipBag(2, createRng(5));
const s2 = Array.from({ length: 20 }, () => two.next());
check('two tips alternate', s2.every((v, i) => i === 0 || v !== s2[i - 1]));
if (failed) process.exit(1);
