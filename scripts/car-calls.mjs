// Analytical draw-call list of the player car: every visible mesh (geometry groups count separately), by parent path
// and material. No re-render, so it is fast under SwiftShader. Usage: CAR=supra scripts/with-dev.sh 'node scripts/car-calls.mjs'
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 640, height: 360 } });
await p.goto(`${process.env.BASE}?soak&skip&demo&ai=0&w=clear&car=${process.env.CAR ?? 'supra'}`, { waitUntil: 'load' });
await p.waitForTimeout(6000);
const rows = await p.evaluate(() => {
  const sc = window.__rbScene;
  let car = null, best = 0; // the scene child with the most meshes that carries wheels: the player car holder
  for (const c of sc.children) { let n = 0, paint = false; c.traverse((o) => { if (o.isMesh) { n++; if (o.material?.name === 'paint' || o.material?.name === 'body') paint = true; } }); if (paint && n > best && n < 400) { best = n; car = c; } }
  const out = {};
  car?.traverse((o) => {
    let v = true; for (let q = o; q; q = q.parent) if (!q.visible) v = false;
    if (!o.isMesh || !v) return;
    const path = []; for (let q = o.parent; q && q !== car; q = q.parent) path.push(q.name || q.type);
    const key = `${path.reverse().join('/')} :: ${o.material.name || o.material.type}${o.isInstancedMesh ? ' (inst)' : ''}`;
    out[key] = (out[key] ?? 0) + Math.max(1, o.geometry.groups.length);
  });
  return Object.entries(out).sort((a, c) => c[1] - a[1]);
});
console.log('total', rows.reduce((a, r) => a + r[1], 0)); for (const [k, n] of rows) console.log(String(n).padStart(4), k);
await b.close();
