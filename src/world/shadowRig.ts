import type { DirectionalLight, Object3D, Scene } from 'three';

/** Half-size (m) of the square the key light's shadow covers around the camera. */
export const SHADOW_HALF = 40;
/** Shadow map resolution (texels per side). */
export const SHADOW_MAP = 2048;

/** Round `v` to the nearest multiple of `texel` (shadow-map texel size in metres), so a moving centre never shimmers. */
export function snapToTexel(v: number, texel: number): number {
  return Math.round(v / texel) * texel;
}

/** Texel size (m) of a square shadow camera of half-size `half` on a `mapSize` map. */
export const texelSize = (half: number, mapSize: number): number => (2 * half) / mapSize;

/**
 * Mark a sky or background object (dome, stars, moon, clouds, skyline, mist): it never casts or receives shadows and
 * carries `userData.sky = true` so tests can find it. Applies to the whole subtree.
 */
export function markSky(o: Object3D): Object3D {
  o.traverse((c) => {
    c.userData.sky = true;
    c.castShadow = false;
    c.receiveShadow = false;
  });
  return o;
}

export interface KeyShadow {
  /** Centre the shadow on (x, z), snapped to whole texels in the light's view plane. No allocation. */
  follow(x: number, z: number): void;
  dispose(): void;
}

/**
 * Directional key light that casts the scene's shadows (only when the renderer's shadow map is enabled by the Graphics
 * setting). The light keeps its direction (its `position` is used as the offset from the centre) and follows the camera.
 * The centre is snapped in light space: projected onto the light's right/up axes, each rounded to a texel, so the
 * shadow map grid stays fixed in the world while the car drives.
 */
export function rigKeyShadow(light: DirectionalLight, scene: Scene, cast = false): KeyShadow {
  const ox = light.position.x, oy = light.position.y, oz = light.position.z;
  const len = Math.hypot(ox, oy, oz) || 1;
  // light-view basis: f points from the target to the light; r = up x f, u = f x r
  const fx = ox / len, fy = oy / len, fz = oz / len;
  let rx = fz, rz = -fx; // (0,1,0) x f = (fz, 0, -fx)
  const rl = Math.hypot(rx, rz) || 1;
  rx /= rl; rz /= rl;
  const ux = fy * rz, uy = fz * rx - fx * rz, uz = -fy * rx; // f x r with r = (rx, 0, rz)
  const texel = texelSize(SHADOW_HALF, SHADOW_MAP);
  light.castShadow = cast; // off by default: keeps the approved look and the visual bands; the rig is ready when enabled
  light.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
  const cam = light.shadow.camera;
  cam.left = cam.bottom = -SHADOW_HALF;
  cam.right = cam.top = SHADOW_HALF;
  cam.near = 1;
  cam.far = len + 80;
  cam.updateProjectionMatrix();
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.03;
  scene.add(light.target);
  const follow = (x: number, z: number): void => {
    const a = snapToTexel(x * rx + z * rz, texel);
    const b = snapToTexel(x * ux + z * uz, texel);
    const d = x * fx + z * fz; // depth along the light: no snapping needed
    const cx = a * rx + b * ux + d * fx, cy = b * uy + d * fy, cz = a * rz + b * uz + d * fz;
    light.target.position.set(cx, cy, cz);
    light.position.set(cx + ox, cy + oy, cz + oz);
    light.target.updateMatrixWorld();
  };
  follow(0, 0);
  return {
    follow,
    dispose: () => {
      scene.remove(light.target);
      light.shadow.map?.dispose();
    },
  };
}
