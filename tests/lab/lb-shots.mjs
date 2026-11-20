// Screenshots of the online boards in the dev page with a FAKE scores API (Playwright routes; no server touched):
// the map screen fills its "Online top 3" lines, and the results line after a submit through the real client code.
// Needs `npm run dev` (BASE, default http://localhost:5173). Writes logs/shots/lb-*.png. Usage: node tests/lab/lb-shots.mjs [es]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const lang = process.argv[2] === 'es' ? 'es' : 'en';
mkdirSync('logs/shots', { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let posted = 0, failed = 0;
const check = (n, ok, info = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${info ? `  (${info})` : ''}`); };
await page.route('**/api/storage.php*', (r) => r.fulfill({ json: { keys: {}, now: Math.floor(Date.now() / 1000) } }));
await page.route('**/api/scores.php*', (r) => {
  if (r.request().method() === 'POST') { posted++; return r.fulfill({ json: { ok: true, improved: true, rank: 3, of: 41, mine: 58420 } }); }
  const u = new URL(r.request().url());
  const boards = {};
  for (const k of (u.searchParams.get('boards') ?? '').split(',')) {
    boards[k] = k.startsWith('neon') ? { top: [], of: 0 } : { top: [{ name: 'Nia', ms: 56120, car: 'evo' }, { name: '<b>x</b>', ms: 57002, car: 'supra' }, { name: 'Bo', ms: 58420, car: 'civic' }], of: 41 };
  }
  return r.fulfill({ json: { boards } });
});
await page.addInitScript((l) => { try { const s = JSON.parse(localStorage.getItem('racers-blood-save-v1') ?? 'null'); if (!s) localStorage.setItem('rb-lang', l); } catch { /* */ } }, lang);
await page.goto(`${BASE}/?screen=maps&lang=${lang}`, { waitUntil: 'load', timeout: 90000 });
await page.waitForFunction(() => document.querySelectorAll('[data-lb]').length > 0 && [...document.querySelectorAll('[data-lb]')].every((e) => e.textContent), null, { timeout: 30000 }).catch(() => {});
const tops = await page.$$eval('[data-lb]', (els) => els.map((e) => e.textContent));
check('map cards show the online top 3', tops.length >= 5 && tops.some((x) => x.includes('Nia')), `${tops.length} cards`);
check('an empty board invites the first time', tops.some((x) => !x.includes('Nia') && x.length > 5));
check('names are text, not HTML', tops.some((x) => x.includes('<b>x</b>')));
await page.screenshot({ path: `logs/shots/lb-maps-${lang}.png` });
await page.goto(`${BASE}/?skip&track=kestrel&results&lang=${lang}`, { waitUntil: 'load', timeout: 90000 });
await page.waitForSelector('#rs-lb', { state: 'attached', timeout: 90000 });
const line = await page.evaluate(async () => {
  const url = performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/game/leaderboardHook.ts'));
  const m = await import(url);
  const res = await m.leaderboard().submit({ board: 'kestrel:CLEAR:0', ms: 58420, car: 'civic', f: [0, 0, 0, 0] });
  const el = document.getElementById('rs-lb');
  el.textContent = m.boardLine(res);
  return el.textContent;
});
check('results line after a submit', posted === 1 && /41/.test(line), line);
await page.waitForTimeout(2200); // the results fade in
await page.screenshot({ path: `logs/shots/lb-results-${lang}.png` });
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
