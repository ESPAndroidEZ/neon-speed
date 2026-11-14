import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, InstancedMesh, LineBasicMaterial, LineSegments, MeshBasicMaterial, Object3D, Points, PointsMaterial, RingGeometry, type PerspectiveCamera, type Scene } from 'three';
import { qualityNow } from '../core/quality';
import { clamp, smoothstep } from '../core/math';
import type { Disposable, WeatherProfile } from '../types/game';
import { makePoolTexture } from './textures';

export interface WeatherFx extends Disposable {
  /** Per display frame. `speed` = car speed (m/s) for wind streaks. Particles live in a box around the camera. */
  update(frameDt: number, camera: PerspectiveCamera, speed: number): void;
  setProfile(p: WeatherProfile): void;
  /** 0..1 dynamic weather: rain / snow intensity ramps in over time. */
  setIntensity(k: number): void;
  /** Dev showcase: draw rain, snow and wind lines at full strength. */
  setShowcase(on: boolean): void;
}

const W = 44;
const H = 26;
const RAIN = 5000;
const SNOW = 3600;
const RIPPLES = 110;
const WIND = 160;
const wrap = (v: number, n: number): number => ((v % n) + n) % n;

/**
 * Rain streaks with splash ripples on the road, snow flakes with turbulence, and wind lines at high speed.
 * Fixed-size buffers, no allocation per frame; counts follow the quality tier and the weather intensity.
 */
