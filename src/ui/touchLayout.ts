/** Phone button layout: where the player put each button (centre as a fraction of the screen), per scheme. */
export type Layout = Record<string, { x: number; y: number }>;
export type LayoutPreset = 'default' | 'hb-right' | 'both-right';

const IDS = ['gas', 'brake', 'nitro', 'hb', 'pause', 'reset', 'arrowL', 'arrowR', 'shiftUp', 'shiftDown'];
const SCHEMES = ['tilt', 'wheel', 'buttons'];
const clamp01 = (n: number): number => Math.min(0.97, Math.max(0.03, n));

/** Keep only known `scheme:button` keys with finite coordinates (stored data is untrusted). */
export function sanitizeLayout(raw: unknown): Layout {
  const out: Layout = {};
  if (typeof raw !== 'object' || raw === null) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const [scheme, id] = k.split(':');
    const p = v as { x?: unknown; y?: unknown } | null;
    if (SCHEMES.includes(scheme) && IDS.includes(id) && p && typeof p.x === 'number' && typeof p.y === 'number' && Number.isFinite(p.x + p.y)) out[k] = { x: clamp01(p.x), y: clamp01(p.y) };
  }
  return out;
}

export const sanitizeScale = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1.4, Math.max(0.8, v)) : 1);

/** Move buttons that have a saved spot and scale all of them (individual CSS `translate` / `scale`, so the press effect still works). */
export function applyLayout(layer: HTMLElement, scheme: string, layout: Layout, scale: number): void {
  layer.querySelectorAll<HTMLElement>('.b').forEach((el) => {
    el.style.scale = scale === 1 ? '' : String(scale);
    const p = layout[`${scheme}:${el.dataset.id}`];
    if (!p) return;
    el.style.left = `${p.x * 100}%`;
    el.style.top = `${p.y * 100}%`;
    el.style.right = el.style.bottom = 'auto';
    el.style.translate = '-50% -50%';
  });
}

/** Edit mode: dragging a button moves it (the normal press handlers never see the touch). Returns the cleanup. */
export function enableDrag(root: HTMLElement, scheme: () => string, layout: Layout, onChange: () => void): () => void {
  let drag: { el: HTMLElement; id: number } | null = null;
  const down = (e: PointerEvent): void => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.b');
    if (!el || drag) return;
    e.stopPropagation();
    e.preventDefault();
    drag = { el, id: e.pointerId };
    el.classList.add('on');
  };
  const move = (e: PointerEvent): void => {
    if (!drag || e.pointerId !== drag.id) return;
    e.stopPropagation();
    const p = { x: clamp01(e.clientX / innerWidth), y: clamp01(e.clientY / innerHeight) };
    layout[`${scheme()}:${drag.el.dataset.id}`] = p;
    applyLayout(drag.el.parentElement as HTMLElement, scheme(), layout, Number(drag.el.style.scale) || 1);
  };
  const up = (e: PointerEvent): void => {
    if (!drag || e.pointerId !== drag.id) return;
    e.stopPropagation();
    drag.el.classList.remove('on');
    drag = null;
    onChange();
  };
  const opts = { capture: true } as const;
  root.addEventListener('pointerdown', down, opts);
  root.addEventListener('pointermove', move, opts);
  root.addEventListener('pointerup', up, opts);
  root.addEventListener('pointercancel', up, opts);
  return () => {
    root.removeEventListener('pointerdown', down, opts);
    root.removeEventListener('pointermove', move, opts);
    root.removeEventListener('pointerup', up, opts);
    root.removeEventListener('pointercancel', up, opts);
  };
}

/**
 * Ready-made spots measured from the live pedals (so it fits any screen): the handbrake above the pedals on the right,
 * so a thumb can lift off the gas and pull it in one move; "both-right" also puts the nitro there.
 */
export function presetLayout(name: LayoutPreset, layer: HTMLElement, scheme: string, current: Layout): Layout {
  const out: Layout = {};
  for (const [k, v] of Object.entries(current)) if (!k.startsWith(`${scheme}:`) || !['hb', 'nitro'].includes(k.split(':')[1])) out[k] = v; // keep the other buttons where they are
  if (name === 'default') return out;
  const gas = layer.querySelector('[data-id="gas"]')?.getBoundingClientRect();
  const brk = layer.querySelector('[data-id="brake"]')?.getBoundingClientRect();
  const hb = layer.querySelector('[data-id="hb"]')?.getBoundingClientRect();
  if (!gas || !brk || !hb || !innerWidth) return out;
  const y = clamp01((Math.min(gas.top, brk.top) - hb.height * 0.62 - 12) / innerHeight);
  const gx = (gas.left + gas.right) / 2 / innerWidth, bx = (brk.left + brk.right) / 2 / innerWidth;
  if (name === 'hb-right') out[`${scheme}:hb`] = { x: clamp01((gx + bx) / 2), y };
  else {
    out[`${scheme}:hb`] = { x: clamp01(bx), y };
    out[`${scheme}:nitro`] = { x: clamp01(gx), y };
  }
  return out;
}
