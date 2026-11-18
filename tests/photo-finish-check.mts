import { isPhotoFinish } from '../src/game/photoFinish';

let fails = 0;
const ok = (c: boolean, m: string): void => { if (!c) { fails++; console.error('FAIL', m); } };
const r = (position: number, time: number | null, isPlayer = false) => ({ position, time, isPlayer });

ok(isPhotoFinish([r(1, 60, true), r(2, 60.12), r(3, 63)]), 'player wins by 0.12 s');
ok(isPhotoFinish([r(1, 60), r(2, 60.2, true), r(3, 63)]), 'player loses by 0.2 s');
ok(!isPhotoFinish([r(1, 60, true), r(2, 60.5)]), '0.5 s is not a photo finish');
ok(!isPhotoFinish([r(1, 60, true), r(2, 60.31)]), 'just over 0.3 s is not');
ok(!isPhotoFinish([r(1, 60), r(2, 60.1), r(3, 70, true)]), 'player not in the top two');
ok(!isPhotoFinish([r(1, 60, true), r(2, null)]), 'DNF second');
ok(!isPhotoFinish([r(1, 60, true)]), 'solo run');
ok(!isPhotoFinish([r(1, NaN, true), r(2, 60)]), 'NaN time');
ok(!isPhotoFinish([r(1, 61, true), r(2, 60)]), 'positions inconsistent with times');
ok(!isPhotoFinish([]), 'empty');
if (fails) process.exit(1);
console.log('photo-finish-check ok');
