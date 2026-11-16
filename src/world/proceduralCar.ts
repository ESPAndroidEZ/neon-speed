import { LOOK_CONFIG } from '../render/lookConfig';
import { mergeByMaterial } from './mergeMeshes';
import { BoxGeometry, Color, Group, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, type Object3D, type Texture } from 'three';
import { damp } from '../core/math';
import { buildBody, type BodyShape } from './carBody';
import { addDetails } from './carDetails';
import { addSignature } from './carSignature';
import { addExtras } from './carExtras';
import { flakeTexture } from './textures';
import { addLightsAndShadow } from './carLights';
import { buildArch, buildWheel, makeWheelMats } from './carWheels';
import { applyAppearance, glowAt } from './carAppearance';
import { defaultLoadout, type Loadout } from '../data/loadout';

const bright = (hex: number, k: number): Color => new Color(hex).multiplyScalar(k);

/** Present on GLB-based cars: lets the garage fix a model that faces the wrong way. */
export interface Calibration {
  getYaw(): number;
  setYaw(rad: number): void;
  /** Show an arrow in front of the car pointing along the game's nose direction (+Z). */
  setArrow(on: boolean): void;
}

export interface CarVisual {
  root: Group;
  /** The node that pitches and rolls (child of root). Body-fixed add-ons such as the plates go here so they move with the panels. */
  body?: Group;
  calibrate?: Calibration;
  /** Rear exhaust tips and tyre contact points in car space, for smoke, flames and skid marks. */
  exhaust: readonly Object3D[];
  rearWheels: readonly Object3D[];
  setPaint(hex: number): void;
  setUnderglow(hex: number): void;
  /** Finish, vinyl, tint, headlights, calipers, stance and underglow pattern (rims only at build time). Optional on GLB cars. */
  setAppearance?(l: Loadout, paintHex: number): void;
  setEnv(env: Texture): void;
  /** Per display frame: wheel spin and steer, brake lights, body pitch/roll from accelerations. */
  update(dt: number, speed: number, steer: number, braking: boolean, longAccel: number, latAccel: number): void;
}

