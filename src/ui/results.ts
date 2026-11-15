import type { RaceResult } from '../core/raceManager';
import { injectCss } from './uiKit';
import { isPhone } from '../core/quality';

const fmt = (t: number): string => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;

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
  private readonly handlers: { onAgain: () => void; onMenu?: () => void };

  constructor(parent: HTMLElement, handlers: { onAgain: () => void; onMenu?: () => void }) {
    this.handlers = handlers;
    this.root.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:#05060dcc;color:#e8f6ff;font:600 16px system-ui,sans-serif;z-index:20;padding:16px;box-sizing:border-box;overflow:auto';
    parent.appendChild(this.root);
  }

  show(r: RaceResult, extra?: ResultsExtra): void {
    const rows = r.racers
      .map((x) => `<tr style="${x.isPlayer ? 'color:#ff2a9d' : ''}"><td>P${x.position}</td><td>${x.name}</td><td style="text-align:right">${x.time === null ? 'DNF' : fmt(x.time)}</td></tr>`)
      .join('');
    const head = extra ? (extra.passed ? 'EVENT PASSED' : 'NOT THIS TIME') : r.position === 1 ? 'VICTORY' : `FINISHED P${r.position}`;
    const color = extra && !extra.passed ? '#ff5470' : '#18d8ff';
    const verdict = extra ? `<div style="margin:6px 0;color:${extra.passed ? '#7dff9a' : '#ff9aa8'}">${extra.objective}</div>` : '';
    const notes = (extra?.notes ?? []).map((n) => `<div style="color:#ffd27d">${n}</div>`).join('');
    this.root.innerHTML = `<div style="min-width:min(340px,86vw);max-width:calc(100vw - 24px);max-height:calc(100% - 24px);overflow:auto;box-sizing:border-box;padding:clamp(14px,3vmin,28px) clamp(16px,4vmin,36px);border:1px solid #18d8ff55;border-radius:12px;background:#0a0d1cee;box-shadow:0 0 40px #18d8ff33">
      <div style="font-size:clamp(30px,6vw,46px);font-style:italic;color:${color}">${head}</div>${verdict}
      <table style="width:100%;margin:14px 0;border-collapse:collapse;line-height:1.8">${rows}</table>
      <div>Best lap <b>${Number.isFinite(r.bestLap) ? fmt(r.bestLap) : '--'}</b> &nbsp; Drift <b>${r.driftScore}</b></div>
      <div style="font-size:30px;margin:10px 0;color:#7dff9a">+ $${r.cash.toLocaleString()}</div>${notes}
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
      add(touch ? 'Race again' : 'Race again (Enter)', this.handlers.onAgain, true);
      if (this.handlers.onMenu) add(touch ? 'Menu' : 'Menu (Esc)', () => this.handlers.onMenu?.());
    }
    this.root.style.display = 'flex';
  }

  hide(): void {
    this.root.style.display = 'none';
  }

  get visible(): boolean {
    return this.root.style.display === 'flex';
  }
}
