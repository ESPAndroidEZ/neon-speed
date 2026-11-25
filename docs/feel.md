# Driving feel: Classic vs Street (2026-11-25)

Setting: Settings > Basic > **Driving style** (`settings.drivingStyle`, `CLASSIC` default / `STREET`).
Code: `physics/drivingStyle.ts` (`STREET_FEEL` multipliers, `applyStyle` called from `data/carBuild.ts applyBuild`, PLAYER ONLY),
`camera/cameraStyle.ts` (`STREET_CAM`, applied in `ui/settings.ts applySettings`), `input/steerRamp.ts` (`STREET_RAMP`, keyboard
and touch ramps only), `fx/juice.ts` (nitro edge blur 0.15 -> 0.4). Locked models are untouched: turbo, rain/snow grip,
handbrake carry and drift hold, weight-transfer data. Rivals keep their own tuning (`aiTuning`), so the AI never gets the Street grip.
Restore point: tag `driving-backup-2026-11-25`.

## What Street changes
| | Classic | Street |
|---|---|---|
| tyre grip front / rear | car data | x1.12 / x1.16 |
| lock at speed (`steerFalloffSpeed`, `minSteerScale`) | car data | x1.15 / x1.08 |
| counter-steer when the stick centres (`driftAssist`) | car data | x1.35 (cap 1) |
| power slide (`powerSlide`; the `powerFloor` stays) | car data | x1.25 (cap 0.95) |
| nitro extra torque / burn rate | 1.55 / 0.22 per s | extra x1.4 / burn x0.8 |
| yaw damping | car data | x1.08 |
| key steering at speed (rise / cross per s) | 3.4 / 9 | 4.6 / 11.5 |
| camera at speed (distance / height / yaw lag) | 8.4 / 3.0 / 5 | 7.3 / 2.65 / 6.2 |
| nitro FOV kick / edge blur | 8 deg / 0.15 | 12 deg / 0.4 |

## Lab numbers (`npx tsx tests/lab/feel.mts classic|street`, flat pad, CLEAR)
0-100 in s; R = steady full-lock radius in m at 60 / 100 km/h (slip in brackets: > 20 deg = spun); hb = handbrake at
80 km/h for 0.6 s with full lock (peak slip / heading change after 2.5 s); power = full lock + full gas from 50 km/h (peak slip);
nitro = km/h gained in 3 s from 100 km/h with nitro minus without.

| car | 0-100 C / S | R60 C / S | R100 C / S | hb slip C / S | hb turn C / S | power C / S | nitro C / S |
|---|---|---|---|---|---|---|---|
| Civic | 6.83 / 6.77 | 17.2 / 14.0 | 33.7 (17) / 25.6 (15) | 34 / 35 | 112 / 121 | 4.2 / 3.1 | +13.4 / +17.7 |
| Golf | 7.87 / 7.87 | 23.3 / 21.0 | 39.8 (16) / 32.5 (16) | 36 / 36 | 113 / 122 | 2.7 / 2.3 | +10.3 / +14.5 |
| 350Z | 5.60 / 5.27 | 30.4 / 27.5 | 76.3 (8) / 70.5 (7) | 28 / 28 | 83 / 92 | 19.2 / 24.6 | +14.2 / +20.4 |
| RX-7 | 5.18 / 4.83 | 28.7 / 26.0 | 72.6 (7) / 66.9 (6) | 26 / 26 | 88 / 98 | 11.4 / 20.2 | +15.0 / +21.6 |
| E61 | 6.63 / 6.63 | 25.6 / 23.3 | 62.6 (7) / 52.0 (6) | 29 / 29 | 97 / 109 | 1.2 / 1.4 | +9.8 / +14.4 |
| M3 | 5.17 / 5.17 | 25.2 / 22.8 | 60.3 (8) / 49.6 (7) | 33 / 33 | 98 / 111 | 3.0 / 2.2 | +18.7 / +25.6 |
| Evo | 5.20 / 5.20 | 23.7 / 21.6 | 62.6 (6) / 57.5 (5) | 27 / 27 | 100 / 113 | 2.0 / 2.4 | +14.4 / +20.1 |
| Supra | 4.78 / 4.52 | 23.8 / 21.5 | 18.3 (33, spins) / 57.3 (8) | 36 / 36 | 103 / 119 | 4.2 / 3.1 | +12.0 / +17.0 |

Reading: Street turns 8-19 % tighter at 60 km/h, the handbrake swings the car 9-16 deg further with the same peak slip
(the approved carry/hold do the work), the 350Z and RX-7 break loose on the gas far easier, nitro gives ~40 % more, and the
Supra no longer spins under full lock at 100 km/h. The M3/Supra power-slide probe barely moves (50 km/h in a tall gear and
turbo lag): they slide on the handbrake, as before. Tuning history: a first try (rear grip x1.06-1.09, lock x1.35) spun the
350Z, M3 and Supra at full lock at 100 km/h; a lower `powerFloor` (x0.75) spun the clumsy bot in rain 58 % more (6.9 vs 4.3 spins/lap, 2 DNF; floor kept: 4.45, 0 DNF, `tests/lab/feel-rain.mts`); sweep tool `tests/lab/feel-sweep.mts key=value,...`.

Balance (bot at full skill on Kestrel Bay, Street-tuned car): every car inside its `tests/balance-check` band, 1-4 s faster
than Classic (civic 62.9, golf 63.4, 350z 59.6, rx7 59.3, e61 62.0, m3 57.7, evo 59.4, supra 57.7 s).
Guard: `tests/driving-style-check.mts` (Classic = these backup numbers; Street tighter, holds 100 km/h, stronger nitro,
handbrake unchanged, power slide on the RWD Japanese cars, rivals unaffected, camera and ramp defaults restored).

## Bot playtest (`npx tsx tests/lab/handling-lab.mts <label> STANDARD [street]`)
Every car x every map x CLEAR/RAIN/SNOW, 4 laps, STANDARD assist (logs/handling/classic-1125.txt, street-1125.txt):

| bot | Classic spins / wall hits per lap, drift % | Street |
|---|---|---|
| clean | 0.00 / 0.12, 0.2 % | 0.00 / 0.12, 0.2 % |
| keyboard | 0.01 / 1.08, 24.4 % | 0.00 / 0.99, 20.4 % |
| clumsy | 4.21 / 18.14, 47.5 % (RAIN 4.34) | 3.56 / 16.47, 46.2 % (RAIN 4.45) |

No DNF in either style. Street is more forgiving for weak drivers and slides a little less by accident; the slides it
has are the ones the driver asks for (handbrake, gas). Not verified by a human on a real device yet.
