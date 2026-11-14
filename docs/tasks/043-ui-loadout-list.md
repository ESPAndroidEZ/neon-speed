# Task 043: Loadout list screen
Files: src/ui/loadoutList.ts
Branch: qwen/043-ui-loadout-list
Contract (read-only): everything else. Do NOT edit any other file. Allowed imports: only what the reference file imports (`import type` for types).

## Reference implementation (read it first, copy its shape)
src/ui/garageLook.ts (how rows are built), docs/ui-style.md, src/data/loadout.ts, src/ui/theme.ts (CSS variables)

## Exact signature
```ts
import type { SaveStore } from '../core/save';
export function buildLoadoutList(store: SaveStore, onBack: () => void): HTMLElement;
```

## Write
A full-screen list of the player's cars. Each card (use `className = 'rb-card'`, text from CSS variables like `var(--text-dim)`) shows the car name, a coloured chip for the finish, the vinyl name or `plain`, the rim design and size, the four add-on parts (or `stock`), the tint and stance values, and a plate (monospace). Use `h` and `button` from './uiKit' as garageLook.ts does. Cars without a saved loadout show `default`. A Back button at the end. No DOM outside the returned element, no listeners left behind, under 90 lines.

## Validation
Only `npm run build` can check it (no DOM test); also make sure it uses `store.data.loadouts` and `CARS` and nothing else from the store.

## Done when
`npm run build` passes, only `src/ui/loadoutList.ts` changed, the file is under 110 lines (one file, one short pass: if you are running out of room, finish fewer entries rather than cutting a line in half).
