import type { Material, Mesh, Object3D } from 'three';
import type { Engine } from '../core/engine';
import type { CarSpec } from '../data/cars';
import { disposeVisual } from '../world/disposeVisual';
import { buildProceduralCar } from '../world/proceduralCar';
import type { Hud } from '../ui/hud';
import type { Game } from './game';

const HZ = 10;
const MAX = 3000; // 5 min of lap at 10 Hz
interface GhostLap { t: number; f: number[] } // lap time and frames [x, y, z, heading, ...] at 10 Hz

const key = (track: string, car: string): string => `rb-ghost:${track}:${car}`;
function load(k: string): GhostLap | null {
  try {
    const g = JSON.parse(localStorage.getItem(k) ?? 'null') as GhostLap | null;
    return g && Array.isArray(g.f) && g.f.length >= 8 ? g : null;
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
export function attachGhost(engine: Engine, game: Game, hud: Hud): void {
  const rec = new Float32Array(MAX * 4);
  let n = 0, lapStart = -1, setupRef: unknown = null, k = '', best: GhostLap | null = null, body: Object3D | null = null;

  const clear = (): void => {
    if (body) { engine.scene.remove(body); disposeVisual(body); body = null; }
  };
  engine.onFrame(() => {
    const rm = game.rm, s = game.setup;
    if (!s || game.state !== 'RACING') { if (body) body.visible = false; return; }
    if (s !== setupRef) { // new race: load this track + car's ghost
      setupRef = s; clear(); n = 0; lapStart = -1;
      k = key(s.trackId ?? 'kestrel', s.car.id);
      best = load(k);
      if (best) { body = ghostBody(s.car); body.visible = false; engine.scene.add(body); }
    }
    if (rm.phase !== 'RACING') return;
    const p = game.player, st = p.car.state;
    if (p.lapStart !== lapStart) { // a lap just finished (or the race started)
      const t = p.lapStart - Math.max(0, lapStart);
      if (lapStart >= 0 && n > 8 && (!best || t < best.t)) {
        best = { t: Math.round(t * 1000) / 1000, f: Array.from(rec.subarray(0, n * 4), (x) => Math.round(x * 100) / 100) };
        save(k, best);
        hud.popUp('NEW BEST LAP · GHOST SAVED', '#8fd8ff');
        if (!body) { body = ghostBody(s.car); engine.scene.add(body); }
      }
      lapStart = p.lapStart; n = 0;
    }
    const lt = rm.raceTime - p.lapStart;
    while (n < MAX && lt >= n / HZ) { // fills skipped slots on slow frames so the timeline stays true
      rec[n * 4] = st.position.x; rec[n * 4 + 1] = st.position.y; rec[n * 4 + 2] = st.position.z; rec[n * 4 + 3] = st.heading;
      n++;
    }
    if (!body || !best || p.finished) { if (body) body.visible = false; return; }
    const frames = best.f.length / 4, fi = lt * HZ, i = Math.floor(fi);
    if (i >= frames - 1) { body.visible = false; return; }
    const a = fi - i, f = best.f, j = i * 4;
    let dh = f[j + 7] - f[j + 3];
    if (dh > Math.PI) dh -= Math.PI * 2; else if (dh < -Math.PI) dh += Math.PI * 2;
    body.position.set(f[j] + (f[j + 4] - f[j]) * a, f[j + 1] + (f[j + 5] - f[j + 1]) * a, f[j + 2] + (f[j + 6] - f[j + 2]) * a);
    body.rotation.y = f[j + 3] + dh * a;
    body.visible = true;
  });
}
