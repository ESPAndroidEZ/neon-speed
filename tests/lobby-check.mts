/* The lobby server (server/lobby, Python standard library) against a fake client over real local sockets:
 * runs server/lobby/test_lobby.py and passes its PASS/FAIL lines through. Skips (PASS with a note) without python3. */
import { spawnSync } from 'node:child_process';

const r = spawnSync('python3', ['server/lobby/test_lobby.py'], { encoding: 'utf8', timeout: 60000 });
if (r.error) {
  console.log(`PASS  lobby tests skipped: no python3 (${r.error.message})`);
  process.exit(0);
}
process.stdout.write(r.stdout);
if (r.status !== 0) process.stdout.write(r.stderr.split('\n').slice(-6).join('\n'));
process.exit(r.status ?? 1);
