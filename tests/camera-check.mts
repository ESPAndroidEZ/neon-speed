import { PerspectiveCamera } from 'three';
import { ChaseCam } from '../src/camera/chaseCam.ts';
import { CarController } from '../src/physics/carController.ts';
import { applyTuning, createDefaultTuning } from '../src/physics/carTuning.ts';
import { fillEnv, LEVELS, type PhysicsLevel } from '../src/physics/weatherLevels.ts';
import { CARS } from '../src/data/cars.ts';
import { createNeutralInput } from '../src/types/game.ts';
import type { CarState, Weather } from '../src/types/game.ts';

const LEGACY = false;
const Cam = ChaseCam;

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const D = 1 / 60;
const DISPLAY = 1 / 144; // a 144 Hz monitor: render frames fall between physics steps
const std = (a: number[]): number => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / Math.max(1, a.length));
/** High-pass: value minus its centred moving average (window ~0.3 s) leaves only jitter, not the smooth motion. */
const hp = (a: number[], w = 21): number[] => a.map((v, i) => {
  const lo = Math.max(0, i - w);
  const hi = Math.min(a.length - 1, i + w);
  let s = 0;
  for (let k = lo; k <= hi; k++) s += a[k];
  return v - s / (hi - lo + 1);
});

/** Frame-to-frame acceleration of a series (units/s^2). Smooth motion gives a smooth series; jitter gives noise. */
const accel = (a: number[]): number[] => a.slice(1, -1).map((v, i) => (a[i + 2] - 2 * v + a[i]) / (DISPLAY * DISPLAY));
interface Jitter { pos: number; yaw: number; fov: number }

/** Full throttle from a standstill for 12 s, camera pose sampled every display frame, exactly as Game + Juice drive it. */
function run(weather: Weather, level: PhysicsLevel, carId: string, nitro = false): Jitter {
  const spec = CARS.find((c) => c.id === carId)!;
  const car = new CarController(applyTuning(createDefaultTuning(), spec.tuning));
  car.reset();
  const cam = new PerspectiveCamera(60, 16 / 9, 0.1, 800);
  const chase = new Cam(cam);
  const view: CarState = { position: { x: 0, y: 0, z: 0 }, heading: 0, velocity: { x: 0, y: 0, z: 0 }, speed: 0, yawRate: 0, slipAngle: 0 };
  chase.setTarget(view);
  const env = fillEnv({ name: weather, grip: 1, fogDensity: 0, fogColor: 0, precipitation: 0, roadRoughness: 0, level, yawDampMul: 1, assistMul: 1, rearGripMul: 1, intensity: 1 }, weather, level, 1);
  const inp = createNeutralInput();
  inp.throttle = 1;
  inp.nitro = nitro;
  const px: number[] = [];
  const py: number[] = [];
  const pz: number[] = [];
  const yaw: number[] = [];
  const fov: number[] = [];
  let acc = 0;
  for (let t = 0; t < 12; t += DISPLAY) {
    acc += DISPLAY;
    while (acc >= D) {
      car.step(D, inp, env);
      acc -= D;
    }
    car.readPose(acc / D, view.position);
    view.heading = car.state.heading;
    view.speed = car.state.speed;
    view.slipAngle = car.state.slipAngle;
    chase.setNitro(car.drivetrain.nitroActive);
    // Juice: what it feeds the camera each frame
    if (LEGACY) {
      const lv = weather === 'CLEAR' ? 0 : 1 + LEVELS.indexOf(level);
      const sl = Math.max(Math.abs(car.state.slipAngle) > 0.1 ? Math.min(1, (Math.abs(car.state.slipAngle) - 0.1) / 0.35) : 0, car.flags.wheelspin ? 0.7 : 0);
      (chase as unknown as { addShake(a: number): void }).addShake(sl * 0.012 * (1 + lv));
    } else (chase as unknown as { feedSlide?(slip: number, speed: number, dt: number): void }).feedSlide?.(car.state.slipAngle, car.state.speed, DISPLAY);
    chase.update(DISPLAY);
    if (t > 1.5) { // skip the first second while the camera settles from its snap
      px.push(cam.position.x);
      py.push(cam.position.y);
      pz.push(cam.position.z);
      const d = cam.getWorldDirection(new (cam.position.constructor as new () => typeof cam.position)());
      yaw.push(Math.atan2(d.x, d.z));
      fov.push(cam.fov);
    }
  }
  // unwrap yaw
  for (let i = 1; i < yaw.length; i++) while (yaw[i] - yaw[i - 1] > Math.PI) yaw[i] -= 2 * Math.PI;
  const rp = [px, py, pz].map((a) => std(hp(accel(a), 11)));
  return { pos: Math.sqrt(rp[0] ** 2 + rp[1] ** 2 + rp[2] ** 2), yaw: std(hp(accel(yaw), 11)), fov: std(hp(accel(fov), 11)) };
}

