import type { BufferGeometry, Material, Object3D, Texture } from 'three';

/** Material slots that may hold a texture this object owns (envMap is never one: it is the world's shared PMREM). */
const SLOTS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap', 'bumpMap', 'clearcoatNormalMap'] as const;

/**
 * Frees the GPU side of a removed object tree: geometries, materials and their textures. Shared geometry or
 * canvas textures (cached GLB, module-level parts) are safe to free: three uploads them again on next use.
 * Render-target textures are skipped (freeing those would wipe the shared environment map).
 */
export function disposeVisual(root: Object3D): void {
  root.traverse((o) => {
    const m = o as Object3D & { geometry?: BufferGeometry; material?: Material | Material[] };
    m.geometry?.dispose();
    const list = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mat of list) {
      const rec = mat as unknown as Record<string, Texture | null | undefined>;
      for (const k of SLOTS) {
        const tex = rec[k];
        if (tex && !(tex as Texture & { isRenderTargetTexture?: boolean }).isRenderTargetTexture) tex.dispose();
      }
      mat.dispose();
    }
  });
}
