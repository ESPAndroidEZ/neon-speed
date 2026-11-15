# 05 Language switch keeps UI state

Source: `docs/fable-notes.md`, "Weak spots": the live language switch re-renders menus/HUD/touch labels, but an open dialogue line, an already-shown subtitle and the garage's browsed car index (resets to the selected car) are lost.

1. Find the language-change hook (`grep -rn "onLangChange\|setLang\|lang" src/i18n src/ui | head -40`) and how menus re-render.
2. Garage: remember the browsed car index across the re-render (store it where the garage already keeps its state; `ui/carNav` is the Prev/Next logic). It must not change the selected/owned car or the save.
3. Subtitles / dialogue: re-translate the line currently shown from its key (or from the English source through `tx()`), keeping its remaining display time. If the current code only keeps the finished string, keep the English source or key next to it. No allocation in per-frame code; subtitle updates are event-driven, so this is fine.
4. Keep files under 220 lines; no `enum`, `import type` for types. Add a small test in `tests/` for the browsed-index logic if it is pure (follow `tests/i18n-check.mts` style); skip UI-only parts.

Done when: switching EN to ES in the garage keeps the browsed car and a visible subtitle changes language without restarting; build and tests green.
