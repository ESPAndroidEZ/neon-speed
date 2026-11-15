import { clamp } from '../../src/core/math.ts';
import { WEATHER } from '../../src/physics/weather.ts';
import { createNeutralInput } from '../../src/types/game.ts';
import { car, IDS } from './v2.mts';

/* Scripted manoeuvres per car on v2 (plan section 6): `npx tsx tests/lab/v2-manoeuvres.mts`. Prints one table row per car. */
const D = 1 / 60;
const G = 9.81;
const cruise = (u: number, v: number): number => clamp((v - u) * 0.6 + 0.15, 0, 1);

/** Hairpin at 40 km/h: full lock held, speed held; min radius (m) and time for 180 deg (s). */
function hairpin(id: string): [number, number] {
  const c = car(id), i = createNeutralInput(), v = 40 / 3.6;
  c.u = v;
  let yaw = 0, t = 0, rMin = 1e9;
  while (yaw < Math.PI && t < 15) {
    i.steer = 1;
    i.throttle = cruise(c.u, v);
    c.step(D, i, WEATHER.CLEAR);
    yaw += c.r * D; t += D;
    if (t > 1) rMin = Math.min(rMin, Math.hypot(c.u, c.v) / Math.max(1e-3, Math.abs(c.r)));
  }
  return [rMin, t];
}

/** Sweeper at 120 km/h: slow steer ramp, speed held; peak steady lateral g and the body slip there (deg). */
function sweeper(id: string): [number, number] {
  const c = car(id), i = createNeutralInput(), v = 120 / 3.6;
  c.u = v;
  let best = 0, slip = 0, avg = 0;
  for (let k = 0; k < 60 * 15; k++) {
    i.steer = Math.min(1, k / (60 * 12));
    i.throttle = cruise(c.u, v);
    c.step(D, i, WEATHER.CLEAR);
    avg += (c.u * c.r - avg) * 0.05;
    if (Math.abs(avg) / G > best) { best = Math.abs(avg) / G; slip = (c.state.slipAngle * 180) / Math.PI; }
  }
  return [best, slip];
}

/** Wet braking into a corner: 100 km/h, rain, full brake with 30 % steer; path length to stop (m), peak body slip above 30 km/h (deg). */
function wetBrake(id: string): [number, number] {
  const c = car(id), i = createNeutralInput();
  i.throttle = 1;
  while (c.u * 3.6 < 100) c.step(D, i, WEATHER.CLEAR);
  i.throttle = 0; i.brake = 1; i.steer = 0.3;
  let path = 0, slip = 0, k = 0;
  while (c.u > 0.5 && k++ < 60 * 15) { // stop at standstill (holding the brake would engage reverse)
    c.step(D, i, WEATHER.RAIN);
    path += Math.hypot(c.u, c.v) * D;
    if (Math.hypot(c.u, c.v) > 30 / 3.6) slip = Math.max(slip, Math.abs(c.state.slipAngle));
  }
  return [path, (slip * 180) / Math.PI];
}

console.log('| Car | Hairpin 40: min R (m) / 180 deg (s) | Sweeper 120: max g / slip (deg) | Wet brake into corner: stop (m) / peak slip (deg) |');
console.log('|---|---|---|---|');
for (const id of IDS) {
  const h = hairpin(id), s = sweeper(id), w = wetBrake(id);
  console.log(`| ${id} | ${h[0].toFixed(1)} / ${h[1].toFixed(2)} | ${s[0].toFixed(2)} / ${s[1].toFixed(1)} | ${w[0].toFixed(1)} / ${w[1].toFixed(1)} |`);
}
