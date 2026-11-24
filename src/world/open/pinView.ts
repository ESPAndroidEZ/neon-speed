import { AdditiveBlending, Color, CylinderGeometry, Float32BufferAttribute, Group, InstancedMesh, Matrix4, MeshBasicMaterial, RingGeometry } from 'three';
import { heightAt } from '../roads/height';
import { PIN_R, type StoryPin } from '../../core/storyPins';

const BEAM_H = 46;
const HOT = new Color(1, 0.23, 0.65), DONE = new Color(0.15, 0.7, 0.5);

export interface PinView { readonly group: Group; set(states: Uint8Array): void; pulse(t: number): void; dispose(): void }

/**
 * Story places as rings on the street with a light beam over the one that is next: all rings in one instanced mesh and
 * all beams in another (two draw calls). Locked places draw nothing, finished ones a faint green ring.
 */
export function pinView(pins: readonly StoryPin[]): PinView {
  const n = Math.max(1, pins.length);
  const ringGeo = new RingGeometry(PIN_R - 1.5, PIN_R, 56).rotateX(-Math.PI / 2);
  const beamGeo = new CylinderGeometry(1.4, 1.4, BEAM_H, 14, 1, true).translate(0, BEAM_H / 2, 0);
  const fade: number[] = []; // vertex colour 1 at the foot, 0 at the top: with additive blending that is a fading beam
  const pos = beamGeo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) { const k = 1 - pos.getY(i) / BEAM_H; fade.push(k, k, k); }
  beamGeo.setAttribute('color', new Float32BufferAttribute(fade, 3));
  const ringMat = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false });
  const beamMat = new MeshBasicMaterial({ color: HOT, vertexColors: true, transparent: true, opacity: 0.6, blending: AdditiveBlending, depthWrite: false, side: 2 });
  const rings = new InstancedMesh(ringGeo, ringMat, n), beams = new InstancedMesh(beamGeo, beamMat, n);
  for (const m of [rings, beams]) { m.frustumCulled = false; m.renderOrder = 3; }
  rings.name = 'story-rings'; beams.name = 'story-beams';
  const group = new Group();
  group.name = 'story-pins';
  group.add(rings, beams);
  const m = new Matrix4();
  const put = (mesh: InstancedMesh, i: number, s: number, lift: number): void => {
    const p = pins[i];
    m.makeScale(s, s, s).setPosition(p.x, heightAt(p.x, p.z) + lift, p.z);
    mesh.setMatrixAt(i, m);
  };
  return {
    group,
    set(states) {
      for (let i = 0; i < pins.length; i++) {
        put(rings, i, states[i] ? 1 : 0, 0.1);
        put(beams, i, states[i] === 1 ? 1 : 0, 0.1);
        rings.setColorAt(i, states[i] === 2 ? DONE : HOT);
      }
      rings.instanceMatrix.needsUpdate = beams.instanceMatrix.needsUpdate = true;
      if (rings.instanceColor) rings.instanceColor.needsUpdate = true;
    },
    pulse(t) { ringMat.opacity = 0.6 + 0.25 * Math.sin(t * 3); beamMat.opacity = 0.5 + 0.2 * Math.sin(t * 2.2); },
    dispose() { group.removeFromParent(); ringGeo.dispose(); beamGeo.dispose(); ringMat.dispose(); beamMat.dispose(); rings.dispose(); beams.dispose(); },
  };
}
