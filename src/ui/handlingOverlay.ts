import type { CarController } from '../physics/carController';
import { HANDLING } from '../physics/assists';

/*
 * Handling debug overlay (plan section 7), toggled with F4: per-axle load (N), slip angle (deg), grip usage (0..1),
 * drive split, active assist level. Builds its element on first show; while hidden it costs one boolean check per frame
 * (the text is rebuilt only when visible, ~10 times a second: debug only).
 */
let el: HTMLDivElement | null = null;
let shown = false;
let wired = false;
let tick = 0;

const DEG = 180 / Math.PI;
const f0 = (n: number): string => n.toFixed(0).padStart(6);
const f2 = (n: number): string => n.toFixed(2).padStart(6);

function wire(): void {
  wired = true;
  if (typeof window === 'undefined') return;
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'F4') return;
    e.preventDefault();
    shown = !shown;
    if (shown && !el) {
      el = document.createElement('div');
      el.style.cssText = 'position:fixed;left:12px;top:120px;z-index:50;padding:8px 10px;background:rgba(5,8,16,.78);color:#9ff;font:12px/1.35 monospace;white-space:pre;pointer-events:none;border:1px solid rgba(120,220,255,.35)';
      document.body.append(el);
    }
    if (el) el.style.display = shown ? 'block' : 'none';
  });
}

export const handlingOverlay = {
  update(car: CarController): void {
    if (!wired) wire();
    if (!shown || !el || ++tick % 6 !== 0) return;
    const p = car.v2;
    if (HANDLING.model !== 'v2') {
      el.textContent = `HANDLING legacy (v1)   F4 hides\nload F/R ${f0(car.load.fzF)} ${f0(car.load.fzR)} N\nslip ${f2(car.state.slipAngle * DEG)} deg`;
      return;
    }
    el.textContent =
      `HANDLING v2   stability ${car.stability}   F4 hides\n` +
      `            front   rear\n` +
      `load N    ${f0(p.fzF)} ${f0(p.fzR)}\n` +
      `slip deg  ${f2(p.alphaF * DEG)} ${f2(p.alphaR * DEG)}\n` +
      `grip use  ${f2(p.useF)} ${f2(p.useR)}${p.lockedF ? '  F LOCK' : ''}${p.lockedR ? '  R LOCK' : ''}${p.spin ? '  SPIN' : ''}\n` +
      `drive split F ${(p.split * 100).toFixed(0)} %   steer ${(p.delta * DEG).toFixed(1)} deg\n` +
      `assist active ${(p.assist * 100).toFixed(0)} %   body slip ${(car.state.slipAngle * DEG).toFixed(1)} deg`;
  },
};
