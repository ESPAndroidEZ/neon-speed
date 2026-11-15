import type { TitleCard } from '../data/lore';
import { h, injectCss } from './uiKit';
import { t, tx } from '../i18n';

/** Full-screen "Previously in Kestrel Bay" cards. Click, Enter, Space or Esc skips; each card shows for ~4.5 s. */
export class TitleCards {
  private layer: HTMLElement | null = null;
  private timer = 0;
  private cards: readonly TitleCard[] = [];
  private idx = 0;
  private done: (() => void) | null = null;

  constructor() {
    injectCss();
    window.addEventListener('keydown', (e) => {
      if (!this.layer || e.repeat) return;
      if (e.code === 'Escape') this.finish();
      else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        this.next();
      }
    });
  }

  get active(): boolean {
    return this.layer !== null;
  }

  play(cards: readonly TitleCard[], done: () => void): void {
    this.cards = cards;
    this.idx = -1;
    this.done = done;
    this.layer = h('div', 'rb-layer');
    this.layer.style.background = '#020309';
    this.layer.style.zIndex = '70';
    this.layer.addEventListener('click', () => this.next());
    document.body.appendChild(this.layer);
    this.next();
  }

  private next(): void {
    window.clearTimeout(this.timer);
    if (++this.idx >= this.cards.length) {
      this.finish();
      return;
    }
    const c = this.cards[this.idx];
    const box = h('div');
    box.style.cssText = 'max-width:min(760px,90vw);text-align:center;opacity:0;transition:opacity .7s';
    box.append(h('div', 'rb-sub', this.idx === 0 ? t('cards.previously') : `${this.idx + 1} / ${this.cards.length}`));
    const title = h('h2', 'rb-title', tx(c.heading));
    title.style.fontSize = 'clamp(32px,7vw,64px)';
    const text = h('div', '', tx(c.text));
    text.style.cssText = 'font-size:clamp(16px,2.4vw,22px);line-height:1.5;margin-top:12px;opacity:.9';
    const hint = h('div', 'rb-sub', t('cards.skip'));
    hint.style.cssText += ';margin-top:28px;font-size:11px;opacity:.5';
    box.append(title, text, hint);
    this.layer?.replaceChildren(box);
    requestAnimationFrame(() => (box.style.opacity = '1'));
    this.timer = window.setTimeout(() => this.next(), 4800);
  }

  private finish(): void {
    window.clearTimeout(this.timer);
    this.layer?.remove();
    this.layer = null;
    const cb = this.done;
    this.done = null;
    cb?.();
  }
}
