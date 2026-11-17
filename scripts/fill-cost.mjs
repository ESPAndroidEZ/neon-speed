// Frame-time cost of each top-level scene child (hide it, measure, show it). Finds fill-rate hogs that draw-call
// counts miss. SwiftShader: relative only. Usage: TIER=low scripts/with-dev.sh 'node scripts/fill-cost.mjs "w=rain&track=kestrel"'
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const c = await b.newContext({ viewport: { width: 844, height: 390 } });
await c.addInitScript((tier) => { try { localStorage.setItem('racers-blood-save-v1', JSON.stringify({ settings: { quality: tier, autoQuality: false, muted: true } })); } catch {} }, process.env.TIER ?? 'low');
const p = await c.newPage();
await p.goto(`${process.env.BASE}?soak&skip&demo&ai=5&${process.argv[2] ?? 'w=rain'}`, { waitUntil: 'load' });
await p.waitForTimeout(8000);
const r = await p.evaluate(async () => {
  const sc = window.__rbScene;
  const frames = (ms) => new Promise((res) => { const t = []; let last = performance.now(); const end = last + ms; const f = (now) => { t.push(now - last); last = now; if (now < end) requestAnimationFrame(f); else res(t.slice(2).reduce((a, x) => a + x, 0) / Math.max(1, t.length - 2)); }; requestAnimationFrame(f); });
  const base = await frames(3000), out = [];
  for (const o of sc.children) {
    if (!o.visible) continue;
    let n = 0; o.traverse((q) => { if (q.isMesh || q.isPoints || q.isLine) n++; });
    if (!n && !o.isLight) continue;
    o.visible = false; const t = await frames(2000); o.visible = true;
    out.push([+(base - t).toFixed(1), `${o.name || o.type}(${o.children.length}) meshes=${n} ${o.isMesh ? (o.material?.type ?? '') : ''}`]);
  }
  return { base: +base.toFixed(1), out: out.sort((a, x) => x[0] - a[0]) };
});
console.log('base frame ms', r.base); for (const [d, n] of r.out.slice(0, 15)) console.log(String(d).padStart(6), n);
await b.close();
