import { Color, type DirectionalLight, type HemisphereLight, type Mesh, type Object3D, type Scene, type ShaderMaterial } from 'three';
import type { SaveStore } from '../../core/save';

/** Free Drive time of day (docs/nfs-vision.md section 4): night is the game's own look; the others recolour the sky, fog and lights on top of it. */
export type Tod = 'night' | 'dusk' | 'dawn' | 'day';
export const TODS: readonly Tod[] = ['night', 'dusk', 'dawn', 'day'];

interface Preset { top: number; horizon: number; stars: number; moon: number; fog: number; fogW: number; fogK: number; hemiSky: number; hemiGround: number; hemiK: number; sun: number; sunK: number }
const P: Record<Exclude<Tod, 'night'>, Preset> = {
  dusk: { top: 0x2a2a70, horizon: 0xff7a3d, stars: 0.2, moon: 0.25, fog: 0xb4604f, fogW: 0.55, fogK: 0.9, hemiSky: 0xa8708f, hemiGround: 0x2a1a26, hemiK: 1.15, sun: 0xff9a5a, sunK: 1.1 },
  dawn: { top: 0x39508f, horizon: 0xffb0a0, stars: 0.1, moon: 0.1, fog: 0xd8a3a8, fogW: 0.55, fogK: 0.85, hemiSky: 0xb0a0c8, hemiGround: 0x2a2630, hemiK: 1.25, sun: 0xffc4a0, sunK: 1.2 },
  day: { top: 0x4f9bff, horizon: 0xcde6ff, stars: 0, moon: 0, fog: 0xb8d4ee, fogW: 0.85, fogK: 0.55, hemiSky: 0xcfe3ff, hemiGround: 0x607080, hemiK: 1.7, sun: 0xfff2dc, sunK: 1.9 },
};

const mix = new Color();

/**
 * Recolours the live scene: the sky dome's uniforms, the hemisphere and moon lights, and (through `fog`, read by
 * districtFog) the fog. The base values are read when an override starts and after every weather change (`rebase`).
 * Night does nothing at all. Allocation free per frame.
 */
export class TimeOfDay {
  tod: Tod;
  /** What districtFog reads: the colour to lean toward, how far (0 = not at all) and a factor on the density. */
  readonly fog = { color: new Color(), w: 0, k: 1 };
  private readonly scene: Scene;
  private readonly store: SaveStore;
  private sky: ShaderMaterial | null = null;
  private hemi: HemisphereLight | null = null;
  private sun: DirectionalLight | null = null;
  private base: { hemi: number; sun: number; sunColor: number; sky: number; ground: number } | null = null;
  private blend = 0;

  constructor(scene: Scene, store: SaveStore) {
    this.scene = scene;
    this.store = store;
    this.tod = TODS.includes(store.data.settings.tod) ? store.data.settings.tod : 'night';
  }

  set(t: Tod): void {
    this.tod = t;
    this.store.data.settings.tod = t;
    this.store.commit();
    this.restore(); // the lights go back to their own values first, so the next override reads the true base
  }

  cycle(): Tod {
    this.set(TODS[(TODS.indexOf(this.tod) + 1) % TODS.length]);
    return this.tod;
  }

  /** After a weather change reset the lights: read their new base values. */
  rebase(): void { this.base = null; }

  /** Put the lights back to what they were before the override (the sky colours come back with the next `setWeather`). */
  restore(): void {
    const b = this.base;
    if (b && this.hemi && this.sun) {
      this.hemi.color.setHex(b.sky); this.hemi.groundColor.setHex(b.ground); this.hemi.intensity = b.hemi;
      this.sun.color.setHex(b.sunColor); this.sun.intensity = b.sun;
    }
    this.base = null; this.blend = 0; this.fog.w = 0; this.fog.k = 1;
  }

  /** Leaving Free Drive: the lights are restored here, the caller re-applies the weather (sky and fog). */
  reset(): void { this.restore(); }

  update(dt: number): void {
    if (this.tod === 'night') { this.fog.w = 0; this.fog.k = 1; return; }
    if (!this.find()) return;
    const p = P[this.tod as Exclude<Tod, 'night'>];
    this.blend = Math.min(1, this.blend + dt * 0.8);
    const hemi = this.hemi as HemisphereLight, sun = this.sun as DirectionalLight, sky = this.sky as ShaderMaterial;
    if (!this.base) this.base = { hemi: hemi.intensity, sun: sun.intensity, sunColor: sun.color.getHex(), sky: hemi.color.getHex(), ground: hemi.groundColor.getHex() };
    const b = this.base, k = this.blend;
    const u = sky.uniforms;
    (u.top.value as Color).lerp(mix.setHex(p.top), 0.12 * k + 0.02);
    (u.horizon.value as Color).lerp(mix.setHex(p.horizon), 0.12 * k + 0.02);
    u.stars.value += (p.stars - u.stars.value) * 0.1;
    u.moon.value += (p.moon - u.moon.value) * 0.1;
    hemi.color.setHex(b.sky).lerp(mix.setHex(p.hemiSky), k);
    hemi.groundColor.setHex(b.ground).lerp(mix.setHex(p.hemiGround), k);
    hemi.intensity = b.hemi * (1 + (p.hemiK - 1) * k);
    sun.color.setHex(b.sunColor).lerp(mix.setHex(p.sun), k);
    sun.intensity = b.sun * (1 + (p.sunK - 1) * k);
    this.fog.color.setHex(p.fog);
    this.fog.w = p.fogW * k;
    this.fog.k = 1 + (p.fogK - 1) * k;
  }

  /** The sky dome and the lights of the loaded map (found once; the world swaps them when a map loads). */
  private find(): boolean {
    if (this.sky && this.hemi && this.sun && this.hemi.parent === this.scene) return true;
    this.sky = this.hemi = this.sun = null;
    for (const c of this.scene.children as Object3D[]) {
      if (c.type === 'HemisphereLight') this.hemi = c as HemisphereLight;
      else if (c.type === 'DirectionalLight' && !this.sun) this.sun = c as DirectionalLight;
      else if (c.type === 'Group') c.traverse((o) => { const m = (o as Mesh).material as ShaderMaterial | undefined; if (m && m.uniforms && m.uniforms.horizon && m.uniforms.stars) this.sky = m; });
    }
    return !!(this.sky && this.hemi && this.sun);
  }
}
