import type { SaveSlots, SlotId } from '../core/gameSave';
import { slotList } from './saveUi';
import { button, h, injectCss } from './uiKit';
import { onLangChange, t } from '../i18n';

export interface PauseHandlers {
  onResume: () => void;
  onRestart: () => void;
  onSave: (slot: SlotId) => void;
  onSaveQuit: () => void;
  /** Extra buttons under the list (full screen, recalibrate tilt); nulls are skipped. */
  extra?: () => (HTMLElement | null)[];
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
    onLangChange(() => (this.layer?.dataset.picker ? this.picker() : this.layer && this.show()));
  }

  get open(): boolean {
    return this.layer !== null;
  }

  show(): void {
    this.close();
    const el = h('div', 'rb-layer dim');
    el.style.zIndex = '40';
    el.append(h('h2', 'rb-title', t('pause.title')));
    el.append(
      button(t('pause.resume'), () => this.hnd.onResume(), 'hot'),
      button(t('pause.restart'), () => this.hnd.onRestart()),
      button(t('pause.save'), () => this.picker()),
      button(t('pause.saveQuit'), () => this.hnd.onSaveQuit()),
    );
    const more = (this.hnd.extra?.() ?? []).filter((x): x is HTMLElement => x !== null);
    if (more.length) el.append(h('div', 'rb-row', ''), ...more);
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
    el.append(h('h2', 'rb-title', t('pause.saveTo')), slotList(this.slots, true, (id) => {
      this.hnd.onSave(id);
      this.show();
    }), button(t('common.back'), () => this.show()));
    this.layer = el;
    document.body.appendChild(el);
  }

  close(): void {
    this.layer?.remove();
    this.layer = null;
  }
}
