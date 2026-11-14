import type { SaveStore } from '../core/save';
import { findCar } from '../data/cars';
import { freeRaceField } from '../data/rivals';
import { findEvent } from '../data/story';
import type { Juice } from '../fx/juice';
import type { Game } from '../game/game';
import type { PauseController } from '../game/pause';
import type { StoryController } from '../game/story';
import type { Hud } from '../ui/hud';
import type { Menu } from '../ui/menu';
import type { World } from '../world/world';

export interface DevStartDeps {
  q: URLSearchParams;
  direct: boolean;
  game: Game;
  store: SaveStore;
  world: World;
  menu: Menu;
  story: StoryController;
  pause: PauseController;
  juice: Juice;
  hud: Hud;
  leaveToMenu: () => void;
}

/**
 * THROWAWAY dev entry points driven by URL flags: `?skip ?demo ?ai ?at ?ff ?wi ?pause ?showcase` start a race directly,
 * `?showcar=id&angle=front|side|rear|q` shows one car on the stage, `?screen=...` opens a menu screen, `?event=id` a story event.
 * Without any flag the title screen opens.
 */
export function runDevStart(d: DevStartDeps): void {
  const { q, game, store, world, menu, story, pause, juice, hud } = d;
if (d.direct) {
  const car = findCar(q.get('car') ?? store.data.selected);
  const field = freeRaceField(Number(q.get('ai') ?? 0));
  game.startRace({ car, paint: store.data.paint[car.id] ?? car.color, glow: store.data.glow[car.id], weather: game.weather, laps: 3, cinematic: false, agents: field, meta: { rivalIds: field.map((f) => f.agent.id), skillScale: 1, wet: game.weather !== 'CLEAR', eventId: null } });
  if (q.has('wi')) game.weatherIntensity = Number(q.get('wi')); // dev: force the rain/snow build-up
  const at = q.get('at'); // dev: start at a zone (tunnel, bridge, dock, plaza, alley) or a sample index
  if (at) {
    const idx = Number.isNaN(Number(at)) ? world.track.zones.indexOf(at as never) + 6 : Number(at);
    game.rm.player.contact.place(game.rm.player.car, Math.max(0, idx));
    game.views.update(0, 0);
  }
  if (q.has('showcase')) juice.toggleShowcase();
  if (q.has('ff')) game.fastForward(Number(q.get('ff')));
  if (q.get('pause') === 'menu') pause.pause(); // dev: open the pause menu
  if (q.get('pause') === 'load') {
    pause.pause(); // dev: autosave, quit to the menu and open the load screen
    pause.saveAndQuit();
    d.leaveToMenu();
    menu.load();
  }
} else {
  if (q.get('car')) store.data.selected = findCar(q.get('car') ?? '').id; // dev: preview any car
  if (q.has('showcar')) { // dev: one car on the stage from a fixed angle, no UI (for screenshots)
    const c = findCar(q.get('showcar') ?? '');
    game.showroom(c, c.color, undefined);
    const a = { front: 0.5, side: 0.5 + Math.PI / 2, rear: 0.5 + Math.PI, q: 0.5 + 0.7 }[q.get('angle') ?? 'q'] ?? 1.2;
    game.showroomCam.fixedAngle = a;
    game.showroomCam.distance = Number(q.get('dist') ?? 6.5);
    hud.setVisible(false);
  } else menu.title();
  const scr = q.get('screen');
  if (scr === 'garage') menu.garage();
  else if (scr === 'weather') menu.weather();
  else if (scr === 'settings') menu.settings();
  else if (scr === 'story') menu.story();
  else if (scr === 'crew') menu.crew();
  else if (q.get('event')) story.start(findEvent(q.get('event') ?? '')); // dev: jump into a story event
}

}
