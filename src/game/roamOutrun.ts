import type { Game } from './game';
import type { SaveStore } from '../core/save';
import type { Hud } from '../ui/hud';
import type { Racer } from '../core/raceManager';
import type { FieldEntry } from '../data/rivals';
import { aiTuning } from '../data/rivals';
import { CHALLENGERS, FLOW_HOOK, type RoamFlow } from './roamFlow';
import { RoamContact } from '../physics/roamContact';
import type { CarController } from '../physics/carController';
import { CityDriver, cityPath, nearestIndex, progressIndex, type CityPath } from '../physics/cityDriver';
import { resolveCarPair } from '../physics/carCollision';
import { fillEnv, type PhysicsEnv } from '../physics/weatherLevels';
import { findRoute } from '../core/route';
import { outrunHud } from '../ui/outrunHud';
import { roamToast } from '../ui/roamToast';
import { t } from '../i18n';

/** Outrun rules (docs/research-open-world.md): first to the finish, or pull this far clear; lose when they lead by LOSE. */
export const OUTRUN = { win: 300, lose: 400, minLen: 1000, maxLen: 1700, count: 3, cash: 1500, rep: 40, maxSecs: 240 } as const;
const GRIP: Record<string, number> = { CLEAR: 1, RAIN: 0.72, SNOW: 0.63 };

interface Run { racer: Racer; drv: CityDriver; path: CityPath; contact: RoamContact; pIdx: number; t: number; go: boolean; name: string; id: string; beat: number }

/**
 * The in-city outrun (Underground round): a challenger leaves traffic and races you along a GPS route through the
 * streets you are in. The rival is a real car (its own CarController, a RoamContact for the city, a racer view), steered
 * by physics/cityDriver; catch-up only changes its target speed, at most +-9 %. Installed by game/flowLaunch.
 */
