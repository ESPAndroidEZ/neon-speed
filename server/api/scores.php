<?php
// Neon Speed leaderboards. Rules (board keys, names, lap plausibility) in scores-lib.php; map data in scores-tracks.php.
// GET  ?board=<key>[&n=10]           -> {top:[{name,ms,car}], of, rank, mine}  (rank/mine need the X-Player header)
// GET  ?boards=<k1>,<k2>,...&n=3     -> {boards:{key:{top, of}}}               (track select: up to 12 boards)
// POST {board, ms, car, f:[x,y,z,h,...], name?}  header X-Player -> {ok, improved, rank, of, mine}
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
require __DIR__ . '/scores-lib.php';
$tracks = require __DIR__ . '/scores-tracks.php';

const LB_PER_PLAYER_10MIN = 30;
const LB_PER_IP_10MIN = 300; // many players share one NAT address (the office network)

function fail(int $code, string $msg): never
{
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

$code = $_SERVER['HTTP_X_PLAYER'] ?? '';
$id = preg_match('/^[A-Z2-7]{20}$/', $code) ? hash('sha256', $code) : null;
$cfg = require '/etc/neonspeed/db.php';
try {
    $pdo = new PDO($cfg['dsn'], $cfg['user'], $cfg['pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]);
} catch (Throwable $e) {
    fail(503, 'database unavailable');
}

/** Top n of a board (name falls back to "Driver" + 4 characters of the id) and its size. */
function lb_top(PDO $pdo, string $board, int $n): array
{
    $st = $pdo->prepare("SELECT COALESCE(n.name, CONCAT('Driver ', UPPER(LEFT(s.player_id, 4)))) AS name, s.ms, s.car FROM scores s LEFT JOIN lb_names n ON n.player_id = s.player_id WHERE s.board = ? ORDER BY s.ms, s.created LIMIT $n");
    $st->execute([$board]);
    $top = [];
    foreach ($st as $r) $top[] = ['name' => $r['name'], 'ms' => (int) $r['ms'], 'car' => $r['car']];
    $c = $pdo->prepare('SELECT COUNT(*) FROM scores WHERE board = ?');
    $c->execute([$board]);
    return ['top' => $top, 'of' => (int) $c->fetchColumn()];
}

/** The player's best on a board and its rank (1 = fastest), or nulls. */
function lb_mine(PDO $pdo, string $board, ?string $id): array
{
    if ($id === null) return ['rank' => null, 'mine' => null];
    $st = $pdo->prepare('SELECT ms FROM scores WHERE board = ? AND player_id = ?');
    $st->execute([$board, $id]);
    $ms = $st->fetchColumn();
    if ($ms === false) return ['rank' => null, 'mine' => null];
    $r = $pdo->prepare('SELECT COUNT(*) + 1 FROM scores WHERE board = ? AND ms < ?');
    $r->execute([$board, (int) $ms]);
    return ['rank' => (int) $r->fetchColumn(), 'mine' => (int) $ms];
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $n = max(1, min(10, (int) ($_GET['n'] ?? 10)));
        if (isset($_GET['boards'])) {
            $out = [];
            foreach (array_slice(explode(',', (string) $_GET['boards']), 0, 12) as $key) {
                if (lb_board($tracks, $key) !== null) $out[$key] = lb_top($pdo, $key, $n);
            }
            echo json_encode(['boards' => (object) $out]);
            exit;
        }
        $key = (string) ($_GET['board'] ?? '');
        if (lb_board($tracks, $key) === null) fail(400, 'bad board');
        echo json_encode(lb_top($pdo, $key, $n) + lb_mine($pdo, $key, $id));
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'GET or POST');
    if ($id === null) fail(400, 'bad player code');
    $body = json_decode((string) file_get_contents('php://input', false, null, 0, 400000), true);
    if (!is_array($body)) fail(400, 'bad body');
    $b = lb_board($tracks, (string) ($body['board'] ?? ''));
    $ms = $body['ms'] ?? null;
    $car = (string) ($body['car'] ?? '');
    if ($b === null || !is_int($ms) || $ms <= 0 || !preg_match('/^[a-z0-9]{1,16}$/', $car) || !is_array($body['f'] ?? null)) fail(400, 'bad entry');
    $why = lb_check_lap($tracks[$b['track']], $ms, $body['f']);
    if ($why !== '') fail(422, 'rejected: ' . $why);
    $ip = substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . 'neonspeed'), 0, 16);
    $known = $pdo->prepare('SELECT 1 FROM players WHERE id = ?');
    $known->execute([$id]);
    if (!$known->fetchColumn()) fail(409, 'unknown player'); // storage.php creates the player on its first sync: retry later
    $lim = $pdo->prepare('SELECT (SELECT COUNT(*) FROM lb_log WHERE player_id = ? AND at > NOW() - INTERVAL 10 MINUTE), (SELECT COUNT(*) FROM lb_log WHERE ip_hash = ? AND at > NOW() - INTERVAL 10 MINUTE)');
    $lim->execute([$id, $ip]);
    [$mine10, $ip10] = array_map('intval', $lim->fetch(PDO::FETCH_NUM));
    if ($mine10 >= LB_PER_PLAYER_10MIN || $ip10 >= LB_PER_IP_10MIN) fail(429, 'too many scores');
    $pdo->prepare('INSERT INTO lb_log (player_id, ip_hash) VALUES (?, ?)')->execute([$id, $ip]);
    if (random_int(1, 100) === 1) $pdo->exec('DELETE FROM lb_log WHERE at < NOW() - INTERVAL 1 DAY');
    if (isset($body['name']) && is_string($body['name']) && ($name = lb_name($body['name'])) !== null) {
        $pdo->prepare('INSERT INTO lb_names (player_id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)')->execute([$id, $name]);
    }
    $ghost = json_encode($body['f']);
    $up = $pdo->prepare('INSERT INTO scores (board, player_id, ms, car, ghost) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE car = IF(VALUES(ms) < ms, VALUES(car), car), ghost = IF(VALUES(ms) < ms, VALUES(ghost), ghost), created = IF(VALUES(ms) < ms, NOW(), created), ms = LEAST(ms, VALUES(ms))');
    $up->execute([$b['key'], $id, $ms, $car, $ghost]);
    $improved = $up->rowCount() > 0; // 1 = new row, 2 = faster lap, 0 = not faster
    echo json_encode(['ok' => true, 'improved' => $improved] + lb_mine($pdo, $b['key'], $id) + ['of' => lb_top($pdo, $b['key'], 1)['of']]);
} catch (Throwable $e) {
    error_log('neonspeed scores: ' . $e->getMessage());
    fail(str_contains($e->getMessage(), "doesn't exist") ? 503 : 500, 'scores unavailable');
}
