// Code-health gate, run by `npm run build` after the line check. Cheap regex rules for the project's hard rules.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src', import.meta.url));
const rules = [
  [/\benum\s+\w+/, 'no enum (use a union type)'],
  [/\bnamespace\s+\w+\s*\{/, 'no namespace'],
  [/constructor\s*\((?:[^)]*,)?\s*(private|public|protected|readonly)\s+\w+\s*[?:]/, 'no constructor parameter properties'],
  [/:\s*any\b|\bas any\b|<any>/, 'no any'],
  [/\bdebugger\b/, 'no debugger statements'],
  [/@ts-ignore|@ts-nocheck/, 'no ts-ignore'],
];
const SKIP_CONSOLE = /[\\/]dev[\\/]/;
function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.ts$/.test(name)) yield p;
  }
}
let bad = 0;
for (const f of walk(root)) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, '').replace(/'[^']*'|"[^"]*"|`[^`]*`/g, "''");
    for (const [re, msg] of rules) if (re.test(code)) { console.error(`HEALTH ${relative(root, f)}:${i + 1}: ${msg}`); bad++; }
    if (!SKIP_CONSOLE.test(f) && /\bconsole\.(log|debug)\b/.test(code)) { console.error(`HEALTH ${relative(root, f)}:${i + 1}: no console.log outside src/dev`); bad++; }
  });
}
if (bad) { console.error(`${bad} code-health problem(s)`); process.exit(1); }
console.log('health check ok');
