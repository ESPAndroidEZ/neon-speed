import fs from 'node:fs';
import path from 'node:path';
import { detectLang, fill, getLang, LANGS, setLang, t, table, tx } from '../src/i18n';
import { ES_CONTENT } from '../src/i18n/esContent';
import { harvest } from './lab/i18n-harvest.mts';

let fails = 0;
const fail = (m: string): void => { fails++; console.log('FAIL', m); };
const params = (s: string): string => (s.match(/\{\w+\}/g) ?? []).sort().join(',');

// 1. both tables: identical keys, no empty values, same placeholders
const en = table('en');
const es = table('es');
for (const k of Object.keys(en)) {
  if (!(k in es)) fail(`es missing key ${k}`);
  else {
    if (!en[k as keyof typeof en].trim()) fail(`empty en ${k}`);
    if (!es[k as keyof typeof es].trim()) fail(`empty es ${k}`);
    if (params(en[k as keyof typeof en]) !== params(es[k as keyof typeof es])) fail(`placeholders differ in ${k}`);
  }
}
for (const k of Object.keys(es)) if (!(k in en)) fail(`es has extra key ${k}`);
console.log(Object.keys(en).length, 'UI keys in', LANGS.join('+'));

// 2. long content: every English string in src/data has Spanish with the same placeholders
const all = harvest();
let missing = 0;
for (const s of all) {
  const v = ES_CONTENT[s];
  if (!v || !v.trim()) { missing++; if (missing <= 10) fail(`no Spanish for: ${s.slice(0, 60)}`); } else if (params(v) !== params(s)) fail(`placeholders differ: ${s.slice(0, 50)}`);
}
if (missing) fail(`${missing} content strings without Spanish`);
for (const s of Object.keys(ES_CONTENT)) if (!all.includes(s)) fail(`stale Spanish entry (English text changed?): ${s.slice(0, 60)}`);
console.log(all.length, 'content strings, all translated:', missing === 0);

// 3. every t('key') in the source exists; dynamic keys are checked against their value sets
const files: string[] = [];
(function walk(d: string): void { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.ts') && !p.includes(`${path.sep}i18n${path.sep}`)) files.push(p); } })('src');
for (const f of files) {
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/\bt\((['`])([^'`]+)\1/g)) {
    const k = m[2];
    if (!k.includes('${') && !(k in en)) fail(`${f}: unknown key ${k}`);
  }
}
const DYN: Record<string, string[]> = {
  weather: ['CLEAR', 'RAIN', 'SNOW'], 'scheme': ['tilt', 'wheel', 'buttons'], tut: ['tilt', 'wheel', 'buttons'],
  opt: ['OFF', 'LOW', 'NORMAL', 'AGGRESSIVE', 'EXTREME', 'BEGINNER', 'STANDARD', 'PRO', 'ROOKIE', 'STREET', 'LEGEND', 'LIGHT', 'FULL', 'legacy', 'v2', 'low', 'medium', 'high', 'ultra'],
  'hint.assist': ['BEGINNER', 'STANDARD', 'PRO'], 'hint.diff': ['ROOKIE', 'STREET', 'PRO', 'LEGEND'], 'hint.model': ['legacy', 'v2'], 'hint.stab': ['OFF', 'LIGHT', 'FULL'],
  'hint.wphys': ['NORMAL', 'AGGRESSIVE', 'EXTREME'], 'look.slot': ['spoiler', 'splitter', 'skirts', 'hood'], setup: ['finalDrive', 'spring', 'rideHeight', 'brakeBias', 'steer', 'diff', 'pressure', 'downforce'],
  'maps.type': ['circuit', 'sprint', 'drift'], style: ['clean', 'aggressive', 'blocker', 'drifter', 'late-braker'], size: ['S', 'M', 'L'],
};
for (const [p, vals] of Object.entries(DYN)) for (const v of vals) if (!(`${p}.${v}` in en)) fail(`missing dynamic key ${p}.${v}`);

// 4. behaviour: params, language switch, fallback, detection, accents
setLang('en');
if (t('garage.buy', { price: '$5' }) !== 'Buy $5') fail('param fill (en)');
setLang('es');
if (t('garage.buy', { price: '$5' }) !== 'Comprar $5') fail('param fill (es)');
if (getLang() !== 'es') fail('setLang');
if (tx('Not in the table at all') !== 'Not in the table at all') fail('tx falls back to English');
if (tx('Stage 1') !== 'Etapa 1') fail('tx es');
if (fill('a {x} b {y}', { x: 1 }) !== 'a 1 b {y}') fail('unknown placeholder stays visible');
let seen = '';
const off = (await import('../src/i18n')).onLangChange((l) => { seen = l; });
setLang('en');
if (seen !== 'en') fail('listeners fire on switch');
off();
for (const [nav, want] of [['es', 'es'], ['es-MX', 'es'], ['es_AR', 'es'], ['espanol', 'en'], ['en-US', 'en'], ['pt-BR', 'en'], [undefined, 'en'], ['', 'en']] as const) {
  const got = detectLang(nav);
  if (got !== want) fail(`detectLang(${nav}) = ${got}`);
}
const letters = new Set((Object.values(es).join('') + Object.values(ES_CONTENT).join('')).split(''));
for (const ch of 'áéíóúñ¿¡') if (!letters.has(ch)) fail(`Spanish text never uses ${ch}`);

console.log(fails ? `${fails} FAILURES` : 'i18n ok');
process.exit(fails ? 1 : 0);
