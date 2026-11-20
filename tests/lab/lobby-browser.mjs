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
  await a.screenshot({ path: `logs/shots/lobby-empty-${lang}.png` });
  await quick(a).click();
  await a.waitForFunction(() => /\b[A-Z]{4}\b/.test(document.querySelector('.rb-logo')?.textContent ?? ''), null, { timeout: 15000 });
  const code = (await a.locator('.rb-logo').textContent()).trim();
  check('Quick race with no rooms opens a public room', /^[A-Z]{4}$/.test(code), code);
  const t0 = Date.now();
  const b = await open('Bob');
  console.log('B loaded after', Date.now() - t0, 'ms');
  for (let k = 0; k < 8; k++) {
    await b.waitForTimeout(5000);
    console.log('B poll', Date.now() - t0, await b.evaluate(async (u) => {
      const boxes = [...document.querySelectorAll('section.rb-panel')].map((e) => e.style.display || 'shown').join(',');
      const url = performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/net/serverLink.ts'));
      if (!url) return `boxes ${boxes}; module not loaded`;
      const m = await import(url);
      const l = new m.ServerLink(u, (x) => new WebSocket(x));
      const t = performance.now();
      const r = await l.rooms();
      l.close();
      return `boxes ${boxes}; class: ${r.length} rooms, listed ${l.listed}, ${Math.round(performance.now() - t)} ms`;
    }, `ws://127.0.0.1:${port}/ws/`));
  }
  b.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('B console:', m.text().slice(0, 200)); });
  b.on('pageerror', (e) => console.log('B error:', e.message.slice(0, 200)));
  const seen = await b.waitForFunction((c) => document.body.innerText.includes(c), code, { timeout: 90000, polling: 1000 }).then(() => '', async () => (await b.evaluate(() => document.body.innerText)).slice(0, 600));
  if (seen) console.log('B probe:', JSON.stringify(seen.slice(0, 40)), await b.evaluate((u) => new Promise((res) => { const w = new WebSocket(u); const log = []; w.onopen = () => { log.push('open'); w.send(JSON.stringify({ t: 'hi', v: 1 })); }; w.onmessage = (e) => { log.push(String(e.data)); if (log.length > 1) w.send(JSON.stringify({ t: 'list' })); if (log.length > 2) res(log.join(' ')); }; w.onclose = (e) => res(log.join(' ') + ' closed ' + e.code); setTimeout(() => res(log.join(' ') + ' timeout'), 4000); }), `ws://127.0.0.1:${port}/ws/`));
  check("second player sees the room in the list", !seen, code);
  await b.screenshot({ path: `logs/shots/lobby-list-${lang}.png`, timeout: 90000 });
  console.log('B before quick click', Date.now() - t0, 'ms');
  await quick(b).click();
  console.log('B clicked', Date.now() - t0, 'ms');
  await b.waitForFunction(() => document.querySelector('.rb-logo') !== null, null, { timeout: 15000 });
  const joined = (await b.locator('.rb-logo').textContent()).trim();
  check('Quick race joins the open room', joined === code, joined);
  await a.waitForFunction(() => /Bob/.test(document.body.innerText), null, { timeout: 15000 });
  check('host sees the guest by name', true);
  await a.screenshot({ path: `logs/shots/lobby-room-${lang}.png` });
  await a.locator('button', { hasText: lang === 'es' ? /Empezar|Iniciar|Salir/ : 'Start race for everyone' }).first().click();
  const racing = async (p) => p.waitForFunction(() => !document.querySelector('.rb-logo')?.isConnected, null, { timeout: 60000 }).then(() => true, () => false);
  const [ra, rb] = await Promise.all([racing(a), racing(b)]);
  check('host starts: both pages leave the room screen for the race', ra && rb);
  await a.waitForTimeout(6000);
  await b.screenshot({ path: `logs/shots/lobby-race-${lang}.png` });
} finally {
  await browser.close();
  lobby.kill();
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
