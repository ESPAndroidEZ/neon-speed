# Task 065: Eight more neon shop signs for Neon Harbor (fictional brands)
Files: src/world/city/signsC.ts src/world/city/signs.ts
Check: npx tsx tests/chunk-geo-check.mts
Branch: qwen/065-harbor-signs
Contract (read-only): SignSpec in src/world/city/signs.ts (text, sub, color, alt, style 'tube'|'solid'|'bar', icon 'bowl'|'bolt'|'scissors'|'star'|'ring'|'cup')

## Why
Free Drive repeats the same 23 sign designs over 10,000 buildings. More designs = less repetition, no new draw call (one shared atlas).

## Export exactly
signsC.ts: export const SIGNS_C: readonly SignSpec[]  (8 entries, `import type { SignSpec } from './signs'`)
signs.ts: add `import { SIGNS_C } from './signsC';` and `...SIGNS_C,` after `...SIGNS_B,`. Change nothing else in signs.ts.

## Behaviour
1. FICTIONAL brands only (owner rule): no real company, product or person names. Short text (max 12 characters) so it fits a 256 x 128 cell; sub max 16 characters, upper case.
2. Themes for the districts: harbour (fish market, ship chandler, sailor bar), industrial (24 h diner, tyre shop), oldtown (bakery, tattoo), strip (karaoke). Example: { text: 'TIDE MARKET', sub: 'FRESH CATCH', ... }.
3. Colours from the game palette only: '#ff2a9d', '#18d8ff', '#ffb347', '#7a5cff', '#39ff88', '#ff9a2e', '#ff4fa3', '#ffd27d', '#c8f4ff', '#ffffff'. color and alt differ.
4. Mix the three styles (at least two of each) and use only existing icon names.

## Done when
npm run build passes, the Check passes, files under 220 lines, only listed files changed. Hand-check (Carlos): `npm run dev`, `/?roam=harbour`: new signs appear on harbour fronts.