const POS_MAX = 6; // m/s^2  frame-to-frame camera acceleration jitter (std dev) while accelerating
const YAW_MAX = 0.05; // rad/s^2
const FOV_MAX = 20; // deg/s^2
for (const w of ['CLEAR', 'RAIN', 'SNOW'] as Weather[]) {
  for (const lv of LEVELS) {
    for (const car of ['civic', 'supra']) {
      const j = run(w, lv, car);
      check(`${w} ${lv} ${car}: no camera jitter on full-throttle acceleration`, j.pos < POS_MAX && j.yaw < YAW_MAX && j.fov < FOV_MAX, `pos ${j.pos.toFixed(2)} m/s2, yaw ${j.yaw.toFixed(3)} rad/s2, fov ${j.fov.toFixed(2)} deg/s2`);
    }
  }
}
const n = run('CLEAR', 'AGGRESSIVE', 'supra', true);
check('nitro kick is smooth (no jitter)', n.pos < POS_MAX && n.fov < FOV_MAX, `fov ${n.fov.toFixed(2)}`);
// shake: only impacts and big slides, capped, and the setting scales it
{
  const mk = (shake: number): { cam: PerspectiveCamera; chase: ChaseCam; view: CarState } => {
    const cam = new PerspectiveCamera(60, 16 / 9, 0.1, 800);
    const chase = new ChaseCam(cam);
    chase.tuning.shake = shake;
    const view: CarState = { position: { x: 0, y: 0, z: 0 }, heading: 0, velocity: { x: 0, y: 0, z: 0 }, speed: 30, yawRate: 0, slipAngle: 0 };
    chase.setTarget(view);
    chase.update(0.016);
    return { cam, chase, view };
  };
  const spread = (shake: number, slip: number, hit: boolean): number => {
    const { cam, chase } = mk(shake);
    const xs: number[] = [];
    if (hit) chase.addShake(0.9);
    for (let i = 0; i < 300; i++) {
      chase.feedSlide(slip, 30, 0.016);
      chase.update(0.016);
      xs.push(cam.position.x);
    }
    return Math.max(...xs) - Math.min(...xs);
  };
  check('small slip (0.3 rad) and wheelspin never shake the camera', spread(1, 0.3, false) < 1e-6, `${spread(1, 0.3, false)}`);
  check('a big slide (0.9 rad) does shake it, but capped under 0.6 m peak-to-peak', spread(1, 0.9, false) > 0.02 && spread(1, 0.9, false) < 0.6, `${spread(1, 0.9, false).toFixed(3)} m`);
  check('an impact shakes it and the shake dies out', spread(1, 0, true) > 0.05, `${spread(1, 0, true).toFixed(3)} m`);
  check('Off removes all shake, Low is gentler than Normal', spread(0, 0.9, true) < 1e-6 && spread(0.5, 0.9, true) < spread(1, 0.9, true), '');
}

// owner 2026-11-21: a long handbrake slide must not pull the camera in. The zoom follows speed up quickly and down slowly.
{
  const cam = new PerspectiveCamera(60, 16 / 9, 0.1, 500);
  const chase = new Cam(cam);
  const car = { position: { x: 0, y: 0, z: 0 }, heading: 0, speed: 45, slipAngle: 0 } as unknown as CarState;
  chase.setTarget(car);
  for (let i = 0; i < 240; i++) chase.step(1 / 60);
  const far = chase.pose.fov, fast = chase.pose.position.length();
  (car as { speed: number }).speed = 8; // the handbrake scrubs the speed away
  for (let i = 0; i < 60; i++) chase.step(1 / 60); // one second later
  const dFov = far - chase.pose.fov;
  check('one second into a speed loss the view has hardly zoomed in (under a third of the way)', dFov < (far - 60) * 0.34, `${dFov.toFixed(1)} of ${(far - 60).toFixed(1)} deg`);
  for (let i = 0; i < 360; i++) chase.step(1 / 60);
  check('it still settles to the slow-speed view afterwards', chase.pose.fov < far - (far - 60) * 0.7 && chase.pose.position.length() < fast, `${chase.pose.fov.toFixed(1)} deg`);
  (car as { speed: number }).speed = 45;
  for (let i = 0; i < 60; i++) chase.step(1 / 60);
  check('and it opens up again quickly when the car speeds up', chase.pose.fov > far - 6, `${chase.pose.fov.toFixed(1)} vs ${far.toFixed(1)}`);
}
// spring arm (Free Drive): a wall behind the car pulls the camera in at once; it eases back out over about a second
{
  const cam = new ChaseCam(new PerspectiveCamera(60, 16 / 9, 0.1, 1000));
  const st = { position: { x: 0, y: 0, z: 0 }, heading: 0, velocity: { x: 0, y: 0, z: 0 }, speed: 0, yawRate: 0, slipAngle: 0 };
  cam.setTarget(st);
  for (let i = 0; i < 30; i++) cam.step(1 / 60);
  const far = Math.hypot(cam.pose.position.x, cam.pose.position.z);
  let wall = true;
  cam.clip = () => (wall ? 0.4 : 1);
  cam.step(1 / 60);
  const near = Math.hypot(cam.pose.position.x, cam.pose.position.z);
  wall = false;
  for (let i = 0; i < 12; i++) cam.step(1 / 60);
  const mid = Math.hypot(cam.pose.position.x, cam.pose.position.z);
  for (let i = 0; i < 240; i++) cam.step(1 / 60);
  const back = Math.hypot(cam.pose.position.x, cam.pose.position.z);
  check('spring arm: in at once behind a wall', near < far * 0.45, `${far.toFixed(2)} -> ${near.toFixed(2)} m`);
  check('spring arm: out slowly, then all the way', mid < far * 0.75 && Math.abs(back - far) < 0.05, `${mid.toFixed(2)} then ${back.toFixed(2)} m`);
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
