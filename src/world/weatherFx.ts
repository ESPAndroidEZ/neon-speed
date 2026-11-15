import { Vector3, type Camera, type InstancedBufferGeometry, type Mesh, type PerspectiveCamera, type PlaneGeometry, type Scene, type ShaderMaterial } from 'three';
import { qualityNow } from '../core/quality';
import { clamp } from '../core/math';
import type { Disposable, WeatherProfile } from '../types/game';
import { precipCover } from './precipCover';
import { createPrecipState, stepPrecip, wrapN, type PrecipBox, type PrecipState } from './precipMath';
import { makeDrops, makeSplashes, makeStreaks } from './precipMeshes';
import { WindLines } from './windLines';

export interface WeatherFx extends Disposable {
  /** Per display frame. `speed` = car speed (m/s) for wind lines. */
  update(frameDt: number, camera: PerspectiveCamera, speed: number): void;
  setProfile(p: WeatherProfile): void;
  /** 0..1 dynamic weather: rain / snow intensity ramps in over time. */
  setIntensity(k: number): void;
  /** Dev showcase: draw rain, snow and wind lines at full strength. */
  setShowcase(on: boolean): void;
  /** For tests: CPU state of the rain and snow volumes and every mesh (fixed pools). */
  readonly debug: { rain: PrecipState; snow: PrecipState; meshes: readonly Mesh<InstancedBufferGeometry | PlaneGeometry, ShaderMaterial>[] };
}

export const RAIN_BOX: PrecipBox = { sx: 40, sy: 22, sz: 40, ahead: 9, lift: 3 };
export const SNOW_BOX: PrecipBox = { sx: 36, sy: 20, sz: 36, ahead: 8, lift: 3 };
export const RAIN_N = 7000;
export const SNOW_N = 4500;
const SPLASH_N = 220;

type Pool = Mesh<InstancedBufferGeometry, ShaderMaterial>;

/**
 * Precipitation as one GPU system (see precipMath / precipShaders): fixed pools of instanced quads whose world
 * positions come from seeds + drift + wrap in the vertex shader. Rain = additive streaks stretched by speed relative
 * to the camera, with splash rings on the road; snow = soft flakes with turbulence; optional windscreen droplets.
 * Killed under tunnel roofs and in the player's car (precipCover). The CPU only writes a few uniforms per frame.
 */
