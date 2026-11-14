// Screenshots of every car from 3 angles on the garage stage into logs/cars/. Needs the dev server.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = 'http://localhost:5173/';
mkdirSync('logs/cars', { recursive: true });
const cars = process.argv.slice(2).length ? process.argv.slice(2) : ['civic', '350z', 'rx7', 'evo', 'supra'];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const car of cars) for (const angle of ['front', 'side', 'rear']) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}?showcar=${car}&angle=${angle}`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `logs/cars/${car}-${angle}.png` });
  if (errs.length) console.log('ERROR', car, angle, errs[0]);
  await page.close();
}
await browser.close();
console.log('done');
