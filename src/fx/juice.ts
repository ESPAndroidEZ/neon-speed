import type { Engine } from '../core/engine';
import { clamp, damp, smoothstep } from '../core/math';
import { grade } from '../core/grade';
import { qualityNow } from '../core/quality';
import { setLightGlow } from '../world/carLights';
import type { Game } from '../game/game';
import { WEATHER } from '../physics/weather';
import { createWeatherFx, type WeatherFx } from '../world/weatherFx';
import { ExhaustFx } from './exhaustFx';
import { FinalFx } from './finalFx';
import { HeadlightPool } from './headlights';
import { ParticlePool } from './particles';
import { SkidMarks } from './skidMarks';
import { TyreFx } from './tyreFx';

/** Visual feedback: tyre smoke / spray / powder, skid marks, sparks, flames, backfire, rain, snow, wind lines, shake, post fx. */
export class Juice {
  readonly weatherFx: WeatherFx;
  private readonly game: Game;
  private readonly engine: Engine;
  private readonly pools: ParticlePool[];
  private readonly smoke: ParticlePool;
  private readonly sparks: ParticlePool;
  private readonly splash: ParticlePool;
  private readonly skids: SkidMarks;
  private readonly tyres: TyreFx;
  private readonly exhaust: ExhaustFx;
  private readonly post: FinalFx;
  private readonly lights: HeadlightPool;
  private streak = 0;
  private wasNitro = false;
  private seenRace: unknown = null;
  private shown = false;
  private showClock = 0;
  private lastWeather = '';

  constructor(engine: Engine, game: Game) {
    this.game = game;
    this.engine = engine;
    this.smoke = new ParticlePool(engine.scene, { max: 1100, additive: false, gravity: 0.7, drag: 1.4 });
    this.sparks = new ParticlePool(engine.scene, { max: 400, additive: true, gravity: -9, drag: 0.4 });
    const flames = new ParticlePool(engine.scene, { max: 700, additive: true, gravity: 0.5, drag: 3 });
    this.splash = new ParticlePool(engine.scene, { max: 500, additive: false, gravity: -7, drag: 0.6 });
    this.pools = [this.smoke, this.sparks, flames, this.splash];
    this.skids = new SkidMarks(engine.scene);
    this.tyres = new TyreFx(this.smoke, this.skids);
    this.exhaust = new ExhaustFx(flames);
    this.post = new FinalFx(engine);
    this.lights = new HeadlightPool(engine.scene);
    this.weatherFx = createWeatherFx(engine.scene);
    engine.onFrame(this.frame);
  }

  /** Dev: toggle a continuous showcase of every effect around the player's car (key P). */
  toggleShowcase(): boolean {
    this.shown = !this.shown;
    this.weatherFx.setShowcase(this.shown);
    this.exhaust.forceNitro = this.shown;
    return this.shown;
  }

  /** Burst of water droplets, used for puddles and the showcase. */
  splashAt(x: number, z: number, vx: number, vz: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      const sp = 1.5 + Math.random() * 3.5;
      this.splash.emit(x, 0.1, z, vx * 0.3 + Math.cos(a) * sp, 2 + Math.random() * 4, vz * 0.3 + Math.sin(a) * sp, 0.5 + Math.random() * 0.5, 0.25, 0.1, 0.8, 0.9, 1, 0.8);
    }
  }

  private readonly frame = (_alpha: number, dt: number): void => {
    const g = this.game;
    const px = this.engine.renderer.domElement.clientHeight * this.engine.renderer.getPixelRatio();
    for (const pool of this.pools) pool.setScale(px * 0.9);
    if (this.seenRace !== g.rm) {
      this.seenRace = g.rm;
      this.skids.clear();
    }
    const player = g.views.views.find((v) => v.racer.isPlayer);
    for (const v of g.views.views) {
      this.tyres.update(v, dt, g.weather, this.shown && v === player ? 1 : 0);
      this.exhaust.update(v, dt);
    }
    if (this.shown && player) this.showcase(player, dt);
    if (player) g.chase.feedSlide(player.racer.car.state.slipAngle, player.racer.car.state.speed, dt); // big slides only
    for (const v of g.views.views) {
      const sp = Math.abs(v.racer.car.state.speed);
      if (v.racer.contact.surface.kind === 'puddle' && sp > 6) {
        const s = v.racer.car.state;
        this.splashAt(v.x + Math.sin(v.heading) * 1.5, v.z + Math.cos(v.heading) * 1.5, s.velocity.x, s.velocity.z, Math.ceil(sp * dt * 14 * qualityNow().particles) + 1);
      }
    }
    setLightGlow(grade.glowK);
    this.lights.update(g.views.views, g.state !== 'MENU');
    this.hits();
    this.screenFx(dt);
    if (g.weather !== this.lastWeather) {
      this.lastWeather = g.weather;
      this.weatherFx.setProfile(WEATHER[g.weather]);
    }
    this.weatherFx.setIntensity(g.state === 'MENU' ? 0 : g.weatherIntensity);
    this.weatherFx.update(dt, this.engine.camera, Math.abs(g.rm.player.car.state.speed));
    for (const pool of this.pools) pool.update(dt);
    this.skids.update(dt);
  };

  private showcase(v: NonNullable<ReturnType<Game['views']['views']['find']>>, dt: number): void {
    this.showClock += dt;
    if (this.showClock > 0.7) {
      this.showClock = 0;
      const sh = Math.sin(v.heading);
      const ch = Math.cos(v.heading);
      this.game.impact.strength = 14;
      this.game.impact.x = v.x + ch * 1.2 + sh * 2;
      this.game.impact.z = v.z - sh * 1.2 + ch * 2;
      this.splashAt(v.x - sh * 3 + ch * 2, v.z - ch * 3 - sh * 2, 0, 0, 30);
      v.racer.car.drivetrain.events.push(5, 0.9);
    }
  }

  /** Sparks, shake and bloom for the strongest hit since the last frame. */
  private hits(): void {
    const rub = this.game.rm.player.contact;
    if (rub.scrape > 4 && this.game.state === 'RACING') {
      const v = this.game.rm.player.car.state.velocity;
      for (let i = 0; i < 2; i++) this.sparks.emit(rub.contact.x, 0.3 + Math.random() * 0.4, rub.contact.z, -v.x * 0.3 + (Math.random() - 0.5) * 4, 1 + Math.random() * 3, -v.z * 0.3 + (Math.random() - 0.5) * 4, 0.25 + Math.random() * 0.3, 0.2, 0.06, 3.2, 1.8, 0.5, 1);
    }
    const imp = this.game.impact;
    if (imp.strength <= 0.8) {
      imp.strength = 0;
      return;
    }
    const k = clamp(imp.strength / 15, 0.1, 1);
    const count = Math.round(14 + k * 60);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 3 + Math.random() * 10 * (0.5 + k);
      this.sparks.emit(imp.x, 0.5 + Math.random() * 0.5, imp.z, Math.cos(a) * sp, 1 + Math.random() * 5, Math.sin(a) * sp, 0.35 + Math.random() * 0.6, 0.2, 0.06, 3.2, 1.8, 0.5, 1);
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
    const target = smoothstep(30, 80, Math.abs(p.state.speed)) * 0.6 + (nitro ? 0.4 : 0);
    this.streak = damp(this.streak, target, 3, dt);
    this.post.width = this.engine.renderer.domElement.width;
    this.post.update(dt, this.streak);
  }
}
