import { CarController } from '../src/physics/carController.ts';
import { applyTuning, createDefaultTuning, type CarTuning } from '../src/physics/carTuning.ts';
import { ASSIST_LEVELS, setAssist, type AssistLevel } from '../src/physics/assists.ts';
import { WEATHER } from '../src/physics/weather.ts';
import { createNeutralInput } from '../src/types/game.ts';
import type { CarInput } from '../src/types/game.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`);
};
const D = 1 / 60;
const inp = (o: Partial<CarInput>): CarInput => ({ ...createNeutralInput(), ...o });
const mk = (o: Partial<CarTuning> = {}, level: AssistLevel = 'STANDARD', sens = 1): CarController => {
  const c = new CarController(applyTuning(createDefaultTuning(), o));
  c.reset();
  setAssist(c.assist, level);
  c.sensitivity = sens;
  return c;
};
const toSpeed = (c: CarController, v: number): void => {
  const i = inp({ throttle: 1 });
  while (c.state.speed < v) c.step(D, i, WEATHER.CLEAR);
};
const hold = (c: CarController, secs: number, i: CarInput): void => {
  for (let k = 0; k < secs * 60; k++) c.step(D, i, WEATHER.CLEAR);
};

// Weight transfer: braking loads the nose, power loads the tail, cornering moves load outward.
{
  const c = mk();
  const stat = { f: c.load.fzF, r: c.load.fzR };
  toSpeed(c, 25);
  hold(c, 0.5, inp({ throttle: 1 }));
  check('acceleration loads the rear axle', c.load.fzR > stat.r * 1.05 && c.load.fzF < stat.f * 0.95, `rear ${(c.load.fzR / stat.r).toFixed(2)}x`);
  hold(c, 0.6, inp({ brake: 1 }));
  check('braking loads the front axle', c.load.fzF > stat.f * 1.1 && c.load.fzR < stat.r * 0.9, `front ${(c.load.fzF / stat.f).toFixed(2)}x`);
  check('total load is conserved', Math.abs(c.load.fzF + c.load.fzR - 1300 * 9.81) < 1, `${(c.load.fzF + c.load.fzR).toFixed(0)} N`);
  const k = mk();
  toSpeed(k, 25);
  hold(k, 1.2, inp({ throttle: 0.5, steer: 0.6 }));
  check('hard cornering costs grip on the loaded axles', k.load.gripF < 0.97 && k.load.gripR < 0.99, `front ${k.load.gripF.toFixed(3)} rear ${k.load.gripR.toFixed(3)}`);
}

// Balance knob: more roll transfer on the front means less cornering force at the nose (understeer).
{
  const latG = (rollFront: number): number => {
    const c = mk({ rollFront });
    toSpeed(c, 22);
    hold(c, 0.4, inp({ throttle: 0.35 }));
    hold(c, 2.0, inp({ throttle: 0.3, steer: 0.35 }));
    return Math.abs(c.state.yawRate * c.state.speed);
  };
  const push = latG(0.7);
  const loose = latG(0.3);
  check('front-heavy roll understeers (less lateral g)', push < loose, `0.7: ${push.toFixed(2)} vs 0.3: ${loose.toFixed(2)} m/s2`);
}

// Brake bias: under hard braking in a turn a front-biased car loses front grip and runs wide.
{
  const yaw = (brakeBias: number): number => {
    const c = mk({ brakeBias });
    toSpeed(c, 30);
    hold(c, 0.3, inp({}));
    hold(c, 0.6, inp({ brake: 1, steer: 0.3 }));
    return Math.abs(c.state.yawRate);
  };
  check('front brake bias reduces turn-in under braking', yaw(0.78) < yaw(0.5), `0.78: ${yaw(0.78).toFixed(3)} vs 0.5: ${yaw(0.5).toFixed(3)} rad/s`);
}

// Engine braking: lifting off slows the car more with a bigger engine-braking value.
{
  const speedAfterLift = (engineBraking: number): number => {
    const c = mk({ engineBraking });
    toSpeed(c, 40);
    hold(c, 2, inp({}));
    return c.state.speed;
  };
  check('engine braking slows a lift-off', speedAfterLift(0.12) < speedAfterLift(0.02) - 0.5, `${speedAfterLift(0.12).toFixed(1)} vs ${speedAfterLift(0.02).toFixed(1)} m/s`);
}

// Throttle lag: a lagged throttle gives less drive in the first quarter second.
{
  const sp = (throttleLag: number): number => {
    const c = mk({ throttleLag });
    hold(c, 0.5, inp({ throttle: 1 }));
    return c.state.speed;
  };
  check('throttle lag delays the launch', sp(0.25) < sp(0) * 0.97, `${sp(0.25).toFixed(2)} vs ${sp(0).toFixed(2)} m/s`);
}

// Assists: BEGINNER is harder to spin than PRO, and recovers a slide faster.
{
  const peakYaw = (level: AssistLevel): number => {
    const c = mk({}, level);
    toSpeed(c, 28);
    let peak = 0;
    for (let k = 0; k < 90; k++) {
      c.step(D, inp({ throttle: 1, steer: 1, handbrake: k > 20 && k < 40 }), WEATHER.CLEAR);
      peak = Math.max(peak, Math.abs(c.state.yawRate));
    }
    return peak;
  };
  // after a handbrake flick, hands off: how much sliding is left over the next 2 s (mean |slip|)
  const recover = (level: AssistLevel): number => {
    const c = mk({}, level);
    toSpeed(c, 25);
    hold(c, 0.4, inp({ throttle: 0.5 }));
    for (let k = 0; k < 30; k++) c.step(D, inp({ throttle: 0.5, steer: 1, handbrake: true }), WEATHER.CLEAR);
    let sum = 0;
    for (let k = 0; k < 120; k++) {
      c.step(D, inp({ throttle: 0.3 }), WEATHER.CLEAR);
      sum += Math.abs(c.state.slipAngle);
    }
    return sum / 120;
  };
  check('beginner spins less than pro', peakYaw('BEGINNER') < peakYaw('PRO') * 0.95, `${peakYaw('BEGINNER').toFixed(2)} vs ${peakYaw('PRO').toFixed(2)} rad/s`);
  check('beginner catches a slide faster than pro', recover('BEGINNER') < recover('PRO') * 0.9, `mean slip ${recover('BEGINNER').toFixed(2)} vs ${recover('PRO').toFixed(2)} rad`);
  check('standard assist is neutral (approved handling)', ASSIST_LEVELS.STANDARD.steer === 0 && ASSIST_LEVELS.STANDARD.brake === 0 && ASSIST_LEVELS.STANDARD.counter === 1, '');
}

// Steering sensitivity scales the response.
{
  const yaw = (sens: number): number => {
    const c = mk({}, 'STANDARD', sens);
    toSpeed(c, 15);
    hold(c, 1.0, inp({ throttle: 0.25, steer: 0.1 }));
    return Math.abs(c.state.yawRate);
  };
  check('higher sensitivity turns harder', yaw(1.4) > yaw(1) * 1.15 && yaw(0.6) < yaw(1) * 0.85, `${yaw(0.6).toFixed(2)} / ${yaw(1).toFixed(2)} / ${yaw(1.4).toFixed(2)} rad/s`);
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
