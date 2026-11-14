# Task 019: dialogue and career unit tests
Files: tests/qwen-dialogue.mts
Branch: qwen/019-test-dialogue
Contract (read-only): everything under `src/`; import with `.ts` extensions. Do NOT edit `src/`.

## Style
Copy the `check()` harness from `tests/tracks-check.mts`.

## Write
Imports: `applyChoice, playable, defaultCareer, clampRel, nextEvent, isDone, storyComplete, completeEvent` from `src/core/career.ts`; `ALL_EVENTS, eventsOf` from `src/data/story2.ts`; `defaultSave, SaveStore` from `src/core/save.ts`; `CARS` from `src/data/cars.ts`.
1. `playable` keeps lines without conditions, keeps `if` lines only when the flag is set, keeps `unless` lines only when it is not; it never mutates its input array.
2. `applyChoice` with an option that sets `{open: true}` and `rel {cain: 2}` called three times leaves `rel.cain === 5` (clamped) and `flags.open === true`; `clampRel(9) === 5` and `clampRel(-9) === -5`.
3. Every event in `ALL_EVENTS` has a unique id; event ids of chapter 1 come before chapter 2 in `ALL_EVENTS`; `eventsOf(1)` and `eventsOf(2)` partition it.
4. Walking a fresh career: `nextEvent` returns events in `ALL_EVENTS` order as each is completed with `completeEvent` (use a `SaveStore` over an in-memory `{getItem,setItem,removeItem}` object); `isDone` becomes true after the four chapter 1 events but `storyComplete` only after all ten.
5. Every `choice` in every event has exactly two options, each with a non-empty `label` and at least one reply line, and every `if`/`unless` flag used in any event is set by at least one choice option.
6. A career with a stored garbage `flags` value (string, array, number) loaded through `SaveStore` gives `flags` as a plain object with only `true` values.

## Done when
`npx tsx tests/qwen-dialogue.mts` prints ALL PASS. If a check fails because of a REAL bug in `src/`, wrap that check so it is skipped and add a `// BUG:` comment.
