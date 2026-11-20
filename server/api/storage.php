<?php
// Neon Speed storage API. GET returns every synced key of the player, POST {"items":{"key":"value"|null}} stores them.
// Identity: header X-Player = a 20 character base32 code the browser made up (only its sha256 is stored).
// Config (not in git): /etc/neonspeed/db.php returns ['dsn' => ..., 'user' => ..., 'pass' => ...].
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const KEY_RE = '/^(racers-blood-save-v1|racers-blood-slots|ns\.ach|ns\.stats|ns-online-name|rb-ghost:[A-Za-z0-9_-]{1,40}:[A-Za-z0-9_-]{1,40})$/';
const MAX_VALUE = 400000;   // bytes per key
const MAX_ITEMS = 40;       // keys per request
const MAX_TOTAL = 4000000;  // bytes per player
const NEW_PLAYERS_PER_HOUR = 300; // per IP hash (many players share a NAT)

function fail(int $code, string $msg): never
{
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

/** JSON reply, gzip-compressed when the browser accepts it and the body is worth it (nginx does not compress application/json here). */
function reply(array $data): never
{
    $json = json_encode($data);
    if (strlen($json) > 1024 && str_contains($_SERVER['HTTP_ACCEPT_ENCODING'] ?? '', 'gzip')) {
        $json = gzencode($json, 4);
        header('Content-Encoding: gzip');
        header('Vary: Accept-Encoding');
    }
    header('Content-Length: ' . strlen($json));
    echo $json;
    exit;
}

$code = $_SERVER['HTTP_X_PLAYER'] ?? '';
if (!preg_match('/^[A-Z2-7]{20}$/', $code)) {
    fail(400, 'bad player code');
}
$id = hash('sha256', $code);
$cfg = require '/etc/neonspeed/db.php';
try {
    $pdo = new PDO($cfg['dsn'], $cfg['user'], $cfg['pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]);
} catch (Throwable $e) {
    fail(503, 'database unavailable');
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // ?since=<unix time>: only the keys changed after it (the browser keeps what it already has): a launch with nothing new costs ~100 bytes
        $since = isset($_GET['since']) ? max(0, (int) $_GET['since']) : 0;
        $st = $pdo->prepare('SELECT k, v, UNIX_TIMESTAMP(updated) AS t FROM player_kv WHERE player_id = ?' . ($since > 0 ? ' AND updated > FROM_UNIXTIME(?)' : ''));
        $st->execute($since > 0 ? [$id, $since] : [$id]);
        $keys = [];
        foreach ($st as $row) {
            $keys[$row['k']] = ['v' => $row['v'], 't' => (int) $row['t']];
        }
        $pdo->prepare('UPDATE players SET last_seen = NOW() WHERE id = ?')->execute([$id]);
        reply(['keys' => (object) $keys, 'now' => (int) $pdo->query('SELECT UNIX_TIMESTAMP()')->fetchColumn()]);
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        fail(405, 'GET or POST');
    }
    $raw = file_get_contents('php://input', false, null, 0, 3000000);
    if (($_SERVER['HTTP_CONTENT_ENCODING'] ?? '') === 'gzip' && $raw !== false) { // the browser compresses big uploads (save slots)
        $raw = @gzdecode($raw, 3000000);
    }
    $body = json_decode($raw === false ? '' : $raw, true);
    $items = is_array($body) ? ($body['items'] ?? null) : null;
    if (!is_array($items) || count($items) > MAX_ITEMS) {
        fail(400, 'bad items');
    }
    foreach ($items as $k => $v) {
        if (!is_string($k) || !preg_match(KEY_RE, $k)) {
            fail(400, 'bad key');
        }
        if ($v !== null && (!is_string($v) || strlen($v) > MAX_VALUE)) {
            fail(413, 'value too large');
        }
    }
    $pdo->beginTransaction();
    $exists = $pdo->prepare('SELECT 1 FROM players WHERE id = ? FOR UPDATE');
    $exists->execute([$id]);
    if (!$exists->fetchColumn()) {
        $ip = substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . 'neonspeed'), 0, 16);
        $n = $pdo->prepare('SELECT COUNT(*) FROM players WHERE ip_hash = ? AND created > NOW() - INTERVAL 1 HOUR');
        $n->execute([$ip]);
        if ((int) $n->fetchColumn() >= NEW_PLAYERS_PER_HOUR) {
            $pdo->rollBack();
            fail(429, 'too many new players');
        }
        $pdo->prepare('INSERT INTO players (id, ip_hash) VALUES (?, ?)')->execute([$id, $ip]);
    }
    $up = $pdo->prepare('INSERT INTO player_kv (player_id, k, v) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)');
    $del = $pdo->prepare('DELETE FROM player_kv WHERE player_id = ? AND k = ?');
    foreach ($items as $k => $v) {
        if ($v === null) {
            $del->execute([$id, $k]);
        } else {
            $up->execute([$id, $k, $v]);
        }
    }
    $sum = $pdo->prepare('SELECT COALESCE(SUM(LENGTH(v)), 0) FROM player_kv WHERE player_id = ?');
    $sum->execute([$id]);
    if ((int) $sum->fetchColumn() > MAX_TOTAL) {
        $pdo->rollBack();
        fail(413, 'player storage full');
    }
    $pdo->prepare('UPDATE players SET last_seen = NOW() WHERE id = ?')->execute([$id]);
    $pdo->commit();
    reply(['ok' => true, 'n' => count($items)]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('neonspeed storage: ' . $e->getMessage());
    fail(500, 'storage error');
}
