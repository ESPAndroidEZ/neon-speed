// Sweep SNOW_FEEL: FEEL=tr,floorR npx tsx tests/lab/snow/feel-sweep.mts legacy civic
import { SNOW_FEEL } from '/home/carlos/projects/racer-blood/src/physics/legacy/legacyStep.ts';
const [tr, fr] = (process.env.FEEL ?? '').split(',').map(Number);
if (!isNaN(tr)) SNOW_FEEL.tr = tr;
if (!isNaN(fr)) SNOW_FEEL.floorR = fr;
await import('/home/carlos/projects/racer-blood/tests/lab/snow/snow-repro.mts');
