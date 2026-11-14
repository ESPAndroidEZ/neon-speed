import type { Engine } from '../core/engine';
import { clamp, damp, smoothstep } from '../core/math';
import type { Game } from '../game/game';
import type { RacerView } from '../game/racerViews';
import { ParticlePool } from './particles';
import { SkidMarks } from './skidMarks';
import { FinalFx } from './finalFx';
import { HeadlightPool } from './headlights';

/** Visual feedback: tyre smoke, skid marks, barrier sparks, nitro flames, speed streaks, shake and bloom kicks. */
export class Juice {
  private readonly game: Game;
  private readonly engine: Engine;
  private readonly smoke: ParticlePool;
  private readonly sparks: ParticlePool;
  private readonly flames: ParticlePool;
  private readonly skids: SkidMarks;
  private readonly speed: FinalFx;
  private readonly lights: HeadlightPool;
  private readonly last = new WeakMap<RacerView, Float32Array>();
  private readonly acc = new WeakMap<RacerView, number>();
  private streak = 0;
  private seenRace: unknown = null;
  private wasNitro = false;

  constructor(engine: Engine, game: Game) {
    this.game = game;
    this.engine = engine;
    this.smoke = new ParticlePool(engine.scene, { max: 700, additive: false, gravity: 0.7, drag: 1.4 });
    this.sparks = new ParticlePool(engine.scene, { max: 300, additive: true, gravity: -9, drag: 0.4 });
    this.flames = new ParticlePool(engine.scene, { max: 300, additive: true, gravity: 0.5, drag: 3 });
    this.skids = new SkidMarks(engine.scene);
    this.speed = new FinalFx(engine);
    this.lights = new HeadlightPool(engine.scene);
    engine.onFrame(this.frame);
  }

  clear(): void {
    this.skids.clear();
  }

  private readonly frame = (_alpha: number, dt: number): void => {
    if (this.seenRace !== this.game.rm) {
      this.seenRace = this.game.rm;
      this.skids.clear();
    }
    const px = this.engine.renderer.domElement.clientHeight * this.engine.renderer.getPixelRatio();
    for (const pool of [this.smoke, this.sparks, this.flames]) pool.setScale(px * 0.9);
    const wet = this.game.weather === 'RAIN' ? 0.6 : 1;
    for (const v of this.game.views.views) {
      this.wheels(v, dt, wet);
      this.nitro(v, dt);
    }
    this.lights.update(this.game.views.views);
    this.hits();
    this.screenFx(dt);
    this.smoke.update(dt);
    this.sparks.update(dt);
    this.flames.update(dt);
    this.skids.flush();
  };

  /** Smoke and skid marks from the rear tyres, scaled by how hard they slide. */
  private wheels(v: RacerView, dt: number, wet: number): void {
    const car = v.racer.car;
    const s = car.state;
    const speed = Math.abs(s.speed);
    let k = 0;
    if (speed > 4) k = Math.max(k, smoothstep(0.12, 0.5, Math.abs(s.slipAngle)));
    if (car.flags.wheelspin) k = Math.max(k, 0.6);
    if (car.flags.handbrake && speed > 6) k = Math.max(k, 0.9);
    if (car.flags.braking && speed > 14) k = Math.max(k, 0.3);
    let last = this.last.get(v);
    if (!last) {
      last = new Float32Array(5); // x0 z0 x1 z1 wasSliding
      this.last.set(v, last);
    }
    const sh = Math.sin(v.heading);
    const ch = Math.cos(v.heading);
    const wheels = v.visual.rearWheels;
    let emit = (this.acc.get(v) ?? 0) + k * 55 * dt;
    for (let i = 0; i < wheels.length; i++) {
      const lx = wheels[i].position.x;
      const lz = wheels[i].position.z;
      const wx = v.x + ch * lx + sh * lz;
      const wz = v.z - sh * lx + ch * lz;
      if (k > 0.25 && last[4] === 1) this.skids.add(last[i * 2], last[i * 2 + 1], wx, wz, clamp(k, 0, 1) * 0.8 * wet);
      last[i * 2] = wx;
      last[i * 2 + 1] = wz;
      if (emit >= 1 && k > 0.12) {
        const n = Math.floor(emit / wheels.length) + 1;
        for (let j = 0; j < n; j++) this.smoke.emit(wx, 0.15, wz, s.velocity.x * 0.2 + (Math.random() - 0.5) * 1.2, 0.3 + Math.random() * 0.6, s.velocity.z * 0.2 + (Math.random() - 0.5) * 1.2, 0.9 + Math.random() * 0.7, 0.5, 2.8 + k, 0.78, 0.8, 0.85, 0.32 * k + 0.08);
      }
    }
    if (emit >= 1) emit = 0;
    this.acc.set(v, emit);
    last[4] = k > 0.25 ? 1 : 0;
  }

  private nitro(v: RacerView, dt: number): void {
    if (!v.racer.car.drivetrain.nitroActive) return;
    const s = v.racer.car.state;
    const sh = Math.sin(v.heading);
    const ch = Math.cos(v.heading);
    for (const e of v.visual.exhaust) {
      const wx = v.x + ch * e.position.x + sh * e.position.z;
      const wz = v.z - sh * e.position.x + ch * e.position.z;
      const n = Math.max(1, Math.round(dt * 120));
      for (let i = 0; i < n; i++) {
        const sp = 7 + Math.random() * 6;
        this.flames.emit(wx, e.position.y, wz, s.velocity.x - sh * sp, 0.2, s.velocity.z - ch * sp, 0.16 + Math.random() * 0.12, 0.55, 0.12, 0.5, 0.9, 3.2, 0.9);
        this.flames.emit(wx, e.position.y, wz, s.velocity.x - sh * sp * 0.6, 0.3, s.velocity.z - ch * sp * 0.6, 0.12, 0.35, 0.05, 3.2, 1.3, 0.3, 0.8);
      }
    }
  }

  /** Sparks, shake and bloom for the strongest hit since the last frame. */
  private hits(): void {
    const imp = this.game.impact;
    if (imp.strength <= 0.8) {
      imp.strength = 0;
      return;
    }
    const k = clamp(imp.strength / 15, 0.1, 1);
    const count = Math.round(8 + k * 40);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 3 + Math.random() * 9 * (0.5 + k);
      this.sparks.emit(imp.x, 0.5 + Math.random() * 0.4, imp.z, Math.cos(a) * sp, 1 + Math.random() * 4, Math.sin(a) * sp, 0.3 + Math.random() * 0.5, 0.16, 0.05, 3, 1.7, 0.5, 1);
    }
    this.game.chase.addShake(k * 0.9);
    this.engine.kickBloom(k * 0.6);
    imp.strength = 0;
  }

  private screenFx(dt: number): void {
    const p = this.game.rm.player.car;
    const nitro = p.drivetrain.nitroActive;
    if (nitro && !this.wasNitro) this.engine.kickBloom(0.8);
    this.wasNitro = nitro;
    const target = smoothstep(32, 85, Math.abs(p.state.speed)) * 0.55 + (nitro ? 0.4 : 0);
    this.streak = damp(this.streak, target, 3, dt);
    this.speed.update(dt, this.streak);
  }
}
