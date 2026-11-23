# Owner playtest feedback, 2026-11-21 (tasks for next session)

Carlos played the story on the live build (2a6611b). Verdict: "it was indeed fun". Direction for the next work:
**less is more, make what we have better and give it more point**, rather than adding size. Nothing below is started.

## Story and presentation
1. **Every character needs a little presentation.** Rivals and crew should be introduced (a short intro card, line or
   cutscene moment when they first appear), so the player knows who they are racing. More story ("make more history").
2. **Every story race is on the same track.** Spread the story events over the different maps (data in
   `data/story*.ts`, `trackId` per event); check `tests/career-check.mts` and balance bands still pass.
3. **Drift event (the third race) must show its target**, e.g. `0 / 3000` on the HUD during the run, not only in the
   results.

## Phone / tilt controls
4. **Launch with manual gas does not work in tilt mode** (the start/launch gas while tilting). Reproduce on a phone in
   tilt mode, then fix (`ui/touchControls.ts` `starting` / `startgas`, `game/inputSetup.ts`).
5. **Tilt users need a small toggle button: manual gas vs automatic gas**, so it does not go full throttle every time
   and you can drive calmly. Automatic stays available; the button switches between the two.
6. **Stay in landscape no matter what for tilt users:** turning the phone around must not pause the game. Lock the
   orientation / ignore the flip instead of showing the rotate card (`ui/rotateHint.ts`). Check on a real phone.

## Driving feel
7. **Holding the handbrake longer makes the camera zoom**, which does not look nice. Remove or soften that zoom (camera
   FOV / distance during long handbrake). The handbrake FEEL itself is approved and locked: change only the camera.
8. **Leaving the street in the city, the physics feel a little strange** (off-road / sidewalk / kerb behaviour in Free
   Drive, `physics/roamContact.ts`). Investigate and make it feel consistent with the race maps.

## City driving (Free Drive): smaller, fuller, with a point
9. **The city is too big and too empty; nobody knows what to do there.** Make it smaller and denser (fewer districts or
   a smaller playable area), so it looks better and every street has something. Less is more.
10. **Give it a point:** clear things to do and a goal (more activities placed close together, visible markers, a
    reason to drive around: e.g. challenges, collectibles, story jobs). Today the race rings, cameras and drift zones
    are too spread out to find.
11. **Hitting traffic cars does nothing.** Collisions with traffic need a reaction (the other car reacts/spins/stops,
    sound, sparks, maybe a penalty or a chase).
12. **The GUI in Free Drive does not look good.** Redo the Free Drive overlay (top bar, location line, offer card,
    minimap) in the menu style (`docs/ui-style.md`).
13. **Buildings are good in most places, but there are some exceptions** (odd or broken buildings somewhere). Do a
    screenshot sweep to find them; ask Carlos for locations if not obvious.

## Music
14. **More deep-house songs: Carlos really likes them.** Add new songs to `audio/houseSongs.ts` (keep the auto shuffle
    and crossfade; `tests/house-check.mts`, `tests/music-auto-check.mts`, `tests/lab/music-join.mjs`; check loudness
    with `tests/lab/house-wav.mjs`).

## Notes for whoever picks this up
- Locked items still apply (turbo, rain/snow physics, handbrake feel, STANDARD assist): items 7 and 8 must not change
  the approved car handling, only the camera and the city contact.
- Items 4-6 need a real phone to verify; say "not tried on a real phone" until Carlos confirms.
- Suggested order: 4 + 5 + 7 (small, felt every race), then 2 + 3 + 1 (story), then 9-13 (city rework as one block),
  then 14, with 6 and 8 alongside.
