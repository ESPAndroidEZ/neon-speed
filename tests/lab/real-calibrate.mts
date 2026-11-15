// Real-spec calibration: real kg, peak Nm (incl. full boost), torque rpm, redline, drivetrain and weight split; then
// search finalDrive (0-100 km/h) and topRatio (top speed) to match the real figures. npx tsx tests/lab/real-calibrate.mts
import { CARS } from '../../src/data/cars.ts';
import { measureCar } from '../../src/physics/carStats.ts';
import { REAL } from '../../src/data/carReal.ts';
const SPLIT = { FWD: [0.96, 1.64], AWD: [1.14, 1.46], RWD: [1.25, 1.35] } as const; // cg to front / rear axle, m (wheelbase 2.6)
for (const c of CARS.filter((x) => !process.argv[2] || x.id === process.argv[2])) {
  const r = REAL[c.id];
  const boost = c.tuning.turboTorque ?? 0;
  const base = { ...c.tuning, mass: r.kg, engineTorque: Math.round(r.nm / (1 + boost)), peakRpm: r.nmRpm, redlineRpm: r.redline,
    driveFront: r.drive === 'FWD' ? 1 : r.drive === 'AWD' ? 0.45 : 0, cgToFront: SPLIT[r.drive][0], cgToRear: SPLIT[r.drive][1] };
  let fd = 3.9, tr = 0.8, m = measureCar({ ...base, finalDrive: fd, topRatio: tr });
  for (let pass = 0; pass < 2; pass++) {
    let best = 1e9;
    for (let f = 2.6; f <= 6.0; f += 0.1) { const x = measureCar({ ...base, finalDrive: f, topRatio: tr }); const e = Math.abs(x.accel - r.zeroTo100); if (e < best) { best = e; fd = f; m = x; } }
    best = 1e9;
    for (let t = 0.4; t <= 1.0; t += 0.03) { const x = measureCar({ ...base, finalDrive: fd, topRatio: t }); const e = Math.abs(x.topKph - r.top) + 3 * Math.abs(x.accel - r.zeroTo100); if (e < best) { best = e; tr = t; m = x; } }
  }
  console.log(`${c.id.padEnd(6)} ${r.drive} | mass: ${r.kg}, engineTorque: ${base.engineTorque}, peakRpm: ${r.nmRpm}, redlineRpm: ${r.redline}, driveFront: ${base.driveFront}, cgToFront: ${base.cgToFront}, cgToRear: ${base.cgToRear}, finalDrive: ${fd.toFixed(2)}, topRatio: ${tr.toFixed(2)} | 0-100 ${m.accel.toFixed(2)} (${r.zeroTo100}) top ${m.topKph.toFixed(0)} (${r.top})`);
}
