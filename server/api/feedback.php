<?php
// Neon Speed feedback API: POST {"kind":"idea|bug|other","message":"...","contact":"optional email","meta":{...},"website":""}.
// Every message is stored in the database; an email to the owner is attempted afterwards (it can land in spam: the row is the record).
// The recipient lives only on the server: /etc/neonspeed/feedback.php returns ['to' => 'address'] (scripts/set-feedback-email.sh).
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const PER_HOUR = 40; // the server sees every visitor as one NAT address, so these limits are global, not per person
const PER_DAY = 200;

function fail(int $code, string $msg): never
{
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail(405, 'POST only');
}
$raw = file_get_contents('php://input', false, null, 0, 20000);
$b = json_decode($raw === false ? '' : $raw, true);
if (!is_array($b)) {
    fail(400, 'bad body');
}
if (($b['website'] ?? '') !== '') { // honeypot: a person never fills this
    echo json_encode(['ok' => true]);
    exit;
}
$kind = $b['kind'] ?? '';
$message = trim((string) ($b['message'] ?? ''));
$contact = trim((string) ($b['contact'] ?? ''));
if (!in_array($kind, ['idea', 'bug', 'other'], true)) {
    fail(400, 'bad kind');
}
$len = mb_strlen($message, 'UTF-8');
if ($len < 5 || $len > 2000) {
    fail(400, 'message length');
}
if ($contact !== '' && (strlen($contact) > 120 || !filter_var($contact, FILTER_VALIDATE_EMAIL))) {
    fail(400, 'bad contact');
}
$meta = '';
if (isset($b['meta']) && is_array($b['meta'])) {
    $parts = [];
    foreach (array_slice($b['meta'], 0, 12, true) as $k => $v) {
        if (is_string($k) && (is_string($v) || is_int($v) || is_float($v))) {
            $parts[] = preg_replace('/[^\x20-\x7E]/', '', substr($k, 0, 20) . '=' . substr((string) $v, 0, 100));
        }
    }
    $meta = substr(implode('; ', $parts), 0, 1000);
}

$cfg = require '/etc/neonspeed/db.php';
try {
    $pdo = new PDO($cfg['dsn'], $cfg['user'], $cfg['pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]);
    $ip = substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . 'neonspeed'), 0, 16);
    $n = $pdo->prepare('SELECT SUM(created > NOW() - INTERVAL 1 HOUR), COUNT(*) FROM feedback WHERE ip_hash = ? AND created > NOW() - INTERVAL 1 DAY');
    $n->execute([$ip]);
    [$hour, $day] = array_map('intval', $n->fetch(PDO::FETCH_NUM));
    if ($hour >= PER_HOUR || $day >= PER_DAY) {
        fail(429, 'too many messages, try later');
    }
    $ins = $pdo->prepare('INSERT INTO feedback (ip_hash, kind, message, contact, meta) VALUES (?, ?, ?, ?, ?)');
    $ins->execute([$ip, $kind, $message, $contact, $meta]);
    $id = (int) $pdo->lastInsertId();
} catch (Throwable $e) {
    error_log('neonspeed feedback: ' . $e->getMessage());
    fail(503, 'could not store the message');
}

$mailed = false;
$mc = @include '/etc/neonspeed/feedback.php';
$to = is_array($mc) ? (string) ($mc['to'] ?? '') : '';
if ($to !== '' && filter_var($to, FILTER_VALIDATE_EMAIL)) {
    $subject = '=?UTF-8?B?' . base64_encode("Neon Speed feedback #$id ($kind)") . '?=';
    $body = "Type: $kind\nContact: " . ($contact !== '' ? $contact : '(none)') . "\nDevice: " . ($meta !== '' ? $meta : '(not shared)') . "\n\n$message\n";
    $headers = "From: Neon Speed <noreply@notcarlos.mosidealus.nl>\r\nContent-Type: text/plain; charset=utf-8\r\nMIME-Version: 1.0";
    if ($contact !== '') {
        $headers .= "\r\nReply-To: " . str_replace(["\r", "\n"], '', $contact);
    }
    $mailed = @mail($to, $subject, $body, $headers);
    try {
        $pdo->prepare('UPDATE feedback SET mailed = ? WHERE id = ?')->execute([$mailed ? 1 : 0, $id]);
    } catch (Throwable $e) {
        /* the row is already stored */
    }
}
echo json_encode(['ok' => true, 'id' => $id]);
