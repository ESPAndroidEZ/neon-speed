const CSS = `
.rb-layer{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;color:#e8f6ff;font:600 16px system-ui,sans-serif;z-index:30;text-shadow:0 0 10px #18d8ff66;user-select:none}
.rb-layer.dim{background:radial-gradient(ellipse at center,#05060d55 0%,#05060dcc 100%)}
.rb-title{font-size:clamp(40px,9vw,96px);font-style:italic;font-weight:900;letter-spacing:-2px;color:#fff;text-shadow:0 0 18px #ff2a9d,0 0 50px #18d8ff;margin:0}
.rb-sub{opacity:.8;letter-spacing:4px;text-transform:uppercase;font-size:13px}
.rb-btn{min-width:240px;padding:13px 22px;font:inherit;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#e8f6ff;background:#0a0d1ccc;border:1px solid #18d8ff88;border-radius:8px;cursor:pointer;transition:.12s}
.rb-btn:hover,.rb-btn:focus{background:#18d8ff33;box-shadow:0 0 22px #18d8ff66;outline:none}
.rb-btn.hot{border-color:#ff2a9d;box-shadow:0 0 16px #ff2a9d55}
.rb-btn:disabled{opacity:.4;cursor:default}
.rb-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:center}
.rb-card{padding:16px 22px;border:1px solid #18d8ff55;border-radius:10px;background:#0a0d1ccc;min-width:200px;text-align:center;cursor:pointer}
.rb-card:hover{border-color:#ff2a9d;box-shadow:0 0 20px #ff2a9d55}
.rb-cash{position:fixed;right:24px;top:18px;font-size:22px;color:#7dff9a;z-index:31}
.rb-bar{height:7px;width:180px;background:#ffffff22;border-radius:4px;overflow:hidden}
.rb-bar i{display:block;height:100%;background:linear-gradient(90deg,#18d8ff,#ff2a9d)}
.rb-sw{width:26px;height:26px;border-radius:50%;border:2px solid #fff6;cursor:pointer}
.rb-sw.on{border-color:#fff;box-shadow:0 0 10px #fff}
`;

let injected = false;

export function injectCss(): void {
  if (injected) return;
  injected = true;
  const s = document.createElement('style');
  s.textContent = CSS;
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
