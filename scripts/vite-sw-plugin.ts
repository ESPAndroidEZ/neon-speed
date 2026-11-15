import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import type { Plugin } from 'vite';

const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const COMPRESSIBLE = /\.(js|css|html|json|webmanifest|svg|glb|txt)$/;

/**
 * After the build: writes the precache list and a content-hash version into dist/sw.js (so every release
 * replaces the old cache and the page can offer "update"), and with `compress` adds .gz / .br copies of the text
 * and model files for hosts that serve pre-compressed files.
 */
export function swPrecache(opts: { compress: boolean }): Plugin {
  let outDir = 'dist';
  return {
    name: 'rb-sw-precache',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir;
    },
    closeBundle() {
      const files = walk(outDir).filter((f) => !/\.(gz|br)$/.test(f) && !f.endsWith('sw.js'));
      const rel = files.map((f) => relative(outDir, f).split('\\').join('/')).sort();
      const hash = createHash('sha256');
      for (const f of files.sort()) hash.update(readFileSync(f));
      const version = `rb-${hash.digest('hex').slice(0, 10)}`;
      const swPath = join(outDir, 'sw.js');
      const sw = readFileSync(swPath, 'utf8')
        .replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`)
        .replace(/const PRECACHE = \[[^\]]*\];/, `const PRECACHE = ${JSON.stringify(['./', ...rel.filter((r) => r !== 'index.html')])};`);
      writeFileSync(swPath, sw);
      if (!opts.compress) return;
      for (const f of walk(outDir)) {
        if (!COMPRESSIBLE.test(f) || statSync(f).size < 1024) continue;
        const buf = readFileSync(f);
        writeFileSync(`${f}.gz`, gzipSync(buf, { level: 9 }));
        writeFileSync(`${f}.br`, brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }));
      }
    },
  };
}
