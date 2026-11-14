import { Color, FogExp2, Group } from 'three';
import { ChaseCam } from './camera/chaseCam';
import { CinematicCam } from './camera/cinematicCam';
import { createIntroShots } from './camera/shots';
import { Engine } from './core/engine';
import { TuningPanel } from './dev/tuningPanel';
import { CARS, findCar, type CarSpec } from './data/cars';
import { buildProceduralCar, type CarVisual } from './world/proceduralCar';
import { LapCounter } from './core/lapCounter';
import { TrackContact } from './physics/trackContact';
import { buildWorld } from './world/world';
import { KeyboardInput } from './input/keyboard';
import { CarController } from './physics/carController';
import { applyTuning, createDefaultTuning } from './physics/carTuning';
import { WEATHER } from './physics/weather';
import { Hud } from './ui/hud';
import { createNeutralInput } from './types/game';
import type { CarState, GameState, RaceTelemetry, Weather } from './types/game';

/*
 * Phase 1 orchestrator: CINEMATIC -> RACING in the smoke arena with a box car.
 * Keys: R reset, 1/2/3 weather (clear/rain/snow), backtick tuning panel, any key/tap skips the intro.
 */

const container = document.getElementById('app');
if (!container) throw new Error('#app container missing from index.html');

const engine = new Engine({ container });
const world = buildWorld(engine.scene, engine.renderer);
const carMesh = new Group(); // pose holder; the visual is its child
engine.scene.add(carMesh);
let spec: CarSpec = findCar('civic');
let paint = spec.color;
let visual: CarVisual | null = null;
const tuning = applyTuning(createDefaultTuning(), spec.tuning);
const car = new CarController(tuning);
const contact = new TrackContact(world.track);
const laps = new LapCounter(world.track);
const setCar = (next: CarSpec, color: number): void => {
  spec = next;
  paint = color;
  applyTuning(tuning, spec.tuning);
  if (visual) carMesh.remove(visual.root);
  visual = buildProceduralCar(spec.shape, paint);
  visual.setEnv(world.env);
  carMesh.add(visual.root);
};
setCar(spec, paint);
const START = world.track.samples.length - 6;
const input = new KeyboardInput();
const chase = new ChaseCam(engine.camera);
const hud = new Hud(document.body);
const telemetry: RaceTelemetry = {
  speedKph: 0, rpm: 0, redlineRpm: tuning.redlineRpm, gear: 1, nitroLevel: 1, nitroActive: false,
  drifting: false, driftScore: 0, lap: 1, totalLaps: 1, position: 1, racerCount: 1, raceTime: 0,
};

// What the camera and mesh see: the physics state interpolated between fixed steps.
const view: CarState = {
  position: { x: 0, y: 0, z: 0 }, heading: 0, velocity: { x: 0, y: 0, z: 0 }, speed: 0, yawRate: 0, slipAngle: 0,
};
chase.setTarget(view);

const panel = new TuningPanel(document.body);
panel.add('car', tuning);
panel.add('chase', chase.tuning);
panel.build();

let longAccel = 0;
let lastSpeed = 0;
let state: GameState = 'CINEMATIC';
let weather: Weather = 'CLEAR';
const ctl = createNeutralInput();
const fogColor = new Color();

const setWeather = (w: Weather): void => {
  weather = w;
  const p = WEATHER[w];
  const fog = engine.scene.fog;
  if (fog instanceof FogExp2) {
    fog.density = p.fogDensity;
    fog.color.setHex(p.fogColor);
  }
  engine.scene.background = fogColor.setHex(p.fogColor);
  hud.setWeather(w);
  world.setWeather(p);
};
setWeather('CLEAR');

const intro = new CinematicCam({
  camera: engine.camera,
  subject: carMesh,
  shots: createIntroShots(),
  handover: () => chase.pose,
});
intro.onShotChange = () => engine.kickBloom(0.7);
intro.onComplete = () => {
  state = 'RACING';
};

engine.onFixedUpdate((dt) => {
  if (state !== 'RACING') return;
  input.sample(ctl);
  car.step(dt, ctl, WEATHER[weather]);
  longAccel = (car.state.speed - lastSpeed) / dt;
  lastSpeed = car.state.speed;
  contact.update(car);
  laps.update(contact.hit.index);
});

engine.onFrame((alpha, frameDt) => {
  const s = car.state;
  const heading = car.readPose(alpha, view.position);
  view.heading = heading;
  view.speed = s.speed;
  view.slipAngle = s.slipAngle;
  carMesh.position.set(view.position.x, 0, view.position.z);
  carMesh.rotation.y = heading;
  visual?.update(frameDt, s.speed, ctl.steer, ctl.brake > 0.1 && s.speed > 1, longAccel, car.lateralAccel);

  chase.setNitro(car.drivetrain.nitroActive);
  if (state === 'CINEMATIC') {
    chase.step(frameDt); // keep the handover target live
    intro.update(frameDt);
  } else chase.update(frameDt);

  car.fillTelemetry(telemetry);
  hud.update(telemetry);
});

const skip = (): void => {
  if (state === 'CINEMATIC') intro.skip();
};
container.addEventListener('pointerdown', skip);
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'KeyR') {
    contact.place(car, contact.nearestIndex(car));
    laps.teleport(contact.hit.index);
  }
  else if (e.code === 'KeyC') setCar(CARS[(CARS.indexOf(spec) + 1) % CARS.length], CARS[(CARS.indexOf(spec) + 1) % CARS.length].color); // TEMP until the garage
  else if (e.code === 'Digit1') setWeather('CLEAR');
  else if (e.code === 'Digit2') setWeather('RAIN');
  else if (e.code === 'Digit3') setWeather('SNOW');
  else if (e.code !== 'Backquote') skip();
});

const q = new URLSearchParams(location.search); // dev shortcuts: ?skip  ?w=rain|snow
if (q.get('w') === 'rain') setWeather('RAIN');
if (q.get('w') === 'snow') setWeather('SNOW');
contact.place(car, START);
laps.reset(START);
intro.start();
if (q.has('skip')) {
  intro.skip();
  intro.skip();
}
engine.start();
