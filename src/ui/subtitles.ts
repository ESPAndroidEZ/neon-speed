import { h, injectCss } from './uiKit';
import { getLang, onLangChange, tx } from '../i18n';

/** Optional browser text-to-speech for DJ Switch. Silent when unsupported or turned off. */
export class Voice {
  enabled = false;

  say(text: string): void {
    if (!this.enabled || typeof speechSynthesis === 'undefined') return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const es = getLang() === 'es';
      u.lang = es ? 'es-ES' : 'en-US';
      u.pitch = 0.6;
      u.rate = 0.95;
      const v = speechSynthesis.getVoices().find((x) => (es ? /es[-_]/i : /en[-_]/i).test(x.lang) && /male|david|daniel|alex|jorge|diego|pablo|google uk english male/i.test(x.name));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch {
      /* speech is a bonus: ignore failures */
    }
  }

  stop(): void {
    try {
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}

export interface Caption {
  at: number;
  dur: number;
  text: string;
  kind: 'switch' | 'lower' | 'title';
}

/** Timed captions over the opening cinematic, plus one-off subtitle lines (race intro cards). */
export class Subtitles {
  private readonly layer = h('div');
  private readonly timers: number[] = [];
  private readonly voice: Voice;

  constructor(voice: Voice) {
    injectCss();
    this.voice = voice;
    this.layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:25;font:700 20px system-ui,sans-serif;color:#fff;text-shadow:0 0 10px #000';
    document.body.appendChild(this.layer);
    onLangChange(() => { for (const el of Array.from(this.layer.children) as HTMLElement[]) if (el.dataset.src) el.textContent = tx(el.dataset.src); }); // a shown line switches language in place
  }

  schedule(list: readonly Caption[]): void {
    this.clear();
    for (const c of list) {
      this.timers.push(window.setTimeout(() => this.flash(c.text, c.dur, c.kind), c.at * 1000));
    }
  }

  /** Show a single line for `dur` seconds. */
  flash(text: string, dur: number, kind: Caption['kind'] = 'switch'): void {
    const line = tx(text);
    const el = h('div', '', line);
    el.dataset.src = text;
    const styles: Record<Caption['kind'], string> = {
      switch: 'position:absolute;left:0;right:0;bottom:14%;text-align:center;font-size:clamp(18px,3vw,28px);font-style:italic;color:#9fe8ff',
      lower: 'position:absolute;left:max(24px,4vw);bottom:22%;font-size:clamp(16px,2.4vw,22px);letter-spacing:2px;padding:8px 14px;background:#05060d99;border-left:3px solid #ff2a9d',
      title: 'position:absolute;left:0;right:0;top:34%;text-align:center;font-size:clamp(40px,9vw,96px);font-style:italic;font-weight:900;text-shadow:0 0 18px #ff2a9d,0 0 50px #18d8ff',
    };
    el.style.cssText = `${styles[kind]};opacity:0;transition:opacity .25s`;
    this.layer.appendChild(el);
    requestAnimationFrame(() => (el.style.opacity = '1'));
    if (kind === 'switch') this.voice.say(line.replace(/^DJ SWITCH:\s*/, ''));
    this.timers.push(
      window.setTimeout(() => (el.style.opacity = '0'), Math.max(0, dur * 1000 - 250)),
      window.setTimeout(() => el.remove(), dur * 1000 + 100),
    );
  }

  clear(): void {
    for (const id of this.timers) clearTimeout(id);
    this.timers.length = 0;
    this.layer.replaceChildren();
    this.voice.stop();
  }
}
