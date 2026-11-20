<?php
// Health check: GET /api/health.php -> 200 {"ok":true,...} or 503 when the database is down or the disk is nearly
// full. Also reports the age of the last database backup and the deployed version (api/version.txt, written by
// scripts/deploy-server.sh). No player data, no secrets. Must be called with the .php suffix: the plain /api/ prefix
// belongs to the administrator's metrics service.
declare(strict_types=1);
header('Content-Type: application/json');
header('Cache-Control: no-store');
$out = ['ok' => true, 'time' => time()];

$t0 = microtime(true);
try {
    $cfg = require '/etc/neonspeed/db.php';
    $pdo = new PDO($cfg['dsn'], $cfg['user'], $cfg['pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 2]);
    $out['db'] = (int) $pdo->query('SELECT 1')->fetchColumn() === 1 ? 'ok' : 'bad';
} catch (Throwable $e) {
    $out['db'] = 'down';
}
$out['db_ms'] = (int) round((microtime(true) - $t0) * 1000);

$free = @disk_free_space(__DIR__);
$total = @disk_total_space(__DIR__);
$out['disk_free_pct'] = ($free !== false && $total) ? (int) round($free / $total * 100) : null;

$last = @file_get_contents('/var/backups/neonspeed-last.txt');
if ($last !== false && preg_match('/^(\d+) (\d+)/', $last, $m)) {
    $out['backup_age_h'] = round((time() - (int) $m[1]) / 3600, 1);
    $out['backup_bytes'] = (int) $m[2];
} else {
    $out['backup_age_h'] = null;
}
$ver = @file_get_contents(__DIR__ . '/version.txt');
$out['version'] = $ver !== false ? trim($ver) : null;

if ($out['db'] !== 'ok' || ($out['disk_free_pct'] !== null && $out['disk_free_pct'] < 5)) $out['ok'] = false;
http_response_code($out['ok'] ? 200 : 503);
echo json_encode($out);