export function createWeatherFx(scene: Scene): WeatherFx {
  let precip = 0;
  let name: WeatherProfile['name'] = 'CLEAR';
  let intensity = 1;
  let showcase = false;
  let t = 0;
  const last = { x: 0, y: 0, z: 0, set: false };

  // ── rain: line segments (local box coordinates, shifted against camera motion so drops stay put in the world)
  const rl = new Float32Array(RAIN * 3);
  for (let i = 0; i < RAIN; i++) rl.set([Math.random() * W, Math.random() * H, Math.random() * W], i * 3);
  const rainPos = new Float32Array(RAIN * 6);
  const rainGeo = new BufferGeometry();
  rainGeo.setAttribute('position', new BufferAttribute(rainPos, 3).setUsage(35048));
  const rain = new LineSegments(rainGeo, new LineBasicMaterial({ color: new Color(0xaabfe8), transparent: true, opacity: 0.3, depthWrite: false, blending: AdditiveBlending }));
  rain.frustumCulled = false;
  rain.visible = false;

  // ── snow: points
  const sl = new Float32Array(SNOW * 3);
  const sp = new Float32Array(SNOW); // sway phase
  for (let i = 0; i < SNOW; i++) {
    sl.set([Math.random() * W, Math.random() * H, Math.random() * W], i * 3);
    sp[i] = Math.random() * 6.28;
  }
  const snowPos = new Float32Array(SNOW * 3);
  const snowGeo = new BufferGeometry();
  snowGeo.setAttribute('position', new BufferAttribute(snowPos, 3).setUsage(35048));
  const snow = new Points(snowGeo, new PointsMaterial({ map: makePoolTexture(), color: 0xffffff, size: 0.27, sizeAttenuation: true, transparent: true, opacity: 0.72, depthWrite: false }));
  snow.frustumCulled = false;
  snow.visible = false;

  // ── splash ripples on the road
  const ripMat = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, blending: AdditiveBlending });
  const ripples = new InstancedMesh(new RingGeometry(0.1, 0.15, 14).rotateX(-Math.PI / 2), ripMat, RIPPLES);
  ripples.frustumCulled = false;
  ripples.visible = false;
  const rx = new Float32Array(RIPPLES);
  const rz = new Float32Array(RIPPLES);
  const ra = new Float32Array(RIPPLES).fill(9);
  let rHead = 0;
  let rAcc = 0;
  const dummy = new Object3D();
  const rc = new Color();

  // ── wind lines
  const wl = new Float32Array(WIND * 3);
  for (let i = 0; i < WIND; i++) wl.set([(Math.random() - 0.5) * 16, 0.5 + Math.random() * 7, Math.random() * 30 - 8], i * 3);
  const windPos = new Float32Array(WIND * 6);
  const windGeo = new BufferGeometry();
  windGeo.setAttribute('position', new BufferAttribute(windPos, 3).setUsage(35048));
  const windMat = new LineBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending });
  const wind = new LineSegments(windGeo, windMat);
  wind.frustumCulled = false;
  let heading = 0;

  scene.add(rain, snow, ripples, wind);

  return {
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
      t += dt;
      const c = camera.position;
      const dx = last.set ? c.x - last.x : 0;
      const dy = last.set ? c.y - last.y : 0;
      const dz = last.set ? c.z - last.z : 0;
      last.x = c.x;
      last.y = c.y;
      last.z = c.z;
      last.set = true;
      const q = qualityNow().particles;
      const showRain = showcase || (name === 'RAIN' && intensity > 0.02);
      const showSnow = showcase || (name === 'SNOW' && intensity > 0.02);
      rain.visible = showRain;
      snow.visible = showSnow;
      ripples.visible = showRain;
      const k = showcase ? 1 : intensity * Math.max(0.5, precip);
      const sdx = clamp(dx, -3, 3);
      const sdz = clamp(dz, -3, 3);

      if (showRain) {
        const n = Math.floor(RAIN * k * q);
        const slantX = -clamp(dx / Math.max(dt, 1e-3), -90, 90) * 0.012 + 0.25;
        const slantZ = -clamp(dz / Math.max(dt, 1e-3), -90, 90) * 0.012;
        for (let i = 0; i < n; i++) {
          const o = i * 3;
          rl[o] = wrap(rl[o] - sdx, W);
          rl[o + 1] = wrap(rl[o + 1] - dy - 24 * dt, H);
          rl[o + 2] = wrap(rl[o + 2] - sdz, W);
          const x = c.x + rl[o] - W / 2;
          const y = c.y + rl[o + 1] - H / 2 + 6;
          const z = c.z + rl[o + 2] - W / 2;
          const p6 = i * 6;
          rainPos[p6] = x; rainPos[p6 + 1] = y; rainPos[p6 + 2] = z;
          rainPos[p6 + 3] = x + slantX; rainPos[p6 + 4] = y + 0.9; rainPos[p6 + 5] = z + slantZ;
        }
        rainGeo.setDrawRange(0, n * 2);
        rainGeo.attributes.position.needsUpdate = true;
        // ripples: spawn on the road around the camera, grow and fade
        rAcc += dt * 140 * k * q;
        while (rAcc >= 1) {
          rAcc -= 1;
          rx[rHead] = c.x + (Math.random() - 0.5) * 36;
          rz[rHead] = c.z + (Math.random() - 0.5) * 36;
          ra[rHead] = 0;
          rHead = (rHead + 1) % RIPPLES;
        }
        for (let i = 0; i < RIPPLES; i++) {
          ra[i] += dt * 2.2;
          const a = ra[i];
          const live = a < 1;
          dummy.position.set(rx[i], 0.05, rz[i]);
          dummy.scale.setScalar(live ? 0.7 + a * 3.2 : 0.0001);
          dummy.updateMatrix();
          ripples.setMatrixAt(i, dummy.matrix);
          ripples.setColorAt(i, rc.setScalar(live ? (1 - a) * 0.9 : 0));
        }
        ripples.instanceMatrix.needsUpdate = true;
        if (ripples.instanceColor) ripples.instanceColor.needsUpdate = true;
      }

      if (showSnow) {
        const n = Math.floor(SNOW * k * q);
        const gust = Math.sin(t * 0.4) * 0.9 + Math.sin(t * 1.3) * 0.4; // wind gusts
        for (let i = 0; i < n; i++) {
          const o = i * 3;
          const ph = sp[i];
          sl[o] = wrap(sl[o] - sdx + (Math.sin(t * 0.9 + ph) * 0.9 + gust) * dt, W);
          sl[o + 1] = wrap(sl[o + 1] - dy - (1.9 + Math.sin(ph * 3 + t) * 0.4) * dt, H);
          sl[o + 2] = wrap(sl[o + 2] - sdz + Math.cos(t * 0.7 + ph) * 0.8 * dt, W);
          snowPos[o] = c.x + sl[o] - W / 2;
          snowPos[o + 1] = c.y + sl[o + 1] - H / 2 + 6;
          snowPos[o + 2] = c.z + sl[o + 2] - W / 2;
        }
        snowGeo.setDrawRange(0, n);
        snowGeo.attributes.position.needsUpdate = true;
      }

      // wind lines: white streaks racing past the camera, only at high speed
      const vis = showcase ? 1 : smoothstep(34, 70, speed);
      windMat.opacity = vis * 0.5;
      wind.visible = vis > 0.02 && qualityNow().fx;
      if (wind.visible) {
        const len = 1.5 + speed * 0.08;
        const mx = Math.hypot(dx, dz) > 0.02 ? dx : Math.sin(heading);
        const mz = Math.hypot(dx, dz) > 0.02 ? dz : Math.cos(heading);
        const ml = Math.hypot(mx, mz) || 1;
        const fx = mx / ml;
        const fz = mz / ml;
        heading = Math.atan2(fx, fz);
        for (let i = 0; i < WIND; i++) {
          const o = i * 3;
          wl[o + 2] -= (speed * 1.6 + 8) * dt;
          if (wl[o + 2] < -10) wl[o + 2] += 40;
          const lx = wl[o];
          const lz = wl[o + 2];
          const wx = c.x + fz * lx + fx * lz;
          const wz = c.z - fx * lx + fz * lz;
          const p6 = i * 6;
          windPos[p6] = wx; windPos[p6 + 1] = wl[o + 1]; windPos[p6 + 2] = wz;
          windPos[p6 + 3] = wx + fx * len; windPos[p6 + 4] = wl[o + 1]; windPos[p6 + 5] = wz + fz * len;
        }
        windGeo.attributes.position.needsUpdate = true;
      }
    },
    dispose() {
      for (const o of [rain, snow, ripples, wind]) {
        scene.remove(o);
        o.geometry.dispose();
      }
    },
  };
}
