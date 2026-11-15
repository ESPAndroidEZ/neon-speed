/** Dev-only FPS + frame-work readout, toggled with F3 (off at start so screenshots stay clean). */
export function installFpsCounter(onFrame: (fn: (a: number, dt: number) => void) => void, workMs: () => number): void {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:50%;bottom:4px;transform:translateX(-50%);z-index:9000;font:700 12px monospace;color:#7dff9a;background:#000a;padding:2px 6px;border-radius:4px;pointer-events:none;display:none';
  document.body.append(el);
  let acc = 0, n = 0;
  window.addEventListener('keydown', (e) => {
    if (e.code === 'F3') {
      e.preventDefault();
      el.style.display = el.style.display === 'none' ? '' : 'none';
    }
  });
  onFrame((_a, dt) => {
    acc += dt;
    n++;
    if (acc < 0.5) return;
    if (el.style.display !== 'none') el.textContent = `${Math.round(n / acc)} fps  ${workMs().toFixed(1)} ms work`;
    acc = 0;
    n = 0;
  });
}
