# Research: making Free Drive (Neon Harbor) feel better

2026-11-25. Sources are open-source games, sims and public papers/talks only. I did not study Need for Speed / EA code or data, OpenUG2 or OpenNFS.
Licences were checked through the GitHub licence API or the LICENSE/COPYING file. Rule: **GPL / EPL = ideas only; MIT / BSD / Apache-2.0 / zlib = code may be copied with its notice kept.**
Current state seen in our code: `physics/roamTraffic` uses a fixed 9 m gap, constant ACCEL 2.2 / BRAKE 6, a flat 7 m/s turn speed and spawn/despawn rings of 320/420 m. `game/roamStuck` is 22 lines. Outruns are launched onto a race map, not run in the city.

## 1. Projects

| Project | Link | Licence (checked) | Good for | Reuse |
|---|---|---|---|---|
| Need For Throttle Underchase | github.com/PROJonYz/NeedForThrottleUnderchase | none: repo has only a README and screenshots, no source | Shows what a solo dev puts in a UG2-style city (meets, outruns, garages) | Ideas only (look at the itch build, no code available) |
| VDrift | github.com/VDrift/vdrift | GPL-3.0 | AI braking look-ahead based on curvature (`src/ai/ai_car_standard.cpp`) | Ideas only |
| Speed Dreams | sourceforge / mirror github.com/argos-research/speed-dreams | GPL-2.0 (mirror) | Racing-line robots (simplix), lines that use the width of the road | Ideas only |
| Stunt Rally 3 | github.com/stuntrally/stuntrally3 | GPL-3.0 | VDrift-based car feel, road splines | Ideas only |
| SuperTuxKart | github.com/supertuxkart/stk-code | GPL-3.0+ (COPYING) | AI speed cap by distance to the player (`data/stk_config.xml`) | Ideas only |
| movsim traffic-simulation.de | github.com/movsim/traffic-simulation-de | GPL-3.0 | Reference JS for IDM + MOBIL, junctions, ramps | Ideas only |
| HighwayEnv | github.com/Farama-Foundation/HighwayEnv | MIT | Clean IDM + MOBIL with tuned constants (`vehicle/behavior.py`) | Code allowed |
| RoadTrafficSimulator | github.com/volkhin/RoadTrafficSimulator | MIT | Small JS city traffic: IDM, stop line treated as a car, picking a lane before a turn, light phases | Code allowed |
| A/B Street | github.com/a-b-street/abstreet | Apache-2.0 | Junction rules: turn conflicts, "don't block the box", gridlock fixes | Code allowed (Rust, port) |
| Eclipse SUMO | github.com/eclipse-sumo/sumo | EPL-2.0 | Industry traffic sim: junction right of way, lane-change models | Ideas only (copyleft) |
| CARLA | github.com/carla-simulator/carla | MIT | Traffic manager: spawning around the hero vehicle, hybrid physics far away | Code allowed (C++/UE) |
| Godot engine + demos | github.com/godotengine/godot, godot-demo-projects | MIT / MIT | `SpringArm3D` camera collision, truck_town follow camera | Code allowed |
| Bullet | github.com/bulletphysics/bullet3 | zlib (LICENSE.txt) | Raycast vehicle, contact impulses, friction combining | Code allowed |
| Rapier (JS) | github.com/dimforge/rapier.js | Apache-2.0 | Shape casts and character-controller sliding along walls | Code allowed |
| TNTGame | github.com/yomboprime/TNTGame | MIT (models it uses are GPL/CC BY) | three.js vehicle sandbox | Code allowed (code only) |
| InfiniTownTS | github.com/osoker/InfiniTownTS | none (no licence file; port of Little Workshop's demo) | Endless tiled city, recycling chunks | Ideas only (no licence means no rights) |
| three.js | github.com/mrdoob/three.js | MIT | Already used | Code allowed |

Papers and talks (ideas): Treiber et al., IDM (2000); Kesting, Treiber, Helbing, MOBIL (2007); Craig Reynolds, "Steering Behaviors for Autonomous Characters" (GDC 1999); Michael Booth, Left 4 Dead "AI Director" (2009); John Nesky, "50 Game Camera Mistakes" (GDC 2014).

## 2. Techniques worth adopting

**T1. Car-following with IDM** (HighwayEnv, RoadTrafficSimulator, movsim). Problem: traffic with a fixed gap and constant accel/brake jerks, bunches up and rear-ends cars when the player cuts in.
`a = aMax * (1 - (v/v0)^4 - (s*/s)^2)`, where `s* = s0 + v*T + v*dv / (2*sqrt(aMax*b))`. City values: s0 2 m, T 1.2-1.5 s, aMax 1.5-2.5, b 3-5, a random delta 3.5-4.5 per car so cars differ. Clamp braking to about 9 m/s² for emergencies. It is a few lines and has no allocation, so it fits the step loop.

**T2. Stop lines and the player as "virtual leaders"** (RoadTrafficSimulator `car.coffee`). Problem: brake-checking at lights and ignoring the player. Treat a red or yellow stop line as a parked car at the line (s = distance to the line, v = 0) and add a third term `(sStop*/dStop)^2`. Also treat the player as a leader when the player's car sits in the agent's lane corridor (within half a lane width laterally, ahead within 40 m). Yellow light: stop only if `v²/(2b) < distance to the line`, otherwise go through.

**T3. Lane changes with MOBIL** (HighwayEnv, movsim). Problem: traffic forms walls the player can't get through, or swerves into the player. Change lanes only if `gain = a'_self - a_self + p*(a'_newFollower - a_newFollower + a'_oldFollower - a_oldFollower) > 0.2 m/s²` and the new follower would not have to brake harder than 2 m/s². Politeness p is 0-0.3. Check at most once per second per car (stagger the timers). Use the lane change to move cars aside from a fast player coming from behind or a police car with its siren on: give it a "yield" bias that adds +1 m/s² to the right lane when a fast car is within 60 m behind.

**T4. Junction behaviour** (A/B Street, SUMO, RoadTrafficSimulator). Problem: cars clip through each other or lock up in junctions. Rules: (a) choose the next edge and the lane for the turn before the junction (turn left from the left lane); (b) **don't block the box**: enter only if the exit lane has at least one car length free; (c) claim a junction "reservation" for the turn and refuse conflicting turns until it is cleared; (d) move along a curved turn path (Bezier) at `v = sqrt(aLat * r)` with aLat about 2.5 m/s², not at a flat 7 m/s; (e) light phases split into protected left / straight+right, with a random offset per junction.

**T5. Density ring around the player** (CARLA traffic manager, common open-world practice). Problem: empty streets, or cars popping in on screen. Keep a target count per ring, not per map. Spawn in an annulus 120-250 m away **behind the camera or occluded** (dot(view dir, to spawn point) < 0.3, or a building in between), never closer than 80 m in view; despawn only when > 300 m away and out of view. Raise the density on main roads and near the player's heading, and cut it in front of an active race line. Cars far away (> 150 m) can run a cheap "on rails" update at 10 Hz; full IDM only near the player.

**T6. AI rivals on a road graph** (VDrift, Speed Dreams, Reynolds). Problem: rivals cut corners into walls or brake late in city corners. Build the route as a polyline from the graph (A* over edges), offset into the racing lane and smoothed at junctions. Steer at a point `L = 2.25 + 0.33*v` metres ahead (VDrift's look-ahead factors). Speed: for each sample up to `brakeDist(v,0) + 10 m` ahead, compute `vMax = sqrt(mu*g*r)` (mu * 0.62 lateral, VDrift) and brake if `(v² - vMax²)/(2*mu*g*0.68) > distance to it`. Limit how fast throttle and brake can change. Add Reynolds-style avoidance: project traffic 1.5 s ahead and steer away if the projected gap is under 2.5 m.

**T7. Rubber band / catch-up** (SuperTuxKart). Problem: rivals either vanish ahead or are trivial. STK caps the AI speed by its distance to the player, linear between points, e.g. hard: `0 m: 0.96, 80 m: 0.8` of top speed for the last AI, `50 m: 1.0, 150 m: 0.9` for the leader. It **never raises speed above 1.0**. Our rule (only help is `aiDifficulty`, capped at 9 %, no extra grip) fits: use a distance-based slowdown when the AI is ahead and a capped boost when it is behind, and switch it off on Legend.

**T8. Outrun rule (UG-style street duel)** (common genre rule; Underchase shows it in a city). Problem: one-on-ones in the city have no clear end. Run it in the city itself, no race map: win when you lead by **N = 250-300 m (straight-line or along the route) for T = 3-5 s**, or when the rival is not in your view for T seconds. Lose the other way round. Show a gap bar that fills up. Timeout after 120 s goes to whoever leads. Same rule for police escape (heat: break line of sight plus distance for a cooldown).

**T9. Collision response with traffic** (Bullet, our `obbHit`). Problem: hits feel like walls or like ghosts. Give every traffic car a mass (hatch 1100, van 1900 kg) and resolve with an impulse: `j = -(1+e)*vRel·n / (1/mA + 1/mB + rotational terms)`, with e 0.2-0.3 and friction `mu*j` along the tangent. Let the hit traffic car turn into a short-lived simple rigid body (2-3 s, sliding, spinning, then a parked hazard) instead of snapping back to its lane. Scale the player's speed loss by the mass ratio. Rule: glancing hits (angle < 25°) cost little speed and push the player aside; head-on hits cost a lot.

**T10. Walls, kerbs, off-road without snagging** (Rapier character controller, Bullet). Problem: cars stick on wall corners and kerbs. (a) Remove only the velocity into the wall (`v -= min(0, v·n)*n`) and keep the slide along it, with a small scrub (5-15 % per hit by angle). (b) Smooth corner normals: wall polygons get rounded corners (radius 0.5-1 m) so the normal turns smoothly. (c) Kerbs are a surface (grip and speed drag), not a collider. (d) Push out of a wall in 2-3 steps instead of one jump. (e) "Stuck" helper: if speed < 1 m/s for 2 s with the throttle held and the nose against a wall, offer reset to the nearest graph edge, facing along it.

**T11. Chase camera in tight streets** (Godot `SpringArm3D` and truck_town, Nesky). Problem: the camera clips into buildings or swings wildly. Cast a sphere (r 0.3 m) from a pivot above the car to the wanted camera spot. If it hits, pull in to `hit - margin` at once; ease back out slowly (about 0.5 s). Keep min and max distances (truck_town: 2-4 m). Look ahead: aim at `car + velocity*0.3 s`, yaw-lag about 0.15-0.25 s, and stay behind velocity (not the nose) in slides. Raise the camera a little when pulled in so it doesn't go behind the car's roof. Never shake from plain driving (our rule).

**T12. Keep the city feeling full** (L4D "AI Director" idea, genre practice). Problem: long empty drives between events. Keep an **activity budget**: within 400 m there should always be 2-4 things (ring, challenger, meet, speed trap, collectible). A director spawns them on roads in front of the player when the count drops and pulls back when a chase or race is on. Show far ones as minimap/GPS icons and near ones as tall light beams. Pedestrians and parked cars cluster near meets and shops, not evenly.

**T13. Streaming without pop-in** (InfiniTown idea, CARLA, three.js practice). Problem: chunks and props appearing in view. Load chunks by a predicted point `pos + velocity*2 s`, not the current point, so a fast car always has the next chunk ready. Spread building work over frames (time budget about 2 ms per frame). Fade in with distance fog or a dither, and use a cheap far mesh (merged boxes) before the detailed one. Keep a pool of chunk objects and reuse them (no allocation per frame).

## 3. Top 8 for Neon Speed, in order

1. **IDM car-following + stop line as a virtual car + player as leader** (T1, T2) in `physics/roamTraffic`. Fixes the jerky traffic, crashes at lights, rear-ending. Effort **S**.
2. **Wall slide without snagging + better stuck reset** (T10) in `wallHit` / `roamContact` / `roamStuck`. Most "it's buggy" moments come from this. Effort **M**.
3. **Chase camera spring arm with sphere cast and slow ease-out** (T11) in `camera/chaseCam`. Effort **S**.
4. **Traffic hits as short-lived physics bodies with mass ratios** (T9) via `trafficKnock` / `obbHit`. Effort **M**.
5. **Spawn ring out of view + LOD update** (T5); replace the 320/420 m radius rule. Effort **S**.
6. **City rival driver: graph path, curvature look-ahead braking, avoidance** (T6) for challengers and police in `physics/aiLine` / `roamPolice`. Effort **L**.
7. **In-city outrun rule (lead 250 m for 4 s) + distance-cap catch-up** (T7, T8), inside the existing `aiDifficulty` limits. Effort **M**.
8. **Junction rules + MOBIL lane changes and yielding** (T3, T4), then the activity director (T12) and predictive streaming (T13). Effort **L**.

Each step needs a lab or check under `tests/` (e.g. a traffic soak with zero overlaps, a wall-slide speed check, a camera clip check) before the owner playtests it.
