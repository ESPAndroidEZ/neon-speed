import { AudioManager } from './audio/audioManager';
import { Engine } from './core/engine';
import { defaultSave, SaveStore } from './core/save';
import { CARS, findCar } from './data/cars';
import { freeRaceField } from './data/rivals';
import { DemoInput } from './dev/demoInput';
import { TuningPanel } from './dev/tuningPanel';
import { Juice } from './fx/juice';
import { Game } from './game/game';
import { StoryController } from './game/story';
import { KeyboardInput } from './input/keyboard';
import { applyTuning, createDefaultTuning } from './physics/carTuning';
import type { Weather } from './types/game';
import { DialogueBox, Subtitles, Voice } from './ui/dialogue';
import { Hud } from './ui/hud';
import { Menu } from './ui/menu';
import { ResultsScreen } from './ui/results';
import { applySettings } from './ui/settings';
import { preloadCarModels } from './world/carFactory';
import { buildWorld } from './world/world';

/* Bootstrap: engine, world, UI, save, audio, story, then the menu. Dev query flags: ?skip (straight to a race, no menu)
   ?w=rain|snow  ?car=350z  ?ai=N rivals  ?demo (self-driving)  ?ff=seconds  ?at=zone|index  ?screen=garage|weather|settings|story */

const container = document.getElementById('app');
if (!container) throw new Error('#app container missing from index.html');
const q = new URLSearchParams(location.search);
const direct = q.has('skip') || q.has('demo');

let kv: Storage | null = null;
try {
  kv = window.localStorage;
} catch {
  kv = null; // blocked storage: play without saving
}
preloadCarModels(CARS);
const store = new SaveStore(kv, defaultSave(CARS[0].id, CARS[0].color), CARS.map((c) => c.id));

const engine = new Engine({ container });
const world = buildWorld(engine.scene, engine.renderer);
const input = q.has('demo') ? new DemoInput() : new KeyboardInput();
const hud = new Hud(document.body);
const tuning = applyTuning(createDefaultTuning(), {});
let menu: Menu;
let story: StoryController;
const results = new ResultsScreen(document.body, { onAgain: () => game.restart(), onMenu: () => menu.main() });
const game = new Game({ engine, world, hud, results, input, tuning });
new Juice(engine, game);
const audio = new AudioManager(game);
engine.onFrame((_a, dt) => {
  audio.update(dt);
  world.update(dt, engine.camera.position.x, engine.camera.position.z, engine.renderer.domElement.clientHeight * engine.renderer.getPixelRatio());
});
const voice = new Voice();
applySettings({ store, audio: audio.bus, engine, voice });

const panel = new TuningPanel(document.body);
panel.add('car', tuning);
panel.add('chase', game.chase.tuning);
panel.build();

const launchFree = (w: Weather, rivals: number): void => {
  story.endStory();
  const car = findCar(q.get('car') ?? store.data.selected);
  game.startRace({ car, paint: store.data.paint[car.id] ?? car.color, glow: store.data.glow[car.id], weather: w, laps: 3, cinematic: false, agents: freeRaceField(rivals) });
};
menu = new Menu({
  store, audio: audio.bus, engine, voice,
  showroom: (c, p, g) => game.showroom(c, p, g),
  shift: (m) => {
    game.showroomCam.shift = m;
  },
  visual: () => game.views.views[0]?.visual ?? null,
  onSwap: (fn) => {
    game.views.onSwap = fn ? () => fn() : null;
  },
  startRace: (w, n) => {
    menu.hide();
    launchFree(w, n);
  },
  startEvent: (ev) => story.start(ev),
});
story = new StoryController({
  game, store, results, dialogue: new DialogueBox(voice), subs: new Subtitles(voice),
  hideMenu: () => menu.hide(), showStory: () => menu.story(), showEnding: () => menu.showEnding(),
});
game.onFinish = (r) => story.finish(r);

let hudShown = true;
engine.onFrame(() => {
  const show = game.state !== 'MENU';
  if (show !== hudShown) {
    hudShown = show;
    hud.setVisible(show);
  }
});

container.addEventListener('pointerdown', () => game.skipIntro());
window.addEventListener('keydown', (e) => {
  if (e.repeat || game.state === 'MENU') return;
  if (e.code === 'KeyR') game.resetToTrack();
  else if (e.code === 'Digit1') game.setWeather('CLEAR');
  else if (e.code === 'Digit2') game.setWeather('RAIN');
  else if (e.code === 'Digit3') game.setWeather('SNOW');
  else if (e.code === 'Enter' && game.state === 'PODIUM' && !story.current) game.restart();
  else if (e.code === 'Escape') {
    results.hide();
    story.endStory();
    menu.main();
  } else if (e.code !== 'Backquote') game.skipIntro();
});

game.setWeather((q.get('w') ?? 'clear').toUpperCase() as Weather);
if (direct) {
  const car = findCar(q.get('car') ?? store.data.selected);
  game.startRace({ car, paint: store.data.paint[car.id] ?? car.color, glow: store.data.glow[car.id], weather: game.weather, laps: 3, cinematic: false, agents: freeRaceField(Number(q.get('ai') ?? 0)) });
  const at = q.get('at'); // dev: start at a zone (tunnel, bridge, dock, plaza, alley) or a sample index
  if (at) {
    const idx = Number.isNaN(Number(at)) ? world.track.zones.indexOf(at as never) + 6 : Number(at);
    game.rm.player.contact.place(game.rm.player.car, Math.max(0, idx));
    game.views.update(0, 0);
  }
  if (q.has('ff')) game.fastForward(Number(q.get('ff')));
} else {
  if (q.get('car')) store.data.selected = findCar(q.get('car') ?? '').id; // dev: preview any car
  menu.title();
  const scr = q.get('screen');
  if (scr === 'garage') menu.garage();
  else if (scr === 'weather') menu.weather();
  else if (scr === 'settings') menu.settings();
  else if (scr === 'story') menu.story();
}

engine.start();
