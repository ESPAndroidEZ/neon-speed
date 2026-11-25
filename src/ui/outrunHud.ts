import { h } from './uiKit';
import { t } from '../i18n';

export interface OutrunHud { show(name: string): void; update(toGo: number, lead: number, win: number, lose: number): void; hide(): void }

/**
 * The in-city outrun's bar under the Free Drive top bar: rival name, metres to the finish, and a lead gauge
 * (centre = level; right = you lead toward the outrun distance, left = they pull away).
 */
export function outrunHud(): OutrunHud {
  const root = h('div', 'rb-panel');
  root.style.cssText = 'position:fixed;left:50%;top:calc(max(12px,env(safe-area-inset-top)) + 54px);transform:translateX(-50%);z-index:13;display:none;flex-direction:column;align-items:center;gap:4px;padding:6px 14px;min-width:min(300px,80vw);font:700 13px var(--font,system-ui);color:#ffd1ea;pointer-events:none';
  const line = h('div', '');
  const bar = h('div', '');
  bar.style.cssText = 'position:relative;width:100%;height:8px;border-radius:4px;background:#ffffff22;overflow:hidden';
  const fill = h('i', '');
  fill.style.cssText = 'position:absolute;top:0;bottom:0;left:50%;width:0;background:#3ddc97';
  const mid = h('i', '');
  mid.style.cssText = 'position:absolute;top:-2px;bottom:-2px;left:calc(50% - 1px);width:2px;background:#fff';
  bar.append(fill, mid);
  root.append(line, bar);
  document.body.appendChild(root);
  let who = '';
  return {
    show: (name) => { who = name; root.style.display = 'flex'; },
    update: (toGo, lead, win, lose) => {
      line.textContent = t('run.hud', { name: who, km: (Math.max(0, toGo) / 1000).toFixed(2), lead: `${lead >= 0 ? '+' : ''}${Math.round(lead)}` });
      const f = lead >= 0 ? Math.min(1, lead / win) : Math.max(-1, lead / lose);
      fill.style.left = f >= 0 ? '50%' : `${50 + f * 50}%`;
      fill.style.width = `${Math.abs(f) * 50}%`;
      fill.style.background = f >= 0 ? '#3ddc97' : '#ff5470';
    },
    hide: () => { root.style.display = 'none'; },
  };
}
