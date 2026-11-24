import { AdditiveBlending, Color, CylinderGeometry, Float32BufferAttribute, Group, InstancedMesh, Matrix4, MeshBasicMaterial, RingGeometry } from 'three';
import { heightAt } from '../roads/height';
import { PIN_R, type StoryPin } from '../../core/storyPins';

const BEAM_H = 60, WALL_H = 1.6;
const HOT = new Color(1, 0.23, 0.65), DONE = new Color(0.15, 0.7, 0.5);

export interface PinView { readonly group: Group; set(states: Uint8Array): void; pulse(t: number): void; dispose(): void }

/**
 * Story places as rings on the street with a light beam over the one that is next: all rings in one instanced mesh and
 * all beams in another (two draw calls). Locked places draw nothing, finished ones a faint green ring.
 */
export function pinView(pins: readonly StoryPin[]): PinView {
  const n = Math.max(1, pins.length);
  const ringGeo = new RingGeometry(PIN_R - 1.5, PIN_R, 56).rotateX(-Math.PI / 2);
  const beamGeo = new CylinderGeometry(2.1, 2.1, BEAM_H, 16, 1, true).translate(0, BEAM_H / 2, 0);
  const wallGeo = new CylinderGeometry(PIN_R - 0.2, PIN_R - 0.2, WALL_H, 56, 1, true).translate(0, WALL_H / 2, 0);
  const fade: number[] = []; // vertex colour 1 at the foot, 0 at the top: with additive blending that is a fading beam
  const pos = beamGeo.getAttribute('position');
  for (let i = 0; i < pos.count; i++) { const k = 1 - pos.getY(i) / BEAM_H; fade.push(k, k, k); }
  beamGeo.setAttribute('color', new Float32BufferAttribute(fade, 3));
  const wp = wallGeo.getAttribute('position'), wfade: number[] = [];
  for (let i = 0; i < wp.count; i++) { const k = 1 - wp.getY(i) / WALL_H; wfade.push(k, k, k); }
  wallGeo.setAttribute('color', new Float32BufferAttribute(wfade, 3));
  const ringMat = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false });
  const beamMat = new MeshBasicMaterial({ color: HOT, vertexColors: true, transparent: true, opacity: 0.6, blending: AdditiveBlending, depthWrite: false, side: 2 });
  const wallMat = beamMat.clone();
  wallMat.opacity = 0.7;
  const rings = new InstancedMesh(ringGeo, ringMat, n), beams = new InstancedMesh(beamGeo, beamMat, n), walls = new InstancedMesh(wallGeo, wallMat, n);
  for (const m of [rings, beams, walls]) { m.frustumCulled = false; m.renderOrder = 3; }
  rings.name = 'story-rings'; beams.name = 'story-beams'; walls.name = 'story-walls';
  const group = new Group();
  group.name = 'story-pins';
  group.add(rings, beams, walls);
  const m = new Matrix4();
  const put = (mesh: InstancedMesh, slot: number, pin: number, s: number, lift: number): void => {
    const p = pins[pin];
    m.makeScale(s, s, s).setPosition(p.x, heightAt(p.x, p.z) + lift, p.z);
    mesh.setMatrixAt(slot, m);
  };
  return {
    group,
    set(states) {
      let r = 0, b = 0; // only the lit places are drawn: the instances are packed to the front
      for (let i = 0; i < pins.length; i++) {
        if (!states[i]) continue;
        put(rings, r, i, 1, 0.1); put(walls, r, i, 1, 0.1);
        rings.setColorAt(r, states[i] === 2 ? DONE : HOT);
        r++;
        if (states[i] === 1) put(beams, b++, i, 1, 0.1);
      }
      rings.count = walls.count = r; beams.count = b;
      rings.instanceMatrix.needsUpdate = walls.instanceMatrix.needsUpdate = beams.instanceMatrix.needsUpdate = true;
      if (rings.instanceColor) rings.instanceColor.needsUpdate = true;
    },
    pulse(t) { ringMat.opacity = 0.6 + 0.25 * Math.sin(t * 3); beamMat.opacity = 0.5 + 0.2 * Math.sin(t * 2.2); wallMat.opacity = 0.55 + 0.2 * Math.sin(t * 3); },
    dispose() { group.removeFromParent(); ringGeo.dispose(); beamGeo.dispose(); wallGeo.dispose(); ringMat.dispose(); beamMat.dispose(); wallMat.dispose(); rings.dispose(); beams.dispose(); walls.dispose(); },
  };
}
