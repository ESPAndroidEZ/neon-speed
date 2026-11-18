# 10 Rename the game to Neon Speed

Owner decision 2026-11-16: the game is **Neon Speed** (was Racer's Blood). See the CLAUDE.md block of that date.

Sub-checklist (tick as you go):
- [ ] Player-visible text: `index.html` (title, apple-mobile-web-app-title, boot splash text), `public/manifest.webmanifest` (name, short_name, description), `src/ui/menu.ts` title screen, `src/data/story.ts` and other data/i18n strings (`grep -rIn -i "racer's blood\|racer’s blood\|racers blood" src index.html public docs README.md AGENTS.md CLAUDE.md`).
- [ ] Both language tables stay in sync (`npm run lang`, `tests/i18n-check.mts`). In Spanish the name is not translated: "Neon Speed".
- [ ] Native display names only: `android/app/src/main/res/values/strings.xml` app_name, `ios/App/App/Info.plist` display name, `capacitor.config.ts` appName. DO NOT change application ids / bundle ids / package names / `com.racersblood.game` / folders, and do not touch the generated `android/app/src/main/assets/public/**` or `ios/App/App/public/**` bundles (they are build output).
- [ ] Do NOT rename localStorage keys, save keys, IndexedDB names, the repo, `package.json` "name" (display only: add a `"productName"` if useful). Add a one-line test or assertion in `tests/save-roundtrip.mts` style if there is an obvious spot proving an old save still loads under the unchanged key.
- [ ] Docs: README, `docs/story.md`, `docs/plan.md`, `docs/release.md`, `docs/mobile.md`, `docs/art-direction.md`, `docs/project-summary.md`, `docs/handoff.md` mention the new name. Leave historical changelog sentences in `handoff.md` alone but add "(Neon Speed since 2026-11-16)" once at the top.
- [ ] The wordmark: make a good-looking title treatment for NEON SPEED (CSS/canvas, neon glow, subtle flicker that respects reduced-motion). The boot splash and title screen use it. Keep it readable in the bad-weather `npm run visual` checks.
- [ ] Comments in code (`// Racer's Blood ...`) that are user-facing no; leave internal comments.
- [ ] `scripts/phone-access.ps1`, `scripts/qwen.sh`, `blender/lib/rb.py`, `tests/lab/**`: leave unless they print the name to the player. Not needed.

Done when: `grep -rIn -i "racer's blood" src index.html public` has no hits except deliberate ones listed in the report, build + tests + `npm run lang` green, a screenshot of the title screen was looked at (via subagent, downscaled).
