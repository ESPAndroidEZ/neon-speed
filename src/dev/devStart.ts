import { roamDev } from '../game/freeDriveSetup';
import type { DistrictId } from '../types/world';
import { showPeopleGallery } from './peopleGallery';
import { installProbe } from './probe';
import { buildResult } from '../core/raceResult';
import { buildPerson } from '../world/peopleAdapter';
import { STAGE } from '../world/stage';
import { findTrackDef, TRACKS } from '../data/tracks';
import type { SaveStore } from '../core/save';
import { CARS, findCar } from '../data/cars';
import { freeRaceField } from '../data/rivals';
import { findAnyEvent as findEvent } from '../data/story2';
import type { Juice } from '../fx/juice';
import type { Game } from '../game/game';
import type { PauseController } from '../game/pause';
import type { StoryController } from '../game/story';
import type { Hud } from '../ui/hud';
import type { Menu } from '../ui/menu';
import type { World } from '../world/world';

export interface DevStartDeps {
  q: URLSearchParams;
  direct: boolean;
  game: Game;
  store: SaveStore;
  world: World;
  menu: Menu;
  story: StoryController;
  pause: PauseController;
  juice: Juice;
  hud: Hud;
  leaveToMenu: () => void;
}

/**
 * THROWAWAY dev entry points driven by URL flags: `?skip ?demo ?ai ?at ?ff ?wi ?pause ?showcase` start a race directly,
 * `?showcar=id&angle=front|side|rear|q` shows one car on the stage, `?screen=...` opens a menu screen, `?event=id` a story event.
 * Without any flag the title screen opens.
 */
export function runDevStart(d: DevStartDeps): void {
  const { q, game, store, world, menu, story, pause, juice, hud } = d;
  if (q.has('probe')) { installProbe(game); (window as unknown as Record<string, unknown>).__rbGame = game; } // dev: screen positions for scripts/viewport-check.mjs, game handle for scripts/online-check.mjs
  if (q.has('soak')) { // dev: stats for scripts/soak.mjs (leak and crash hunting)
    const eng = (game as unknown as { d: { engine: { renderer: import('three').WebGLRenderer; scene: import('three').Scene; prof: Record<string, number>; workMs: number; dynScale: number } } }).d.engine;
    let objects = 0;
    (window as unknown as Record<string, unknown>).__rbRenderer = eng.renderer;
    (window as unknown as Record<string, unknown>).__rbScene = eng.scene;
    (window as unknown as Record<string, unknown>).__rbStats = () => {
      const i = eng.renderer.info; objects = 0; eng.scene.traverse(() => { objects++; });
      return { geometries: i.memory.geometries, textures: i.memory.textures, programs: i.programs?.length ?? 0, calls: i.render.calls, triangles: i.render.triangles, objects, ...eng.prof, work: eng.workMs, dyn: eng.dynScale, lap: game.rm.player.lapTimes.length };
    };
    (window as unknown as Record<string, unknown>).__rbCycle = (n: number) => { // new race: next car, track and weather
      const ws = ['CLEAR', 'RAIN', 'SNOW'] as const, tr = TRACKS[n % TRACKS.length], car = CARS[n % CARS.length], f = freeRaceField(5);
      game.setWeather(ws[n % 3]);
      game.startRace({ car, paint: car.color, glow: undefined, weather: ws[n % 3], laps: tr.laps, trackId: tr.id, cinematic: false, agents: f, meta: { rivalIds: f.map((x) => x.agent.id), skillScale: 1, wet: n % 3 !== 0, eventId: null } });
      if (n % 4 === 3) d.leaveToMenu();
    };
  }
if (d.direct) {
  const car = findCar(q.get('car') ?? store.data.selected);
  const field = freeRaceField(Number(q.get('ai') ?? 0));
  game.startRace({ car, paint: store.data.paint[car.id] ?? car.color, glow: store.data.glow[car.id], weather: game.weather, laps: findTrackDef(q.get('track') ?? 'kestrel').laps, trackId: q.get('track') ?? undefined, cinematic: false, agents: field, meta: { rivalIds: field.map((f) => f.agent.id), skillScale: 1, wet: game.weather !== 'CLEAR', eventId: null } });
  if (q.has('wi')) game.weatherIntensity = Number(q.get('wi')); // dev: force the rain/snow build-up
  const at = q.get('at'); // dev: start at a zone (tunnel, bridge, dock, plaza, alley) or a sample index
  if (at) {
    const idx = Number.isNaN(Number(at)) ? world.track.zones.indexOf(at as never) + 6 : Number(at);
    game.rm.player.contact.place(game.rm.player.car, Math.max(0, idx));
    game.views.update(0, 0);
  }
  if (q.has('showcase')) juice.toggleShowcase();
  if (q.has('ff')) game.fastForward(Number(q.get('ff')));
  if (q.get('pause') === 'menu') pause.pause(); // dev: open the pause menu
  if (q.has('results')) { // dev: the results screen over the running race (layout checks)
    const res = buildResult(game.rm.racers, game.rm.player, 3);
    (game as unknown as { d: { results: { show: (r: typeof res) => void } } }).d.results.show(res);
  }
  if (q.get('pause') === 'load') {
    pause.pause(); // dev: autosave, quit to the menu and open the load screen
    pause.saveAndQuit();
    d.leaveToMenu();
    menu.load();
  }
} else {
  if (q.get('car')) store.data.selected = findCar(q.get('car') ?? '').id; // dev: preview any car
  if (q.has('people')) { // dev: people gallery (12 looks x clips) beside the stage; Qwen task 056 previews peopleModels here
    const eng = (game as unknown as { d: { engine: { scene: import('three').Scene; onFrame: (f: (a: number, dt: number) => void) => void } } }).d.engine;
    const tick = showPeopleGallery(eng.scene, buildPerson, STAGE.x, STAGE.z + 5);
    eng.onFrame((_a, dt) => tick(dt));
  }
  if (q.has('showcar')) { // dev: one car on the stage from a fixed angle, no UI (for screenshots)
    const c = findCar(q.get('showcar') ?? '');
    game.showroom(c, c.color, undefined);
    const a = { front: 0.5, side: 0.5 + Math.PI / 2, rear: 0.5 + Math.PI, q: 0.5 + 0.7 }[q.get('angle') ?? 'q'] ?? 1.2;
    game.showroomCam.fixedAngle = a;
    game.showroomCam.distance = Number(q.get('dist') ?? 6.5);
    hud.setVisible(false);
  } else menu.title();
  const scr = q.get('screen');
  if (scr === 'main') menu.main();
  else if (scr === 'garage') menu.garage();
  else if (scr === 'weather' || scr === 'maps') menu.maps();
  else if (scr === 'settings') menu.settings();
  else if (scr === 'tune') menu.tune();
  else if (scr === 'story') menu.story();
  else if (scr === 'crew') menu.crew();
  else if (scr === 'online') menu.online();
  else if (q.get('event')) story.start(findEvent(q.get('event') ?? '')); // dev: jump into a story event
  const roam = q.get('roam'); // dev: Free Drive in a district (visual checks): ?roam=strip&w=rain
  if (roam && roamDev) { menu.hide(); roamDev.enter(); if (roam !== '1') roamDev.travel(roam as DistrictId); }
}

}
