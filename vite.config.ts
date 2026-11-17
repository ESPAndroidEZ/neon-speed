import { existsSync, readdirSync } from 'node:fs';
import { defineConfig } from 'vite';
import { brandSafe } from './scripts/vite-brand-plugin';
import { swPrecache } from './scripts/vite-sw-plugin';

/**
 * `npm run build` = verification build; `npm run build:prod` = release build (mode production, pre-compressed
 * .gz/.br copies, asset budget report). Both are minified with hashed file names and no source maps; dev panels and
 * dev URL flags are only reachable behind import.meta.env.DEV, so they are not in the bundle.
 */
/** GLBs that ship (core/modelList): the release only requests these, so optional models never 404. */
const glbs = (dir: string, pre = ''): string[] => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.glb')).map((f) => pre + f) : []);

export default defineConfig(({ mode, command }) => ({
  define: { __RB_MODELS__: command === 'serve' ? 'null' : JSON.stringify([...glbs('public/models'), ...glbs('public/models/props', 'props/')]) },
  // Relative asset URLs: required when the build is served from Capacitor's local scheme on iOS and from a
  // GitHub Pages sub-path (/neon-speed/).
  base: './',
  // host: true exposes the dev server on the LAN so a real phone can load it.
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    assetsInlineLimit: 2048,
    rolldownOptions: {
      output: {
        // three.js in its own long-cached chunk; game code changes do not re-download it
        codeSplitting: { groups: [{ name: 'three', test: /node_modules[\\/]three/ }] },
      },
    },
  },
  plugins: [brandSafe(process.env.VITE_PUBLIC_BUILD === '1'), swPrecache({ compress: mode === 'production' && process.env.RB_RELEASE === '1' })],
}));
