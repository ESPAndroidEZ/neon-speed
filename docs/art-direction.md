# Art direction: Neon Speed

Mood: wet reflective night streets, saturated neon, strong contrast, layered depth, glossy cars, light streaks, gritty industrial detail.
The feel of the late-2000s underground street-racing games, with ORIGINAL assets only: nothing copied, fictional brands everywhere
except the licensed cars in `data/cars.ts`. Everything is procedural (canvas textures, instanced geometry); GLBs are optional upgrades.

## 1. Palette per district
| District / map | Key light | Accent 1 | Accent 2 | Shadow tint | Notes |
|---|---|---|---|---|---|
| Neon Strip (downtown) | magenta `#ff2a9d` | cyan `#18d8ff` | violet `#7a2fd6` | deep blue `#0a0c24` | tall glass and signage, wet boulevards, tram rails reflect cyan |
| Harbor (Kestrel Bay, docks) | sodium orange `#ff9a2e` | teal `#1fb5a8` | red aircraft lights `#ff2020` | brown-black `#120c08` | rust, containers, steam, cranes |
| Cliffside (north coast) | cold blue moon `#8fa4ff` | amber reflectors `#ffa030` | white foam `#e8f0ff` | ink `#05070f` | open sky, ocean, lighthouse, no street lamps |
| Old Town (reserved) | warm yellow `#ffd27d` | brick red `#b3262b` | green neon `#39ff88` | warm black `#140e0a` | narrow, tight, laundry lines, tungsten windows |
| Container Maze (port yard) | sodium orange | signal yellow `#e0b020` | cyan floodlight `#9fe8ff` | steel `#0c1016` | hard floodlights, container colour blocks |
Rule: every frame has ONE dominant hue (the district key light), ONE complementary accent, and the rest is dark blue-black.

## 2. Look presets (`src/core/looks.ts`, switch with `?look=` or Settings > Graphics > Look)
- **Neon Night** (default): saturated magenta/cyan (saturation 1.6), bloom 0.9, exposure 1.0, crushed blacks, strong env reflections on wet road.
- **Dusk Heat**: blue-orange split toning, a warm horizon band in the sky, lower fog density, bloom 0.7, exposure 1.15.
- **Overcast Grit**: desaturated, low contrast sky, heavier fog, grain up, bloom 0.5, concrete and rust read stronger.
Weather multiplies a preset (rain: darker, glossier, cooler; snow: brighter ambient, lower saturation) and never breaks the quality bars below.
Weather grade exposure (`core/grade.ts`, raised 2026-11-15 because nights were too dark): CLEAR 1.0, RAIN 0.9, SNOW 0.76; city hemisphere fill 2.3.

## 3. Lighting rules
1. Lights tell the story: lamps, signs, tail lights and headlights are the ONLY bright things. Walls and sky stay dark.
2. Every emissive surface is `MeshBasicMaterial` colour x 2..4 (HDR) so bloom picks it up. Ambient fill is brighter since 2026-11-15 (owner: nights too dark) but walls still read darker than the lights.
3. Warm key (lamps) against cool fill (moon/sky) in city maps; reverse in Cliffside.
4. Wet look = low roughness (0.15..0.3), env reflections, additive light pools and neon streaks on the road, puddle mirrors.
5. Depth layers: foreground kerb detail, mid street and facades, far skyline silhouettes in 2 fog layers, sky glow at the horizon.
6. Never flat black: shadows are tinted by the district shadow colour, never below luminance 0.02.

## 4. Material rules
- Facades: PBR-style canvas textures (albedo + roughness + normal) in brick, concrete, metal, glass. Window atlas: 60% unlit, 30% warm, 10% neon, some flicker.
- Road: dark asphalt, albedo noise, patches, lane paint with low roughness, tram rails metallic.
- Cars: clearcoat body (clearcoat 1, roughness 0.2..0.35), glass with env reflections, chrome rims, emissive lights; finishes gloss, metallic, pearl, matte, chrome, colour-shift.
- Props: weathered metal and plastic; grime via vertex colour fake AO (darker at the base, near the ground).
- Car models (Blender, `blender/cars/`): the Supra is the quality bar. Real cut wheel arches, wheels flush with the flank, lights/grille/wings seated ON the body (`rb.lamp`, `rb.surface_z`), one `paint` material, under 30k triangles. Number plates (fictional Kestrel Bay plate, owner text) are seated on each bumper at the centre line.
- Tyre smoke: subtle. Grey (about 0.6), under the bloom threshold, max size ~1.7 m in the dry; never white puffs that glow.

## 5. What makes it look great (checklist, review every map screenshot against it)
- [ ] One clear dominant hue, one accent, dark blue-black rest. Contrast: bright neon against near-black.
- [ ] At least three emissive accents in every view (signs, lamps, tail lights, neon rails).
- [ ] Wet reflections visible: road mirrors lights and signs; puddles in rain.
- [ ] Depth: foreground detail, mid facades, far silhouettes in fog, sky glow behind them.
- [ ] Motion: light streaks and tail-light trails at speed, speed lines at the edge, heat haze at exhausts, flicker on neon.
- [ ] Facades are not boxes: floors, balconies, AC units, fire escapes, awnings, roof clutter, a billboard or two.
- [ ] Cars read: a specular edge on the body, glass reflections, glowing lights, underglow on the road.
- [ ] Grit: graffiti, patched asphalt, manholes, cables, steam, trash, cones.
- [ ] Nothing white-clipped (bloom tamed), nothing pure black.

## 6. Quality bars (`npm run visual`, per look preset and weather)
Mean luminance 0.10..0.50 clear, 0.08..0.36 bad weather; clipped pixels < 2%; local contrast (std dev near the car) > 0.08;
saturation (mean chroma of the brightest 5% pixels) > 0.20 in Neon Night (target 0.30: raise the bar as the lights get more saturated). A new look or weather must pass before merging.

## 7. Budgets per tier
| Tier | Render scale | Draw calls | Triangles | Shadows | Reflections | Post | Particles |
|---|---|---|---|---|---|---|---|
| Low (phones) | 0.7 | < 250 | < 250k | off | env map only | bloom lite | 30% |
| Medium | 0.85 | < 400 | < 500k | 1024 map | env + puddles | bloom + vignette | 60% |
| High | 1.0 | < 600 | < 900k | 2048 map | env + planar mirror in rain | full grade, streaks, DoF in garage | 100% |
| Ultra | native DPR | < 900 | < 1.4M | 4096 map | planar + SSR-like fake | + haze, motion blur | 150% |
Auto quality lowers the render resolution in 10 % steps (to 60 %) before dropping a tier. Cars merge their static meshes by material (~40 draw calls per car). Geometry is merged per 150 m chunk, instanced props, distance LOD, chunks outside 450 m culled (Low 250 m). Window flicker is one uniform, not per-window logic.

## Neon Harbor districts (W5.2, 2026-11-20)
Facades: downtown glass, strip concrete with the brightest windows (1.5x), harbour and industrial metal, old town and hills brick. Fog: `DISTRICT_LOOK` colour, tinted 55 % into the weather fog (same rule as races). Street lights every 34 m on alternating sides, light pools in the district's lamp colour (opacity 0.46, 0.62 in the sparse harbour, industrial and hills). Pool colour = lamp colour blended 35 % toward warm white 0xffe6c8. Shop signs: 75 % of Strip fronts, 35 % old town, 25 % downtown, 10 % harbour, 5 % industrial, none in the hills; 3.6-6 m up, 2:1. Readability bands are the same as races (`npm run visual` city cases).
