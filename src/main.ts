import { AudioManager } from './audio/audioManager';
import { Engine } from './core/engine';
import { AutoQuality } from './core/quality';
import { defaultSave, SaveStore } from './core/save';
import { CARS, findCar } from './data/cars';
import { freeRaceField } from './data/rivals';
import { findEvent } from './data/story';
import { AudioTestPanel } from './dev/audioTestPanel';
import { DemoInput } from './dev/demoInput';
import { TuningPanel } from './dev/tuningPanel';
import { Juice } from './fx/juice';
import { Game } from './game/game';
import { StoryController } from './game/story';
import { KeyboardInput } from './input/keyboard';
import { applyTuning, createDefaultTuning } from './physics/carTuning';
import type { Weather } from './types/game';
import { DialogueBox, Subtitles, Voice } from './ui/dialogue';
import { PauseController } from './game/pause';
import { installRadio } from './game/radioHook';
import { restoreGame } from './game/saveGame';
import { SaveSlots } from './core/gameSave';
import { Hud } from './ui/hud';
import { LoadingCard } from './ui/loadingCard';
import { TitleCards } from './ui/titleCards';
import { Menu } from './ui/menu';
import { PauseMenu } from './ui/pauseMenu';
import { toast } from './ui/uiKit';
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
const slots = new SaveSlots(kv);
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
const juice = new Juice(engine, game);
const audio = new AudioManager(game);
engine.onFrame((_a, dt) => {
  audio.update(dt);
  world.update(dt, engine.camera.position.x, engine.camera.position.z, engine.renderer.domElement.clientHeight * engine.renderer.getPixelRatio());
});
const voice = new Voice();
const auto = new AutoQuality();
auto.onDowngrade = (tier) => {
  store.data.settings.quality = tier;
  store.commit();
  toast(`Frame rate was low: graphics lowered to ${tier.toUpperCase()}. (Settings: Auto quality)`);
};
engine.onFrame((_a, dt) => auto.update(dt, engine));
applySettings({ store, audio: audio.bus, engine, voice, auto, game });
void world.applyPropModels();

new AudioTestPanel(document.body, audio);
const panel = new TuningPanel(document.body);
panel.add('car', tuning);
panel.add('chase', game.chase.tuning);
panel.build();

const launchFree = (w: Weather, rivals: number): void => {
  story.endStory();
  const car = findCar(q.get('car') ?? store.data.selected);
  const field = freeRaceField(rivals);
  game.startRace({ car, paint: store.data.paint[car.id] ?? car.color, glow: store.data.glow[car.id], weather: w, laps: 3, cinematic: false, agents: field, meta: { rivalIds: field.map((f) => f.agent.id), skillScale: 1, wet: w !== 'CLEAR', eventId: null } });
};
menu = new Menu({
  store, audio: audio.bus, engine, voice, auto, game,
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
  slots,
  loadSlot: (id) => loadSlot(id),
});
const subs = new Subtitles(voice);
story = new StoryController({
  game, store, results, dialogue: new DialogueBox(voice), subs, cards: new TitleCards(),
  hideMenu: () => menu.hide(), showStory: () => menu.story(), showEnding: () => menu.showEnding(),
});
const pause = new PauseController(game, slots, new PauseMenu(slots, {
  onResume: () => pause.resume(),
  onRestart: () => {
    pause.resume();
    game.restart();
  },
  onSave: (id) => void pause.save(id),
  onSaveQuit: () => {
    pause.saveAndQuit();
    leaveToMenu();
  },
}), toast);
const leaveToMenu = (): void => {
  results.hide();
  story.endStory();
  menu.main();
};
function loadSlot(id: import('./core/gameSave').SlotId): void {
  const snap = slots.get(id);
  if (!snap) return;
  try {
    menu.hide();
    results.hide();
    restoreGame(game, snap);
    story.resume(snap.setup.eventId);
    pause.resume();
    toast('Loaded');
  } catch {
    toast('That save could not be loaded');
    menu.main();
  }
}
if (slots.corrupt) toast('Some saved games were unreadable and were skipped');
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause.pause();
});
window.addEventListener('pagehide', () => pause.autosave());
game.onFinish = (r) => {
  const extra = story.finish(r);
  world.setHandprints(store.data.career.completed.length);
  return extra;
};
world.setHandprints(q.has('hands') ? Number(q.get('hands')) : store.data.career.completed.length);

const loading = new LoadingCard();
game.onStartRace = () => loading.show();
installRadio(engine, game, subs);

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
  if (game.paused && e.code !== 'Escape') return;
  if (e.code === 'KeyR') game.resetToTrack();
  else if (e.code === 'KeyP') toast(juice.toggleShowcase() ? 'Particle showcase ON (P)' : 'Particle showcase off');
  else if (e.code === 'Digit1') game.setWeather('CLEAR');
  else if (e.code === 'Digit2') game.setWeather('RAIN');
  else if (e.code === 'Digit3') game.setWeather('SNOW');
  else if (e.code === 'Enter' && game.state === 'PODIUM' && !story.current) game.restart();
  else if (e.code === 'Escape') {
    if (game.state === 'CINEMATIC') game.skipIntro(); // skipping never leaves the race
    else if (game.state === 'PODIUM') leaveToMenu();
    else pause.toggle();
  } else if (e.code !== 'Backquote') game.skipIntro();
});

game.setWeather((q.get('w') ?? 'clear').toUpperCase() as Weather);
if (direct) {
  const car = findCar(q.get('car') ?? store.data.selected);
  const field = freeRaceField(Number(q.get('ai') ?? 0));
  game.startRace({ car, paint: store.data.paint[car.id] ?? car.color, glow: store.data.glow[car.id], weather: game.weather, laps: 3, cinematic: false, agents: field, meta: { rivalIds: field.map((f) => f.agent.id), skillScale: 1, wet: game.weather !== 'CLEAR', eventId: null } });
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
    leaveToMenu();
    menu.load();
  }
} else {
  if (q.get('car')) store.data.selected = findCar(q.get('car') ?? '').id; // dev: preview any car
  menu.title();
  const scr = q.get('screen');
  if (scr === 'garage') menu.garage();
  else if (scr === 'weather') menu.weather();
  else if (scr === 'settings') menu.settings();
  else if (scr === 'story') menu.story();
  else if (scr === 'crew') menu.crew();
  else if (q.get('event')) story.start(findEvent(q.get('event') ?? '')); // dev: jump into a story event
}

engine.start();
