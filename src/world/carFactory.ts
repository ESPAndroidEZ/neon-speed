import type { Texture } from 'three';
import { modelUrl, type CarSpec } from '../data/cars';
import { hasFailed, loadCarModel } from './assetLoader';
import { defaultLoadout, type Loadout } from '../data/loadout';
import { buildModelCar } from './modelCar';
import { getYawOverride } from './modelPrefs';
import { buildProceduralCar, type CarVisual } from './proceduralCar';

export type ModelStatus = 'glb' | 'procedural' | 'loading';
const status = new Map<string, ModelStatus>();
/** Called whenever a car's model status changes (the garage re-renders its badge). */
export const statusListeners = new Set<() => void>();

/** Whether a car currently uses its GLB body, the procedural fallback, or is still being checked. */
export const modelStatus = (id: string): ModelStatus => status.get(id) ?? 'loading';

/**
 * Visual for a car: the procedural body right away, upgraded to the GLB body (public/models/<id>.glb)
 * as soon as it has loaded. A missing or broken file leaves the procedural car in place.
 */
export function createCarVisual(spec: CarSpec, paint: number, glow: number, env: Texture, upgrade: (v: CarVisual) => void, l: Loadout = defaultLoadout()): CarVisual {
  const v = buildProceduralCar(spec.shape, paint, l);
  v.setEnv(env);
  v.setUnderglow(glow);
  const url = modelUrl(spec);
  if (!hasFailed(url)) {
    loadCarModel(url, { targetLength: spec.shape.length, scale: spec.model.scale, yawOffset: getYawOverride(spec.id) ?? spec.model.yaw })
      .then((m) => {
        const mv = buildModelCar(m, spec.color, paint, getYawOverride(spec.id) ?? spec.model.yaw);
        mv.setEnv(env);
        mv.setUnderglow(glow);
        mv.setAppearance?.(l, paint);
        upgrade(mv);
      })
      .catch(() => undefined); // missing file: keep the procedural car
  }
  return v;
}

/** Start fetching every GLB at boot so they are cached by the time the garage opens. */
export function preloadCarModels(specs: readonly CarSpec[]): void {
  for (const s of specs) {
    status.set(s.id, 'loading');
    loadCarModel(modelUrl(s)).then(
      () => {
        status.set(s.id, 'glb');
        statusListeners.forEach((f) => f());
        console.info(`[models] ${s.id}: GLB loaded (${modelUrl(s)})`);
      },
      (e: unknown) => {
        status.set(s.id, 'procedural');
        statusListeners.forEach((f) => f());
        console.info(`[models] ${s.id}: procedural car (${modelUrl(s)} ${e instanceof Error && e.message.includes('<') ? 'not found' : e instanceof Error ? e.message.slice(0, 90) : 'missing'})`);
      },
    );
  }
}
