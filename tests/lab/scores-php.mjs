// Runs the leaderboard rules (server/api/scores-lib.php + scores-tracks.php) with PHP on the game server's CLI,
// read-only (no database, no files: the program arrives on stdin). Needs `tsh login` and logs/lb-fixtures.json
// (npx tsx tests/lab/lb-fixtures.mts). Usage: node tests/lab/scores-php.mjs   -> ALL PASS / N FAILED
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const HOST = process.env.HOST ?? 'notcarlos.mosidealus.nl';
const body = (file) => readFileSync(file, 'utf8').replace(/^<\?php\s*/, '').replace(/^declare\(strict_types=1\);\s*/m, '');
const fx = readFileSync(process.env.FX ?? 'logs/lb-fixtures.json', 'utf8');
const day = Math.floor(Date.now() / 86400000);
const prog = `<?php declare(strict_types=1);
${body('server/api/scores-lib.php')}
$tracks = (function () { ${body('server/api/scores-tracks.php').replace(/^\/\/.*\n/m, '')} })();
$fail = 0;
$check = function (string $n, bool $ok, string $info = '') use (&$fail) { if (!$ok) $fail++; echo ($ok ? 'PASS' : 'FAIL') . "  $n" . ($info !== '' ? "  ($info)" : '') . "\\n"; };
foreach (json_decode(base64_decode('${Buffer.from(fx).toString('base64')}'), true) as $x) {
  $why = lb_check_lap($tracks[$x['track']], $x['ms'], $x['f']);
  $check(($x['ok'] ? 'accepted: ' : 'rejected: ') . $x['name'], ($why === '') === $x['ok'], $why === '' ? 'plausible' : $why);
}
$check('board key: map, weather, tier', lb_board($tracks, 'kestrel:RAIN-A:2') !== null);
$check('board key: daily of today', lb_board($tracks, 'daily:${day}:coast:CLEAR') !== null);
$check('board key: daily of last week is closed', lb_board($tracks, 'daily:${day - 7}:coast:CLEAR') === null);
$check('board key: drift map has no lap board', lb_board($tracks, 'ring:CLEAR:0') === null);
$check('board key: junk', lb_board($tracks, "kestrel:CLEAR:2' OR 1=1") === null && lb_board($tracks, 'kestrel:FOG:1') === null);
$check('name: normal names pass', lb_name('Carlos_77') === 'Carlos_77' && lb_name('  Ñandú  Racer ') === 'Ñandú Racer');
$check('name: too short / long / symbols', lb_name('ab') === null && lb_name(str_repeat('x', 17)) === null && lb_name('<b>hi</b>') === null);
$check('name: word filter incl. 1337 and Spanish', lb_name('fuckboy') === null && lb_name('Pu7a madre') === null && lb_name('sh1t') === null);
$check('lap: non-number frames rejected', lb_check_lap($tracks['kestrel'], 60000, array_fill(0, 40, 'x')) !== '');
echo $fail ? "\\n$fail FAILED\\n" : "\\nALL PASS\\n";
`;
let out = '';
try {
  out = execFileSync('tsh', ['ssh', `webdev@${HOST}`, 'php'], { input: prog, encoding: 'utf8', maxBuffer: 1 << 24 });
} catch (e) {
  out = `${e.stdout ?? ''}${e.stderr ?? ''}\nFAILED (php run)`;
}
console.log(out.trim());
process.exit(/ALL PASS\s*$/.test(out.trim()) ? 0 : 1);
