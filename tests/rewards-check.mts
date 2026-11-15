// Nitro rewards: near miss, slipstream, clean corner (core/rewards).
import { RaceRewards, REWARD, type RewardRacer } from '../src/core/rewards.ts';
import { CarController } from '../src/physics/carController.ts';
import { createDefaultTuning } from '../src/physics/carTuning.ts';
import type { TrackContact } from '../src/physics/trackContact.ts';
import { createKestrelBay } from '../src/world/kestrelBay.ts';

let failed = 0;
const check = (n: string, ok: boolean, i: string): void => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  (${i})`); };
const D = 1 / 60;
const track = createKestrelBay();
const racer = (isPlayer: boolean, index = 0): RewardRacer => {
  const car = new CarController(createDefaultTuning());
  car.reset(0, 0, 0);
  return { car, isPlayer, finished: false, contact: { hit: { index }, impact: 0 } as unknown as TrackContact };
};
const place = (r: RewardRacer, x: number, z: number, speed: number): void => {
  const s = r.car.state; s.position.x = x; s.position.z = z; s.heading = 0; s.speed = speed;
};
{ // near miss: player passes a car 2 m to the side at 25 m/s
  const rw = new RaceRewards(), me = racer(true), o = racer(false);
  me.car.drivetrain.nitroLevel = 0.2;
  for (let i = 0; i < 40; i++) { place(me, 0, -5 + i * 0.4, 25); place(o, 2, 0, 15); rw.step(D, [me, o], track.samples, 0); }
  check('near miss pays nitro', rw.last === 'NEAR MISS' && me.car.drivetrain.nitroLevel >= 0.2 + REWARD.nearMiss - 1e-6, `${rw.last} nitro ${me.car.drivetrain.nitroLevel.toFixed(2)}`);
}
{ // a pass with contact is not a near miss
  const rw = new RaceRewards(), me = racer(true), o = racer(false);
  for (let i = 0; i < 40; i++) { place(me, 0, -5 + i * 0.4, 25); place(o, 1, 0, 15); rw.step(D, [me, o], track.samples, 3); }
  check('touching is not a near miss', rw.last !== 'NEAR MISS', String(rw.last));
}
{ // slipstream: 10 m behind, same line, 30 m/s, for 1 s
  const rw = new RaceRewards(), me = racer(true), o = racer(false);
  me.car.drivetrain.nitroLevel = 0;
  for (let i = 0; i < 60; i++) { place(me, 0, 0, 30); place(o, 0.5, 10, 30); rw.step(D, [me, o], track.samples, 0); }
  check('slipstream fills nitro and announces', rw.last === 'SLIPSTREAM' && me.car.drivetrain.nitroLevel > 0.08, `${rw.last} nitro ${me.car.drivetrain.nitroLevel.toFixed(2)}`);
}
{ // clean corner: walk the sample index through the plaza hairpin with no wall contact, then with a hit
  const run = (hit: boolean): string | null => {
    const rw = new RaceRewards(), me = racer(true);
    const plaza = track.zones.indexOf('plaza');
    for (let i = plaza - 25; i < plaza + 45; i++) {
      (me.contact.hit as { index: number }).index = (i + track.samples.length) % track.samples.length;
      (me.contact as { impact: number }).impact = hit ? 4 : 0; // scraping the wall the whole way (the window holds both halves of the hairpin)
      place(me, 0, 0, 14); rw.step(D, [me], track.samples, 0);
    }
    return rw.last;
  };
  check('clean corner pays, a wall hit does not', run(false) === 'CLEAN CORNER' && run(true) !== 'CLEAN CORNER', `${run(false)} / ${run(true)}`);
}
{ // save round trip
  const rw = new RaceRewards(); rw.slip = 0.4; rw.seq = 3; rw.last = 'SLIPSTREAM';
  const r2 = new RaceRewards(); r2.restore(JSON.parse(JSON.stringify(rw.snapshot())));
  check('snapshot/restore', r2.slip === 0.4 && r2.seq === 3 && r2.last === 'SLIPSTREAM', '');
}
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
