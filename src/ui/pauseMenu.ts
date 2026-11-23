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
  /** Builds the settings screen; `back` closes it. Adds a Settings button to the pause menu. */
  settings?: (back: () => void) => HTMLElement;
}

/** Pause overlay: Resume, Restart, Save (slot picker), Save & Quit. */
export class PauseMenu {
  private layer: HTMLElement | null = null;
  private readonly slots: SaveSlots;
  private readonly hnd: PauseHandlers;
  /** Settings screen drawn over the pause menu, if open. */
  private sub: HTMLElement | null = null;
  /** Line under the title (lap, position, time); set by the controller before show(). */
  private status = '';

  constructor(slots: SaveSlots, handlers: PauseHandlers) {
    injectCss();
    this.slots = slots;
    this.hnd = handlers;
    onLangChange(() => (this.sub ? this.openSettings() : this.layer?.dataset.picker ? this.picker() : this.layer && this.show()));
  }

  get open(): boolean {
    return this.layer !== null;
  }

  /** Text under PAUSED; empty hides it. Takes effect on the next show(). */
  setStatus(text: string): void {
    this.status = text;
  }

  show(): void {
    this.close();
    const el = h('div', 'rb-layer dim rb-pause');
    el.style.zIndex = '40';
    el.append(h('h2', 'rb-title', t('pause.title')));
    if (this.status) el.append(h('div', 'rb-sub', this.status));
    el.append(
      button(t('pause.resume'), () => this.hnd.onResume(), 'hot'),
      button(t('pause.restart'), () => this.hnd.onRestart()),
      button(t('pause.save'), () => this.picker()),
      ...(this.hnd.settings ? [button(t('menu.settings'), () => this.openSettings())] : []),
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
    if (this.sub) {
      this.closeSettings();
      return true;
    }
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

  private openSettings(): void {
    this.sub?.remove();
    this.sub = this.hnd.settings?.(() => this.closeSettings()) ?? null;
    if (!this.sub) return;
    this.sub.style.zIndex = '45';
    document.body.appendChild(this.sub);
    this.sub.querySelector('button')?.focus({ preventScroll: true });
  }

  private closeSettings(): void {
    this.sub?.remove();
    this.sub = null;
    this.layer?.querySelector('button')?.focus({ preventScroll: true });
  }

  close(): void {
    this.sub?.remove();
    this.sub = null;
    this.layer?.remove();
    this.layer = null;
  }
}
