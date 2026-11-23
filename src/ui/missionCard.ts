import { t } from '../i18n';
import { button, h } from './uiKit';

export interface MissionCard { offer(name: string, brief: string): void; active(name: string, left: number, metres: number): void; result(text: string, good: boolean): void; hide(): void; readonly offering: boolean }

const CSS = `.rb-mission{position:fixed;left:max(var(--sp-3),var(--safe-l));top:calc(max(var(--sp-3),var(--safe-t)) + 56px);z-index:12;display:none;align-items:center;gap:var(--sp-3);padding:var(--sp-2) var(--sp-3);max-width:min(380px,calc(100vw - 2*var(--sp-3) - 190px));background:var(--panel);border:1px solid #18d8ff88;border-left:3px solid var(--magenta);border-radius:var(--radius-sm);font:600 clamp(12px,.3vw + 9px,15px) var(--font);color:var(--text);box-shadow:0 8px 24px #000a}
.rb-mission .rb-mt{font-weight:900;color:var(--cyan)}.rb-mission .rb-mb{color:var(--text-dim);font-weight:500;font-size:.92em}
.rb-mission .rb-btn{min-width:0;padding:var(--sp-2) var(--sp-4)}.rb-mission .rb-clk{font-variant-numeric:tabular-nums;font-weight:900;color:var(--amber)}`;

/** Mission card (menu style): an offer with Go (button or G key), then the clock and distance, then a short result. */
export function missionCard(accept: () => void): MissionCard {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const root = h('div', 'rb-mission');
  const text = h('div', '');
  const title = h('div', 'rb-mt'), body = h('div', 'rb-mb');
  text.append(title, body);
  const go = button(t('mission.go'), () => { if (offering) accept(); }, 'hot');
  root.append(text, go);
  document.body.appendChild(root);
  let offering = false, timer = 0;
  window.addEventListener('keydown', (e) => { if (offering && !e.repeat && e.code === 'KeyG') accept(); });
  const set = (a: string, b: string, showGo: boolean): void => {
    if (title.textContent !== a) title.textContent = a;
    if (body.textContent !== b) body.textContent = b;
    go.style.display = showGo ? '' : 'none';
    root.style.display = 'flex';
    document.body.classList.add('rb-mission');
  };
  return {
    offer(name, brief) { offering = true; set(name, matchMedia('(pointer:coarse)').matches ? brief : `${brief} ${t('mission.key')}`, true); },
    active(name, left, metres) {
      offering = false;
      const s = Math.max(0, Math.ceil(left));
      set(name, `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} · ${metres >= 1000 ? (metres / 1000).toFixed(1) + ' km' : Math.round(metres / 10) * 10 + ' m'}`, false);
    },
    result(text2, good) { offering = false; set(good ? t('mission.done') : t('mission.failed'), text2, false); clearTimeout(timer); timer = window.setTimeout(() => { if (!offering) root.style.display = 'none'; document.body.classList.remove('rb-mission'); }, 4000); },
    hide() { offering = false; root.style.display = 'none'; document.body.classList.remove('rb-mission'); },
    get offering() { return offering; },
  };
}
