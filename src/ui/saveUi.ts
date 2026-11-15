import { type GameSnapshot, type SaveSlots, type SlotId } from '../core/gameSave';
import { button, h } from './uiKit';

const mmss = (t: number): string => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

/** One line of detail for a save: event, car, lap, position, weather, race time, date. */
export function describe(s: GameSnapshot): string {
  const m = s.summary;
  return `${m.eventTitle ?? 'Free race'} · ${m.carName} · lap ${m.lap}/${m.laps} · P${m.position}/${m.racers} · ${m.weather.toLowerCase()} · ${mmss(m.raceTime)} · ${new Date(s.savedAt).toLocaleString()}`;
}

const SLOTS: SlotId[] = [0, 1, 2, 3, 4];
const label = (id: SlotId): string => (id === 'auto' ? 'Autosave' : `Slot ${id + 1}`);

/** A column of slot buttons. `onPick` fires for the chosen slot; with `saving` empty slots are allowed (and autosave is hidden). */
export function slotList(slots: SaveSlots, saving: boolean, onPick: (id: SlotId) => void): HTMLElement {
  const col = h('div');
  col.style.cssText = 'display:flex;flex-direction:column;gap:8px;width:min(720px,92vw)';
  const ids: SlotId[] = saving ? SLOTS : ['auto', ...SLOTS];
  for (const id of ids) {
    const snap = slots.get(id);
    const b = button('', () => {
      // saving over a used slot asks first (it cannot be undone)
      if (saving && snap && !window.confirm(`Overwrite ${label(id)}?\n\n${describe(snap)}`)) return;
      onPick(id);
    });
    b.style.cssText += ';text-align:left;text-transform:none;letter-spacing:0;font-weight:600;padding:10px 14px';
    b.innerHTML = `<b>${label(id)}</b><br><span style="opacity:.8;font-size:13px">${snap ? describe(snap) : 'empty'}</span>`;
    b.disabled = !saving && !snap;
    col.append(b);
  }
  return col;
}

/** Load screen: the autosave and the manual slots. */
export function buildLoadMenu(slots: SaveSlots, onLoad: (id: SlotId) => void, onBack: () => void): HTMLElement {
  const root = h('div', 'rb-layer dim');
  root.append(h('h2', 'rb-title', 'LOAD'), slotList(slots, false, onLoad), button('Back', onBack));
  return root;
}
