import { Color, FogExp2, Scene } from 'three';
import { ChaseCam } from './camera/chaseCam';
import { CinematicCam } from './camera/cinematicCam';
import { createIntroShots } from './camera/shots';
import { Engine } from './core/engine';
import { TuningPanel } from './dev/tuningPanel';
import { buildSmokeScene } from './dev/smokeScene';
import { LapCounter } from './core/lapCounter';
import { TrackContact } from './physics/trackContact';
import { buildWorld } from './world/world';
import { KeyboardInput } from './input/keyboard';
import { CarController } from './physics/carController';
import { createDefaultTuning } from './physics/carTuning';
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
const carMesh = buildSmokeScene(new Scene()); // TEMP box car until proceduralCar
engine.scene.add(carMesh);
const tuning = createDefaultTuning();
const car = new CarController(tuning);
const contact = new TrackContact(world.track);
const laps = new LapCounter(world.track);
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
  carMesh.rotation.z = car.lateralAccel * 0.004; // body rolls outward

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
