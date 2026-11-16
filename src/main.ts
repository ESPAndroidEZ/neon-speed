import { AudioManager } from './audio/audioManager';
import { installUiSound } from './audio/uiSound';
import { tuneTip } from './ui/tuneTip';
import { Engine } from './core/engine';
import { AutoQuality, isPhone } from './core/quality';
import { deviceHints, firstRunTier } from './core/perfTier';
import { installGuard, watchContextLoss } from './core/guard';
import { defaultSave, SaveStore } from './core/save';
import { CARS, findCar } from './data/cars';
import { competitiveField } from './data/rivals';
import { findTrackDef } from './data/tracks';
import { AI_SETTING } from './physics/aiDifficulty';
import { finishFreeRace } from './game/freeRace';
import { Juice } from './fx/juice';
import { attachRaceFeedback } from './game/raceFeedback';
import { Game } from './game/game';
import { StoryController } from './game/story';
import { applyDrivingSettings } from './ui/drivingSettings';
import { registerServiceWorker, showUpdatePrompt } from './core/pwa';
import { installPlatform } from './game/platform';
import { installHotkeys } from './game/hotkeys';
import { fullscreenButton } from './ui/fullscreenButton'; import { photoButton } from './ui/photo';
import { controlRows } from './ui/controlSettings';
import { createControls } from './game/inputSetup';
import { installMinimap } from './game/extras';
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
import { button, toast } from './ui/uiKit';
import { calibrate } from './ui/controlsOnboard';
import { ResultsScreen } from './ui/results';
import { installVersus } from './game/versusGate';
import { Cast } from './game/cast';
import { applySettings } from './ui/settings';
import { initLang } from './i18n/langPrefs';
import { t } from './i18n';
import { preloadCarModels } from './world/carFactory';
import { runBootLoader } from './ui/bootLoader';
import { installRotateHint } from './ui/rotateHint';
import { buildWorld } from './world/world';

/* Bootstrap: engine, world, UI, save, audio, story, then the menu. Dev query flags: ?skip (straight to a race, no menu)
   ?w=rain|snow  ?car=350z  ?ai=N rivals  ?demo (self-driving)  ?ff=seconds  ?at=zone|index  ?screen=garage|weather|settings|story */

installGuard(import.meta.env.PROD);
const container = document.getElementById('app');
if (!container) throw new Error('#app container missing from index.html');
const q = new URLSearchParams(import.meta.env.DEV ? location.search : ''); // dev flags never reach production
const direct = q.has('skip') || q.has('demo');

let kv: Storage | null = null;
try {
  kv = window.localStorage;
} catch {
  kv = null; // blocked storage: play without saving
}
preloadCarModels(CARS);
if (direct) document.getElementById('boot')?.remove(); // dev races start at once
else runBootLoader();
const slots = new SaveSlots(kv);
const store = new SaveStore(kv, defaultSave(CARS[0].id, CARS[0].color), CARS.map((c) => c.id));
const engine = new Engine({ container });
const world = buildWorld(engine.scene, engine.renderer);
watchContextLoss(engine.renderer.domElement, () => engine.stop(), () => pause.autosave());
const controls = createControls(q.has('demo') ? (q.get('demo') ?? '') : null, { pause: () => pause.toggle(), reset: () => game.resetToTrack() }, kv);
const { pad, touch } = controls;
const hud = new Hud(document.body);
const tuning = applyTuning(createDefaultTuning(), {});
let menu: Menu;
let story: StoryController;
const results = new ResultsScreen(document.body, { onAgain: () => game.restart(), onMenu: () => menu.main(), tip: () => tuneTip(store) });
const game = new Game({ engine, world, hud, results, input: controls.input, tuning });
controls.attach(engine, game);
const juice = new Juice(engine, game);
attachRaceFeedback(engine, game, hud); // corner guide + launch pop-ups
const cast = new Cast(engine.scene);
engine.onFrame((_a, dt) => cast.update(game, dt));
const audio = new AudioManager(game);
installUiSound(audio.bus, () => audio.music.keyPc);
engine.onFrame((_a, dt) => {
  audio.update(dt);
  world.update(dt, engine.camera.position.x, engine.camera.position.z, engine.renderer.domElement.clientHeight * engine.renderer.getPixelRatio());
});
const voice = new Voice(); const auto = new AutoQuality();
auto.onDowngrade = (tier) => {
  store.data.settings.quality = tier;
  store.commit();
  toast(t('main.lowFps', { tier: t(`opt.${tier}`).toUpperCase() }));
};
engine.onFrame((_a, dt) => auto.update(dt, engine));
if (!navigator.webdriver && firstRunTier(store.data.settings, deviceHints(engine.renderer.getContext(), isPhone()), kv)) store.commit(); // tests keep their tier
initLang(store);
applySettings({ store, audio: audio.bus, engine, voice, auto, game, hud });
const applyDriving = (): void => {
  applyDrivingSettings(store, pad);
  game.setWeather(game.weather); // re-grade for the chosen look
};
applyDriving();
if (q.get('look')) {
  store.data.settings.look = q.get('look') as 'neon';
  applyDriving();
}
void world.applyPropModels();

