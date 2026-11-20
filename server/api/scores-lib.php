<?php
// Leaderboard rules without a database (tested by tests/lab/scores-php.mjs on the server CLI): board keys, display
// names and the plausibility check of a submitted best lap against its 10 Hz ghost (frames x, y, z, heading).
declare(strict_types=1);
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }

const LB_HZ = 10;          // ghost samples per second (src/game/ghostData.ts GHOST_HZ)
const LB_VMAX = 95.0;      // m/s (342 km/h): no car in the game gets near it
const LB_MAX_FRAMES = 6000; // 10 minutes (src/game/lapFrames.ts keeps the same)
const LB_WEATHER = ['CLEAR', 'RAIN-N', 'RAIN-A', 'RAIN-E', 'SNOW-N', 'SNOW-A', 'SNOW-E'];

/** "kestrel:RAIN-A:2" (map, weather + physics level, car tier 0-3) or "daily:20412:kestrel:RAIN-A" (all tiers). */
function lb_board(array $tracks, string $key): ?array
{
    if (preg_match('/^([a-z0-9-]{1,20}):([A-Z-]{5,6}):([0-3])$/', $key, $m)) {
        [, $track, $weather, $tier] = $m;
    } elseif (preg_match('/^daily:(\d{5}):([a-z0-9-]{1,20}):([A-Z-]{5,6})$/', $key, $m)) {
        [, $day, $track, $weather] = $m;
        if (abs((int) $day - intdiv(time(), 86400)) > 1) return null; // today in some time zone
    } else {
        return null;
    }
    return isset($tracks[$track]) && in_array($weather, LB_WEATHER, true) ? ['track' => $track, 'key' => $key] : null;
}

/** 3-16 letters, digits, space, _ or -; a small word filter (English and Spanish, with 0/1/3/4/5/7 read as letters). */
function lb_name(string $name): ?string
{
    $name = trim(preg_replace('/\s+/u', ' ', $name) ?? '');
    if (!preg_match('/^[\p{L}\p{N} _-]{3,16}$/u', $name)) return null;
    $flat = strtr(mb_strtolower($name), ['0' => 'o', '1' => 'i', '3' => 'e', '4' => 'a', '5' => 's', '7' => 't', ' ' => '', '_' => '', '-' => '']);
    foreach (['fuck', 'shit', 'cunt', 'nigg', 'fag', 'whore', 'slut', 'rape', 'nazi', 'hitler', 'puta', 'puto', 'mierda', 'coño', 'cono', 'polla', 'joder', 'maric', 'zorra', 'cabron', 'gilipo', 'admin'] as $w) {
        if (str_contains($flat, $w)) return null;
    }
    return $name;
}

/** '' when the lap is plausible, else the reason. $f = flat [x, y, z, h, ...] at LB_HZ from the lap start. */
function lb_check_lap(array $def, int $ms, array $f): string
{
    $n = intdiv(count($f), 4);
    if ($n < 8 || $n > LB_MAX_FRAMES || count($f) % 4 !== 0) return 'frames';
    foreach ($f as $v) if (!is_int($v) && !is_float($v)) return 'frames';
    $t = $ms / 1000;
    if (abs($t - ($n - 1) / LB_HZ) > 0.35) return 'time does not match the ghost';
    if ($t < $def['len'] / LB_VMAX) return 'too fast for the map';
    $path = 0.0;
    $stepMax = LB_VMAX / LB_HZ;
    for ($i = 1; $i < $n; $i++) {
        $d = hypot($f[$i * 4] - $f[$i * 4 - 4], $f[$i * 4 + 2] - $f[$i * 4 - 2]);
        if ($d > $stepMax) return 'jump in the ghost';
        $path += $d;
    }
    if ($path < 0.8 * $def['len']) return 'lap too short';
    $cps = $def['cps'];
    $k = count($cps);
    $near = static fn(int $i, array $c): bool => hypot($f[$i * 4] - $c[0], $f[$i * 4 + 2] - $c[1]) <= $c[2];
    // a circuit lap may start anywhere near the line (lap 1 starts on the grid): begin at the checkpoint closest to frame 0
    $start = 0;
    if ($def['type'] === 'circuit') {
        $best = INF;
        foreach ($cps as $j => $c) {
            $d = hypot($f[0] - $c[0], $f[2] - $c[1]);
            if ($d < $best) { $best = $d; $start = $j; }
        }
    }
    $need = $k - 1; // every other checkpoint, in driving order
    $next = 1;
    for ($i = 0; $i < $n && $next <= $need; $i++) {
        if ($near($i, $cps[($start + $next) % $k])) $next++;
    }
    return $next > $need ? '' : 'missed checkpoint ' . (($start + $next) % $k);
}