export function createWeatherFx(scene: Scene): WeatherFx {
  let precip = 0;
  let name: WeatherProfile['name'] = 'CLEAR';
  let intensity = 1;
  let showcase = false;
  let gustT = 0;
  let splashClock = 0;
  let inside = 0;
  let main: Camera | null = null;
  const fwd = new Vector3();
  const rainS = createPrecipState();
  const snowS = createPrecipState();
  const rain: Pool = makeStreaks(RAIN_N, RAIN_BOX.sx, RAIN_BOX.sy, RAIN_BOX.sz, { color: 0x9fb4d8, alpha: 0.3, width: 0.011, exposure: 0.045, minLen: 0.35, maxLen: 2.0, turb: 0, round: 0, additive: true }, 11);
  const snow: Pool = makeStreaks(SNOW_N, SNOW_BOX.sx, SNOW_BOX.sy, SNOW_BOX.sz, { color: 0xe4ebf6, alpha: 0.8, width: 0.045, exposure: 0.012, minLen: 0, maxLen: 0.45, turb: 0.6, round: 1, additive: false }, 23);
  const splash: Pool = makeSplashes(SPLASH_N, 30, 30);
  const drops: Mesh<PlaneGeometry, ShaderMaterial> = makeDrops();
  const meshes: Mesh<InstancedBufferGeometry | PlaneGeometry, ShaderMaterial>[] = [rain, snow, splash, drops];
  const base = [0.3, 0.8, 0.25, 0];
  // reflections (road mirror) render the scene with another camera: precipitation is drawn for the main view only
  meshes.forEach((m, i) => {
    m.onBeforeRender = (_r, _s, cam) => {
      m.material.uniforms.uAlpha.value = cam === main ? base[i] : 0;
      m.material.uniformsNeedUpdate = true;
    };
  });
  const wind = new WindLines(scene);
  scene.add(rain, snow, splash, drops);

  const pushCover = (u: ShaderMaterial['uniforms']): void => {
    const c = precipCover;
    u.uCar.value.set(c.carX, c.carY, c.carZ, c.carR);
    u.uTunA.value.set(c.ax, c.az, c.mx, c.mz);
    u.uTunB.value.set(c.bx, c.bz, c.valid ? c.tunHalf : 0, c.tunTop);
  };
  const pushVolume = (m: Pool, s: PrecipState, cam: Vector3, fallX: number, fallY: number, fallZ: number, density: number, fov: number): void => {
    const u = m.material.uniforms;
    u.uCentre.value.set(s.cx, s.cy, s.cz);
    u.uDrift.value.set(s.dx, s.dy, s.dz);
    u.uCamPos.value.copy(cam);
    u.uRel.value.set(fallX - s.vx, fallY - s.vy, fallZ - s.vz);
    u.uTime.value = s.time;
    u.uDensity.value = density;
    u.uPix.value = (2 * Math.tan((fov * Math.PI) / 360)) / 620;
    pushCover(u);
  };

  return {
    debug: { rain: rainS, snow: snowS, meshes },
    setProfile(p) {
      name = p.name;
      precip = p.precipitation;
    },
    setIntensity(k) {
      intensity = clamp(k, 0, 1);
    },
    setShowcase(on) {
      showcase = on;
    },
    update(dt, camera, speed) {
      main = camera;
      const d = dt > 0 && dt < 0.25 ? dt : 1 / 60;
      gustT = wrapN(gustT + d, Math.PI * 100);
      const c = camera.position;
      camera.getWorldDirection(fwd);
      const q = qualityNow();
      const k = showcase ? 1 : intensity * Math.max(0.5, precip);
      const density = clamp(k * q.particles, 0, 1);
      const showRain = showcase || (name === 'RAIN' && intensity > 0.02);
      const showSnow = showcase || (name === 'SNOW' && intensity > 0.02);
      const gust = Math.sin(gustT * 0.4) * 0.9 + Math.sin(gustT * 1.3) * 0.4;
      inside += ((precipCover.valid ? precipCover.inside : 0) - inside) * (1 - Math.exp(-6 * d));

      const rfx = 1 + gust * 0.5;
      const rfz = 0.5;
      stepPrecip(rainS, RAIN_BOX, d, c.x, c.y, c.z, fwd.x, fwd.z, rfx, -13, rfz);
      rain.visible = showRain;
      splash.visible = showRain;
      if (showRain) {
        pushVolume(rain, rainS, c, rfx, -13, rfz, density, camera.fov);
        base[0] = 0.3;
        splashClock = wrapN(splashClock + d * 1.7, 1000);
        const u = splash.material.uniforms;
        const pc = precipCover;
        u.uCentre.value.set(rainS.cx, rainS.cy, rainS.cz);
        u.uClock.value = splashClock;
        u.uDensity.value = density;
        u.uCamPos.value.copy(c);
        u.uRoad.value.set(pc.rx, pc.ry, pc.rz, pc.valid ? pc.roadHalf : 0);
        u.uRoadT.value.set(pc.tx, pc.tz, pc.grade);
        pushCover(u);
      }

      const sfx = gust;
      const sfz = 0.4;
      stepPrecip(snowS, SNOW_BOX, d, c.x, c.y, c.z, fwd.x, fwd.z, sfx, -1.7, sfz);
      snow.visible = showSnow;
      if (showSnow) pushVolume(snow, snowS, c, sfx, -1.7, sfz, density, camera.fov);

      // windscreen droplets: faint, rain only, never in a tunnel
      const dropA = showRain && q.fx ? 0.1 * k * (1 - inside) : 0;
      base[3] = dropA;
      drops.visible = dropA > 0.004;
      const du = drops.material.uniforms;
      du.uTime.value = rainS.time;
      du.uAspect.value = camera.aspect;

      wind.update(d, rainS, speed, q.fx, showcase);
    },
    dispose() {
      for (const m of meshes) {
        scene.remove(m);
        m.geometry.dispose();
        m.material.dispose();
      }
      wind.dispose(scene);
    },
  };
}
