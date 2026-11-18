import type { Object3D } from 'three';

/**
 * Render layer for things the rain mirror (world/roadMirror) skips: people and wheels. The main camera sees layers 0
 * and 1 (core/engine); the mirror's own camera only layer 0, so its extra scene pass costs far fewer draw calls.
 */
export const NO_REFLECT = 1;

/** Move a subtree to the NO_REFLECT layer. */
export function noReflect(o: Object3D): void {
  o.traverse((c) => c.layers.set(NO_REFLECT));
}
