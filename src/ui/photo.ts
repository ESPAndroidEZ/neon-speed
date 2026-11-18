import { button } from './uiKit';
import { t } from '../i18n';

/** What photo mode needs from the engine: the canvas and a way to draw one more frame of the paused scene. */
export interface PhotoSource {
  canvas: HTMLCanvasElement;
  render: () => void;
}

/** File name like neon-speed-20261116-231502.png (local time). */
export function photoName(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `neon-speed-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.png`;
}

function flash(calm: boolean): void {
  if (calm) return;
  const f = document.createElement('div');
  f.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:.7;z-index:99;pointer-events:none;transition:opacity .35s';
  document.body.append(f);
  requestAnimationFrame(() => (f.style.opacity = '0'));
  setTimeout(() => f.remove(), 450);
}

/**
 * Photo mode: hides every UI layer for one frame, draws the scene again and saves the canvas as a PNG download.
 * Returns false when the browser could not make the image. Runs on a button press, never per frame.
 */
export function takePhoto(src: PhotoSource): boolean {
  const hidden: [HTMLElement, string][] = [];
  for (const el of Array.from(document.body.children)) {
    if (!(el instanceof HTMLElement) || el.contains(src.canvas)) continue;
    hidden.push([el, el.style.visibility]);
    el.style.visibility = 'hidden';
  }
  let ok = false;
  try {
    src.render();
    src.canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = photoName(new Date());
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, 'image/png');
    ok = true;
  } catch {
    ok = false;
  }
  for (const [el, v] of hidden) el.style.visibility = v;
  if (ok) flash(document.documentElement.hasAttribute('data-calm'));
  return ok;
}

/** Pause-menu button. */
export function photoButton(src: PhotoSource): HTMLButtonElement {
  const b = button(t('pause.photo'), () => {
    b.textContent = takePhoto(src) ? t('pause.photoSaved') : t('pause.photoFail');
    setTimeout(() => (b.textContent = t('pause.photo')), 1800);
  });
  return b;
}
