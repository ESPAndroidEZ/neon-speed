import { LOOK_CONFIG } from '../render/lookConfig';
import { Color, FogExp2 } from 'three';
import type { Engine } from '../core/engine';
import { setGrade } from '../core/grade';
import { look } from '../core/looks';
import { paletteOf } from '../data/palettes';
import { qualityNow } from '../core/quality';
import { WEATHER } from '../physics/weather';
import type { Weather } from '../types/game';
import type { Hud } from '../ui/hud';
import type { World } from '../world/world';

const bg = new Color();
const tint = new Color();

/** Push a weather into fog, background, HUD label and the world's materials. */
export function applyWeather(engine: Engine, hud: Hud, world: World, w: Weather): void {
  const p = WEATHER[w];
  const fog = engine.scene.fog;
  // district tint on the weather fog, scaled by the look
  bg.setHex(p.fogColor).lerp(tint.setHex(paletteOf(world.def.id).fog), 0.55);
  if (fog instanceof FogExp2) {
    fog.density = p.fogDensity * look.fogK * LOOK_CONFIG.fog.densityScale;
    fog.color.copy(bg);
  }
  engine.scene.background = bg;
  const g = setGrade(w);
  engine.renderer.toneMappingExposure = g.exposure * look.exposure;
  engine.setBloom({ strength: qualityNow().bloomStrength * g.bloomK * look.bloomK * LOOK_CONFIG.bloom.strength, radius: LOOK_CONFIG.bloom.radius, threshold: Math.max(g.bloomThreshold, LOOK_CONFIG.bloom.threshold) });
  hud.setWeather(w);
  world.setWeather(p);
}
