import { AdditiveBlending, Matrix4, InstancedMesh, MeshBasicMaterial, OctahedronGeometry, Color } from 'three';
import { heightAt } from '../roads/height';
import type { Token } from '../../core/tokens';

const FLOAT = 1.6;

/** Neon tokens as glowing diamonds: all of them in one instanced mesh (one draw call); a collected one is scaled to 0. */
export function tokenMesh(tokens: readonly Token[], got: Uint8Array): { mesh: InstancedMesh; hide(i: number): void; pulse(t: number): void } {
  const mat = new MeshBasicMaterial({ color: new Color(0.1, 0.8, 0.9), transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false });
  const mesh = new InstancedMesh(new OctahedronGeometry(0.85, 0), mat, Math.max(1, tokens.length));
  const m = new Matrix4();
  for (let i = 0; i < tokens.length; i++) {
    const s = got[i] ? 0 : 1;
    m.makeScale(s * 0.8, s * 1.3, s * 0.8).setPosition(tokens[i].x, heightAt(tokens[i].x, tokens[i].z) + FLOAT, tokens[i].z);
    mesh.setMatrixAt(i, m);
  }
  mesh.name = 'neon-tokens';
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  return {
    mesh,
    hide(i) { m.makeScale(0, 0, 0); mesh.setMatrixAt(i, m); mesh.instanceMatrix.needsUpdate = true; },
    pulse(t) { const k = 0.55 + 0.25 * Math.sin(t * 4); mat.color.setRGB(0.05 * k, 0.85 * k, 0.95 * k); },
  };
}
