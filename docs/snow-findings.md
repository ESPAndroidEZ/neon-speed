# Snow handling: root causes found (2026-11-15, headless repro in tests/lab/snow/, legacy model)
Measured 0-100 / lateral g at 80 km/h: civic 6.8 s, 1.12 g (clear) vs 10.5 s, 0.54 g (snow NORMAL) vs 13.7 s, 0.41 g (AGGRESSIVE); 350z 5.6 / 11.5 / 17.2 s (AGGRESSIVE only 155 km/h after 30 s); evo AWD 5.2 / 5.5 / 6.6 s.
No double-applied grip in legacy. Causes:
1. Snow grip table too low: physics/weatherLevels.ts:9 [0.45,0.34,0.26] (also physics/weather.ts:7). Proposed [0.58,0.46,0.36]; update tests/weather-check.mts:40-50. LOCKED in CLAUDE.md: needs Carlos's OK (this round's request counts) and a log line.
2. Traction capped at mu*load: legacy/driveSplit.ts:38-39 with TRACTION_SQUAT 0.15 (legacyStep.ts:11). Use sqrt(g) for traction only, keep g for lateral.
3. Touch throttle is all-or-nothing: friction circle drops rear lateral to powerFloor 0.45 (legacyStep.ts:52), front -11% (53). Add a traction-control cap ~0.85x traction when g < 0.7 and/or a gas ramp on touch.
4. Snow banks bankDrag 0.7 (surfaces.ts:33) = ~15 m/s^2 decel on the outside of tight corners: lower to ~0.15 (EXTREME 0.25).
5. v2 only: speed steering lock uses dry muF (v2/arcade.ts:21): pass g from v2Step.ts:31.
6. RWD power slides gated off below grip 0.6 (legacy/stability.ts:62): lower to ~0.5.
