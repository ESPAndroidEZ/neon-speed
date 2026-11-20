// Two browser pages race through the OWN lobby server, started locally (server/lobby/lobby.py): page A presses
// Quick race (opens a public room), page B sees it in "Open rooms" and joins with Quick race, A starts, both race.
// Needs `npm run dev` (BASE, default http://localhost:5173). Screenshots logs/shots/lobby-*.png. Usage: node tests/lab/lobby-browser.mjs [es]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const lang = process.argv[2] === 'es' ? 'es' : 'en';
const port = 20000 + Math.floor(Math.random() * 20000);
mkdirSync('logs/shots', { recursive: true });
const lobby = spawn('python3', ['server/lobby/lobby.py', '--port', String(port)], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((r) => lobby.stdout.once('data', r));
let failed = 0;
const check = (n, ok, info = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${info ? `  (${info})` : ''}`); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const open = async (name) => {
  const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await p.addInitScript(([u, n, l]) => { localStorage.setItem('ns-lobby-url', u); localStorage.setItem('ns-online-name', n); localStorage.setItem('rb-lang', l); }, [`ws://127.0.0.1:${port}/ws/`, name, lang]);
  await p.route('**/api/*.php*', (r) => r.fulfill({ json: { keys: {}, now: Math.floor(Date.now() / 1000) } }));
  await p.goto(`${BASE}/?screen=online&lang=${lang}`, { waitUntil: 'load', timeout: 90000 });
  return p;
};
const quick = (p) => p.locator('button', { hasText: lang === 'es' ? 'Carrera rápida' : 'Quick race' });
try {
  const a = await open('Alice');
  await quick(a).waitFor({ timeout: 30000 });
  check('online screen shows the open-rooms panel when the server answers', await quick(a).isVisible());
  await a.waitForTimeout(2500); // menus fade in
  await a.screenshot({ path: `logs/shots/lobby-empty-${lang}.png`, timeout: 90000 });
  await quick(a).click();
  await a.waitForFunction(() => /\b[A-Z]{4}\b/.test(document.querySelector('.rb-logo')?.textContent ?? ''), null, { timeout: 15000 });
  const code = (await a.locator('.rb-logo').textContent()).trim();
  check('Quick race with no rooms opens a public room', /^[A-Z]{4}$/.test(code), code);
  const t0 = Date.now();
  const b = await open('Bob');
  // the page may freeze for tens of seconds while two software-rendered games compile shaders on one CPU (lab only):
  // the list retries, so allow up to 3 minutes
  const seen = await b.waitForFunction((c) => document.body.innerText.includes(c), code, { timeout: 180000, polling: 2000 }).then(() => true, () => false);
  check('second player sees the room in the list', seen, `${code} after ${Math.round((Date.now() - t0) / 1000)} s`);
  const sc = await b.evaluate(() => { const r = document.querySelector('section.rb-panel')?.closest('.rb-layer'); return r ? { auto: getComputedStyle(r).overflowY, fits: r.scrollHeight <= r.clientHeight } : null; });
  check('a long online screen scrolls instead of cutting off', !!sc && (sc.fits || sc.auto === 'auto' || sc.auto === 'scroll'), JSON.stringify(sc));
  const row = await b.evaluate(() => { const b = [...document.querySelectorAll('section.rb-panel .rb-row')].find((r) => /^[A-Z]{4}/.test(r.textContent ?? '')); return b ? Math.round(b.getBoundingClientRect().height) : -1; });
  check('room row stays compact (one or two lines)', row > 0 && row < 70, `${row} px`);
  await b.waitForTimeout(2500);
  await b.screenshot({ path: `logs/shots/lobby-list-${lang}.png`, timeout: 90000 });
  await quick(b).click();
  await b.waitForFunction(() => document.querySelector('.rb-logo') !== null, null, { timeout: 15000 });
  const joined = (await b.locator('.rb-logo').textContent()).trim();
  check('Quick race joins the open room', joined === code, joined);
  await a.waitForFunction(() => /Bob/.test(document.body.innerText), null, { timeout: 15000 });
  check('host sees the guest by name', true);
  await a.waitForTimeout(2500);
  await a.screenshot({ path: `logs/shots/lobby-room-${lang}.png`, timeout: 90000 });
  await a.locator('button', { hasText: lang === 'es' ? /Empezar|Iniciar|Salir/ : 'Start race for everyone' }).first().click();
  const racing = async (p) => p.waitForFunction(() => !document.querySelector('.rb-logo')?.isConnected, null, { timeout: 60000 }).then(() => true, () => false);
  const [ra, rb] = await Promise.all([racing(a), racing(b)]);
  check('host starts: both pages leave the room screen for the race', ra && rb);
  await a.waitForTimeout(6000);
  await b.screenshot({ path: `logs/shots/lobby-race-${lang}.png`, timeout: 90000 });
} finally {
  await browser.close();
  lobby.kill();
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
