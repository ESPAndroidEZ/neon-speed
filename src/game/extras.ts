import type { CarState } from '../types/game';
import { createMinimap } from '../ui/minimap';
import type { World } from '../world/world';
import type { Game } from './game';

/** HUD extras tied to the current track: the minimap (hidden outside races). */
export function installMinimap(game: Game, world: World, onFrame: (fn: () => void) => void): void {
  let track = world.track;
  let map = createMinimap(document.body, track.samples);
  const states: CarState[] = [];
  let shown = true;
  onFrame(() => {
    if (world.track !== track) {
      track = world.track;
      map.dispose();
      map = createMinimap(document.body, track.samples);
      shown = true;
    }
    const show = game.state === 'RACING' || game.state === 'PODIUM';
    if (show !== shown) {
      shown = show;
      map.setVisible(show);
    }
    if (!show) return;
    const rs = game.rm.racers;
    states.length = rs.length;
    let me = 0;
    for (let i = 0; i < rs.length; i++) {
      states[i] = rs[i].car.state;
      if (rs[i].isPlayer) me = i;
    }
    map.update(states, me);
  });
}
