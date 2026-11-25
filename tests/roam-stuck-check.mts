/* Free Drive stuck detector (game/roamStuck.ts): on the gas without moving -> hint after 4 s, respawn after 9 s;
 * moving, coasting or braking never; water counts double. */
import { RoamStuck } from '../src/game/roamStuck.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`); };
const run = (s: RoamStuck, secs: number, speed: number, thr: number, x = 0, z = 0): number => { let r = 0; for (let i = 0; i < secs * 60; i++) r = s.update(1 / 60, speed, thr, x, z); return r; };

const a = new RoamStuck();
check('fine at first', run(a, 2, 0, 1) === 0);
check('hint after 4 s on the gas', run(a, 3, 0, 1) === 1);
check('respawn after 9 s', run(a, 6, 0, 1) === 2);
const b = new RoamStuck();
check('standing still without throttle is fine', run(b, 20, 0, 0) === 0);
check('moving resets the timer', run(b, 3.5, 0, 1) === 0 && run(b, 0.1, 8, 1) === 0 && run(b, 3.5, 0, 1) === 0);
const c = new RoamStuck();
check('reset clears it', run(c, 5, 0, 1) === 1 && (c.reset(), run(c, 1, 0, 1) === 0));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
