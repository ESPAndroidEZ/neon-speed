/*
 * THROWAWAY dev panel: one slider per numeric field of the given objects, edited live.
 * Toggle with the backtick key. "Copy values" puts JSON on the clipboard to paste back to the architect.
 */

type Group = { name: string; obj: Record<string, number> };

const CSS = `
#tp{position:fixed;left:0;top:0;bottom:0;width:300px;overflow:auto;background:#05060dee;color:#cfe;font:11px system-ui,sans-serif;padding:8px;display:none;z-index:10}
#tp h4{margin:10px 0 4px;color:#18d8ff}
#tp label{display:flex;align-items:center;gap:6px;margin:1px 0}
#tp label span{width:112px;flex:none}
#tp input{flex:1;min-width:0}
#tp output{width:46px;text-align:right;flex:none}
#tp button{margin:2px 4px 2px 0}
`;

export class TuningPanel {
  private readonly root = document.createElement('div');
  private readonly groups: Group[] = [];

  constructor(parent: HTMLElement) {
    this.root.id = 'tp';
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote') this.root.style.display = this.root.style.display === 'block' ? 'none' : 'block';
    });
    parent.appendChild(this.root);
  }

  /** Register an object whose numeric fields become sliders. Call before build(). */
  add(name: string, obj: object): void {
    this.groups.push({ name, obj: obj as Record<string, number> });
  }

  build(): void {
    const style = document.createElement('style');
    style.textContent = CSS;
    const copy = document.createElement('button');
    copy.textContent = 'Copy values';
    copy.onclick = () => {
      const out: Record<string, Record<string, number>> = {};
      for (const g of this.groups) {
        out[g.name] = {};
        for (const k of Object.keys(g.obj)) if (typeof g.obj[k] === 'number') out[g.name][k] = g.obj[k];
      }
      const text = JSON.stringify(out, null, 1);
      void navigator.clipboard.writeText(text).then(
        () => (copy.textContent = 'Copied!'),
        () => window.prompt('Copy:', text),
      );
      setTimeout(() => (copy.textContent = 'Copy values'), 1500);
    };
    this.root.append(style, copy);
    for (const g of this.groups) {
      const h = document.createElement('h4');
      h.textContent = g.name;
      this.root.appendChild(h);
      for (const key of Object.keys(g.obj)) {
        const v0 = g.obj[key];
        if (typeof v0 !== 'number') continue;
        const max = v0 === 0 ? 1 : Math.abs(v0) * 2.5;
        const input = document.createElement('input');
        input.type = 'range';
        input.min = String(v0 < 0 ? -max : 0);
        input.max = String(max);
        input.step = String(max / 400);
        input.value = String(v0);
        const out = document.createElement('output');
        out.textContent = String(+v0.toFixed(3));
        input.oninput = () => {
          g.obj[key] = parseFloat(input.value);
          out.textContent = String(+g.obj[key].toFixed(3));
        };
        const label = document.createElement('label');
        const span = document.createElement('span');
        span.textContent = key;
        label.append(span, input, out);
        this.root.appendChild(label);
      }
    }
  }
}
