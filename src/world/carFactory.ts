import type { Texture } from 'three';
import { modelUrl, type CarSpec } from '../data/cars';
import { hasFailed, loadCarModel } from './assetLoader';
import { buildModelCar } from './modelCar';
import { getYawOverride } from './modelPrefs';
import { buildProceduralCar, type CarVisual } from './proceduralCar';

/**
 * Visual for a car: the procedural body right away, upgraded to the GLB body (public/models/<id>.glb)
 * as soon as it has loaded. A missing or broken file leaves the procedural car in place.
 */
export function createCarVisual(spec: CarSpec, paint: number, glow: number, env: Texture, upgrade: (v: CarVisual) => void): CarVisual {
  const v = buildProceduralCar(spec.shape, paint);
  v.setEnv(env);
  v.setUnderglow(glow);
  const url = modelUrl(spec);
  if (!hasFailed(url)) {
    loadCarModel(url, { targetLength: spec.shape.length, scale: spec.model.scale, yawOffset: getYawOverride(spec.id) ?? spec.model.yaw })
      .then((m) => {
        const mv = buildModelCar(m, spec.color, paint, getYawOverride(spec.id) ?? spec.model.yaw);
        mv.setEnv(env);
        mv.setUnderglow(glow);
        upgrade(mv);
      })
      .catch(() => undefined); // missing file: keep the procedural car
  }
  return v;
}

/** Start fetching every GLB at boot so they are cached by the time the garage opens. */
export function preloadCarModels(specs: readonly CarSpec[]): void {
  for (const s of specs) loadCarModel(modelUrl(s)).catch(() => undefined);
}
