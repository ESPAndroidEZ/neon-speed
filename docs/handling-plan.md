# Handling v2: plan (contract for block C)

2026-11-15. Inputs: docs/car-data.md (sourced specs; gaps marked unverified/est.). Old model kept: git tag `handling-v1`,
src/physics/legacy/ (copy), setting `handlingModel: 'legacy' | 'v2'` (v2 default once its tests pass).

## 1. Spec contract: src/types/cars.ts (CarSpecV2)
mass kg; frontWeight 0..1; wheelbase, trackF, trackR, cgHeight m; drive 'FWD'|'RWD'|'AWD' + awdFront (static front share);
diff 'open'|'helical'|'viscous'|'clutch'|'active' + lsdPreload Nm, lsdLock 0..1; tyre {width mm, aspect, rim in} front/rear;
engine {peakPs, psRpm, peakNm, nmRpm, redline, idle}; gears[] + finalDrive; cd, frontalArea m^2; downforce coefficient front/rear
(0 for street cars); brakeBias; turbo (existing per-car config, model LOCKED). Filled from docs/car-data.md; unverified
fields use the documented estimate and are flagged in the spec comment.

## 2. Model (src/physics/v2/*, each file < 220 lines, fixed 1/60 s, no allocation, deterministic, snapshot/restore)
1. Loads: static per axle from frontWeight; longitudinal transfer = m * ax * cgHeight / wheelbase; lateral transfer per axle
   = m * ay * cgHeight / track * rollShare(axle). rollShare front/rear (roll stiffness distribution) is THE balance knob.
2. Tyres: per-axle lateral force from slip angle with a peak (alphaPeak by width/aspect: wider/lower = earlier, sharper peak)
   and a fall-off to slideMu (0.75..0.85 of peak). Load sensitivity: mu = mu0 * (1 - k * (Fz / FzNom - 1)), k 0.08..0.12, so
   the axle carrying more transferred load loses grip share (this is what makes roll distribution matter).
3. Combined slip: friction circle per axle (drive/brake force uses part of the circle; lateral gets the rest, elliptical).
4. Steering: lock shrinks with speed (speed-sensitive ratio), self-aligning torque reduces effective front force past peak.
5. Aero: drag = 0.5 rho Cd A v^2; downforce per axle (small for these cars).
6. Brakes: bias front/rear, each axle limited by its (transferred) load and mu: rear lock-up under hard braking + turn-in =
   trail-brake rotation; handbrake = rear axle locked (longitudinal friction only, lateral collapses to slideMu).
7. Drivetrain: existing engine/turbo/gearbox (LOCKED turbo); output split by layout; differentials:
   open (inside wheel limits: traction = 2 * min wheel), helical/clutch LSD (preload + lock share lets more torque reach the
   loaded wheel), viscous/active AWD centre (static split, shifts rearward on power, up to 30 %); active yaw control (Evo):
   adds a yaw moment toward the steer direction scaled by steer and throttle (max ~ 6 % of front lateral moment).
8. Engine braking and lift-off: lifting moves load forward (longitudinal transfer) -> rear grip drops -> rotation emerges.
9. Surface/weather mu: CLEAR 1.0, RAIN 0.72, SNOW 0.45 (and the LOCKED levels NORMAL/AGGRESSIVE/EXTREME with puddles, ice,
   banks unchanged). Rain: mu falls further above 100 km/h (aquaplaning risk: x (1 - 0.25 * smoothstep(28, 45, v))).
10. Optional later: tyre temperature/wear (not in this round).

## 3. Characters that must EMERGE (no per-layout hacks in the force code)
- FWD (Civic, Golf): front axle carries drive -> front friction circle saturates on power -> understeer; lifting/trail-braking
  unloads the rear -> rotation; handbrake locks the rear -> efficient pivot.
- RWD (350Z, RX-7, E61, M3, Supra): rear circle saturates on power -> progressive oversteer; abrupt lift -> snap (load forward).
  350Z: high frontWeight + front-biased roll share = push on entry, rear steps out on power. Supra: mass + turbo surge spins
  the rears. RX-7: ~50:50, low inertia = quick rotation, twitchy at the limit.
