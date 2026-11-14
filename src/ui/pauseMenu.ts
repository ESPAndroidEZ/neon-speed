import type { SaveSlots, SlotId } from '../core/gameSave';
import { slotList } from './saveUi';
import { button, h, injectCss } from './uiKit';

export interface PauseHandlers {
  onResume: () => void;
  onRestart: () => void;
  onSave: (slot: SlotId) => void;
  onSaveQuit: () => void;
}

/** Pause overlay: Resume, Restart, Save (slot picker), Save & Quit. */
export class PauseMenu {
  private layer: HTMLElement | null = null;
  private readonly slots: SaveSlots;
  private readonly hnd: PauseHandlers;

  constructor(slots: SaveSlots, handlers: PauseHandlers) {
    injectCss();
    this.slots = slots;
    this.hnd = handlers;
  }

  get open(): boolean {
    return this.layer !== null;
  }

  show(): void {
    this.close();
    const el = h('div', 'rb-layer dim');
    el.style.zIndex = '40';
    el.append(h('h2', 'rb-title', 'PAUSED'));
    el.append(
      button('Resume (Esc)', () => this.hnd.onResume(), 'hot'),
      button('Restart', () => this.hnd.onRestart()),
      button('Save', () => this.picker()),
      button('Save & Quit to menu', () => this.hnd.onSaveQuit()),
    );
    this.layer = el;
    document.body.appendChild(el);
    el.querySelector('button')?.focus({ preventScroll: true });
  }

  /** Esc inside the slot picker goes back to the pause menu; returns true if it handled the key. */
  back(): boolean {
    if (!this.layer?.dataset.picker) return false;
    this.show();
    return true;
  }

  private picker(): void {
    this.close();
    const el = h('div', 'rb-layer dim');
    el.style.zIndex = '40';
    el.dataset.picker = '1';
    el.append(h('h2', 'rb-title', 'SAVE TO'), slotList(this.slots, true, (id) => {
      this.hnd.onSave(id);
      this.show();
    }), button('Back', () => this.show()));
    this.layer = el;
    document.body.appendChild(el);
  }

  close(): void {
    this.layer?.remove();
    this.layer = null;
  }
}
