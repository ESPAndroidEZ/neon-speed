import { TIPS } from '../data/lore';
import { h, injectCss } from './uiKit';
import { t, tx } from '../i18n';
import { TipBag } from '../core/tipBag';

/** Short loading card with a lore tip while a race is being set up. Also masks the car model swapping in. */
export class LoadingCard {
  private readonly bag = new TipBag(TIPS.length, Math.random);

  constructor() {
    injectCss();
  }

  show(ms = 1400): void {
    const el = h('div', 'rb-layer');
    el.style.cssText += ';background:#020309;z-index:65;transition:opacity .5s;opacity:1';
    const tip = TIPS[this.bag.next()];
    el.append(h('div', 'rb-sub', t('loading')), h('div', '', tx(tip)));
    (el.lastElementChild as HTMLElement).style.cssText = 'max-width:min(640px,88vw);text-align:center;font-size:clamp(16px,2.4vw,22px);font-style:italic;line-height:1.5';
    document.body.appendChild(el);
    window.setTimeout(() => (el.style.opacity = '0'), ms);
    window.setTimeout(() => el.remove(), ms + 600);
  }
}
