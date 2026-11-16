import { calmEffective } from '../src/ui/calm.ts';
let failed = 0;
const check = (n: string, ok: boolean): void => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}`); if (!ok) failed++; };
check('off by default', calmEffective(false, false) === false);
check('player choice turns it on', calmEffective(true, false) === true);
check('OS reduced motion turns it on', calmEffective(false, true) === true);
check('both is on', calmEffective(true, true) === true);
if (failed) process.exit(1);
