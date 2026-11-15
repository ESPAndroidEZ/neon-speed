import { BoxGeometry, Color, ConeGeometry, CylinderGeometry, Group, Material, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, type Texture } from 'three';
import { damp } from '../core/math';
import type { CarModel } from '../types/game';
import { findBodyMaterial, setModelYaw } from './assetLoader';
import { attachParts } from './carParts';
import { addLightsAndShadow } from './carLights';
import { upgradeCarMaterials } from './materialUpgrade';
import type { CarVisual } from './proceduralCar';

/**
 * CarVisual for a baked GLB car (Tripo): wheels are part of the mesh so they do not spin or steer.
 * Pitch and roll, underglow, paint tint (only if the body material can be identified) and a yaw
 * calibration arrow are provided.
 */
const addOnTrim = new MeshStandardMaterial({ color: 0x0b0c10, roughness: 0.6, metalness: 0.4 });

export function buildModelCar(model: CarModel, factoryColor: number, paintHex: number, yaw: number): CarVisual {
  const root = new Group();
  const body = new Group();
  body.add(model.root);
  root.add(body);
  const { x: w, z: len } = model.size;
  setModelYaw(model, yaw);

  // material upgrade pass (clearcoat body, dark glass, rubber tyres), then pick the paintable body material
  const bodies = upgradeCarMaterials(model.root, { env: null });
  const found = findBodyMaterial(model.root);
  const bodyMat = (found && bodies.includes(found as never) ? found : bodies.length === 1 ? bodies[0] : null) as (Material & { color?: Color; map?: unknown }) | null;
  const tint = (hex: number): void => {
    if (!bodyMat?.color) return;
    if (hex === factoryColor && bodyMat.map) bodyMat.color.setHex(0xffffff); // textured (Tripo): show the baked paint; untextured (Blender): the colour IS the paint
    else if (bodyMat.map) bodyMat.color.setHex(0xffffff).lerp(new Color(hex), 0.7); // textured body: keep some of the baked detail
    else bodyMat.color.setHex(hex);
  };
  tint(paintHex);
  addLightsAndShadow(root, w, len, 0.7);

  const glowMat = new MeshBasicMaterial({ color: new Color(0x2a6bff).multiplyScalar(1.5), transparent: true, opacity: 0.6 });
  const glow = new Mesh(new BoxGeometry(w * 0.85, 0.02, len * 0.8), glowMat);
  glow.position.y = 0.08;
  root.add(glow);

  const exhaust: Object3D[] = [];
  for (const x of [-w * 0.28, w * 0.28]) {
    const e = new Object3D();
    e.position.set(x, 0.38, -len / 2);
    root.add(e);
    exhaust.push(e);
  }
  const rear: Object3D[] = [];
  for (const x of [-(w / 2 - 0.15), w / 2 - 0.15]) {
    const r = new Object3D();
    r.position.set(x, 0.3, -len * 0.3);
    root.add(r);
    rear.push(r);
  }

  const arrow = new Group();
  const arrowMat = new MeshBasicMaterial({ color: new Color(0xff2a9d).multiplyScalar(3), depthTest: false });
  const shaft = new Mesh(new CylinderGeometry(0.07, 0.07, 1.2, 8).rotateX(Math.PI / 2), arrowMat);
  const head = new Mesh(new ConeGeometry(0.2, 0.5, 12).rotateX(Math.PI / 2), arrowMat);
  head.position.z = 0.85;
  arrow.add(shaft, head);
  arrow.position.set(0, 1.1, len / 2 + 1.3);
  arrow.renderOrder = 10;
  arrow.visible = false;
  root.add(arrow);

  let curYaw = yaw;
  let pitch = 0;
  let roll = 0;
  return {
    root,
    body,
    exhaust,
    rearWheels: rear,
    calibrate: {
      getYaw: () => curYaw,
      setYaw: (r) => {
        curYaw = r;
        setModelYaw(model, r);
      },
      setArrow: (on) => {
        arrow.visible = on;
      },
    },
    setPaint: tint,
    setUnderglow: (hex) => glowMat.color.setHex(hex).multiplyScalar(1.5),
    // GLB bodies are not swappable: add-on parts attach at anchors from the bounding box; finish, tint and the rest are applied to what can be found
    setAppearance: (l) => {
      attachParts(body, { length: len, width: w, height: model.size.y, belt: model.size.y * 0.55, wheelbase: len * 0.6 }, l.parts, (bodyMat as Material | null) ?? addOnTrim, addOnTrim);
    },
    setEnv: (env: Texture) => {
      model.root.traverse((o) => {
        if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
          o.material.envMap = env;
          o.material.envMapIntensity = o.material instanceof MeshPhysicalMaterial && o.material.clearcoat > 0.9 ? 1.5 : 1;
          o.material.needsUpdate = true;
        }
      });
    },
    update(dt, _speed, _steer, _braking, longAccel, latAccel) {
      pitch = damp(pitch, Math.max(-0.05, Math.min(0.05, -longAccel * 0.004)), 8, dt);
      roll = damp(roll, Math.max(-0.1, Math.min(0.1, latAccel * 0.0045)), 8, dt);
      body.rotation.x = pitch;
      body.rotation.z = roll;
    },
  };
}
