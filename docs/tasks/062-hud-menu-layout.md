# Task 062: Menu stack on the left, turn signifier from the lookahead, DJ Switch radio box
Files: src/ui/menu.ts src/ui/cornerGuide.ts src/ui/subtitles.ts src/i18n/enGame.ts src/i18n/esGame.ts src/i18n/enMenu.ts src/i18n/esMenu.ts
Check: npx tsx tests/i18n-check.mts && npx tsx tests/line-sign-check.mts
Branch: qwen/062-hud-menu-layout
Contract (read-only): `t(key, params)` from '../i18n' (all visible text; add keys to BOTH en and es files with identical keys and {params}; Spanish: Spain Spanish, with accents, 'coche', 'conducción'). CSS variable `--rb-sub-scale` (1 / 1.25 / 1.5) is set by the Subtitle size setting.

## Behaviour
1. menu.ts `main()` only (title and other screens unchanged): the button stack moves from the centre to the left third: `align-items:flex-start`, vertically centred, `padding-left: max(env(safe-area-inset-left), clamp(16px, 4vw, 48px))`, stack width at most 33vw (buttons `min-width:min(260px,33vw)`, text left-aligned), on portrait phones (max-width 600px) keep it left too but let buttons use up to 70vw. The 3D car is already moved right by the 'menu' camera layout; do not touch the camera.
2. cornerGuide.ts: the pill shows the next corner only when the distance to its APEX (the sample of maximum curvature) is at most 120 m (today it looks 180 m to the corner start). Distance text rounds to 10 m; below 10 m show no number (never "0 m"); on a straight (no corner within 120 m) the guide is hidden. Words go through t() (keys cg.* exist). Do not change the LEFT/RIGHT sign logic (tests/line-sign-check.mts must pass) or the brake/ease logic.
3. subtitles.ts: DJ Switch lines (kind 'switch') render in a compact radio box in the upper left, below the weather label (top: calc(max(14px, env(safe-area-inset-top)) + 70px), left: max(16px, env(safe-area-inset-left))): width min(320px, 42vw) * var(--rb-sub-scale, 1), font-size calc(13px * var(--rb-sub-scale, 1)), a small "DJ SWITCH" tag (t('radio.tag'), add the key) over the text, dark translucent panel with a cyan left border, no italics, max 3 lines (line-clamp), fade in/out as now. Kinds 'lower' and 'title' keep their positions.
4. Every string you touch goes through t() / tx(); never concatenate translated fragments.

## Done when
`npm run build` and the Check pass, files under 220 lines, only listed files changed.

## Hand-check (30 s, Carlos)
`npm run dev`: Main Menu buttons hug the left, car on the right; race: the corner pill appears only when a corner is within about 120 m and never says 0 m; DJ Switch lines show in a small box top-left under the weather text; Settings > Subtitle size changes its size; switch language to Español: all of it follows.
