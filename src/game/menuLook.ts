import type { Engine } from '../core/engine';
import type { Game } from './game';

/** Bloom is eased down in the menus: a white car facing the camera with its headlights on bloomed into one bright blob. */
const MENU_BLOOM = 0.55;

export function attachMenuLook(engine: Engine, game: Game): void {
  let saved = -1; // the strength to give back when the menus close; -1 = not lowered
  engine.onFrame(() => {
    const menu = game.state === 'MENU';
    if (menu && saved < 0) { saved = engine.baseBloomStrength; engine.setBloom({ strength: saved * MENU_BLOOM }); }
    else if (!menu && saved >= 0) { if (Math.abs(engine.baseBloomStrength - saved * MENU_BLOOM) < 1e-6) engine.setBloom({ strength: saved }); saved = -1; } // changed meanwhile (Settings > Graphics): keep the new value
  });
}