/** Low-poly procedural car from a BodyShape. Nose +Z, +X left, origin on the ground at the centre. */
export function buildProceduralCar(baseShape: BodyShape, paintHex: number, loadout: Loadout = defaultLoadout()): CarVisual {
  const shape: BodyShape = loadout.parts.spoiler ? { ...baseShape, spoiler: 'none' } : baseShape; // an add-on spoiler replaces the stock one
  const root = new Group();
  const body = new Group();
  root.add(body);
  const paint = new MeshPhysicalMaterial({ color: paintHex, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.04, bumpMap: flakeTexture(), bumpScale: 0.35 });
  const glass = new MeshPhysicalMaterial({ color: 0x0a101c, metalness: 0.9, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 });
  const trim = new MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.6, metalness: 0.4 });
  const metal = new MeshStandardMaterial({ color: 0xb4b8c2, metalness: 0.95, roughness: 0.25 });
  const w = shape.width;
  const zf = shape.length / 2;
  const parts = buildBody(shape);
  const shell = new Mesh(parts.shell, paint);
  const cab = new Mesh(parts.cabin, [glass, paint]);
  shell.castShadow = cab.castShadow = true;
  body.add(shell, cab);
  const headMat = new MeshBasicMaterial({ color: bright(0xdff2ff, 2.4) });
  const tailMat = new MeshBasicMaterial({ color: bright(0xff1010, 0.9) });
  addDetails(body, shape, parts, paint, trim, metal);
  const tail = new Mesh(new BoxGeometry(w * 0.74, 0.03, 0.04), trim); // dark bar between the lamps
  tail.position.set(0, shape.beltHeight - 0.16, -zf - 0.01);
  body.add(tail);
  const sigMats = { paint, trim, metal, head: headMat, tail: tailMat };
  addSignature(body, shape, parts, sigMats);
  addExtras(body, shape, parts, sigMats);
  mergeByMaterial(body); // static body pieces: one draw call per material

  addLightsAndShadow(root, w, shape.length - 0.22, parts.hoodY(zf - 0.14) - 0.06);
  const glowMat = new MeshBasicMaterial({ color: bright(0x2a6bff, 1.5), transparent: true, opacity: 0.6 });
  const glowPlane = new Mesh(new BoxGeometry(w * 0.85, 0.02, shape.length * 0.8), glowMat);
  glowPlane.position.y = 0.08;
  root.add(glowPlane);

  const wheels = makeWheelMats();
  const pivots: { pivot: Object3D; side: number }[] = [];
  const wr = shape.wheelRadius;
  const spinners: Object3D[] = [];
  const steerPivots: Object3D[] = [];
  const rear: Object3D[] = [];
  for (const sx of [1, -1]) {
    for (const front of [true, false]) {
      const x = sx * (w / 2 - 0.085);
      const z = (front ? 1 : -1) * shape.wheelbase * 0.5;
      const arch = buildArch(wr);
      arch.position.set(sx * (w / 2 - 0.2), wr, z);
      root.add(arch);
      const pivot = new Group();
      pivot.position.set(x, wr, z);
      const { spin, caliper } = buildWheel(wr, sx, wheels, loadout.rim.design, loadout.rim.size);
      pivots.push({ pivot, side: sx });
      pivot.add(spin, caliper);
      root.add(pivot);
      spinners.push(spin);
      if (front) steerPivots.push(pivot);
      else rear.push(pivot);
    }
  }
  mergeByMaterial(root); // the four arch liners -> one draw call
  const exhaust: Object3D[] = [];
  for (const x of [-w * 0.28, w * 0.28]) {
    const e = new Group();
    e.position.set(x, 0.36, -zf - 0.05);
    root.add(e);
    exhaust.push(e);
  }

  let glowBase = 0x2a6bff;
  let pattern = loadout.glowPattern;
  let clock = 0;
  const tmp = new Color();
  const addOn = { root: body, anchors: { length: shape.length, width: shape.width, height: shape.height, belt: shape.beltHeight, wheelbase: shape.wheelbase }, trim };
  const targets = { paint, glass, headMat, glowMat, wheels, body, pivots, parts: addOn };
  applyAppearance(targets, loadout, paintHex);
  let pitch = 0;
  let roll = 0;
  let spin = 0;
  let steerVis = 0;
  return {
    root,
    body,
    exhaust,
    rearWheels: rear,
    setPaint: (hex) => {
      paintHex = hex;
      applyAppearance(targets, loadout, hex);
    },
    setAppearance: (l, hex) => {
      loadout = l;
      pattern = l.glowPattern;
      paintHex = hex;
      applyAppearance(targets, l, hex);
    },
    setUnderglow: (hex) => {
      glowBase = hex;
      glowMat.color.copy(bright(hex, 1.5));
    },
    setEnv: (env) => {
      // every standard material needs the environment or its metal parts (rims, tips, discs) render black
      root.traverse((o) => {
        if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
          o.material.envMap = env;
          o.material.envMapIntensity = 1.1;
          o.material.needsUpdate = true;
        }
      });
      paint.envMap = env;
      paint.envMapIntensity = 1.5;
      glass.envMap = env;
      paint.needsUpdate = true;
    },
    update(dt, speed, steer, braking, longAccel, latAccel) {
      clock += dt;
      if (pattern !== 'solid') glowMat.color.copy(glowAt(pattern, clock, glowBase, tmp)).multiplyScalar(1.5);
      spin += (speed / wr) * dt;
      steerVis = damp(steerVis, steer * 0.5, 14, dt);
      for (const s of spinners) s.rotation.x = spin;
      for (const p of steerPivots) p.rotation.y = steerVis;
      tailMat.color.setHex(0xff1010).multiplyScalar(braking ? LOOK_CONFIG.brakeLight.braking : LOOK_CONFIG.brakeLight.idle);
      pitch = damp(pitch, Math.max(-0.05, Math.min(0.05, -longAccel * 0.004)), 8, dt);
      roll = damp(roll, Math.max(-0.1, Math.min(0.1, latAccel * 0.0045)), 8, dt);
      body.rotation.x = pitch; // braking (negative accel) dives the nose
      body.rotation.z = roll;
    },
  };
}
