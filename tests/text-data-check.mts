import { CREW } from '../src/data/lore.ts';
import { RADIO } from '../src/data/radio.ts';
import { TIPS } from '../src/data/tips.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const all: string[] = [];
for (const [k, v] of Object.entries(RADIO)) {
  if (Array.isArray(v)) all.push(...v);
  else for (const l of Object.values(v)) all.push(...(Array.isArray(l) ? l : []));
}
check('radio has no duplicate lines', new Set(all).size === all.length, `${all.length} lines`);
const bad = all.filter((l) => /\{(?!name\}|pos\}|n\}|lap\}|laps\}|score\})/.test(l));
check('radio placeholders are known', bad.length === 0, bad[0] ?? '');
check('every drift line has {score}', RADIO.drift.every((l) => l.includes('{score}')));
check('every rival line names the rival', Object.entries(RADIO.rival).filter(([n]) => n !== 'Dante Voss').every(([n, ls]) => ls.every((l) => l.includes(n.split(' ')[0]))));
check('30 unique tips under 110 chars', TIPS.length === 30 && new Set(TIPS).size === 30 && TIPS.every((t) => t.length < 110), `${TIPS.length}`);
check('no tip or radio line reveals Switch is Cain', ![...TIPS, ...all].some((t) => /switch is cain|cain is switch/i.test(t)));
check('crew ids are unique', new Set(CREW.map((c) => c.id)).size === CREW.length, `${CREW.length}`);
process.exit(failed ? 1 : 0);
