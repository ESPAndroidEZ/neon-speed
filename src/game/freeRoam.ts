import { Group } from 'three';
import type { Engine } from '../core/engine';
import type { SaveStore } from '../core/save';
import type { Hud } from '../ui/hud';
import type { Game } from './game';
import type { Footprint, RoadGraph } from '../types/world';
import { RaceManager } from '../core/raceManager';
import { findCar } from '../data/cars';
import { applyBuild } from '../data/carBuild';
import { applyTuning, createDefaultTuning } from '../physics/carTuning';
import { RoamContact } from '../physics/roamContact';
import { fillEnv, type PhysicsEnv } from '../physics/weatherLevels';
import { createRoadHit } from '../world/roads/roadIndex';
import { generateRoads } from '../world/roads/generate';
import { generateFootprints } from '../world/open/footprints';
import { cellOf, chunkCount, chunkIndex } from '../world/open/chunkIndex';
import { chunkJob, disposeChunk, roamMaterials } from '../world/open/chunkMesh';
import { Streamer } from '../world/open/streamer';
import { roamHud, type RoamHud } from '../ui/roamHud';
import { roamPause, type RoamPause } from '../ui/roamPause';
import type { DistrictId } from '../types/world';

interface City { g: RoadGraph; fs: Footprint[]; contact: RoamContact; streamer: Streamer<Group>; group: Group; dispose(): void }

/**
 * Free Drive in Neon Harbor (GameState FREEROAM, docs/open-world.md): the player's garage car on the open city, chunks
 * streamed around the camera, buildings and the quay as walls. The car is the player of a RaceManager that never starts,
 * so the engine sound, effects and camera follow it as in a race; Game hands this module the fixed step and the frame.
 */
export function installFreeRoam(d: { engine: Engine; game: Game; hud: Hud; store: SaveStore; toMenu: () => void }): { enter(): void } {
  const { engine, game } = d;
  let city: City | null = null;
  let ui: RoamHud | null = null;
  let menu: RoamPause | null = null;
  let active = false;
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
    return { g, fs, contact: new RoamContact(g, fs), streamer, group, dispose: () => { streamer.clear(); mats.dispose(); } };
  };

  /** Onto the nearest road centre line, facing along it (the way closer to the car's heading), stopped. */
  const respawn = (): void => {
    if (!city) return;
    const car = game.rm.player.car, st = car.state;
    city.contact.roads.nearestAny(st.position.x, st.position.z, hit);
    const h = city.contact.roads.pointAt(hit.edge, hit.s, 0, p);
    const back = Math.cos(h - st.heading) < 0 ? Math.PI : 0;
    car.reset(p.x, p.z, h + back);
  };

  /** Build the chunks around the car before showing it (enter, fast travel): up to ~0.3 s of slices, the rest streams. */
  const prime = (): void => {
    if (!city) return;
    const s = game.rm.player.car.state, cx = cellOf(city.g, s.position.x), cz = cellOf(city.g, s.position.z);
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
    if (on) menu?.open(); else menu?.close();
  };

  const leave = (): void => {
    active = false;
    game.roam = null;
    city?.streamer.clear();
    if (city) engine.scene.remove(city.group);
    game.world.root.visible = true;
    ui?.hide();
    menu?.close();
  };

  const step = (dt: number): void => {
    if (!city) return;
    const r = game.rm.player, c = city.contact;
    fillEnv(env, game.weather, game.physicsLevel, 1);
    c.rain = game.weather === 'RAIN' ? 1 : 0;
    r.car.step(dt, game.ctl, env);
    c.update(r.car);
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
    game.chase.update(dt);
    game.rm.player.car.fillTelemetry(game.telemetry);
    d.hud.setBanner('');
    d.hud.update(game.telemetry);
    ui?.update(city.streamer.live.size, city.streamer.pending);
  };

  engine.onFrame(() => { if (active && game.state !== 'FREEROAM') leave(); }); // left through the menu: free the city

  return {
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
      engine.scene.add(city.group);
      game.rm.player.car.reset(0, 0, 0);
      respawn();
      prime();
      game.roam = { step, frame };
      game.state = 'FREEROAM';
      game.paused = false;
      game.views.update(0, 0);
      game.syncView(true);
      active = true;
      ui ??= roamHud({ respawn, pause: () => setPaused(!game.paused) });
      menu ??= roamPause({ resume: () => setPaused(false), travel: (t) => { setPaused(false); travel(t); }, respawn: () => { setPaused(false); respawn(); }, exit: () => { setPaused(false); d.toMenu(); }, photo: { canvas: engine.renderer.domElement, render: () => engine.composer.render(0.016) } });
      ui.show();
    },
  };
}
