# 03 Hide dev-only keys from the player HUD

Source: `docs/fable-notes.md`, "Weak spots": `hud.keys` shows the dev weather keys (1/2/3) to players.

1. `grep -rn "hud.keys" src | head -20` to find the key, its renderer and both language tables (`src/i18n`).
2. Players must not see the dev weather keys. Keep any real player-facing keys (pause, camera, etc.). Gate the dev part behind the existing dev/debug flag if there is one (look for how `src/dev` or `?dev` is detected); do not invent a second mechanism.
3. Weather physics setting and the actual key handling stay as they are; only what the HUD advertises changes. Both `en` and `es` tables must stay in sync (`npm run lang`, `tests/i18n-check.mts`).
4. Add or extend a test if there is an obvious place (HUD text check); otherwise skip tests, do not invent infrastructure.

Done when: HUD no longer lists 1/2/3 for players, dev mode still can, `npm run lang`, build and tests green.
