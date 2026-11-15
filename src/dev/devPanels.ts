import type { AudioManager } from '../audio/audioManager';
import type { Game } from '../game/game';
import type { CarTuning } from '../physics/carTuning';
import { AudioTestPanel } from './audioTestPanel';
import { TuningPanel } from './tuningPanel';
import { installFpsCounter } from './fpsCounter';
import type { Engine } from '../core/engine';

/** Dev-only panels (K audio test, ` tuning, F3 FPS). main.ts imports this lazily in dev builds only, so prod never ships them. */
export function installDevPanels(audio: AudioManager, game: Game, tuning: CarTuning, engine: Engine): void {
  installFpsCounter((fn) => engine.onFrame(fn), () => engine.workMs);
  new AudioTestPanel(document.body, audio);
  const panel = new TuningPanel(document.body);
  panel.add('car', tuning);
  panel.add('chase', game.chase.tuning);
  panel.build();
}
