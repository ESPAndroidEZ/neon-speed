import { PosCue } from '../src/game/posCue.ts';
let failed = 0;
const check = (n: string, ok: boolean, d = ''): void => { console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${d ? ' - ' + d : ''}`); if (!ok) failed++; };
const run = (c: PosCue, pos: number, secs: number, count = 4): number[] => {
  const out: number[] = [];
  for (let i = 0; i < Math.round(secs * 60); i++) { const r = c.step(pos, count, 1 / 60); if (r) out.push(r); }
  return out;
};
const a = new PosCue();
check('first sighting does not fire', run(a, 3, 1).length === 0);
const up = run(a, 2, 1);
check('moving up fires +1 once', up.length === 1 && up[0] === 1, up.join());
const down = run(a, 3, 1);
check('dropping back fires -1 once', down.length === 1 && down[0] === -1, down.join());
const b = new PosCue();
run(b, 2, 1);
const flick = [...run(b, 1, 0.2), ...run(b, 2, 0.2), ...run(b, 1, 0.2), ...run(b, 2, 1)];
check('short side-by-side flicker never fires', flick.length === 0, flick.join());
const c = new PosCue();
run(c, 4, 1);
const jump = run(c, 2, 1);
check('jumping two places fires once', jump.length === 1 && jump[0] === 1, jump.join());
const solo = new PosCue();
check('single racer (time trial) never fires', run(solo, 1, 1, 1).length === 0 && run(solo, 2, 1, 1).length === 0);
c.reset();
check('reset: new race starts fresh', run(c, 3, 1).length === 0 && run(c, 2, 1).length === 1);
if (failed) process.exit(1);
