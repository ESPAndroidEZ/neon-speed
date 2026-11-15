// Brand-safe public build: after the build-time swap (scripts/vite-brand-plugin.ts) no real brand or model name is
// left in any string literal of src/, ids and numbers are untouched, and code outside strings is unchanged.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PUBLIC_NAMES, publicize } from '../scripts/vite-brand-plugin.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`);
};
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : f.endsWith('.ts') ? [join(d, f)] : []));
const REAL = new RegExp(`(?<![A-Za-z0-9])(${PUBLIC_NAMES.map(([r]) => r.replace(/[-]/g, '\\-')).join('|')})(?![A-Za-z0-9])`);
const LIT = /'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g;
const left: string[] = [];
let numbersSame = true, codeSame = true;
for (const f of walk('src')) {
  const src = readFileSync(f, 'utf8');
  const out = publicize(src);
  for (const lit of out.match(LIT) ?? []) {
    const text = lit.startsWith('`') ? lit.replace(/\$\{[^}]*\}/g, '') : lit;
    const m = text.match(REAL);
    if (m) left.push(`${f}: ${m[0]}`);
  }
  if ((src.match(/\d+(\.\d+)?/g) ?? []).join() !== (out.match(/\d+(\.\d+)?/g) ?? []).join()) numbersSame = false;
  if (src.replace(LIT, '""') !== out.replace(LIT, '""')) codeSame = false;
}
check('no real names left in string literals', left.length === 0, left.slice(0, 5).join('; '));
check('every number unchanged', numbersSame);
check('code outside strings unchanged', codeSame);
const sample = publicize("brand: 'Mitsubishi', name: 'Lancer Evolution VIII', id: 'evo', t: `the ${car.name} Supra`");
check('sample swap', sample === "brand: 'Mitsuya', name: 'Lancet Evolve VIII', id: 'evo', t: `the ${car.name} Sovra`", sample);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
