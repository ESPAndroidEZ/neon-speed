import { uiNotes } from '../src/audio/uiSound.ts';
import type { UiKind } from '../src/audio/uiSound.ts';
let failed = 0;
const check = (n: string, ok: boolean, d = ''): void => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' - ' + d : ''}`); if (!ok) failed++; };
const kinds: UiKind[] = ['hover', 'select', 'back', 'error'];
let range = true, fin = true;
for (let k = 0; k < 12; k++) for (const kind of kinds) for (const n of uiNotes(kind, k)) { if (!Number.isFinite(n)) fin = false; if (n < 48 || n > 86) range = false; }
check('ui blips finite', fin);
check('ui blips stay in a pleasant range', range);
check('select rises, back falls', uiNotes('select', 9)[1] > uiNotes('select', 9)[0] && uiNotes('back', 9)[1] < uiNotes('back', 9)[0]);
check('hover is one note, error is two', uiNotes('hover', 0).length === 1 && uiNotes('error', 0).length === 2);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
