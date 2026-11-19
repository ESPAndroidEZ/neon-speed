import { buzz } from './haptics';

/** Shared look of the phone controls. Hit areas reach `--hit` beyond the visible shape (::before). */
export const TOUCH_CSS = `
.rb-tc{position:fixed;inset:0;z-index:100;pointer-events:none;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;
--sl:max(14px,env(safe-area-inset-left));--sr:max(14px,env(safe-area-inset-right));--sb:max(14px,env(safe-area-inset-bottom));--st:max(10px,env(safe-area-inset-top));
--u:clamp(64px,min(15vmin,19vw),118px);--hit:18px}
.rb-tc .zone{position:absolute;left:0;bottom:0;width:48%;height:72%;pointer-events:auto;touch-action:none}
.rb-tc .knob{position:absolute;width:118px;height:118px;margin:-59px 0 0 -59px;border-radius:50%;border:2px solid #18d8ff66;background:radial-gradient(#18d8ff22,#0000 70%);opacity:0;transition:opacity .15s}
.rb-tc .knob i{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px;border-radius:50%;background:#18d8ffcc;box-shadow:0 0 18px #18d8ff}
.rb-tc .hint{position:absolute;left:calc(var(--sl) + 24px);bottom:calc(var(--sb) + 30px);font:800 12px system-ui;letter-spacing:.12em;color:#ffffff66}
.rb-tc .b{position:absolute;display:flex;align-items:center;justify-content:center;flex-direction:column;pointer-events:auto;touch-action:none;
font:900 clamp(11px,1.6vmin + 4px,15px)/1 system-ui,sans-serif;letter-spacing:.08em;color:#fff;background:#0b1024a6;border:2px solid var(--c);opacity:.86;
box-shadow:0 0 14px color-mix(in srgb,var(--c) 40%,transparent),inset 0 0 18px color-mix(in srgb,var(--c) 22%,transparent);transition:transform .06s,background .06s}
.rb-tc .b::before{content:'';position:absolute;inset:calc(var(--hit) * -1);border-radius:inherit}
.rb-tc .b svg{font-size:22px}.rb-tc .b small{font-size:9px;opacity:.7;margin-top:4px;letter-spacing:.14em}
.rb-tc .b.on{transform:scale(.93);background:color-mix(in srgb,var(--c) 55%,#0b1024);box-shadow:0 0 28px var(--c);opacity:1}
.rb-tc .sm{width:44px;height:44px;border-radius:12px;--c:#ffffff88;--hit:8px;top:calc(var(--st) + 34px)}
.rb-tc .round{width:var(--u);height:var(--u);border-radius:50%}
.rb-tc .pedal{width:calc(var(--u) * 1.05);height:calc(var(--u) * 1.55);border-radius:22px 22px 28px 28px}
.rb-tc .big{width:calc(var(--u) * 1.4);height:calc(var(--u) * 1.4);border-radius:50%}
.rb-tc .arrow{width:calc(var(--u) * 1.15);height:calc(var(--u) * 1.15);border-radius:24px;--c:#18d8ff}
.rb-tc .arrow svg{font-size:34px}
.rb-tc .shift{width:calc(var(--u) * .72);height:calc(var(--u) * .72);border-radius:50%;--c:#18d8ff;font-size:24px}.rb-tc:not([data-manual]) .shift{display:none}
.rb-tc .startgas{display:none}.rb-tc[data-start] .startgas{display:flex}.rb-tc[data-start] [data-id=nitro]{display:none}
.rb-tc .gas{--c:#3dff8a}.rb-tc .brk{--c:#ff3b4e}.rb-tc .n2o{--c:#ff2a9d}.rb-tc .hb{--c:#ffc23d}
`;

/**
 * A multi-touch-safe hold button: pointer events with their own pointer id (a second finger elsewhere never steals
 * or releases it), pointer capture, haptic tick on press, no context menu. `down` / `up` fire once per press.
 */
export function holdButton(cls: string, html: string, down: () => void, up?: () => void): HTMLDivElement {
  const el = document.createElement('div');
  el.className = `b ${cls}`;
  el.innerHTML = html;
  el.setAttribute('role', 'button');
  let id: number | null = null;
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (id !== null) return;
    id = e.pointerId;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic pointer */
    }
    el.classList.add('on');
    buzz(12);
    down();
  });
  const release = (e: PointerEvent): void => {
    if (e.pointerId !== id) return;
    id = null;
    el.classList.remove('on');
    up?.();
  };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('lostpointercapture', release);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  return el;
}

/** Position helper: `left` / `right` / `bottom` as CSS expressions. */
export function place(el: HTMLElement, pos: { left?: string; right?: string; bottom?: string; top?: string }): HTMLElement {
  for (const k of ['left', 'right', 'bottom', 'top'] as const) if (pos[k] !== undefined) el.style[k] = pos[k] as string;
  return el;
}
