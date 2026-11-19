import { defaultControls, parseControls } from '../src/input/controlPrefs.ts';
import { sanitizeLayout, sanitizeScale } from '../src/ui/touchLayout.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};

const good = sanitizeLayout({ 'wheel:hb': { x: 0.8, y: 0.5 }, 'buttons:arrowL': { x: 0.1, y: 0.9 } });
check('valid layout kept', good['wheel:hb']?.x === 0.8 && good['buttons:arrowL']?.y === 0.9);
const bad = sanitizeLayout({ 'wheel:hb': { x: 'a', y: 1 }, 'nope:hb': { x: 0.5, y: 0.5 }, 'wheel:evil': { x: 0.5, y: 0.5 }, 'wheel:gas': { x: NaN, y: 0.5 }, 'wheel:nitro': { x: 5, y: -3 } });
check('junk dropped, out-of-range clamped', Object.keys(bad).join() === 'wheel:nitro' && bad['wheel:nitro'].x <= 0.97 && bad['wheel:nitro'].y >= 0.03, Object.keys(bad).join());
check('layout of the wrong type is empty', Object.keys(sanitizeLayout('x')).length === 0 && Object.keys(sanitizeLayout(null)).length === 0);
check('scale clamps and defaults', sanitizeScale(5) === 1.4 && sanitizeScale(0.1) === 0.8 && sanitizeScale('x') === 1 && sanitizeScale(1.1) === 1.1);

const round = parseControls(JSON.stringify({ v: 1, ...defaultControls(), layout: { 'wheel:hb': { x: 0.9, y: 0.4 } }, btnScale: 1.2 }));
check('layout and size survive a save round trip', round.layout['wheel:hb']?.x === 0.9 && round.btnScale === 1.2);
const old = parseControls(JSON.stringify({ v: 1, scheme: 'wheel', autoGas: true, chosen: true, seen: [] }));
check('old saves without a layout get defaults', Object.keys(old.layout).length === 0 && old.btnScale === 1);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
