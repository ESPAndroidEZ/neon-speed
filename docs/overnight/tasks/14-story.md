# 14 Story rewrite: a story people actually enjoy

Read `docs/story.md` fully (120 lines), then `src/data/story.ts`, `story2*.ts`, `lore.ts`, `characters.ts`, `barks.ts`, `radio.ts`, `radio2.ts`, `quests/`, `rivals.ts`, and how `src/game` plays beats (story/cast/versus gate, cinematics, dialogue). Understand the beat ids and flags that saves and tests reference BEFORE changing anything.

Constraints: Chapter 2 flags `open` / `sponsor` stay; save format and beat ids stay valid (add new ids, migrate if needed through `MIGRATIONS`, never remove an id a save may contain); cutscenes remain skippable and never leave the race; the game is named **Neon Speed**; brands on signs/parts are FICTIONAL; real car names stay only in `data/cars.ts`; the free Chapter 1 demo is one city loop.

Goal: a story that hooks in the first two minutes, has stakes, memorable characters with distinct voices, a mystery with payoff, rivals who feel like people, and a satisfying ending, told in short beats (race games: 10-25 words per line, strong verbs, humour and heart, no walls of text).

Sub-checklist:
- [x] Critique: write `docs/story-review.md` (max 60 lines): what works, what is weak or generic, where players would skip, plot holes, inconsistent characters. Be honest and specific.
- [x] New outline in `docs/story.md`: premise and tone (neon-noir street racing, loyalty, debt, a city that never sleeps), three-act structure across the chapters, a clear antagonist with a human motive, the protagonist's want vs need, 5-6 named rivals each with a signature car, driving style and a reason to care, a mentor, a betrayal, a late reveal that recontextualises early lines (plant it early), and the Chapter 2 `open` vs `sponsor` branch with consequences that visibly differ in the final act (different rival, radio lines, ending card).
- [x] Opening: a cold open that puts the player in a race within the first minute, then the first conversation. Teach controls through story pressure, not text.
- [x] Pre/post-race dialogue per rival race: banter that references the weather, the car the player drives, the player's previous results (use state the game already has: wins/losses, car tier, flags). At least 3 variants per rival line set so repeated attempts differ. Radio lines and barks (`barks.ts`, `radio*.ts`) get the same treatment: short, characterful, timed to race events.
- [x] Ending(s): at least two endings tied to the branch flag, each with an epilogue card; the credits mention Neon Speed.
- [x] Implement in data files (never inline in code logic), each `.ts` < 220 lines, splitting `story3*.ts` etc. as needed. Keep `tx()`/i18n structure: write English first, then the Spanish (Spain Spanish: coche, móvil, conducir, vosotros, Intro/Mayús) for every new or changed string, same tone, no calques. `npm run lang` and `tests/i18n-check.mts` must pass.
- [x] Tests: story graph check (every beat reachable, no dead ends, flags consistent, both branches reach an ending) in `tests/`, plus the existing story/save tests.
- [x] Update `docs/story.md` so the canonical text matches the game, and mention the changes in the report with a two-paragraph pitch of the new story Carlos can read in one minute.

Done when: tests green including the new story graph test, both languages complete, the pitch is in the report.
