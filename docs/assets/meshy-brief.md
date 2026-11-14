# Meshy brief (free tier): optional prop GLBs

Props are optional. Without them the procedural props are used. Drop GLBs into `public/models/props/`; they are loaded automatically, normalised (scaled to the size below, centred, ground at y = 0) and instanced.

| File | What | Target size | Where it is used |
|------|------|-------------|------------------|
| `lamp.glb` | Street lamp post with a hanging lamp head | 6.5 m tall | every lamp position along the walls (replaces the procedural lamp head) |
| `container.glb` | Shipping container | 6.1 m long (long axis Z) | dock container stacks (replaces the procedural boxes) |
| `kiosk.glb` | Newsstand / street kiosk | 2.8 m tall | two spots on the plaza island |
| `sign.glb` | Neon shop sign board | 2 m tall | reserved (not placed yet) |

Prompts (text to 3D, game-ready low poly, PBR, GLB, no text or logos):
- Lamp: `old industrial harbour street lamp post, dark metal, single curved arm with a rectangular lamp head, low poly`
- Container: `weathered shipping container, corrugated sides, rust streaks, plain colour, low poly`
- Kiosk: `small street newsstand kiosk, metal shutter, awning, neon sign strip, low poly`
- Sign: `rectangular neon shop sign board with a metal frame, blank face, low poly`

Orientation and scale do not matter. Keep each under about 20k triangles and 1024 px textures (`scripts/optimize-models.sh public/models/props` shrinks them).
Check Meshy's current free-tier terms: if outputs are public or need attribution, add the credit to the README before sharing the demo.
