import type { Material, Mesh, Object3D } from 'three';
import type { Engine } from '../core/engine';
import type { CarSpec } from '../data/cars';
import { disposeVisual } from '../world/disposeVisual';
import { buildProceduralCar } from '../world/proceduralCar';
import type { Hud } from '../ui/hud';
import type { Game } from './game';
import { getBuild } from '../data/carBuild';
import { buildKey, recordLap } from '../data/upgradeAdvice';
import { lapPop } from './lapPop';
import { ghostDelta, ghostPose, GhostRecorder, isGhostLap, type GhostLap, type Pose } from './ghostData';
import { t } from '../i18n';


const key = (track: string, car: string): string => `rb-ghost:${track}:${car}`;
function load(k: string): GhostLap | null {
  try {
    const g: unknown = JSON.parse(localStorage.getItem(k) ?? 'null');
    return isGhostLap(g) ? g : null;
  } catch { return null; }
}
function save(k: string, g: GhostLap): void {
  try { localStorage.setItem(k, JSON.stringify(g)); } catch { /* full or blocked storage: no ghost */ }
}

function ghostBody(spec: CarSpec): Object3D {
  const v = buildProceduralCar(spec.shape, 0x8fd8ff);
  v.root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    const mats = (Array.isArray(m.material) ? m.material : [m.material]).map((x: Material) => {
      const c = x.clone();
      c.transparent = true; c.opacity = 0.28; c.depthWrite = false;
      return c;
    });
    m.material = Array.isArray(m.material) ? mats : mats[0];
    m.castShadow = false;
  });
  return v.root;
}

/**
 * Ghost of your best lap per track and car (browser storage, display only: physics and saves never see it).
 * Records the player 10 times a second; a lap faster than the stored one replaces it ("NEW BEST LAP").
 * On every later lap a translucent car drives the best lap alongside you.
 */
export function attachGhost(engine: Engine, game: Game, hud: Hud): () => number {
  let delta = NaN; // seconds ahead (-) / behind (+) of the stored best lap; NaN = no ghost here
  let rec = new GhostRecorder(), setupRef: unknown = null, k = '', body: Object3D | null = null, lastLap = -1, lapsDone = 0;
  const pose: Pose = { x: 0, y: 0, z: 0, h: 0 };
  const clear = (): void => {
    if (body) { engine.scene.remove(body); disposeVisual(body); body = null; }
  };
  engine.onFrame(() => {
    const rm = game.rm, s = game.setup;
    delta = NaN;
    if (!s || game.state !== 'RACING') { if (body) body.visible = false; return; }
    if (s !== setupRef) { // new race: load this track + car's ghost
      setupRef = s; clear(); lastLap = -1; lapsDone = 0;
      k = key(s.trackId ?? 'kestrel', s.car.id);
      rec = new GhostRecorder(load(k));
      if (rec.best) { body = ghostBody(s.car); body.visible = false; engine.scene.add(body); }
    }
    if (rm.phase !== 'RACING') return;
    const p = game.player, st = p.car.state, lt = rm.raceTime - p.lapStart;
    let lapDone = -1; // time of the lap that just ended, for the lap pop-up
    if (p.lapStart !== lastLap) { // a lap ended: keep the best lap per exact build (tuning menu shows it)
      if (lastLap >= 0) { lapDone = p.lapStart - lastLap; const b = getBuild(s.car.id); recordLap(s.trackId ?? 'kestrel', s.car.id, buildKey(b.upgrades, b.setup), lapDone); }
      lastLap = p.lapStart;
    }
    pose.x = st.position.x; pose.y = st.position.y; pose.z = st.position.z; pose.h = st.heading;
    const prevBest = rec.best ? rec.best.t : null;
    const fresh = rec.update(p.lapStart, lt, pose);
    if (fresh) {
      save(k, fresh);
      hud.popUp(t('ghost.saved'), '#8fd8ff');
      if (!body) { body = ghostBody(s.car); engine.scene.add(body); }
    } else if (lapDone > 0 && !p.finished) { // a normal lap: its time and the gap to your best
      const pop = lapPop(t('lap.done', { n: ++lapsDone }), lapDone, prevBest);
      hud.popUp(pop.text, pop.color);
    }
    if (rec.best && !p.finished) delta = ghostDelta(rec.best, lt, st.position.x, st.position.z);
    if (!body || !rec.best || p.finished || !ghostPose(rec.best, lt, pose)) { if (body) body.visible = false; return; }
    body.position.set(pose.x, pose.y, pose.z);
    body.rotation.y = pose.h;
    body.visible = true;
  });
  return () => delta;
}
