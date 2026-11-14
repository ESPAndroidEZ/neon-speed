import { Color, FogExp2 } from 'three';
import type { Engine } from '../core/engine';
import { setGrade } from '../core/grade';
import { qualityNow } from '../core/quality';
import { WEATHER } from '../physics/weather';
import type { Weather } from '../types/game';
import type { Hud } from '../ui/hud';
import type { World } from '../world/world';

const bg = new Color();

/** Push a weather into fog, background, HUD label and the world's materials. */
export function applyWeather(engine: Engine, hud: Hud, world: World, w: Weather): void {
  const p = WEATHER[w];
  const fog = engine.scene.fog;
  if (fog instanceof FogExp2) {
    fog.density = p.fogDensity;
    fog.color.setHex(p.fogColor);
  }
  engine.scene.background = bg.setHex(p.fogColor);
  const g = setGrade(w);
  engine.renderer.toneMappingExposure = g.exposure;
  engine.setBloom({ strength: qualityNow().bloomStrength * g.bloomK, threshold: g.bloomThreshold });
  hud.setWeather(w);
  world.setWeather(p);
}
