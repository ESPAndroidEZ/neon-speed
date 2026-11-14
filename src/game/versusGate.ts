import { findTrackDef } from '../data/tracks';
import { showVersus } from '../ui/versus';
import type { Game } from './game';

/**
 * Puts the versus screen in front of every race start (story and free). Restarts, loaded saves and the dev `?skip`/`?demo`
 * flags go straight in. `bypass(fn)` runs `fn` with the screen switched off.
 */
export function installVersus(game: Game, direct: boolean): { bypass: (fn: () => void) => void } {
  let off = direct;
  const bypass = (fn: () => void): void => {
    const was = off;
    off = true;
    try {
      fn();
    } finally {
      off = was;
    }
  };
  const rawStart = game.startRace.bind(game);
  const rawRestart = game.restart.bind(game);
  game.restart = () => bypass(rawRestart);
  game.startRace = (s) => {
    if (off) return rawStart(s);
    showVersus({ player: s.car, weather: s.weather, def: findTrackDef(s.trackId ?? 'kestrel'), rivalIds: s.agents.map((a) => a.agent.id) }, () => rawStart(s));
  };
  return { bypass };
}
