import type { SaveSlots, SlotId } from '../core/gameSave';
import type { PauseMenu } from '../ui/pauseMenu';
import type { Game } from './game';
import { canSave, captureGame } from './saveGame';
import { pauseStatus } from './pauseStatus';
import { t } from '../i18n';

/** Pause state and saving: pause on Esc or a hidden tab, autosave when pausing or leaving, manual slots. */
export class PauseController {
  private readonly game: Game;
  private readonly slots: SaveSlots;
  private readonly menu: PauseMenu;
  private readonly say: (text: string) => void;

  constructor(game: Game, slots: SaveSlots, menu: PauseMenu, say: (text: string) => void) {
    this.game = game;
    this.slots = slots;
    this.menu = menu;
    this.say = say;
  }

  get paused(): boolean {
    return this.game.paused;
  }

  /** Save into a slot. Returns false when there is nothing to save or storage refused. */
  save(slot: SlotId, quiet = false): boolean {
    const snap = captureGame(this.game);
    if (!snap) return false;
    const ok = this.slots.put(slot, snap);
    if (!quiet) this.say(t(ok ? 'pause.saved' : 'pause.savedSession'));
    return ok;
  }

  pause(): void {
    if (this.game.paused || this.game.state !== 'RACING' || !canSave(this.game)) return;
    this.game.paused = true;
    this.save('auto', true);
    this.menu.setStatus(pauseStatus(this.game.telemetry, t('hud.lap')));
    this.menu.show();
  }

  resume(): void {
    this.game.paused = false;
    this.menu.close();
  }

  /** Esc: close the slot picker, resume, or pause. */
  toggle(): void {
    if (this.game.paused) {
      if (!this.menu.back()) this.resume();
    } else this.pause();
  }

  /** Autosave on the way out (pagehide, leaving the race). */
  autosave(): void {
    if (canSave(this.game)) this.save('auto', true);
  }

  /** Leave the paused race for the menu, keeping an autosave. */
  saveAndQuit(): void {
    this.save('auto');
    this.resume();
  }
}