if (import.meta.env.DEV) void import('./dev/devPanels').then((m) => m.installDevPanels(audio, game, tuning, engine));

const launchFree = (w: Weather, rivals: number, trackId: string): void => {
  const def = findTrackDef(q.get('track') ?? trackId);
  story.endStory();
  const car = findCar(q.get('car') ?? store.data.selected);
  const field = competitiveField(rivals, car, store.data.upgrades[car.id] ?? {}); // same tier, full skill, your upgrades
  game.startRace({ car, paint: store.data.paint[car.id] ?? car.color, glow: store.data.glow[car.id], weather: w, laps: def.laps, trackId: def.id, cinematic: false, agents: field, meta: { rivalIds: field.map((f) => f.agent.id), skillScale: 1, wet: w !== 'CLEAR', eventId: null, level: AI_SETTING.level } });
};
menu = new Menu({
  store, audio: audio.bus, engine, voice, auto, game, hud,
  showroom: (c, p, g) => {
    game.showroom(c, p, g);
    cast.stage('mara');
  },
  layout: (l) => {
    game.showroomCam.layout = l;
  },
  visual: () => game.views.views[0]?.visual ?? null,
  onSwap: (fn) => {
    game.views.onSwap = fn ? () => fn() : null;
  },
  startRace: (w, n, trackId) => {
    menu.hide();
    launchFree(w, n, trackId);
  },
  startEvent: (ev) => story.start(ev),
  slots,
  onDriving: applyDriving,
  controlRows: () => controlRows({ fs, controls: controls.prefs, tilt: controls.tilt }),
  loadSlot: (id) => loadSlot(id),
});
const subs = new Subtitles(voice);
story = new StoryController({
  game, cast, store, results, dialogue: new DialogueBox(voice), subs, cards: new TitleCards(),
  hideMenu: () => menu.hide(), showStory: () => menu.story(), showEnding: (c) => menu.showEnding(c),
});
const pause = new PauseController(game, slots, new PauseMenu(slots, {
  extra: () => [fullscreenButton(fs), photoButton({ canvas: engine.renderer.domElement, render: () => engine.composer.render(0.016) }), controls.prefs.data.scheme === 'tilt' ? button(t('ctl.recal'), () => void calibrate(controls.tilt)) : null],
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
    versus.bypass(() => restoreGame(game, snap));
    story.resume(snap.setup.eventId);
    pause.resume();
    toast(t('main.loaded'));
  } catch {
    toast(t('main.badSave'));
    menu.main();
  }
}
if (slots.corrupt) toast(t('main.corrupt'));
const fs = installPlatform({ engine, game, pause, audioCtx: audio.bus.ctx, toMenu: () => { pause.saveAndQuit(); leaveToMenu(); } });
game.onFinish = (r) => {
  const free = story.current ? undefined : finishFreeRace(store, findTrackDef(game.setup?.trackId ?? 'kestrel'), game.weather, r, () => game.restart(), leaveToMenu);
  const extra = story.finish(r) ?? free;
  world.setHandprints(store.data.career.completed.length);
  return extra;
};
world.setHandprints(q.has('hands') ? Number(q.get('hands')) : store.data.career.completed.length);

const versus = installVersus(game, direct);
const loading = new LoadingCard();
game.onStartRace = () => loading.show();
installRadio(engine, game, subs);

installMinimap(game, world, (fn) => engine.onFrame(fn));
let hudShown = true, padsShown = true;
engine.onFrame(() => {
  const show = game.state !== 'MENU';
  const pads = show && !game.paused && game.state !== 'PODIUM'; // touch buttons never sit over the pause or results menus
  if (show !== hudShown) hud.setVisible((hudShown = show));
  if (pads !== padsShown) touch.setVisible((padsShown = pads));
});
installRotateHint();

container.addEventListener('pointerdown', () => game.skipIntro());
installHotkeys({ game, juice, story, pause, leaveToMenu });
hud.mount(fullscreenButton(fs, true));
controls.onboard();

game.setWeather((q.get('w') ?? 'clear').toUpperCase() as Weather);
// dev URL flags live in a lazily imported module (not in the production bundle); the loop starts once they ran
const ready = import.meta.env.DEV ? import('./dev/devStart').then((m) => m.runDevStart({ q, direct, game, store, world, menu, story, pause, juice, hud, leaveToMenu })) : Promise.resolve(menu.title());

registerServiceWorker(showUpdatePrompt);
void ready.then(() => engine.start());
