import { BoxGeometry, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, type Object3D, type Texture } from 'three';
import { damp } from '../core/math';
import { bodyShell, cabin, roofSpan, type BodyShape } from './carBody';

const bright = (hex: number, k: number): Color => new Color(hex).multiplyScalar(k);

export interface CarVisual {
  root: Group;
  /** Rear exhaust tips and tyre contact points in car space, for smoke, flames and skid marks. */
  exhaust: readonly Object3D[];
  rearWheels: readonly Object3D[];
  setPaint(hex: number): void;
  setUnderglow(hex: number): void;
  setEnv(env: Texture): void;
  /** Per display frame: wheel spin and steer, brake lights, body pitch/roll from accelerations. */
  update(dt: number, speed: number, steer: number, braking: boolean, longAccel: number, latAccel: number): void;
}

/** Low-poly procedural car from a BodyShape. Nose +Z, +X left, origin on the ground at the centre. */
export function buildProceduralCar(shape: BodyShape, paintHex: number): CarVisual {
  const root = new Group();
  const body = new Group();
  root.add(body);
  const paint = new MeshPhysicalMaterial({ color: paintHex, metalness: 0.6, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
  const glass = new MeshStandardMaterial({ color: 0x18223a, metalness: 0.85, roughness: 0.12 });
  const trim = new MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.6, metalness: 0.4 });
  const mesh = (g: BoxGeometry | ReturnType<typeof bodyShell>, m: MeshStandardMaterial | MeshPhysicalMaterial | MeshBasicMaterial, x = 0, y = 0, z = 0): Mesh => {
    const o = new Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    body.add(o);
    return o;
  };
  const w = shape.width;
  const zf = shape.length / 2;
  mesh(bodyShell(shape), paint);
  mesh(cabin(shape), glass);
  const [r0, r1] = roofSpan(shape);
  mesh(new BoxGeometry(w * 0.84 - 0.1, 0.06, r0 - r1 + 0.1), paint, 0, shape.height + 0.02, (r0 + r1) / 2);
  mesh(new BoxGeometry(w * 0.96, 0.14, 0.25), trim, 0, 0.36, zf - 0.05); // splitter-ish bumper strip
  mesh(new BoxGeometry(w * 0.96, 0.12, 0.2), trim, 0, 0.36, -zf + 0.05);
  if (shape.spoiler === 'wing') {
    mesh(new BoxGeometry(w * 0.92, 0.05, 0.38), paint, 0, shape.beltHeight + 0.32, -zf + 0.3);
    for (const x of [-w * 0.3, w * 0.3]) mesh(new BoxGeometry(0.06, 0.3, 0.2), trim, x, shape.beltHeight + 0.14, -zf + 0.32);
  } else if (shape.spoiler === 'lip') {
    mesh(new BoxGeometry(w * 0.86, 0.05, 0.22), paint, 0, shape.beltHeight - 0.02, -zf + 0.22);
  }

  const headMat = new MeshBasicMaterial({ color: bright(0xdff2ff, 4) });
  const tailMat = new MeshBasicMaterial({ color: bright(0xff1010, 2.2) });
  for (const x of [-w * 0.34, w * 0.34]) mesh(new BoxGeometry(0.42, 0.11, 0.08), headMat, x, 0.66, zf + 0.01);
  mesh(new BoxGeometry(w * 0.8, 0.09, 0.06), tailMat, 0, shape.beltHeight - 0.2, -zf - 0.01);

  const glowMat = new MeshBasicMaterial({ color: bright(0x2a6bff, 1.5), transparent: true, opacity: 0.6 });
  const glowPlane = new Mesh(new BoxGeometry(w * 0.85, 0.02, shape.length * 0.8), glowMat);
  glowPlane.position.y = 0.08;
  root.add(glowPlane);

  const tyreMat = new MeshStandardMaterial({ color: 0x060606, roughness: 0.9 });
  const rimMat = new MeshStandardMaterial({ color: 0xb8bcc8, metalness: 0.9, roughness: 0.25 });
  const wr = shape.wheelRadius;
  const spinners: Object3D[] = [];
  const steerPivots: Object3D[] = [];
  const rear: Object3D[] = [];
  for (const sx of [1, -1]) {
    for (const front of [true, false]) {
      const pivot = new Group();
      pivot.position.set(sx * (w / 2 - 0.12), wr, (front ? 1 : -1) * shape.wheelbase * 0.5);
      const spin = new Group();
      const tyre = new Mesh(new CylinderGeometry(wr, wr, 0.26, 18).rotateZ(Math.PI / 2), tyreMat);
      const rim = new Mesh(new CylinderGeometry(wr * 0.62, wr * 0.62, 0.28, 10).rotateZ(Math.PI / 2), rimMat);
      tyre.castShadow = true;
      spin.add(tyre, rim);
      pivot.add(spin);
      root.add(pivot);
      spinners.push(spin);
      if (front) steerPivots.push(pivot);
      else rear.push(pivot);
    }
  }
  const exhaust: Object3D[] = [];
  for (const x of [-w * 0.28, w * 0.28]) {
    const e = new Group();
    e.position.set(x, 0.36, -zf - 0.05);
    root.add(e);
    exhaust.push(e);
  }

  let pitch = 0;
  let roll = 0;
  let spin = 0;
  let steerVis = 0;
  return {
    root,
    exhaust,
    rearWheels: rear,
    setPaint: (hex) => paint.color.setHex(hex),
    setUnderglow: (hex) => {
      glowMat.color.copy(bright(hex, 1.5));
    },
    setEnv: (env) => {
      paint.envMap = env;
      paint.envMapIntensity = 1.4;
      glass.envMap = env;
      paint.needsUpdate = true;
    },
    update(dt, speed, steer, braking, longAccel, latAccel) {
      spin += (speed / wr) * dt;
      steerVis = damp(steerVis, steer * 0.5, 14, dt);
      for (const s of spinners) s.rotation.x = spin;
      for (const p of steerPivots) p.rotation.y = steerVis;
      tailMat.color.copy(bright(0xff1010, braking ? 6 : 2.2));
      pitch = damp(pitch, Math.max(-0.05, Math.min(0.05, -longAccel * 0.004)), 8, dt);
      roll = damp(roll, Math.max(-0.1, Math.min(0.1, latAccel * 0.0045)), 8, dt);
      body.rotation.x = pitch; // braking (negative accel) dives the nose
      body.rotation.z = roll;
    },
  };
}
