// Draw-call breakdown of the live scene by subtree (hides each subtree, re-renders, counts). Needs the dev server.
// Usage: node scripts/drawcalls.mjs "skip&demo&ai=5&w=rain"
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const c = await b.newContext({ viewport: { width: 844, height: 390 } }); await c.addInitScript((tier) => { try { localStorage.setItem('racers-blood-save-v1', JSON.stringify({ settings: { quality: tier, autoQuality: false, muted: true } })); } catch {} }, process.env.TIER ?? 'high'); const p = await c.newPage();
await p.goto(`${process.env.BASE ?? 'http://localhost:5173/'}?soak&${process.argv[2]}`, { waitUntil: 'load' });
await p.waitForTimeout(9000);
const r = await p.evaluate(() => {
  const ren = window.__rbRenderer, sc = window.__rbScene, info = ren.info;
  let cam = null; sc.traverse(() => {}); 
  const cams = []; // grab the game camera by rendering once through a hook
  const orig = ren.render; ren.render = function (s, c) { if (s.isScene && !cam) cam = c; return orig.call(this, s, c); };
  return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => {
    ren.render = orig; const rt = ren.getRenderTarget();
    const calls = () => { info.autoReset = false; info.reset(); orig.call(ren, sc, cam); const c = info.render.calls; info.autoReset = true; return c; };
    const total = calls(); const rows = [];
    const label = (o) => (o.name || o.type) + (o.isMesh && o.material ? ':' + (o.material.name || o.material.type) + (o.geometry?.groups?.length ? '/g' + o.geometry.groups.length : '') : '') + (o.children.length ? `(${o.children.length})` : '');
    const visit = (list, depth) => { for (const o of list) { if (!o.visible) continue; o.visible = false; const d = total - calls(); o.visible = true; if (d >= Number(process.env.MIN ?? 20)) { rows.push([d, '  '.repeat(depth) + label(o)]); if (depth < Number(process.env.DEPTH ?? 2) && o.children.length) visit(o.children, depth + 1); } } };
    visit(sc.children, 0); res({ total, rows });
  })));
});
console.log('total', r.total); for (const [d, n] of r.rows) console.log(String(d).padStart(5), n);
await b.close();
