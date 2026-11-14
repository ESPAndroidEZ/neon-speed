# Task 014: pre-race taunts (barks) for every rival
Files: src/data/barks.ts
Branch: qwen/014-barks
Contract (read-only): none. Data only, no imports.

## Write
`export const BARKS: Record<string, string[]>` keyed by rival id: `pixel`, `lola`, `rook`, `tank`, `vex`, `jinx`, `dante`, `nova`, `brick`, `calloway`. Four lines each, in the rival's voice, said to the player on the versus screen before a race. PG, sharp not cruel, each under 80 characters, no duplicates.
Voices: pixel (streamer, talks to chat), lola (dock rat, quiet confidence), rook (ex-Redline, bitter), tank (few words, heavy), vex (drifter, cocky), jinx (rain lover, grinning), dante (calm, polite, ruthless), nova (drift queen, amused), brick (dock union, blunt), calloway (rich, bored, precise).

## Done when
`npm run build` passes, only `src/data/barks.ts` changed.
