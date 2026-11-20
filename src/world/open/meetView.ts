import { Color, Group, InstancedMesh, MeshBasicMaterial, MeshStandardMaterial, Object3D } from 'three';
import type { CarMeet } from '../../core/carMeet';
import { heightAt } from '../roads/height';
import { carShapes } from './trafficView';
import { zoneMesh } from './zoneView';

const PAINT = [0xff2a9d, 0x18d8ff, 0xffd27d, 0x7a5cff, 0x39ff88, 0xff6a3a, 0xe8e8f0, 0x14161c]; // show cars: loud paint

/** The car meet: 8 parked show cars (instanced, lamps on) and a pink ring on the ground. 3 draw calls, static. */
export function meetGroup(m: CarMeet): { group: Group; dispose(): void } {
  // satin paint: shinier paint caught the player's headlights and bloomed
  const s = carShapes(), body = new MeshStandardMaterial({ roughness: 0.55, metalness: 0.25 }), lamp = new MeshBasicMaterial({ vertexColors: true, color: new Color(0.4, 0.4, 0.4) }); // parked: lamps dimmed, they face the player
  const cars = new InstancedMesh(s.body, body, m.slots.length), lamps = new InstancedMesh(s.lamps, lamp, m.slots.length);
  const o = new Object3D(), c = new Color();
  m.slots.forEach((p, i) => {
    o.position.set(p.x, heightAt(p.x, p.z), p.z);
    o.rotation.set(0, p.h, 0);
    o.updateMatrix();
    cars.setMatrixAt(i, o.matrix);
    lamps.setMatrixAt(i, o.matrix);
    cars.setColorAt(i, c.setHex(PAINT[i % PAINT.length]));
  });
  const ring = zoneMesh([m], 0xff2a9d);
  const group = new Group();
  group.name = 'car-meet';
  group.add(cars, lamps, ring);
  return { group, dispose: () => { for (const x of [s.body, s.lamps, ring.geometry]) x.dispose(); for (const x of [body, lamp, ring.material as MeshBasicMaterial]) x.dispose(); } };
}
