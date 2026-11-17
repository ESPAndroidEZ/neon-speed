// Style combo (core/styleCombo): links multiply, a drift holds the timer, the chain banks after the window, a crash
// loses it, and snapshot/restore continues identically.
import { COMBO, StyleCombo } from '../src/core/styleCombo.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const D = 1 / 60;
const run = (c: StyleCombo, secs: number, bank = 0, drifting = false, impact = 0): void => { for (let i = 0; i < secs * 60; i++) c.step(D, bank, drifting, impact); };

const c = new StyleCombo();
c.link(100); c.link(100); c.link(100); // x1 + x2 + x3
check('three links multiply', c.chain === 600 && c.mult === 4, `chain ${c.chain} mult ${c.mult}`);
run(c, COMBO.window + 0.1);
check('chain banks after the window', c.score === 600 && c.chain === 0 && c.mult === 1 && c.event === 'banked', `score ${c.score}`);
for (let i = 0; i < 9; i++) c.link(10);
check('multiplier caps at x5', c.mult === COMBO.maxMult);
c.step(D, 0, false, 2);
check('crash loses the unbanked chain', c.chain === 0 && c.score === 600 && c.event === 'broken');
const d = new StyleCombo();
d.link(100);
run(d, 5, 0, true);
check('a drift in progress holds the timer', d.chain === 100 && d.timer > 0);
d.step(D, 5000, false, 0);
check('a banked drift links (score / 10 x multiplier)', d.chain === 100 + 500 * 2, `chain ${d.chain}`);
const a = new StyleCombo(), b = new StyleCombo();
a.link(150); run(a, 1, 3000);
b.restore(JSON.parse(JSON.stringify(a.snapshot())));
run(a, 4, 3000); run(b, 4, 3000);
check('restored combo runs identically', JSON.stringify(a.snapshot()) === JSON.stringify(b.snapshot()));
b.restore({ mult: NaN, timer: Infinity } as never);
check('junk snapshot is sanitised', b.mult === 1 && b.timer === 0);
if (failed) { console.log(`${failed} FAILED`); process.exit(1); }
console.log('ALL PASS');
