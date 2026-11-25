import { Group } from 'three';
import { t, type StringKey } from '../i18n';
import type { Engine } from '../core/engine';
import type { SaveStore } from '../core/save';
import type { Hud } from '../ui/hud';
import type { Game } from './game';
import type { Footprint, RoadGraph } from '../types/world';
import { roamMarkers } from './roamMarkers';
import { RaceManager } from '../core/raceManager';
import { findCar } from '../data/cars';
import { applyBuild } from '../data/carBuild';
import { applyTuning, createDefaultTuning } from '../physics/carTuning';
import { RoamContact } from '../physics/roamContact';
import { RoamTraffic } from '../physics/roamTraffic';
import { TrafficView } from '../world/open/trafficView';
import { RoamPeds } from '../physics/roamPeds';
import { PedView } from '../world/open/pedView';
import { roamMap, type RoamMap } from '../ui/roamMap';
import { RoamActivities } from './roamActivities';
import { RoamProgress } from './roamProgress';
import { fillEnv, type PhysicsEnv } from '../physics/weatherLevels';
import { createRoadHit } from '../world/roads/roadIndex';
import { generateRoads } from '../world/roads/generate';
import { generateFootprints } from '../world/open/footprints';
import { cellOf, chunkCount, chunkIndex } from '../world/open/chunkIndex';
import { chunkJob, disposeChunk, roamMaterials, type RoamMaterials } from '../world/open/chunkMesh';
import { districtFog, weatherSurfaces } from '../world/open/roamLook';
import { look } from '../core/looks';
import { LOOK_CONFIG } from '../render/lookConfig';
import type { Weather } from '../types/game';
import { Streamer } from '../world/open/streamer';
import { roamHud, type RoamHud } from '../ui/roamHud';
import { RoamMissions } from './roamMissions';
import { RoamStory } from './roamStory';
import { RoamStuck } from './roamStuck';
import { districtPct } from './districtDone';
import { TimeOfDay } from '../world/open/timeOfDay';
import { roamPause, type RoamPause } from '../ui/roamPause';
import type { DistrictId } from '../types/world';

/** Labs only (tests/lab/roam-activities.mjs): where the first drift zone and camera are, and a teleport. */
export interface RoamLab { spots(): { zone: { x: number; z: number; r: number } | null; trap: { x: number; z: number; tx: number; tz: number } | null; meet: { x: number; z: number; r: number } | null; pins: readonly { event: string; x: number; z: number }[] }; placeAt(x: number, z: number, h: number, speed?: number): void; wanted(): void; tod(t: 'night' | 'dusk' | 'dawn' | 'day'): void }

interface City { g: RoadGraph; fs: Footprint[]; contact: RoamContact; streamer: Streamer<Group>; group: Group; mats: RoamMaterials; traffic: RoamTraffic; trafficView: TrafficView; peds: RoamPeds; pedView: PedView; map: RoamMap; acts: RoamActivities; missions: RoamMissions; story: RoamStory; progress: RoamProgress; dispose(): void }

/**
 * Free Drive in Neon Harbor (GameState FREEROAM, docs/open-world.md): the player's garage car on the open city, chunks
 * streamed around the camera, buildings and the quay as walls. The car is the player of a RaceManager that never starts,
 * so the engine sound, effects and camera follow it as in a race; Game hands this module the fixed step and the frame.
 */
