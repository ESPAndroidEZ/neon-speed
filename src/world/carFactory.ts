import type { Texture } from 'three';
import { modelUrl, type CarSpec } from '../data/cars';
import { hasFailed, loadCarModel } from './assetLoader';
import { defaultLoadout, type Loadout } from '../data/loadout';
import { buildModelCar } from './modelCar';
import { getYawOverride } from './modelPrefs';
import { buildProceduralCar, type CarVisual } from './proceduralCar';
import { createPlates, fitPlates } from './plates';

/** Front and rear plates with the loadout's text; garage edits (setAppearance) update them live. */
export function withPlates(v: CarVisual, spec: CarSpec, l: Loadout, bodyRoot = v.body ?? v.root): CarVisual {
  const plates = createPlates(spec.shape.length, 0.36, Math.min(0.6, spec.shape.beltHeight - 0.32), l.plate);
  bodyRoot.add(plates.group); // on the pitch/roll pivot: on root the rolling bumper swung through the still plate (bug A2)
  fitPlates(plates, bodyRoot, spec.shape.length); // centred and seated on the real bumper of THIS body
  const orig = v.setAppearance?.bind(v);
  v.setAppearance = (nl, paint) => { orig?.(nl, paint); plates.setText(nl.plate); };
  return v;
}

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
  const v = withPlates(buildProceduralCar(spec.shape, paint, l), spec, l);
  v.setEnv(env);
  v.setUnderglow(glow);
  const url = modelUrl(spec);
  if (!hasFailed(url)) {
    loadCarModel(url, { targetLength: spec.shape.length, scale: spec.model.scale, yawOffset: getYawOverride(spec.id) ?? spec.model.yaw })
      .then((m) => {
        const mv = withPlates(buildModelCar(m, spec.color, paint, getYawOverride(spec.id) ?? spec.model.yaw), spec, l);
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
