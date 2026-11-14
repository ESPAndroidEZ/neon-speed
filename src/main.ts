import { Vector3 } from 'three';
import { CinematicCam } from './camera/cinematicCam';
import { createIntroShots } from './camera/shots';
import { Engine } from './core/engine';
import { buildSmokeScene } from './dev/smokeScene';
import type { CameraPose, GameState } from './types/game';

/*
 * BOOTSTRAP orchestrator. Wires CINEMATIC -> RACING only.
 * Replaced next block by the real one (carController, chaseCam, input, HUD).
 */

const container = document.getElementById('app');
if (!container) throw new Error('#app container missing from index.html');

const engine = new Engine({ container });
const car = buildSmokeScene(engine.scene);
let state: GameState = 'CINEMATIC';

// TEMP: fixed chase pose until src/camera/chaseCam.ts exists.
const chasePose: CameraPose = { position: new Vector3(), lookAt: new Vector3(), fov: 62 };
const chase = (): CameraPose => {
  chasePose.position.set(0, 2.6, -6.5).add(car.position);
  chasePose.lookAt.set(0, 1, 8).add(car.position);
  return chasePose;
};

const intro = new CinematicCam({ camera: engine.camera, subject: car, shots: createIntroShots(), handover: chase });
intro.onShotChange = () => engine.kickBloom(0.7);
intro.onComplete = () => {
  state = 'RACING';
};

engine.onFrame((_alpha, frameDt) => {
  if (state === 'CINEMATIC') intro.update(frameDt);
});

container.addEventListener('pointerdown', () => {
  if (state === 'CINEMATIC') intro.skip();
});

intro.start();
engine.start();
