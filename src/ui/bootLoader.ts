import { CARS } from '../data/cars';
import { modelStatus, statusListeners } from '../world/carFactory';

/**
 * The loading screen from index.html (#boot): the bar shows the car models arriving (GLBs load in the background,
 * procedural cars stand in until then) and the screen fades once they have all settled, or after 3 s at most so a
 * slow connection never blocks the menu.
 */
export function runBootLoader(): void {
  const boot = document.getElementById('boot');
  const bar = boot?.querySelector<HTMLElement>('i');
  if (!boot) return;
  let done = false;
  const finish = (): void => {
    if (done) return;
    done = true;
    statusListeners.delete(update);
    boot.style.opacity = '0';
    window.setTimeout(() => boot.remove(), 400);
  };
  function update(): void {
    const settled = CARS.filter((c) => modelStatus(c.id) !== 'loading').length;
    const p = 0.35 + 0.65 * (settled / Math.max(1, CARS.length)); // the code itself is the first 35 %
    if (bar) bar.style.width = `${Math.round(p * 100)}%`;
    if (settled === CARS.length) window.setTimeout(finish, 150);
  }
  statusListeners.add(update);
  update();
  window.setTimeout(finish, 3000);
}
