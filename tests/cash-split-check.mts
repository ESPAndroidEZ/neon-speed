import { cashSplit } from '../src/game/cashSplit';

let fails = 0;
const ok = (c: boolean, m: string): void => { if (!c) { fails++; console.error('FAIL', m); } };

const a = cashSplit(3310, 3100);
ok(!!a && a.prize === 3000 && a.drift === 310, 'win with 3100 drift points');
for (const [cash, d] of [[1805, 49], [1100, 5], [600, 1234.6], [300, 2999]] as const) {
  const s = cashSplit(cash, d);
  ok(s === null || s.prize + s.drift === cash, `parts add up for ${cash}/${d}`);
}
ok(cashSplit(3000, 0) === null, 'no drift, no split');
ok(cashSplit(3000, 4) === null, 'under a dollar of drift');
ok(cashSplit(0, 500) === null, 'zero cash');
ok(cashSplit(100, 5000) === null, 'drift covers everything');
ok(cashSplit(NaN, 500) === null && cashSplit(500, NaN) === null, 'NaN');
ok(cashSplit(-5, 500) === null, 'negative cash');
if (fails) process.exit(1);
console.log('cash-split-check ok');