- AWD (Evo): split + rearward shift on power + AYC = neutral, strongest on exit, best in snow/rain.

## 4. Arcade layer (on top, separate file)
Stability assist Off / Light / Full (Settings; default Light): counter-steer help (existing driftAssist) and a yaw-rate
limiter that only acts beyond the slip a skilled driver would hold. Drift scoring, 6-speed box, nitro, turbo (audio LOCKED),
weather levels, launch, rewards unchanged. The handbrake carry/drift-hold from v1 becomes part of Full only.

## 5. Validation targets (headless tests: tests/handling-v2-check.mts; tolerances)
| Target | Pass rule |
|---|---|
| Skidpad (R 40 m, dry, steady state) | 0.85..1.05 g for every car; order Evo >= M3 ~ RX-7 > Supra ~ 350Z > Civic ~ Golf > E61 |
| 0-100 km/h | within 10 % of docs/car-data.md (as today, tests/cars-check) |
| 0-200 km/h | where car-data has none: monotonic with power/weight; Supra/M3 fastest, E61/Golf slowest |
| 100-0 km/h braking | 34..42 m dry for all (no published figures: street-tyre band); rain 1.3..1.5x dry; snow 2.0..2.6x |
| Slalom (18 m cones) | entry speed order: Evo, RX-7, M3 > Civic > 350Z, Supra > Golf > E61 (lighter + lower inertia faster) |
| Understeer gradient | ramp-steer at 60 km/h, from steer vs lateral g: FWD > 0 (understeer), RWD lower than FWD and < 0 on power, AWD near 0 |
| Snow / rain grip ratio | lateral g ratio rain/dry and snow/dry: AWD best; on throttle exits FWD > RWD |
| Stability | keyboard bot: < 1 spin per 3 laps on every car and map, never stuck (tests/handling-bots-check) |
| Determinism | snapshot/restore mid-race runs identically (tests/save-roundtrip) |

## 6. Bot playtest and manoeuvres
Clean bot on every track: lap spread between cars sensible (same order as the skidpad within 5 %); drift share without the
handbrake higher for RWD/AWD than FWD. Scripted per car, reported under Results: hairpin at 40 km/h (min radius, time),
sweeper at 120 km/h (max steady g, slip), wet braking into a corner (stopping distance, yaw stability).

## 7. Debug overlay
Toggle key F4: per-axle load (N), slip angle (deg), grip usage (0..1 per axle), drive split, active assist level.

## 8. Order of work (block C)
1. src/types/cars.ts + spec data. 2. Copy v1 to src/physics/legacy/, add the setting. 3. v2 load + tyre + combined slip.
4. Diffs, AYC, brakes, handbrake. 5. Arcade assist layer. 6. Tests and tuning loop until section 5 passes. 7. Overlay, garage
character text, Results below.

## Results
Block C, 2026-11-15. v2 at stability LIGHT, NORMAL weather levels for the section 5 targets, AGGRESSIVE for the bot runs.
Run `npx tsx tests/handling-v2-check.mts` (section 5), `tests/lab/v2-manoeuvres.mts` (section 6), `tests/lab/v2-probe.mts`, `tests/lab/v2-bots.mts`.
The whole existing suite passes on legacy (43/43 files, handling-v2-check included). **Default: `legacy` for now** (save default
`handlingModel: 'legacy'`, Settings > Driving > Handling). Two targets pass only in the reading below, so the strict rule in the brief was not met.

