import type { AudioManager, AudioTest } from '../audio/audioManager';
import { AUDIO, type AudioParams } from '../audio/audioParams';

/*
 * THROWAWAY dev panel (key K): trigger the sounds without driving and tune the values live.
 * "Copy values" puts the numbers on the clipboard so they can be pasted back to the architect.
 */

const CSS = `#ap{position:fixed;right:0;top:0;bottom:0;width:300px;overflow:auto;background:#05060dee;color:#cfe;font:12px system-ui,sans-serif;padding:10px;display:none;z-index:50}
#ap h4{margin:10px 0 4px;color:#ff2a9d}#ap button{margin:2px 3px 2px 0;padding:6px 9px}#ap label{display:flex;gap:6px;align-items:center;margin:3px 0}#ap label span{width:100px}#ap input{flex:1;min-width:0}#ap output{width:44px;text-align:right}`;

const SLIDERS: [keyof AudioParams, number, number][] = [
  ['engineVolume', 0, 2.5], ['turboVolume', 0, 3], ['tyreVolume', 0, 3], ['ambienceVolume', 0, 3], ['crashVolume', 0, 3], ['musicVolume', 0, 5], ['rivalVolume', 0, 3],
  ['whistlePitch', 0.5, 1.8], ['bovLength', 0.3, 3], ['clunkVolume', 0, 3], ['popVolume', 0, 3],
];
const PRESETS: { key: 'engineVoicing' | 'squealVoicing'; title: string; options: string[] }[] = [
  { key: 'engineVoicing', title: 'Engine voicing', options: ['Smooth', 'Raspy', 'Aggressive'] },
  { key: 'squealVoicing', title: 'Tyre squeal', options: ['Soft', 'Sharp'] },
];
const BUTTONS: [AudioTest, string][] = [
  ['sweep', 'Rev sweep'], ['upshift', 'Upshift (BOV + clunk + pop)'], ['lift', 'Lift-off BOV'], ['flutter', 'Compressor flutter'], ['backfire', 'Backfire'], ['squeal', 'Tyre squeal (current weather)'], ['nitro', 'Nitro'], ['crash', 'Crash'],
];

export class AudioTestPanel {
  private readonly root = document.createElement('div');

  constructor(parent: HTMLElement, audio: AudioManager) {
    const style = document.createElement('style');
    style.textContent = CSS;
    this.root.id = 'ap';
    this.root.append(style);
    const title = document.createElement('div');
    title.textContent = 'Audio test (K)';
    title.style.cssText = 'font-weight:700;font-size:14px';
    const kind = document.createElement('div');
    this.root.append(title, kind);
    window.setInterval(() => (kind.textContent = `engine: ${audio.engineKind}, context: ${audio.bus.ctx.state}`), 500);
    const h = document.createElement('h4');
    h.textContent = 'Trigger';
    this.root.append(h);
    for (const [k, label] of BUTTONS) {
      const b = document.createElement('button');
      b.textContent = label;
      b.onclick = () => audio.play(k);
      this.root.append(b);
    }
    for (const p of PRESETS) {
      const hh = document.createElement('h4');
      hh.textContent = p.title;
      this.root.append(hh);
      const row: HTMLButtonElement[] = [];
      p.options.forEach((label, i) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.onclick = () => {
          AUDIO[p.key] = i;
          row.forEach((x, j) => (x.style.outline = j === i ? '2px solid #ff2a9d' : ''));
          audio.play(p.key === 'engineVoicing' ? 'sweep' : 'squeal');
        };
        b.style.outline = AUDIO[p.key] === i ? '2px solid #ff2a9d' : '';
        row.push(b);
        this.root.append(b);
      });
    }
    const h2 = document.createElement('h4');
    h2.textContent = 'Mix (category volumes)';
    this.root.append(h2);
    for (const [key, lo, hi] of SLIDERS) {
      const l = document.createElement('label');
      const span = document.createElement('span');
      span.textContent = key;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(lo);
      input.max = String(hi);
      input.step = String((hi - lo) / 200);
      input.value = String(AUDIO[key]);
      const out = document.createElement('output');
      out.textContent = AUDIO[key].toFixed(2);
      input.oninput = () => {
        AUDIO[key] = parseFloat(input.value);
        out.textContent = AUDIO[key].toFixed(2);
      };
      l.append(span, input, out);
      this.root.append(l);
    }
    const copy = document.createElement('button');
    copy.textContent = 'Copy values';
    copy.onclick = () => {
      const text = JSON.stringify(AUDIO, null, 1);
      void navigator.clipboard.writeText(text).then(() => (copy.textContent = 'Copied!'), () => window.prompt('Copy:', text));
      setTimeout(() => (copy.textContent = 'Copy values'), 1500);
    };
    this.root.append(copy);
    parent.appendChild(this.root);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyK' && !e.repeat) {
        this.root.style.display = this.root.style.display === 'block' ? 'none' : 'block';
        void audio.bus.ctx.resume();
      }
    });
  }
}
