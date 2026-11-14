# Task 007: vinyl decal textures
Files: src/world/vinyls.ts
Branch: qwen/007-vinyls
Contract (read-only): none. Imports only from `three`.

## Export exactly
```ts
export type VinylKind = 'stripes' | 'flames' | 'checker' | 'tribal' | 'roundel';
export const VINYL_KINDS: readonly VinylKind[];
export interface VinylColors { primary: string; secondary: string }   // CSS colours, e.g. '#ff2a9d'
export interface VinylOptions { size?: number; number?: number }       // size in px, default 512; number is printed in the roundel
export function createVinylTexture(kind: VinylKind, colors: VinylColors, opts?: VinylOptions): CanvasTexture;
```

## Behaviour
- Draw with the 2D canvas API into a transparent square canvas (`document.createElement('canvas')`), return `new CanvasTexture(canvas)` with `colorSpace = SRGBColorSpace`, `wrapS = wrapT = ClampToEdgeWrapping`, `anisotropy = 4`, `needsUpdate = true`. Background stays transparent so the texture works as a decal on top of car paint.
- `stripes`: two parallel racing stripes down the centre (primary wide, secondary thin on each side), slightly tapered at both ends.
- `flames`: five tongues rising from the bottom edge, primary body with a secondary inner flame and a soft gradient.
- `checker`: a band of a checkered flag pattern across the middle, 8 squares tall, fading out at the left and right edges.
- `tribal`: a symmetric curved blade pattern built from bezier paths, filled primary with a secondary outline.
- `roundel`: a filled circle (primary) with a ring (secondary) and the number centred in bold sans-serif (white text, secondary outline); default number 7.
- Pure functions, no module state, no `any`. Draw helpers may live in the same file (keep under 220 lines).

## Done when
`npm run build` passes, the file is under 220 lines, only the listed file changed.
