// Enforces the project rule: every TypeScript file must be strictly under 220 lines.
// Runs as the first step of `npm run build`, so Claude and Qwen both hit the same wall.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const LIMIT = 220;
const WARN_AT = 200;
const root = fileURLToPath(new URL('../src', import.meta.url));

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.tsx?$/.test(name)) yield path;
  }
}

let failed = false;
for (const file of walk(root)) {
  const lines = readFileSync(file, 'utf8').replace(/\n$/, '').split('\n').length;
  const rel = relative(process.cwd(), file);
  if (lines >= LIMIT) {
    console.error(`FAIL ${rel}: ${lines} lines (must be < ${LIMIT}). Split it into modules.`);
    failed = true;
  } else if (lines >= WARN_AT) {
    console.warn(`warn ${rel}: ${lines} lines (limit ${LIMIT})`);
  }
}

if (failed) process.exit(1);
console.log(`line check ok: every src file is under ${LIMIT} lines`);
