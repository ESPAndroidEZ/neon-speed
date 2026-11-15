// Chase framing per screen shape: the horizontal view never collapses in portrait, never passes the fisheye cap on
// 32:9, 16:9 is untouched, and portrait pulls the camera back and up. Pure maths (camera/aspectFrame).
import { framing, horizontalFov, REF_ASPECT } from '../src/camera/aspectFrame.ts';

let failed = 0;
const check = (n: string, ok: boolean, i = ''): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${i ? `  (${i})` : ''}`);
};
const SHAPES: [string, number][] = [['9:16', 360 / 640], ['390x844', 390 / 844], ['3:4', 768 / 1024], ['4:3', 1024 / 768], ['16:9', 16 / 9], ['19.5:9', 844 / 390], ['21:9', 2560 / 1080], ['32:9', 32 / 9]];
const ref = horizontalFov(60, REF_ASPECT);
for (const fov of [60, 85]) {
  for (const [name, a] of SHAPES) {
    const f = framing(a, fov);
    const h = horizontalFov(f.fov, a);
    const ok = Number.isFinite(f.fov) && f.fov > 20 && f.fov <= 96.0001 && h <= Math.max(112.0001, horizontalFov(fov, REF_ASPECT) + 0.01) && (a >= 1 || h >= 50);
    check(`${name} at tuned ${fov}: vfov ${f.fov.toFixed(1)}, hfov ${h.toFixed(1)}`, ok, `dist x${f.dist.toFixed(2)} height x${f.height.toFixed(2)}`);
  }
}
check('16:9 unchanged', framing(REF_ASPECT, 60).fov === 60 && framing(REF_ASPECT, 60).dist === 1);
check('portrait keeps at least 60 % of the 16:9 width', horizontalFov(framing(0.5625, 60).fov, 0.5625) >= 0.6 * ref, `${horizontalFov(framing(0.5625, 60).fov, 0.5625).toFixed(1)} vs ${ref.toFixed(1)}`);
check('portrait pulls back and up', framing(0.5625, 60).dist > 1.15 && framing(0.5625, 60).height > 1.3);
check('bad aspect is safe', Number.isFinite(framing(NaN, 60).fov) && Number.isFinite(framing(0, 60).fov) && Number.isFinite(framing(Infinity, 60).fov));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