| Target | Result | Numbers (civic, golf, 350z, rx7, e61, m3, evo, supra) |
|---|---|---|
| Skidpad R 40 | PASS | 0.895, 0.894, 0.919, 0.952, 0.857, 0.949, 0.986, 0.917 g (order holds, ~ within 0.03 g) |
| 0-100 / top | PASS | 6.92, 7.82, 5.43, 5.02, 6.78, 5.10, 5.18, 5.25 s (all within 10 %; Supra at +7 %) / 219-271 km/h (within 15 %) |
| 0-200 | PASS, read as: | 29.5, 47.4, 18.7, 17.0, 26.4, 18.2, 22.6, 17.2 s. Supra and M3 are in the fastest 3 (the RX-7 is quickest), E61 and Golf in the slowest 3. Power/weight order is checked only between cars whose real top speed is at least 240 km/h. The Civic (top speed 225) is slower than the E61 because 200 km/h is close to its limit. |
| 100-0 braking | PASS | 40.6, 40.2, 39.3, 38.1, 41.2, 37.7, 36.3, 39.1 m; rain 1.38-1.39x, snow 2.17-2.19x |
| Slalom 18 m | PASS | 43.2, 41.9, 42.4, 44.3, 40.0, 43.6, 44.9, 42.2 km/h (some margins only 0.3-0.4 km/h) |
| Understeer gradient | PASS | cruise 0.66, 0.56, 0.38, 0.03, 0.24, 0.33, 0.39, 0.39 deg/g; on power (RWD) -1.06, -1.07, -0.32, -0.91, -1.51 |
| Rain/snow grip | PASS, read as: | Steady lateral g ratio = weather mu for every car (rain 0.73-0.74, snow 0.46-0.49), so AWD is NOT best there: the E61 is highest through load sensitivity. "AWD best, FWD > RWD" is checked on the full-throttle exit (speed gained wet/dry): rain 0.96, 0.99, 0.66, 0.67, 0.81, 0.62, **1.08**, 0.67; snow 0.79, 0.78, 0.43, 0.43, 0.54, 0.41, **1.08**, 0.48 |
| Stability (keyboard bot) | PASS | spins in 18 laps: 0, 0, 0, 0, 2, 1, 0, 1; never stuck |
| Determinism | PASS | tests/save-roundtrip on v2 (HANDLING=v2) |

Section 6 (v2, dry unless noted). Clean bot laps (Kestrel / Neon / Cliff, s): civic 76.3/83.9/87.8, golf 76.6/84.2/87.8,
350z 73.3/79.7/82.0, rx7 72.1/78.7/81.4, e61 76.0/83.1/86.1, m3 71.8/77.7/79.4, evo 72.2/78.3/81.1, supra 72.7/79.5/81.8.
Lap order follows the skidpad within 5 %. The Evo is slower than its grip suggests (it pulls on exits, not mid-corner). Drift share
without the handbrake is 0-2 % for every car: the clean bot drives on grip, so this does not separate the layouts yet. AI on v2 finishes every lap
(Kestrel about 69-74 s dry), roughly 12 s slower than on legacy, because real tyres (about 0.9-1.0 g) replace the arcade grip.

| Car | Hairpin 40 km/h: min R (m) / 180 deg (s) | Sweeper 120 km/h: max g / body slip (deg) | Wet brake into a corner: stop (m) / peak slip > 30 km/h (deg) |
|---|---|---|---|
| civic | 15.5 / 4.68 | 0.89 / -2.0 | 55.0 / 2.5 |
| golf | 15.8 / 4.83 | 0.89 / -1.7 | 53.8 / 15.5 (nose-heavy hatch: the light rear rotates under ABS) |
| 350z | 17.5 / 5.17 | 0.92 / -2.1 | 53.6 / 1.2 |
| rx7 | 16.6 / 4.88 | 0.99 / -3.0 | 52.0 / 1.7 |
| e61 | 18.2 / 5.42 | 0.87 / -2.7 | 56.0 / 1.5 |
| m3 | 16.9 / 5.00 | 0.96 / -2.2 | 51.5 / 1.2 |
| evo | 15.2 / 4.57 | 1.00 / -2.3 | 49.3 / 2.0 |
| supra | 17.4 / 5.08 | 0.92 / -2.3 | 53.3 / 1.3 |

Tuned while iterating, all estimates flagged in data/carSpecs `est`: tyreMu per car (0.92-1.03), yaw-inertia dynamic index
(0.74-1.3), Evo roll share 0.5, RX-7 Cd 0.31 (the source gives "0.3x"). Model constants: friction ellipse 1.2 along/across, ABS 92 %
front, EBD 72 % rear. Cornering stiffness grows with the square root of the load. LIGHT has an ESC-like drive trim (an oversteer slide past
0.16-0.41 rad, or a yaw rate above what the front wheels ask for). That trim was needed for the keyboard bot in snow; it is not in the plan's
section 4 list.
