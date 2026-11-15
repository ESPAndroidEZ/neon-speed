import { THEME_CSS } from './theme';
const CSS = `
.rb-layer{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;justify-content:safe center;gap:clamp(8px,2vh,14px);overflow-y:auto;overflow-x:hidden;box-sizing:border-box;padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));color:#e8f6ff;font:600 clamp(15px,0.45vw + 8px,26px) system-ui,sans-serif;z-index:30;text-shadow:0 0 10px #18d8ff66;user-select:none}
.rb-layer.dim{background:radial-gradient(ellipse at center,#05060d55 0%,#05060dcc 100%)}
.rb-title{font-size:clamp(30px,min(9vw,11vh),96px);flex:none;font-style:italic;font-weight:900;letter-spacing:-2px;color:#fff;text-shadow:0 0 18px #ff2a9d,0 0 50px #18d8ff;margin:0}
.rb-sub{opacity:.8;letter-spacing:4px;text-transform:uppercase;font-size:13px}
.rb-btn{min-width:min(240px,80vw);min-height:44px;flex:none;padding:clamp(8px,1.6vh,13px) 22px;font:inherit;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#e8f6ff;background:#0a0d1ccc;border:1px solid #18d8ff88;border-radius:8px;cursor:pointer;transition:.12s}
.rb-btn:hover,.rb-btn:focus{background:#18d8ff33;box-shadow:0 0 22px #18d8ff66;outline:none}
.rb-btn.hot{border-color:#ff2a9d;box-shadow:0 0 16px #ff2a9d55}
.rb-btn:disabled{opacity:.4;cursor:default}
.rb-lbl{flex:0 1 min(160px,40%);min-width:90px;text-align:right;overflow-wrap:anywhere}
.rb-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:center}
.rb-card{padding:16px 22px;border:1px solid #18d8ff55;border-radius:10px;background:#0a0d1ccc;min-width:200px;text-align:center;cursor:pointer}
.rb-card:hover{border-color:#ff2a9d;box-shadow:0 0 20px #ff2a9d55}
.rb-layer input[type=range]{accent-color:#18d8ff;width:min(220px,50vw);min-height:32px}.rb-layer input[type=checkbox]{accent-color:#ff2a9d;width:24px;height:24px}
.rb-cash{font-family:system-ui,sans-serif;font-weight:800;position:fixed;right:max(18px,env(safe-area-inset-right),2.5vw);top:max(14px,env(safe-area-inset-top),2vh);max-width:60vw;font-size:clamp(16px,2.2vw,24px);white-space:nowrap;text-align:right;color:#7dff9a;z-index:31;text-shadow:0 0 10px #000}
.rb-toast{position:fixed;left:50%;bottom:max(24px,4vh);transform:translateX(-50%);padding:10px 18px;background:#0a0d1cee;border:1px solid #18d8ff88;border-radius:8px;color:#e8f6ff;font:600 14px system-ui,sans-serif;z-index:60;pointer-events:none}
.rb-bar{height:7px;width:180px;background:#ffffff22;border-radius:4px;overflow:hidden}
.rb-bar i{display:block;height:100%;background:linear-gradient(90deg,#18d8ff,#ff2a9d)}
.rb-sw{width:22px;height:22px;border-radius:50%;border:2px solid #fff6;cursor:pointer}
.rb-sw.on{border-color:#fff;box-shadow:0 0 10px #fff}
@media (min-width:2200px) and (min-height:1300px){.rb-btn{min-width:min(340px,80vw);padding:18px 30px}.rb-sub{font-size:.85em}.rb-cash{font-size:34px}}
`;

let injected = false;

export function injectCss(): void {
  if (injected) return;
  injected = true;
  const s = document.createElement('style');
  s.textContent = THEME_CSS + CSS;
  document.head.appendChild(s);
}

export function h(tag: string, cls = '', html = ''): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export function button(label: string, onClick: () => void, cls = ''): HTMLButtonElement {
  const b = h('button', `rb-btn ${cls}`.trim(), label) as HTMLButtonElement;
  b.addEventListener('click', onClick);
  return b;
}

export const money = (n: number): string => `$${n.toLocaleString('en-US')}`;
export const lapText = (t: number | null): string => (t === null ? '--' : `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`);

/** Small transient message at the bottom centre. */
export function toast(text: string, ms = 3500): void {
  injectCss();
  const t = h('div', 'rb-toast', text);
  document.body.appendChild(t);
  window.setTimeout(() => t.remove(), ms);
}
