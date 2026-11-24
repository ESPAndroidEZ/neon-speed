import { h } from './uiKit';
import { injectRoamCss } from './roamCss';
import { MAX_HEAT } from '../core/police';
import { t } from '../i18n';

export interface HeatHud { update(level: number, bust: number): void; dispose(): void }

const STAR = '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/></svg>';

/** Wanted stars and the busted meter, top left while the police are out. */
export function heatHud(): HeatHud {
  injectRoamCss();
  const root = h('div', 'rb-heat');
  const stars = h('div', 'rb-stars', STAR.repeat(MAX_HEAT));
  const bar = h('div', 'rb-bust', '<u></u>');
  root.append(h('div', 'rb-hl', t('heat.wanted')), stars, bar);
  document.body.appendChild(root);
  let last = -1;
  return {
    update(level, bust) {
      if (level !== last) {
        last = level;
        root.style.display = level > 0 ? 'block' : 'none';
        stars.querySelectorAll('svg').forEach((s, i) => s.classList.toggle('on', i < level));
      }
      (bar.firstChild as HTMLElement).style.width = `${Math.round(bust * 100)}%`;
      bar.style.opacity = bust > 0.02 ? '1' : '0.35';
    },
    dispose() { root.remove(); },
  };
}
