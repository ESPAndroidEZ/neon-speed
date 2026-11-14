// Screenshots of each map from the chase camera (grid, then driving with the demo pilot) plus the map select screen.
// Needs the dev server. Usage: node scripts/map-shots.mjs [trackId ...]   Output: logs/maps/<id>-<shot>.png
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5173/';
mkdirSync('logs/maps', { recursive: true });
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['kestrel', 'neon', 'maze', 'cliff', 'maze-drift'];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
let bad = 0;
const shoot = async (name, q, wait) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(BASE + q, { waitUntil: 'load' });
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `logs/maps/${name}.png` });
  await page.close();
  if (errors.length) { bad++; console.log('ERRORS', name, errors.slice(0, 3)); } else console.log('ok', name);
};
for (const id of ids) {
  await shoot(`${id}-grid`, `?skip&track=${id}&car=supra&ai=0&w=clear&ff=1`, 3500);
  await shoot(`${id}-drive`, `?skip&demo&track=${id}&car=supra&ai=0&w=clear&at=25&ff=8`, 2500);
}
await shoot('select', '?screen=maps', 2500);
await browser.close();
process.exit(bad ? 1 : 0);
