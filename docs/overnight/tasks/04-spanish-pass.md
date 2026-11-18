# 04 Spanish pass (Spain Spanish)

Source: `docs/fable-notes.md`. Decision by Carlos: Spain Spanish (coche, móvil, conducir, matrícula, Intro, Mayús, vosotros imperatives). The text was converted from a LatAm draft by regex plus a hand pass.

1. Find leftovers in `src/i18n` (es tables and the `tx()` content translations): `ustedes`/`ustedes`-form imperatives (e.g. "presionen", "elijan"), carro, auto (meaning car), celular, computadora, manejar/manejo (driving), "ahorita", `Enter`/`Shift` where the UI says Intro/Mayús, "tú/usted" mixing within one screen. Use `grep -rniE` with head_limit; fix by hand, one file at a time.
2. Tone pass on radio lines and the Cain / Mara / Dante dialogue: keep them short, street-racer register, consistent tú/vosotros, no literal English calques. Do not change meaning or keys, only values. Names, brands, track names and character names stay as they are.
3. Strings with `{params}` must keep every placeholder exactly. Keep each `.ts` file under 220 lines (split by area if needed, following the existing es*.ts split).
4. `npm run lang` and `tests/i18n-check.mts` must pass. Build and tests green.

Report: number of strings changed and 5 representative before/after examples so Carlos can judge the register.

Done when: no LatAm leftovers from the grep list remain and all checks pass.
