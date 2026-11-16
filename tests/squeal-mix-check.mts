import { squealMix } from '../src/audio/squealMix.ts';
let failed = 0;
const check = (n: string, ok: boolean, d = ''): void => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' - ' + d : ''}`); if (!ok) failed++; };
let m = squealMix('CLEAR', 'dry');
check('clear dry: only the dry squeal', m.dry === 1 && m.dryHi === 1 && m.wet === 0 && m.wetHi === 0 && m.snow === 0);
m = squealMix('RAIN', 'dry');
check('rain dry: only the spray, as before', m.wet === 1 && m.wetHi === 1 && m.dry === 0 && m.snow === 0);
m = squealMix('SNOW', 'dry');
check('snow dry: only the crunch, as before', m.snow === 1 && m.dry === 0 && m.wet === 0);
m = squealMix('CLEAR', 'puddle');
check('a puddle in clear weather sprays and mutes the squeal', m.wet === 1 && m.dry < 0.3);
m = squealMix('RAIN', 'puddle');
check('a puddle in rain is full spray', m.wet === 1 && m.dry === 0);
m = squealMix('SNOW', 'snowbank');
check('a snow bank crunches at full level', m.snow === 1);
m = squealMix('CLEAR', 'snowbank');
check('a snow bank crunches even in clear weather', m.snow === 1 && m.dry < 0.3);
m = squealMix('SNOW', 'ice');
check('ice is quieter than snow-covered road', m.snow === 0.5);
m = squealMix('CLEAR', 'ice');
check('ice thins the squeal: body down more than the top', m.dry < m.dryHi && m.dry > 0 && m.dryHi < 1);
let ok = true;
for (const w of ['CLEAR', 'RAIN', 'SNOW', 'x']) for (const s of ['dry', 'puddle', 'ice', 'snowbank', 'y']) {
  const r = squealMix(w, s);
  for (const v of [r.dry, r.dryHi, r.wet, r.wetHi, r.snow]) if (!(v >= 0 && v <= 1)) ok = false;
}
check('every mix stays within 0..1', ok);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
