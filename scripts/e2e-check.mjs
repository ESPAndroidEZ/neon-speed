// End-to-end checks in Playwright (needs `npm run dev` for 1-3; builds and previews dist/ itself for 4):
// 1. menu to race by clicking (title, Free Race, first map, CLEAR) at every viewport of viewport-check;
// 2. full-screen button state with a mocked Fullscreen API (enter, Esc from the browser, exit);
// 3. settings persistence (phone control scheme survives a reload);
// 4. offline start: first visit installs the service worker, then the game starts with the network off;
// 5. bundle-size report (scripts/asset-report.mjs) and the headless tilt / full-screen tests.
// Usage: node scripts/e2e-check.mjs [--base URL] [--only menu,fullscreen,settings,offline]
import { chromium } from 'playwright';
import { execSync, spawn } from 'node:child_process';
import { VIEWPORTS } from './viewport-check-list.mjs';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const BASE = arg('--base', 'http://localhost:5173/');
const ONLY = arg('--only', 'menu,fullscreen,settings,offline,report').split(',');
const GL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'];
const browser = await chromium.launch({ args: GL });
let failed = 0;
const report = (ok, name, info = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? `  (${info})` : ''}`);
};
const answered = () => localStorage.setItem('rb-controls', JSON.stringify({ v: 1, scheme: 'wheel', chosen: true, seen: ['tilt', 'wheel', 'buttons'] }));
const clickText = async (page, text) => page.locator('button, .rb-card', { hasText: text }).first().click({ timeout: 8000 });

if (ONLY.includes('menu')) {
  const queue = [...VIEWPORTS];
  await Promise.all([0, 1, 2].map(async () => {
    while (queue.length) {
      const vp = queue.shift();
      const [width, height] = vp.split('x').map(Number);
      const touch = width <= 1024 && height <= 1024;
      const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch && width < 1000 });
      await ctx.addInitScript(answered);
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e).slice(0, 100)));
      let state = 'none';
      try {
        await page.goto(`${BASE}?probe`, { waitUntil: 'load' });
        await page.waitForTimeout(1500);
        await clickText(page, 'Press Enter');
        await clickText(page, 'Free Race');
        await page.locator('.rb-layer .rb-card, .rb-layer canvas').first().click({ timeout: 8000 });
        await page.waitForTimeout(400);
        await clickText(page, 'CLEAR');
        for (let i = 0; i < 40 && !['RACING', 'CINEMATIC'].includes(state); i++) {
          await page.waitForTimeout(500);
          const go = page.locator('button', { hasText: /race|go|start/i }).first(); // versus / intro gates
          if (await go.isVisible().catch(() => false)) await go.click().catch(() => undefined);
          state = (await page.evaluate(() => window.__rbProbe?.()?.state).catch(() => null)) ?? state;
        }
      } catch (e) {
        errors.push(String(e).split('\n')[0].slice(0, 100));
      }
      report(['RACING', 'CINEMATIC'].includes(state) && errors.length === 0, `menu to race ${vp}`, `${state}${errors.length ? ' ' + errors[0] : ''}`);
      await ctx.close();
    }
  }));
}

if (ONLY.includes('fullscreen')) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(answered);
  await ctx.addInitScript(() => { // mocked Fullscreen API: the real one needs a visible window
    let el = null;
    Object.defineProperty(document, 'fullscreenElement', { get: () => el, configurable: true });
    Object.defineProperty(document, 'fullscreenEnabled', { get: () => true, configurable: true });
    const fire = () => document.dispatchEvent(new Event('fullscreenchange'));
    Element.prototype.requestFullscreen = function () { el = this; setTimeout(fire, 0); return Promise.resolve(); };
    document.exitFullscreen = () => { el = null; setTimeout(fire, 0); return Promise.resolve(); };
    window.__browserEsc = () => { el = null; fire(); };
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}?skip&ai=0&ff=1`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const btn = page.locator('#hud .rb-fs');
  const st = () => btn.getAttribute('data-state');
  report((await st()) === 'off', 'fullscreen: HUD button starts "enter"');
  await btn.click();
  await page.waitForTimeout(100);
  report((await st()) === 'on' && (await btn.getAttribute('aria-label')) === 'Exit full screen', 'fullscreen: click enters, icon/label switch to exit');
  await page.evaluate(() => window.__browserEsc());
  await page.waitForTimeout(50);
  report((await st()) === 'off', 'fullscreen: Esc from the browser flips the button back');
  report((await page.evaluate(() => localStorage.getItem('rb-fullscreen'))) === '1', 'fullscreen: choice remembered');
  await btn.click();
  await page.waitForTimeout(50);
  await btn.click();
  await page.waitForTimeout(100);
  report((await st()) === 'off' && (await page.evaluate(() => localStorage.getItem('rb-fullscreen'))) === '0', 'fullscreen: exit via the button, choice off');
  await page.keyboard.press('Escape'); // pause menu has the button too
  await page.waitForTimeout(300);
  report(await page.locator('.rb-layer .rb-fs').isVisible(), 'fullscreen: button in the pause menu');
  await ctx.close();
}

if (ONLY.includes('settings')) {
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('rb-controls', JSON.stringify({ v: 1, scheme: 'wheel', chosen: true })); } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}?screen=settings`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.locator('button', { hasText: 'Buttons (left/right)' }).first().click();
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rb-controls') || '{}').scheme);
  const hot = await page.locator('button.hot', { hasText: 'Buttons (left/right)' }).count();
  report(saved === 'buttons' && hot === 1, 'settings: control scheme persists across a reload', `saved ${saved}`);
  await ctx.close();
}

if (ONLY.includes('offline')) {
  execSync('npx vite build', { stdio: 'ignore' });
  const srv = spawn('npx', ['vite', 'preview', '--port', '4179', '--strictPort'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  try {
    await page.goto('http://localhost:4179/', { waitUntil: 'load' });
    await page.waitForFunction(() => navigator.serviceWorker?.controller || navigator.serviceWorker?.ready.then(() => true), null, { timeout: 15000 });
    await page.waitForTimeout(2500); // precache finishes
    await ctx.setOffline(true);
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(2500);
    const title = await page.locator('h1.rb-title').first().textContent().catch(() => null);
    report(title?.includes('RACER') === true, 'offline: the game starts with the network off (service worker)', String(title));
  } catch (e) {
    report(false, 'offline start', String(e).split('\n')[0]);
  }
  await ctx.close();
  srv.kill();
}
await browser.close();

if (ONLY.includes('report')) {
  console.log(execSync('node scripts/asset-report.mjs').toString().trim());
  for (const t of ['tilt-check', 'fullscreen-check', 'aspect-check', 'brand-check']) {
    try {
      execSync(`npx tsx tests/${t}.mts`, { stdio: 'ignore' });
      report(true, `tests/${t}`);
    } catch {
      report(false, `tests/${t}`);
    }
  }
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
