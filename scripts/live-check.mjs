// Checks the DEPLOYED site (not localhost): per viewport no console errors, no 4xx/5xx or failed requests (models,
// audio, service worker included), sane MIME types, first-load time and transfer size; then a race start by clicking,
// the language switch, save/load (pause autosave), manifest + icons, HTTPS-only APIs, and an offline reload through the
// service worker. Usage: node scripts/live-check.mjs [--base https://espandroidez.github.io/neon-speed/]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const BASE = arg('--base', 'https://espandroidez.github.io/neon-speed/');
const VIEWS = (process.env.VIEWS ?? '390x844,844x390,1366x768,1920x1080').split(',');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let failed = 0;
const report = (ok, name, info = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? `  (${info})` : ''}`); };
const MIME = { js: /javascript/, css: /css/, html: /html/, json: /json/, webmanifest: /manifest\+json|json/, png: /png/, svg: /svg/, glb: /gltf-binary|octet-stream/, ogg: /ogg|octet/, mp3: /mpeg/, wav: /wav/, wasm: /wasm/, woff2: /woff2|font/ };
const answered = () => localStorage.setItem('rb-controls', JSON.stringify({ v: 1, scheme: 'wheel', chosen: true, seen: ['tilt', 'wheel', 'buttons'] }));
const clickText = (page, re) => page.locator('button, .rb-card', { hasText: re }).first().click({ timeout: 10000 });

async function session(vp, opts = {}) {
  const [width, height] = vp.split('x').map(Number), touch = width < 1000;
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, serviceWorkers: 'allow' });
  await ctx.addInitScript(answered);
  if (opts.lang) await ctx.addInitScript((l) => { if (!localStorage.getItem('racers-blood-save-v1')) localStorage.setItem('racers-blood-save-v1', JSON.stringify({ settings: { lang: l } })); }, opts.lang);
  const page = await ctx.newPage();
  const errors = [], bad = [], mime = [];
  let bytes = 0;
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; });
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  page.on('requestfailed', (r) => { if (!/peerjs|0\.peerjs|stun|turn/.test(r.url())) bad.push(`failed ${r.url().replace(BASE, '')}`); });
  page.on('response', (r) => {
    const u = r.url(); if (!u.startsWith(BASE)) return;
    if (r.status() >= 400) bad.push(`${r.status()} ${u.replace(BASE, '')}`);
    const ext = (u.split('?')[0].match(/\.([a-z0-9]+)$/) ?? [])[1], want = MIME[ext], ct = r.headers()['content-type'] ?? '';
    if (want && r.status() < 300 && !want.test(ct)) mime.push(`${u.replace(BASE, '')} ${ct}`);
  });
  const t0 = Date.now();
  await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  const loadMs = Date.now() - t0;
  return { ctx, page, errors, bad, mime, loadMs, bytes: () => bytes };
}

async function raceStart(page) {
  await page.waitForTimeout(1500);
  await clickText(page, /Press Enter|Pulsa Intro/);
  await clickText(page, /Free Race|Carrera libre/);
  await page.locator('.rb-layer .rb-card, .rb-layer canvas').first().click({ timeout: 10000 });
  await page.waitForTimeout(400);
  await clickText(page, /3 rivals|3 rivales/i).catch(() => undefined); // rivals choice, then the weather
  await page.waitForTimeout(400);
  await clickText(page, /^\s*(Clear|Despejado)/i);
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(500);
    const go = page.locator('button', { hasText: /race|go|start|correr|salir/i }).first();
    if (await go.isVisible().catch(() => false)) await go.click().catch(() => undefined);
    if (await page.locator('.info', { hasText: /LAP|VUELTA/i }).first().isVisible().catch(() => false)) return true;
  }
  return false;
}

for (const vp of VIEWS) {
  const s = await session(vp);
  let raced = false;
  try { raced = await raceStart(s.page); } catch (e) { s.errors.push(String(e).split('\n')[0].slice(0, 120)); }
  await s.page.waitForTimeout(3000);
  if (!raced) { mkdirSync('logs/live', { recursive: true }); await s.page.screenshot({ path: `logs/live/fail-${vp}.png` }).catch(() => undefined); }
  const shown = raced ? '' : (await s.page.locator('button:visible').allInnerTexts().catch(() => [])).slice(0, 8).join(' | ');
  report(raced, `race start ${vp}`, shown);
  report(s.errors.length === 0, `no console errors ${vp}`, s.errors[0] ?? '');
  report(s.bad.length === 0, `no 4xx/failed requests ${vp}`, s.bad.slice(0, 3).join(', '));
  report(s.mime.length === 0, `MIME types ${vp}`, s.mime.slice(0, 3).join(', '));
  console.log(`      first load ${vp}: ${s.loadMs} ms to load event, ${(s.bytes() / 1048576).toFixed(2)} MB transferred incl. the race`);
  if (vp === '1366x768') { // save and load: Esc pauses and autosaves; the slot store must hold it after a reload
    await s.page.keyboard.press('Escape');
    await s.page.waitForTimeout(800);
    const saved = await s.page.evaluate(() => localStorage.getItem('racers-blood-slots')?.length ?? 0);
    await s.page.reload({ waitUntil: 'load' });
    const kept = await s.page.evaluate(() => localStorage.getItem('racers-blood-slots')?.length ?? 0);
    report(saved > 0 && kept === saved, 'pause autosave survives a reload', `${saved} -> ${kept} chars`);
  }
  await s.ctx.close();
}

{ // language: a Spanish save shows the Spanish menu; the ES button switches an English one
  const es = await session('844x390', { lang: 'es' });
  await es.page.waitForTimeout(1500);
  report(await es.page.locator('button', { hasText: 'Pulsa Intro' }).first().isVisible().catch(() => false), 'Spanish menu from the save');
  await es.ctx.close();
  const en = await session('844x390');
  await en.page.waitForTimeout(1500);
  await en.page.locator('button[lang="es"]').first().click({ timeout: 8000 }).catch(() => undefined);
  await en.page.waitForTimeout(600);
  report(await en.page.locator('button', { hasText: 'Pulsa Intro' }).first().isVisible().catch(() => false), 'language switch EN -> ES');
  await en.ctx.close();
}

{ // manifest, icons, HTTPS-only APIs, offline reload through the service worker
  const s = await session('390x844');
  const m = await s.page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]'); if (!link) return { err: 'no manifest link' };
    const r = await fetch(link.href); const j = await r.json();
    const icons = await Promise.all((j.icons ?? []).map(async (i) => { const x = await fetch(new URL(i.src, link.href)); return `${i.sizes}:${x.status}:${x.headers.get('content-type')}`; }));
    return { name: j.name, display: j.display, start: j.start_url, icons, apple: !!document.querySelector('link[rel="apple-touch-icon"]'), secure: isSecureContext, motion: typeof DeviceOrientationEvent !== 'undefined', fs: typeof document.documentElement.requestFullscreen === 'function' };
  });
  report(!m.err && m.icons.length > 0 && m.icons.every((i) => /:200:image\//.test(i)), 'manifest + icons', JSON.stringify(m).slice(0, 220));
  report(m.secure && m.motion && m.fs, 'HTTPS context: DeviceOrientation + Fullscreen APIs present');
  const sw = await s.page.evaluate(async () => { if (!navigator.serviceWorker) return 'none'; const r = await Promise.race([navigator.serviceWorker.ready, new Promise((res) => setTimeout(() => res(null), 15000))]); return r?.active?.state ?? 'not ready'; });
  report(sw === 'activated', 'service worker active', sw);
  await s.page.waitForTimeout(4000); // precache finishes
  await s.ctx.setOffline(true);
  let offline = false;
  try { await s.page.reload({ waitUntil: 'load', timeout: 20000 }); await s.page.waitForTimeout(2500); offline = await s.page.locator('button', { hasText: /Press Enter|Pulsa Intro/ }).first().isVisible(); } catch (e) { s.errors.push(String(e).slice(0, 100)); }
  report(offline, 'offline reload shows the title screen');
  await s.ctx.close();
}
await browser.close();
console.log(failed ? `${failed} FAILED` : 'ALL PASS');
process.exit(failed ? 1 : 0);