export function installOutrun(d: { game: Game; store: SaveStore; hud: Hud; goTo: (x: number, z: number) => void }): { start(rival: FieldEntry, slot: number, x: number, z: number): void } {
  const { game, store, hud } = d;
  const ui = outrunHud();
  const env: PhysicsEnv = fillEnv({ name: 'CLEAR', grip: 1, fogDensity: 0, fogColor: 0, precipitation: 0, roadRoughness: 0, level: 'NORMAL', yawDampMul: 1, assistMul: 1, rearGripMul: 1, intensity: 1 }, 'CLEAR', 'NORMAL');
  let pending: { rival: FieldEntry; slot: number; x: number; z: number } | null = null, run: Run | null = null, contact: RoamContact | null = null, contactFor: RoamFlow | null = null;

  const end = (won: boolean | null): void => {
    if (!run) return;
    const r = run;
    run = null;
    const i = game.rm.racers.indexOf(r.racer);
    if (i >= 0) game.rm.racers.splice(i, 1);
    game.views.remove(r.racer);
    ui.hide();
    d.goTo(NaN, NaN);
    if (won === null) return;
    if (won && store.claimRace(r.id)) { store.data.cash += OUTRUN.cash; store.addRep(OUTRUN.rep); store.commit(); }
    roamToast(won ? t('run.won', { name: r.name, cash: OUTRUN.cash.toLocaleString() }) : t('run.lost', { name: r.name }), won ? '#3ddc97' : '#ff5470', 4500);
  };

  const begin = (p: NonNullable<typeof pending>, flow: RoamFlow): void => {
    const g = flow.g, nodes = g.nodes.filter((n) => n.edges.length >= 2);
    const near = nodes.reduce((b, n) => (Math.hypot(n.x - p.x, n.z - p.z) < Math.hypot(b.x - p.x, b.z - p.z) ? n : b));
    const far = nodes.filter((n) => { const k = Math.hypot(n.x - near.x, n.z - near.z); return k > OUTRUN.minLen * 0.7 && k < OUTRUN.maxLen * 0.8 && flow.open(n.district); });
    let rt = null;
    for (let k = 0; k < Math.min(8, far.length) && !rt; k++) { const r = findRoute(g, near.id, far[(p.slot * 37 + k * 11) % far.length].id); if (r && r.length > OUTRUN.minLen && r.length < OUTRUN.maxLen * 1.3) rt = r; }
    if (!rt) { roamToast(t('ch.none')); return; }
    const path = cityPath(g, rt.nodes, rt.edges, GRIP[game.weather] ?? 1);
    if (contactFor !== flow) { contact = new RoamContact(g, flow.fs); contactFor = flow; } // the hash over the buildings is built once per city
    const c = contact as RoamContact;
    c.traffic = flow.traffic;
    const racer = game.rm.addRacer('rival', p.rival.agent.name, aiTuning(p.rival.car, p.rival.upgrades), null, false);
    game.views.add(racer, p.rival.car, p.rival.paint, p.rival.glow);
    flow.traffic?.release(CHALLENGERS[p.slot]); // the challenger leaves the traffic: the rival car takes its place
    const i0 = progressIndex(path, p.x, p.z, 0), drv = new CityDriver(path);
    drv.idx = i0;
    const j = Math.min(path.s.length - 1, i0 + 2);
    racer.car.reset(path.x[i0], path.z[i0], Math.atan2(path.x[j] - path.x[i0], path.z[j] - path.z[i0]));
    run = { racer, drv, path, contact: c, pIdx: 0, t: 0, go: false, name: p.rival.agent.name, id: `run:${Date.now().toString(36)}`, beat: OUTRUN.count + 1 };
    d.goTo(path.x[path.x.length - 1], path.z[path.z.length - 1]);
    ui.show(run.name);
  };

  FLOW_HOOK.tick = (car: CarController, dt: number, flow: RoamFlow): boolean => {
    if (pending) { const p = pending; pending = null; begin(p, flow); }
    const r = run;
    if (!r) return false;
    const rc = r.racer.car, inp = r.racer.input;
    r.t += dt;
    fillEnv(env, game.weather, game.physicsLevel, 1);
    if (!r.go) {
      const left = Math.ceil(OUTRUN.count - r.t);
      if (left < r.beat) { r.beat = left; hud.popUp(left > 0 ? String(left) : t('run.go'), left > 0 ? '#ffd27d' : '#3ddc97'); }
      inp.throttle = 0; inp.brake = 1; inp.steer = 0; inp.nitro = false; inp.handbrake = false;
      if (r.t >= OUTRUN.count) r.go = true;
    } else r.drv.drive(rc, inp);
    rc.step(dt, inp, env);
    r.contact.update(rc);
    r.racer.contact.pitch = r.contact.pitch;
    resolveCarPair(car, rc);
    // the player's progress on the route (a full search when far off it: a shortcut, a respawn)
    const pp = car.state.position;
    r.pIdx = progressIndex(r.path, pp.x, pp.z, r.pIdx);
    if ((r.path.x[r.pIdx] - pp.x) ** 2 + (r.path.z[r.pIdx] - pp.z) ** 2 > 3600) r.pIdx = nearestIndex(r.path, pp.x, pp.z);
    const me = r.path.s[r.pIdx], them = r.drv.distance, lead = me - them, L = r.path.length;
    r.drv.pace = 1 + Math.max(-0.09, Math.min(0.09, lead / 2000)); // catch-up: a target-speed change only, capped like the race AI
    ui.update(L - Math.max(me, them), lead, OUTRUN.win, OUTRUN.lose);
    if (!r.go) return true;
    if (me > L - 20 || lead > OUTRUN.win) end(true);
    else if (them > L - 20 || -lead > OUTRUN.lose || r.t > OUTRUN.maxSecs) end(false);
    return true;
  };

  // left Free Drive mid-race: drop it (the views are cleared when the next mode starts)
  window.setInterval(() => { if (run && game.state !== 'FREEROAM') { run = null; ui.hide(); } }, 500);

  return {
    start: (rival, slot, x, z) => { if (!run && !pending) pending = { rival, slot, x, z }; },
  };
}
