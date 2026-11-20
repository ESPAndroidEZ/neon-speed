import type { Engine } from '../core/engine';
import type { SaveStore } from '../core/save';
import type { Hud } from '../ui/hud';
import type { Game } from './game';
import { setFreeDrive } from '../ui/freeDriveButton';
import { installFreeRoam } from './freeRoam';

/** Free Drive (Neon Harbor) behind the main-menu button. One call from main. */
export function wireFreeDrive(d: { engine: Engine; game: Game; hud: Hud; store: SaveStore; toMenu: () => void; hideMenu: () => void }): void {
  const roam = installFreeRoam(d);
  setFreeDrive(() => { d.hideMenu(); roam.enter(); }); // from the main menu: nothing else is running
}
