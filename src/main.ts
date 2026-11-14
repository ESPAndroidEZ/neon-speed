import { Engine } from './core/engine';
import { CARS } from './data/cars';
import { TuningPanel } from './dev/tuningPanel';
import { Game } from './game/game';
import { KeyboardInput } from './input/keyboard';
import { applyTuning, createDefaultTuning } from './physics/carTuning';
import type { Weather } from './types/game';
import { Hud } from './ui/hud';
import { ResultsScreen } from './ui/results';
import { buildWorld } from './world/world';

/* Bootstrap: build the engine, world and UI, hand everything to Game. Dev query flags: ?skip  ?w=rain|snow  ?car=350z */

const container = document.getElementById('app');
if (!container) throw new Error('#app container missing from index.html');
const q = new URLSearchParams(location.search);

const engine = new Engine({ container });
const world = buildWorld(engine.scene, engine.renderer);
const input = new KeyboardInput();
const hud = new Hud(document.body);
const tuning = applyTuning(createDefaultTuning(), {});
let game: Game;
const results = new ResultsScreen(document.body, { onAgain: () => game.restart() });
game = new Game({ engine, world, hud, results, input, tuning });

const panel = new TuningPanel(document.body);
panel.add('car', tuning);
panel.add('chase', game.chase.tuning);
panel.build();

const car = CARS.find((c) => c.id === q.get('car')) ?? CARS[0];
const weather = (q.get('w') ?? 'clear').toUpperCase() as Weather;
game.startRace({ car, paint: car.color, weather, laps: 3, cinematic: !q.has('skip'), agents: [] });

container.addEventListener('pointerdown', () => game.skipIntro());
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'KeyR') game.resetToTrack();
  else if (e.code === 'Digit1') game.setWeather('CLEAR');
  else if (e.code === 'Digit2') game.setWeather('RAIN');
  else if (e.code === 'Digit3') game.setWeather('SNOW');
  else if (e.code === 'Enter' && game.state === 'PODIUM') game.restart();
  else if (e.code !== 'Backquote') game.skipIntro();
});

engine.start();
