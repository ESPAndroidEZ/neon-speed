import { AdditiveBlending, Color, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makePoolTexture, makeShadowTexture } from './textures';

const glowMats: MeshBasicMaterial[] = [];

/** Scale every car's lamp glow (bad weather: fog would turn big halos into a white-out). */
export function setLightGlow(k: number): void {
  for (const m of glowMats) m.opacity = Math.min(1, k);
}

let pool: ReturnType<typeof makePoolTexture> | null = null;
let shadow: ReturnType<typeof makeShadowTexture> | null = null;

/**
 * Headlight and taillight glow (additive quads at the front and rear of the bounding box) plus a soft contact shadow.
 * Works for any car, procedural or GLB: only needs the body size and a lamp height.
 */
export function addLightsAndShadow(root: Group, width: number, length: number, lampY: number): void {
  pool ??= makePoolTexture();
  shadow ??= makeShadowTexture();
  const glow = (color: number, k: number, z: number, dir: number): void => {
    const mat = new MeshBasicMaterial({ map: pool, color: new Color(color).multiplyScalar(k), transparent: true, depthWrite: false, blending: AdditiveBlending });
    glowMats.push(mat);
    const quads: PlaneGeometry[] = [];
    for (const sx of [-1, 1]) {
      for (const turn of [0, Math.PI / 2]) { // two crossed quads so the glow reads from the side too
        quads.push(new PlaneGeometry(0.55, 0.28).rotateY(dir > 0 ? turn : Math.PI + turn).translate(sx * width * 0.33, lampY, z + dir * 0.02) as PlaneGeometry);
      }
    }
    const merged = mergeGeometries(quads); // four quads, one draw call
    for (const q of quads) q.dispose();
    if (merged) root.add(new Mesh(merged, mat));
  };
  glow(0xdff2ff, 0.5, length / 2, 1);
  glow(0xff1a10, 0.3, -length / 2, -1);
  const sh = new Mesh(new PlaneGeometry(width * 1.7, length * 1.25).rotateX(-Math.PI / 2), new MeshBasicMaterial({ map: shadow, transparent: true, depthWrite: false, opacity: 0.8 }));
  sh.position.y = 0.035;
  sh.renderOrder = 1;
  root.add(sh);
}
