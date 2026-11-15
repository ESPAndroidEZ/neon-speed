import { type GameSnapshot, type SaveSlots, type SlotId } from '../core/gameSave';
import { button, h } from './uiKit';
import { t, tx } from '../i18n';
import type { Weather } from '../types/game';

const mmss = (sec: number): string => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

/** One line of detail for a save: event, car, lap, position, weather, race time, date. */
export function describe(s: GameSnapshot): string {
  const m = s.summary;
  return `${m.eventTitle ? tx(m.eventTitle) : t('save.freeRace')} · ${m.carName} · ${t('save.lap', { lap: m.lap, laps: m.laps })} · P${m.position}/${m.racers} · ${t(`weather.${m.weather as Weather}`).toLowerCase()} · ${mmss(m.raceTime)} · ${new Date(s.savedAt).toLocaleString()}`;
}

const SLOTS: SlotId[] = [0, 1, 2, 3, 4];
const label = (id: SlotId): string => (id === 'auto' ? t('save.auto') : t('save.slot', { n: id + 1 }));

/** A column of slot buttons. `onPick` fires for the chosen slot; with `saving` empty slots are allowed (and autosave is hidden). */
export function slotList(slots: SaveSlots, saving: boolean, onPick: (id: SlotId) => void): HTMLElement {
  const col = h('div');
  col.style.cssText = 'display:flex;flex-direction:column;gap:8px;width:min(720px,92vw)';
  const ids: SlotId[] = saving ? SLOTS : ['auto', ...SLOTS];
  for (const id of ids) {
    const snap = slots.get(id);
    const b = button('', () => {
      // saving over a used slot asks first (it cannot be undone)
      if (saving && snap && !window.confirm(`${t('save.overwrite', { slot: label(id) })}\n\n${describe(snap)}`)) return;
      onPick(id);
    });
    b.style.cssText += ';text-align:left;text-transform:none;letter-spacing:0;font-weight:600;padding:10px 14px';
    b.innerHTML = `<b>${label(id)}</b><br><span style="opacity:.8;font-size:13px">${snap ? describe(snap) : t('save.empty')}</span>`;
    b.disabled = !saving && !snap;
    col.append(b);
  }
  return col;
}

/** Load screen: the autosave and the manual slots. */
export function buildLoadMenu(slots: SaveSlots, onLoad: (id: SlotId) => void, onBack: () => void): HTMLElement {
  const root = h('div', 'rb-layer dim');
  root.append(h('h2', 'rb-title', t('save.load')), slotList(slots, false, onLoad), button(t('common.back'), onBack));
  return root;
}
