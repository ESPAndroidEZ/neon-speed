import type { RaceResult } from '../core/raceManager';
import { injectCss } from './uiKit';
import { isPhone } from '../core/quality';
import { t } from '../i18n';
import { resultGap } from '../game/resultGap';
import { isPhotoFinish } from '../game/photoFinish';
import { cashSplit } from '../game/cashSplit';
import { raceStats } from '../game/raceStats';
import { speedText } from '../game/speedUnit';

const fmt = (sec: number): string => `${Math.floor(sec / 60)}:${(sec % 60).toFixed(2).padStart(5, '0')}`;

/** Story events add an objective verdict and their own buttons. */
export interface ResultsExtra {
  objective: string;
  passed: boolean;
  /** Extra lines under the cash (bonus, unlocks). */
  notes?: string[];
  buttons: { label: string; hot?: boolean; action: () => void }[];
}

/** Post-race overlay: positions, times, cash payout and buttons. Plain DOM. */
export class ResultsScreen {
  private readonly root = document.createElement('div');
  private readonly handlers: { onAgain: () => void; onMenu?: () => void; tip?: () => string | null };

  constructor(parent: HTMLElement, handlers: { onAgain: () => void; onMenu?: () => void; tip?: () => string | null }) {
    this.handlers = handlers;
    this.root.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:#05060dcc;color:#e8f6ff;font:600 16px system-ui,sans-serif;z-index:20;padding:16px;box-sizing:border-box;overflow:auto';
    parent.appendChild(this.root);
  }

  show(r: RaceResult, extra?: ResultsExtra): void {
    const win = r.racers.find((x) => x.position === 1)?.time ?? null;
    const rows = r.racers
      .map((x) => `<tr style="${x.isPlayer ? 'color:#ff2a9d' : ''}"><td>P${x.position}</td><td>${x.isPlayer ? t('vs.you') : x.name}</td><td style="text-align:right">${x.time === null ? t('res.dnf') : fmt(x.time)}</td><td style="text-align:right;opacity:.65;font-size:.8em;padding-left:10px">${resultGap(x.time, win)}</td></tr>`)
      .join('');
    const head = t(extra ? (extra.passed ? 'res.passed' : 'res.failed') : r.position === 1 ? 'res.victory' : 'res.finished', { p: r.position });
    const color = extra && !extra.passed ? 'var(--red)' : '#18d8ff';
    const photo = isPhotoFinish(r.racers) ? `<div style="color:#ffd27d;letter-spacing:.2em;font-size:.85em">${t('res.photo')}</div>` : '';
    const verdict = photo + (extra ? `<div style="margin:6px 0;color:${extra.passed ? 'var(--green)' : '#ff9aa8'}">${extra.objective}</div>` : '');
    const tip = !extra && r.position > 1 ? this.handlers.tip?.() : null; // lost a free race: suggest an upgrade
    const lt = r.lapTimes ?? [];
    const best = Math.min(...lt);
    const splits = lt.length > 1 ? `<div style="font-size:.85em;opacity:.85;margin-top:4px">${t('res.laps')}: ${lt.map((v, i) => `<span style="${v === best ? 'color:var(--green)' : ''}">${i + 1}&nbsp;${fmt(v)}</span>`).join(' &nbsp;·&nbsp; ')}</div>` : '';
    const st = raceStats.any ? `<div style="font-size:.8em;opacity:.75;margin-top:4px">${t('res.top')} <b>${speedText(raceStats.topKph)}</b> · ${t('res.near')} <b>${raceStats.near}</b> · ${t('res.slip')} <b>${raceStats.slip}</b> · ${t('res.clean')} <b>${raceStats.clean}</b></div>` : '';
    const cs = extra ? null : cashSplit(r.cash, r.driftScore);
    const split = cs ? `<div style="font-size:.8em;opacity:.75;margin-bottom:8px">${t('res.split', { prize: cs.prize.toLocaleString(), drift: cs.drift.toLocaleString() })}</div>` : '';
    const pb = !extra && r.note ? [`<div style="color:#18d8ff;font-size:.9em">${r.note}</div>`] : [];
    const notes = pb.join('') + (tip ? [tip] : extra?.notes ?? []).map((n) => `<div style="color:#ffd27d">${n}</div>`).join('');
    this.root.innerHTML = `<div style="min-width:min(340px,86vw);max-width:calc(100vw - 24px);max-height:calc(100% - 24px);overflow:auto;box-sizing:border-box;padding:clamp(14px,3vmin,28px) clamp(16px,4vmin,36px);border:1px solid #18d8ff55;border-radius:12px;background:#0a0d1cee;box-shadow:0 0 40px #18d8ff33">
      <div style="font-size:clamp(30px,6vw,46px);font-style:italic;color:${color}">${head}</div>${verdict}
      <table style="width:100%;margin:14px 0;border-collapse:collapse;line-height:1.8">${rows}</table>
      <div>${t('res.bestLap')} <b>${Number.isFinite(r.bestLap) ? fmt(r.bestLap) : '--'}</b> &nbsp; ${t('res.drift')} <b>${r.driftScore}</b></div>${splits}${st}
      <div style="font-size:30px;margin:10px 0 ${split ? '2px' : '10px'};color:var(--green)">+ $${r.cash.toLocaleString()}</div>${split}${notes}
      <div id="rs-btns" style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"></div></div>`;
    injectCss();
    const touch = isPhone();
    const box = this.root.querySelector('#rs-btns');
    const add = (label: string, action: () => void, hot = false): void => {
      const b = document.createElement('button');
      b.textContent = label;
      b.className = `rb-btn${hot ? ' hot' : ''}`;
      b.style.minWidth = 'min(200px,40vw)';
      b.addEventListener('click', action);
      box?.appendChild(b);
    };
    if (extra) for (const b of extra.buttons) add(b.label, b.action, b.hot);
    else {
      add(t(touch ? 'res.again' : 'res.againKey'), this.handlers.onAgain, true);
      if (this.handlers.onMenu) add(t(touch ? 'common.menu' : 'res.menuKey'), () => this.handlers.onMenu?.());
    }
    const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion:reduce)').matches;
    this.root.style.animation = calm ? 'none' : 'rb-fade .7s var(--ease) 1.2s both'; // the car rolls out first, then the results fade in
    this.root.style.display = 'flex';
  }

  hide(): void {
    this.root.style.display = 'none';
  }

  get visible(): boolean {
    return this.root.style.display === 'flex';
  }
}
