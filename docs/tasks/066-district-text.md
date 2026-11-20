# Task 066: Street names and district descriptions for Neon Harbor (English + Spanish)
Files: src/data/world/districtText.ts src/i18n/esContentI.ts src/i18n/esContent.ts tests/lab/i18n-harvest.mts
Check: npx tsx tests/i18n-check.mts
Branch: qwen/066-district-text
Contract (read-only): DistrictId in src/types/world.ts ('downtown' | 'harbour' | 'oldtown' | 'strip' | 'hills' | 'industrial' | 'bay')

## Why
The full map and the GPS will show where you are ("Pier Road, Harbour") and a line about each district. Text only; Claude wires it.

## Export exactly
districtText.ts:
export const STREET_NAMES: Readonly<Record<DistrictId, readonly string[]>>; // 12 per district (bay: 4)
export const DISTRICT_BLURB: Readonly<Record<DistrictId, string>>;         // one sentence each, max 110 characters
esContentI.ts: export const ES_CONTENT_I: Record<string, string> (Spanish for every blurb; street names stay English, do not add them)

## Behaviour
1. Fictional names in the game's mood (neon, rain, harbour, street racing): e.g. 'Pier Road', 'Crane Street', 'Lantern Alley'. No real brands or people. Unique across the whole list.
2. Style of the blurbs: plain present tense, e.g. 'Container stacks, crane lights and long straight docks: the drifters' playground.'
3. Spanish: natural Spain Spanish ("tú"), same meaning, no placeholders.
4. esContent.ts: import ES_CONTENT_I and spread it in the merged object exactly like ES_CONTENT_H (look at the file).
5. tests/lab/i18n-harvest.mts: add `import { DISTRICT_BLURB } from '../../src/data/world/districtText.ts';` and inside harvest() `list(Object.values(DISTRICT_BLURB));` next to `list(TIPS);`. Change nothing else.

## Done when
npm run build passes, the Check prints "i18n ok", files under 220 lines, only listed files changed.