export function installFreeRoam(d: { engine: Engine; game: Game; hud: Hud; store: SaveStore; toMenu: () => void }): { enter(): void; travel(d: DistrictId): void; routeLength(): number; lab: RoamLab } {
  const { engine, game } = d;
  let city: City | null = null;
  const tod = new TimeOfDay(engine.scene, d.store);
  let ui: RoamHud | null = null;
  let menu: RoamPause | null = null;
  let mapFromDrive = false; // the M key / map button opened the map over the drive (Back resumes), not from the pause menu
  let active = false, hinted = false; const stuck = new RoamStuck();
  let shownWeather: Weather | null = null;
  const cars = new Float32Array(2 * 41);
  const hit = createRoadHit(), p = { x: 0, z: 0 };
  const env: PhysicsEnv = fillEnv({ name: 'CLEAR', grip: 1, fogDensity: 0, fogColor: 0, precipitation: 0, roadRoughness: 0, level: 'NORMAL', yawDampMul: 1, assistMul: 1, rearGripMul: 1, intensity: 1 }, 'CLEAR', 'NORMAL');

  const build = (): City => {
    const g = generateRoads(7), fs = generateFootprints(g), ci = chunkIndex(g, fs), mats = roamMaterials();
    const group = new Group();
    group.name = 'neon-harbor';
    const streamer = new Streamer<Group>({
      n: chunkCount(g),
      start: (i) => { const job = chunkJob(g, fs, ci[i], mats); return { next: () => { const r = job.next(); if (r.done) group.add(r.value); return r; } }; },
      dispose: (_i, c) => disposeChunk(c),
    });
    const traffic = new RoamTraffic(g, 40), trafficView = new TrafficView(g, 40), contact = new RoamContact(g, fs);
    const peds = new RoamPeds(g, 30), pedView = new PedView(30);
    contact.traffic = traffic;
    group.add(trafficView.group, pedView.mesh);
    const map = roamMap(g, ci, contact.roads, () => { if (mapFromDrive) { mapFromDrive = false; game.paused = false; } else menu?.open(); });
    const acts = new RoamActivities(g, group, d.hud, contact, () => findCar(d.store.data.selected).name);
    const story = new RoamStory(g, group, d.store, acts, map);
    map.setMarkers(roamMarkers(acts, story, () => game.rm.player.car.state.position));
    const missions = new RoamMissions(g, acts, d.store, () => map);
    return { g, fs, contact, streamer, group, mats, traffic, trafficView, peds, pedView, map, acts, missions, story, progress: new RoamProgress(d.store, acts, g.half), dispose: () => { missions.stop(); story.dispose(); streamer.clear(); mats.dispose(); trafficView.dispose(); pedView.dispose(); acts.dispose(); } };
  };

  /** Onto the nearest road centre line, facing along it (the way closer to the car's heading), stopped. */
  const respawn = (): void => {
    if (!city) return;
    const car = game.rm.player.car, st = car.state;
    city.contact.roads.nearestAny(st.position.x, st.position.z, hit);
    const h = city.contact.roads.pointAt(hit.edge, hit.s, 0, p);
    const back = Math.cos(h - st.heading) < 0 ? Math.PI : 0;
    car.reset(p.x, p.z, h + back);
    city.traffic.scatter(p.x, p.z); stuck.reset(); hinted = false; city.acts.heat.relocate(p.x, p.z); // nobody on the spot; a chase carries on
    city.acts.place(p.x, p.z);
  };

  /** Build the chunks around the car before showing it (enter, fast travel): up to ~0.3 s of slices, the rest streams. */
  const prime = (): void => {
    if (!city) return;
    const s = game.rm.player.car.state, cx = cellOf(city.g, s.position.x), cz = cellOf(city.g, s.position.z);
    city.traffic.scatter(s.position.x, s.position.z); // traffic and people around the new spot too
    city.peds.scatter(s.position.x, s.position.z);
    city.acts.place(s.position.x, s.position.z); city.acts.heat.relocate(s.position.x, s.position.z); // a teleport is not a pass through a camera
    city.streamer.update(cx, cz); // the first update picks the wanted cells
    for (let i = 0; i < 100 && city.streamer.pending; i++) city.streamer.update(cx, cz);
  };

  /** Fast travel: onto a road at the junction nearest the middle of the district's streets. */
  const travel = (dist: DistrictId): void => {
    if (!city) return;
    const nodes = city.g.nodes.filter((n) => n.district === dist && n.edges.length > 1);
    if (!nodes.length) return;
    const cx = nodes.reduce((a, n) => a + n.x, 0) / nodes.length, cz = nodes.reduce((a, n) => a + n.z, 0) / nodes.length;
    const n = nodes.reduce((b, m) => (Math.hypot(m.x - cx, m.z - cz) < Math.hypot(b.x - cx, b.z - cz) ? m : b));
    const e = city.g.edges[n.edges[0]];
    const fromA = e.a === n.id, s = fromA ? n.radius + 6 : e.length - n.radius - 6;
    const h = city.contact.roads.pointAt(e.id, s, 0, p);
    game.rm.player.car.reset(p.x, p.z, fromA ? h : h + Math.PI);
    prime();
    game.syncView(true);
  };

  const setPaused = (on: boolean): void => {
    game.paused = on;
    if (on) menu?.open(); else { menu?.close(); city?.map.closeFull(); }
  };

  const hint = (): void => d.hud.popUp(t('roam.stuck'), '#ffd27d'); const setCast = (on: boolean): void => { const c = engine.scene.getObjectByName('cast'); if (c) c.visible = on; };

  const leave = (): void => {
    active = false;
    city?.progress.save(); city?.acts.heat.leave(); city?.missions.stop(); // the last spot from the frame updates; leaving ends the chase and the job
    game.roam = null;
    city?.streamer.clear();
    if (city) engine.scene.remove(city.group);
    game.world.root.visible = true;
    setCast(true);
    ui?.hide(); mapFromDrive = false; city?.map.show(false); menu?.close(); // the map first: closing it must not reopen the pause menu
    shownWeather = null; tod.reset();
    game.setWeather(game.weather); // the race map's fog and look again
  };

  const step = (dt: number): void => {
    if (!city) return;
    const r = game.rm.player, c = city.contact;
    fillEnv(env, game.weather, game.physicsLevel, 1);
    c.rain = game.weather === 'RAIN' ? 1 : 0;
    r.car.step(dt, game.ctl, env);
    city.traffic.step(dt, r.car.state.position.x, r.car.state.position.z, env.grip);
    const t = city.traffic; // everything that drives, for the pedestrians: the player first, then traffic
    cars[0] = r.car.state.position.x; cars[1] = r.car.state.position.z;
    for (let i = 0; i < t.agents.length; i++) { cars[2 + i * 2] = t.x[i]; cars[3 + i * 2] = t.z[i]; }
    city.peds.step(dt, cars[0], cars[1], cars, t.agents.length + 1);
    c.update(r.car);
    city.acts.step(r.car, dt);
    const sk = stuck.update(dt, r.car.state.speed, game.ctl.throttle, r.car.state.position.x, r.car.state.position.z); if (sk === 1 && !hinted) { hinted = true; hint(); } else if (sk === 2) respawn();
    city.missions.step(dt, r.car.state.position.x, r.car.state.position.z); city.story.step(r.car.state.position.x, r.car.state.position.z, r.car.state.speed);
    const tc = r.contact; // the race contact is idle here: mirror what the city reports, for sparks, shake and sound
    tc.impact = c.impact; tc.scrape = c.scrape; tc.offroad = c.offroad; tc.groundY = c.groundY; tc.pitch = c.pitch;
    tc.contact.x = c.contact.x; tc.contact.z = c.contact.z;
    if (c.impact > 0.8) game.onImpact?.(c.impact);
    game.views.fixedStep(dt);
  };

  const frame = (dt: number): void => {
    if (!city) return;
    const s = game.rm.player.car.state;
    city.streamer.update(cellOf(city.g, s.position.x), cellOf(city.g, s.position.z));
    city.trafficView.update(city.traffic, s.position.x, s.position.z);
    city.pedView.update(city.peds);
    city.map.update(dt, s.position.x, s.position.z, s.heading, city.traffic); city.story.frame(dt, s.position.x, s.position.z);
    city.progress.update(dt, s.position.x, s.position.z, s.heading);
    game.chase.update(dt);
    if (game.weather !== shownWeather) { shownWeather = game.weather; weatherSurfaces(city.mats, game.weather); tod.rebase(); }
    districtFog(engine.scene, s.position.x, s.position.z, game.weather, dt, look.fogK * LOOK_CONFIG.fog.densityScale, tod.fog); tod.update(dt);
    game.rm.player.car.fillTelemetry(game.telemetry);
    d.hud.setBanner('');
    d.hud.update(game.telemetry);
    ui?.update(city.streamer.live.size, city.streamer.pending);
    ui?.tokens(city.acts.tokens.count, city.acts.tokens.tokens.length);
  };

  engine.onFrame(() => { if (active && game.state !== 'FREEROAM') leave(); }); // left through the menu: free the city

  return {
    travel,
    routeLength: () => city?.map.route?.length ?? 0, // labs: the GPS route (m), 0 = none
    lab: { spots: () => ({ zone: city?.acts.zones[0] ?? null, trap: city?.acts.traps[0] ?? null, meet: city?.acts.meetSpot ?? null, pins: city?.story.pins ?? [] }), placeAt: (x, z, h, v = 0) => { const c = game.rm.player.car; c.reset(x, z, h); prime(); c.nudge(0, 0, Math.sin(h) * v, Math.cos(h) * v, 0); }, wanted: () => city?.acts.heat.wanted(), tod: (k) => { tod.set(k); if (k === 'night') game.setWeather(game.weather); } },
    enter: () => {
      city ??= build();
      const store = d.store, spec = findCar(store.data.selected);
      const tu = createDefaultTuning();
      applyTuning(tu, spec.tuning);
      applyBuild(tu, spec.id);
      game.views.clear();
      game.rm = new RaceManager(game.world.track, 1, game.world.obstacles, game.world.surfaces);
      game.rm.addRacer('player', 'You', tu, null, true);
      game.views.add(game.rm.player, spec, store.data.paint[spec.id] ?? spec.color, store.data.glow[spec.id]);
      game.world.root.visible = false; // the race map's meshes; sky and lights stay
      setCast(false); // race crowd and story characters stand at race spots
      engine.scene.add(city.group);
      const from = city.progress.start(); // where the last Free Drive ended (snapped onto the road below)
      game.rm.player.car.reset(from?.x ?? 0, from?.z ?? 0, from?.h ?? 0);
      respawn();
      prime();
      game.roam = { step, frame };
      game.state = 'FREEROAM';
      game.paused = false;
      game.views.update(0, 0);
      game.syncView(true);
      active = true;
      ui ??= roamHud({ respawn, pause: () => setPaused(!game.paused), map: () => { if (game.paused || !city) return; mapFromDrive = true; game.paused = true; city.map.open(); } });
      menu ??= roamPause({ time: { label: () => t(`tod.${tod.tod}` as StringKey), cycle: () => { tod.cycle(); if (tod.tod === 'night') game.setWeather(game.weather); } }, map: () => { menu?.close(); city?.map.open(); }, resume: () => setPaused(false), travel: (t) => { setPaused(false); travel(t); }, pct: (k) => (city ? districtPct(city.acts, city.story, k) : 0), respawn: () => { setPaused(false); respawn(); }, exit: () => { setPaused(false); d.toMenu(); }, photo: { canvas: engine.renderer.domElement, render: () => engine.composer.render(0.016) } });
      ui.show();
      city.map.show(true);
      city.story.enter();
    },
  };
}
