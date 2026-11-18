// The HUD pop-up, countdown banner and wrong-way warning must stay announced to screen readers.
import { readFileSync } from 'node:fs';
let failed = 0;
const check = (n: string, ok: boolean): void => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}`); if (!ok) failed++; };
const hud = readFileSync('src/ui/hud.ts', 'utf8');
const ww = readFileSync('src/ui/wrongWay.ts', 'utf8');
check('pop-up is a polite live region', /this\.pop\.setAttribute\('aria-live', 'polite'\)/.test(hud));
check('banner is a polite live region', /this\.banner\.setAttribute\('aria-live', 'polite'\)/.test(hud));
check('wrong-way warning is an alert', /el\.setAttribute\('role', 'alert'\)/.test(ww));
if (failed) process.exit(1);
