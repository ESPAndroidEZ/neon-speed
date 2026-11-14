import type { RaceResult } from '../core/raceManager';

const fmt = (t: number): string => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;

/** Post-race overlay: positions, times, cash payout and two buttons. Plain DOM. */
export class ResultsScreen {
  private readonly root = document.createElement('div');

  private readonly handlers: { onAgain: () => void; onMenu?: () => void };

  constructor(parent: HTMLElement, handlers: { onAgain: () => void; onMenu?: () => void }) {
    this.handlers = handlers;
    this.root.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:#05060dcc;color:#e8f6ff;font:600 16px system-ui,sans-serif;z-index:20';
    parent.appendChild(this.root);
  }

  show(r: RaceResult): void {
    const rows = r.racers
      .map((x) => `<tr style="${x.isPlayer ? 'color:#ff2a9d' : ''}"><td>P${x.position}</td><td>${x.name}</td><td style="text-align:right">${x.time === null ? 'DNF' : fmt(x.time)}</td></tr>`)
      .join('');
    this.root.innerHTML = `<div style="min-width:340px;padding:28px 36px;border:1px solid #18d8ff55;border-radius:12px;background:#0a0d1cee;box-shadow:0 0 40px #18d8ff33">
      <div style="font-size:46px;font-style:italic;color:#18d8ff">${r.position === 1 ? 'VICTORY' : `FINISHED P${r.position}`}</div>
      <table style="width:100%;margin:14px 0;border-collapse:collapse;line-height:1.8">${rows}</table>
      <div>Best lap <b>${Number.isFinite(r.bestLap) ? fmt(r.bestLap) : '--'}</b> &nbsp; Drift <b>${r.driftScore}</b></div>
      <div style="font-size:30px;margin:10px 0;color:#7dff9a">+ $${r.cash.toLocaleString()}</div>
      <button id="rs-again" style="padding:10px 18px;font:inherit;margin-right:8px">Race again (Enter)</button>
      ${this.handlers.onMenu ? '<button id="rs-menu" style="padding:10px 18px;font:inherit">Menu (Esc)</button>' : ''}</div>`;
    this.root.style.display = 'flex';
    this.root.querySelector('#rs-again')?.addEventListener('click', this.handlers.onAgain);
    this.root.querySelector('#rs-menu')?.addEventListener('click', () => this.handlers.onMenu?.());
  }

  hide(): void {
    this.root.style.display = 'none';
  }

  get visible(): boolean {
    return this.root.style.display === 'flex';
  }
}
