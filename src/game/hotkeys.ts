import type { Juice } from '../fx/juice';
import { toast } from '../ui/uiKit';
import type { Game } from './game';
import type { PauseController } from './pause';
import type { StoryController } from './story';

export interface HotkeyDeps {
  game: Game;
  juice: Juice;
  story: StoryController;
  pause: PauseController;
  leaveToMenu: () => void;
}

/** In-race keys: R reset, Esc pause / skip / leave the podium, Enter restart a free race. Dev keys (P, 1-3) only in dev builds. */
export function installHotkeys(d: HotkeyDeps): void {
  const { game, juice, story, pause } = d;
  window.addEventListener('keydown', (e) => {
    if (e.repeat || game.state === 'MENU') return;
    if (game.paused && e.code !== 'Escape') return;
    if (e.code === 'KeyR') game.resetToTrack();
    else if (import.meta.env.DEV && e.code === 'KeyP') toast(juice.toggleShowcase() ? 'Particle showcase ON (P)' : 'Particle showcase off');
    else if (import.meta.env.DEV && e.code === 'Digit1') game.setWeather('CLEAR');
    else if (import.meta.env.DEV && e.code === 'Digit2') game.setWeather('RAIN');
    else if (import.meta.env.DEV && e.code === 'Digit3') game.setWeather('SNOW');
    else if (e.code === 'Enter' && game.state === 'PODIUM' && !story.current) game.restart();
    else if (e.code === 'Escape') {
      if (game.state === 'CINEMATIC') game.skipIntro(); // skipping never leaves the race
      else if (game.state === 'PODIUM') d.leaveToMenu();
      else pause.toggle();
    } else if (e.code !== 'Backquote') game.skipIntro();
  });
}
