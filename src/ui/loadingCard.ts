import { TIPS } from '../data/lore';
import { h, injectCss } from './uiKit';

/** Short loading card with a lore tip while a race is being set up. Also masks the car model swapping in. */
export class LoadingCard {
  private n = 0;

  constructor() {
    injectCss();
  }

  show(ms = 1400): void {
    const el = h('div', 'rb-layer');
    el.style.cssText += ';background:#020309;z-index:65;transition:opacity .5s;opacity:1';
    const tip = TIPS[(this.n++ * 5 + Math.floor(Math.random() * TIPS.length)) % TIPS.length];
    el.append(h('div', 'rb-sub', 'Loading'), h('div', '', tip));
    (el.lastElementChild as HTMLElement).style.cssText = 'max-width:min(640px,88vw);text-align:center;font-size:clamp(16px,2.4vw,22px);font-style:italic;line-height:1.5';
    document.body.appendChild(el);
    window.setTimeout(() => (el.style.opacity = '0'), ms);
    window.setTimeout(() => el.remove(), ms + 600);
  }
}
