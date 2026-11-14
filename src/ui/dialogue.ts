import { SPEAKERS, type Line, type Speaker } from '../data/story';
import { h, injectCss } from './uiKit';

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

/** Optional browser text-to-speech for DJ Switch. Silent when unsupported or turned off. */
export class Voice {
  enabled = false;

  say(text: string): void {
    if (!this.enabled || typeof speechSynthesis === 'undefined') return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = 0.6;
      u.rate = 0.95;
      const v = speechSynthesis.getVoices().find((x) => /en[-_]/i.test(x.lang) && /male|david|daniel|alex|google uk english male/i.test(x.name));
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

/** Speaker card with an initial avatar, typewriter text, click / Enter / Space to advance, Esc to skip all. */
export class DialogueBox {
  private readonly voice: Voice;
  private layer: HTMLElement | null = null;
  private lines: readonly Line[] = [];
  private idx = 0;
  private done: (() => void) | null = null;
  private typing: number | null = null;
  private full = '';
  private textEl: HTMLElement | null = null;

  constructor(voice: Voice) {
    injectCss();
    this.voice = voice;
    window.addEventListener('keydown', (e) => {
      if (!this.layer || e.repeat) return;
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        this.advance();
      } else if (e.code === 'Escape') this.finish();
    });
  }

  get active(): boolean {
    return this.layer !== null;
  }

  play(lines: readonly Line[], done: () => void): void {
    if (lines.length === 0) {
      done();
      return;
    }
    this.close();
    this.lines = lines;
    this.idx = 0;
    this.done = done;
    this.layer = h('div', 'rb-layer');
    this.layer.style.justifyContent = 'flex-end';
    this.layer.style.paddingBottom = 'max(24px,4vh)';
    this.layer.style.background = 'linear-gradient(transparent 55%,#05060dcc)';
    this.layer.addEventListener('click', () => this.advance());
    document.body.appendChild(this.layer);
    this.show();
  }

  private show(): void {
    const l = this.lines[this.idx];
    const sp: { name: string; color: number } = SPEAKERS[l.who as Speaker];
    const card = h('div', 'rb-card');
    card.style.cssText += `;cursor:pointer;display:flex;gap:16px;align-items:center;text-align:left;width:min(720px,92vw);box-sizing:border-box;border-color:${hex(sp.color)}88`;
    const avatar = h('div', '', l.who === 'narrator' ? '' : (sp.name[0] ?? '?'));
    avatar.style.cssText = `flex:none;width:56px;height:56px;border-radius:50%;display:${l.who === 'narrator' ? 'none' : 'flex'};align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#05060d;background:${hex(sp.color)};box-shadow:0 0 18px ${hex(sp.color)}88`;
    const body = h('div');
    const head = h('div', 'rb-sub', l.phone ? `\u{1F4DE} ${sp.name} (phone)` : sp.name);
    head.style.color = hex(sp.color);
    this.textEl = h('div');
    this.textEl.style.cssText = 'font-size:18px;line-height:1.4;min-height:50px';
    const hint = h('div', 'rb-sub', 'Enter / click to continue · Esc to skip');
    hint.style.cssText += ';font-size:11px;opacity:.5;margin-top:6px';
    body.append(head, this.textEl, hint);
    card.append(avatar, body);
    this.layer?.replaceChildren(card);
    if (l.who === 'switch') this.voice.say(l.text);
    this.type(l.text);
  }

  private type(text: string): void {
    this.full = text;
    let n = 0;
    if (this.typing !== null) clearInterval(this.typing);
    this.typing = window.setInterval(() => {
      n += 2;
      if (this.textEl) this.textEl.textContent = text.slice(0, n);
      if (n >= text.length && this.typing !== null) {
        clearInterval(this.typing);
        this.typing = null;
      }
    }, 18);
  }

  private advance(): void {
    if (this.typing !== null) {
      clearInterval(this.typing);
      this.typing = null;
      if (this.textEl) this.textEl.textContent = this.full;
      return;
    }
    if (++this.idx >= this.lines.length) this.finish();
    else this.show();
  }

  private finish(): void {
    const cb = this.done;
    this.close();
    this.voice.stop();
    cb?.();
  }

  private close(): void {
    if (this.typing !== null) clearInterval(this.typing);
    this.typing = null;
    this.layer?.remove();
    this.layer = null;
    this.done = null;
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
  }

  schedule(list: readonly Caption[]): void {
    this.clear();
    for (const c of list) {
      this.timers.push(window.setTimeout(() => this.flash(c.text, c.dur, c.kind), c.at * 1000));
    }
  }

  /** Show a single line for `dur` seconds. */
  flash(text: string, dur: number, kind: Caption['kind'] = 'switch'): void {
    const el = h('div', '', text);
    const styles: Record<Caption['kind'], string> = {
      switch: 'position:absolute;left:0;right:0;bottom:14%;text-align:center;font-size:clamp(18px,3vw,28px);font-style:italic;color:#9fe8ff',
      lower: 'position:absolute;left:max(24px,4vw);bottom:22%;font-size:clamp(16px,2.4vw,22px);letter-spacing:2px;padding:8px 14px;background:#05060d99;border-left:3px solid #ff2a9d',
      title: 'position:absolute;left:0;right:0;top:34%;text-align:center;font-size:clamp(40px,9vw,96px);font-style:italic;font-weight:900;text-shadow:0 0 18px #ff2a9d,0 0 50px #18d8ff',
    };
    el.style.cssText = `${styles[kind]};opacity:0;transition:opacity .25s`;
    this.layer.appendChild(el);
    requestAnimationFrame(() => (el.style.opacity = '1'));
    if (kind === 'switch') this.voice.say(text.replace(/^DJ SWITCH:\s*/, ''));
    this.timers.push(
      window.setTimeout(() => (el.style.opacity = '0'), Math.max(0, dur * 1000 - 250)),
      window.setTimeout(() => el.remove(), dur * 1000 + 100),
    );
  }

  clear(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers.length = 0;
    this.layer.replaceChildren();
    this.voice.stop();
  }
}
