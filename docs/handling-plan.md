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
(filled in by block C)
