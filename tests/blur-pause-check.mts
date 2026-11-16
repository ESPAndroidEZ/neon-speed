import { shouldPauseOnBlur } from '../src/game/blurPause.ts';
let failed = 0;
const check = (n: string, ok: boolean): void => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}`); if (!ok) failed++; };
const base = { finePointer: true, automated: false, stillFocused: false };
check('desktop, focus really lost: pause', shouldPauseOnBlur(base));
check('focus only moved inside the page: no pause', !shouldPauseOnBlur({ ...base, stillFocused: true }));
check('touch device: no pause', !shouldPauseOnBlur({ ...base, finePointer: false }));
check('automated browser: no pause', !shouldPauseOnBlur({ ...base, automated: true }));
if (failed) process.exit(1);
