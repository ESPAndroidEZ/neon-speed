import type { Engine } from '../core/engine';
import type { SaveStore } from '../core/save';
import type { Hud } from '../ui/hud';
import type { Game } from './game';
import { setFreeDrive } from '../ui/freeDriveButton';
import { installFreeRoam, type RoamLab } from './freeRoam';
import { installCityRaces } from './cityRaceLaunch';
import { installStoryPins } from './storyPinLaunch';
import type { StoryController } from './story';
import type { DistrictId } from '../types/world';
import type { ShopKind } from '../core/shops';
import { installFlow } from './flowLaunch';

/** Dev only (devStart `?roam=<district>`): open Free Drive in a district without the menu. */
export let roamDev: { enter(): void; travel(d: DistrictId): void; routeLength(): number; lab: RoamLab; city: { start(r: import('../core/cityRace').CityRace, field?: import('../data/rivals').FieldEntry[]): void } } | null = null;

/** Free Drive (Neon Harbor) behind the main-menu button. One call from main. */
export function wireFreeDrive(d: { engine: Engine; game: Game; hud: Hud; store: SaveStore; toMenu: () => void; hideMenu: () => void; hideResults: () => void; story: StoryController; shop: (k: ShopKind, back: () => void) => void }): void {
  const roam = installFreeRoam(d);
  const city = installCityRaces({ engine: d.engine, game: d.game, store: d.store, hideResults: d.hideResults, enterRoam: () => roam.enter(), toMenu: d.toMenu }); // W5.5 city races
  installStoryPins({ engine: d.engine, game: d.game, store: d.store, story: d.story, hideResults: d.hideResults, enterRoam: () => roam.enter() }); // story places in the city
  installFlow({ engine: d.engine, game: d.game, hud: d.hud, store: d.store, shop: (k, back) => d.shop(k, () => { d.hideMenu(); back(); }), enterRoam: () => roam.enter(), startRace: city.start }); // challengers, shops
  roamDev = { ...roam, city };
  setFreeDrive(() => { d.hideMenu(); roam.enter(); }); // from the main menu: nothing else is running
}
