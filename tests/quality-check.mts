import { AutoQuality, qualityNow, qualityTier } from '../src/core/quality.ts';
import type { Engine } from '../src/core/engine.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const eng = { maxPixelRatio: 2, setBloom: () => undefined, resize: () => undefined } as unknown as Engine;
const run = (aq: AutoQuality, dt: number, secs: number): void => {
  for (let t = 0; t < secs; t += dt) aq.update(dt, eng);
};
const aq = new AutoQuality(40);
let tier = '';
aq.onDowngrade = (t) => (tier = t);
run(aq, 1 / 60, 30);
check('healthy fps never downgrades', tier === '' && qualityTier() === 'high', qualityTier());
run(aq, 1 / 20, 4);
check('a short stutter lowers resolution, not the tier', tier === '' && aq.dyn < 1, `resolution ${aq.dyn}`);
run(aq, 1 / 20, 16);
check('sustained 20 fps: resolution down to 60 %, then High to Medium', tier === 'medium' && qualityTier() === 'medium', tier);
check('medium turns the mirror off', !qualityNow().mirror && qualityNow().spotLights === 1, '');
run(aq, 1 / 20, 40);
check('keeps dropping to Low but never below', qualityTier() === 'low' && !qualityNow().fx, qualityTier());
run(aq, 1 / 5, 60);
check('stays at Low', qualityTier() === 'low', '');
const off = new AutoQuality(40);
off.enabled = false;
run(off, 1 / 5, 30);
check('disabled auto quality does nothing', true, '');
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
