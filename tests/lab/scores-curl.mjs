// Live check of api/scores.php (W2.2): a real AI lap is accepted, a faked time and a teleport are rejected, bad keys
// and names are refused, the board answers with rank and size. Needs the deployed API and the schema
// (scripts/apply-server-schema.sh) and logs/lb-fixtures.json. Writes ONE test player ("LB Test", a fixed code in
// LB_CODE or a fresh one) to the database: its rows can be removed with the owner's OK.
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE ?? 'https://notcarlos.mosidealus.nl/api';
const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const code = process.env.LB_CODE ?? Array.from({ length: 20 }, () => A[Math.floor(Math.random() * 32)]).join('');
const fx = JSON.parse(readFileSync('logs/lb-fixtures.json', 'utf8'));
const day = Math.floor(Date.now() / 86400000);
let failed = 0;
const check = (n, ok, info = '') => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${info ? `  (${info})` : ''}`); };
const req = async (path, body) => {
  const r = await fetch(`${BASE}/${path}`, { method: body ? 'POST' : 'GET', headers: { 'X-Player': code, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};
const s = await req('storage.php', { items: { 'ns-online-name': 'LB Test' } }); // creates the player like the game's first sync
check('test player exists', s.status === 200, `storage ${s.status}`);
const board = `daily:${day}:kestrel:CLEAR`;
const lap = fx.find((x) => x.name === 'kestrel lap 2'), cut = fx.find((x) => x.name === 'kestrel time cut by 20 %'), tp = fx.find((x) => x.name.startsWith('kestrel teleport'));
const ok = await req('scores.php', { board, ms: lap.ms, car: 'civic', f: lap.f, name: 'LB Test' });
check('valid AI lap accepted with a rank', ok.status === 200 && ok.json.ok && ok.json.rank >= 1 && ok.json.of >= 1, `${ok.status} ${JSON.stringify(ok.json)}`);
const fake = await req('scores.php', { board, ms: cut.ms, car: 'civic', f: cut.f });
check('faked time rejected', fake.status === 422, `${fake.status} ${fake.json.error}`);
const jump = await req('scores.php', { board, ms: tp.ms, car: 'civic', f: tp.f });
check('teleport rejected', jump.status === 422, `${jump.status} ${jump.json.error}`);
const bad = await req('scores.php', { board: "kestrel:CLEAR:2' OR 1=1", ms: lap.ms, car: 'civic', f: lap.f });
check('bad board key refused', bad.status === 400);
const slower = await req('scores.php', { board, ms: lap.ms + 500, car: 'civic', f: [...lap.f, ...lap.f.slice(-20)] });
check('slower lap keeps the best', slower.status === 200 && slower.json.improved === false && slower.json.mine === lap.ms, JSON.stringify(slower.json));
const get = await req(`scores.php?board=${encodeURIComponent(board)}`);
check('board GET: top list, my rank', get.status === 200 && Array.isArray(get.json.top) && get.json.mine === lap.ms, `${get.json.of} entries, rank ${get.json.rank}`);
const many = await req(`scores.php?boards=${encodeURIComponent(`kestrel:CLEAR:0,${board},junk`)}&n=3`);
check('several boards for the track select (junk skipped)', many.status === 200 && many.json.boards[board] && !many.json.boards.junk);
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
