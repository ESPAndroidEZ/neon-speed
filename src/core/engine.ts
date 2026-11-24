import { LOOK_CONFIG } from '../render/lookConfig';
import {
  ACESFilmicToneMapping,
  Color,
  FogExp2,
  HalfFloatType,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  Vector2,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { Disposable, FixedUpdate, FrameCallback } from '../types/game';
import { clamp, damp } from './math';
import { watchViewport } from './viewport';

export interface BloomSettings {
  enabled: boolean;
  strength: number;
  radius: number;
  /** Luminance above which pixels bloom. The pipeline is HDR, so emissive > 1 glows. */
  threshold: number;
}

export interface EngineOptions {
  container: HTMLElement;
  /** Upper bound for devicePixelRatio. Drop to ~1.5 on phones if frame time suffers. */
  maxPixelRatio?: number;
  /** MSAA samples on the HDR render target (WebGL2). 0 disables. */
  msaaSamples?: number;
  bloom?: Partial<BloomSettings>;
}

/** Simulation rate. Physics must only advance inside FixedUpdate callbacks. */
export const FIXED_DT = 1 / 60;
const MAX_FRAME_DT = 0.1; // clamp stalls (tab switch, GC) so we never fast-forward the sim
const MAX_SUBSTEPS = 5; // beyond this we drop the backlog instead of spiralling

const DEFAULT_BLOOM: BloomSettings = { enabled: true, strength: 0.85 * LOOK_CONFIG.bloom.strength, radius: LOOK_CONFIG.bloom.radius, threshold: Math.max(0.85, LOOK_CONFIG.bloom.threshold) };

/**
 * Owns the renderer, the one scene, the one camera, the post-processing chain and the main loop.
 *
 * Pipeline: RenderPass (HDR, MSAA) -> UnrealBloomPass -> OutputPass (tone mapping + sRGB).
 * Loop: fixed 60 Hz simulation steps, then one render per display frame with an interpolation alpha.
 */
export class Engine implements Disposable {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  /** The single camera. Camera rigs (cinematic, chase) all drive this one. */
  readonly camera: PerspectiveCamera;
  readonly composer: EffectComposer;
  readonly bloom: UnrealBloomPass;
  /** Simulated seconds since construction (advances in FIXED_DT increments). */
  simTime = 0;

  private readonly container: HTMLElement;
  maxPixelRatio: number;
  /** Dynamic resolution (core/quality AutoQuality): multiplies the final pixel ratio, applied after the screen's own limit. */
  dynScale = 1;
  /** Graphics screen render scale (0.5 .. 1.5) on top of the tier's device-pixel-ratio cap `maxPixelRatio`. */
  resScale = 1;
  private readonly updates = new Set<FixedUpdate>();
  private readonly frames = new Set<FrameCallback>();
  private readonly unwatch: () => void;
  /** The bloom strength before the per-frame kick (read by game/menuLook). */ baseBloomStrength: number;
  private bloomKick = 0;
  fpsCap = 0; // frame cap, 0 = the display's rate
  /** Smoothed milliseconds of work per frame (update + render submit), read by AutoQuality. */
  workMs = 0;
  /** Last frame's split in ms (fixed updates, frame callbacks, render submit) and fixed steps run; read by scripts/bench.mjs. */
  readonly prof = { sim: 0, frame: 0, render: 0, steps: 0 };
  private accumulator = 0;
  private lastTime = 0;
  private running = false;

  constructor(opts: EngineOptions) {
    const cfg = { ...DEFAULT_BLOOM, ...opts.bloom };
    this.container = opts.container;
    this.maxPixelRatio = opts.maxPixelRatio ?? 2;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);

    // MSAA is done on the composer's render target, so the default framebuffer needs none.
    this.renderer = new WebGLRenderer({
      antialias: false,
      alpha: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    this.renderer.toneMapping = ACESFilmicToneMapping; // applied by OutputPass
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true; // lights opt in via castShadow
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.container.appendChild(this.renderer.domElement);

    this.scene.background = new Color(0x05060d);
    this.scene.fog = new FogExp2(0x070914, 0.011 * LOOK_CONFIG.fog.densityScale);
    this.camera = new PerspectiveCamera(60, w / h, 0.1, 800);
    this.camera.layers.enable(1); // world/layers NO_REFLECT: people and wheels, skipped by the rain mirror

    const target = new WebGLRenderTarget(w, h, {
      type: HalfFloatType,
      samples: opts.msaaSamples ?? 4,
    });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.baseBloomStrength = cfg.strength;
    this.bloom = new UnrealBloomPass(new Vector2(w, h), cfg.strength, cfg.radius, cfg.threshold);
    this.bloom.enabled = cfg.enabled;
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.resize();
    this.unwatch = watchViewport(this.container, () => this.resize());
  }

  /** Register simulation work. Called in registration order, FIXED_DT each. Returns an unsubscribe. */
  onFixedUpdate(fn: FixedUpdate): () => void {
    this.updates.add(fn);
    return () => {
      this.updates.delete(fn);
    };
  }

  /** Register per-frame work (interpolation, cameras, HUD). Called in registration order. */
  onFrame(fn: FrameCallback): () => void {
    this.frames.add(fn);
    return () => {
      this.frames.delete(fn);
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.accumulator = 0;
    this.lastTime = performance.now();
    this.renderer.setAnimationLoop(this.tick);
  }

  stop(): void {
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  setBloom(s: Partial<BloomSettings>): void {
    if (s.enabled !== undefined) this.bloom.enabled = s.enabled;
    if (s.strength !== undefined) this.baseBloomStrength = s.strength;
    if (s.radius !== undefined) this.bloom.radius = s.radius;
    if (s.threshold !== undefined) this.bloom.threshold = s.threshold;
  }

  /** Momentary extra bloom that decays on its own: shot cuts, nitro ignition, impacts. Capped at 0.5 so it never washes out. */
  kickBloom(extra: number): void {
    this.bloomKick = Math.min(0.5, Math.max(this.bloomKick, extra));
  }

  /** MSAA samples of the HDR target (0, 2, 4); re-created. */
  setSamples(n: number): void {
    for (const rt of [this.composer.renderTarget1, this.composer.renderTarget2]) if (rt.samples !== n) { rt.samples = n; rt.dispose(); }
  }

  resize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, this.maxPixelRatio) * this.resScale * this.dynScale;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(w, h);
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.stop();
    this.unwatch();
    this.updates.clear();
    this.frames.clear();
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private readonly tick = (now: number): void => {
    if (this.fpsCap > 0 && now - this.lastTime < 1000 / this.fpsCap - 1.5) return; // skip this display frame; dt keeps accumulating
    const frameDt = clamp((now - this.lastTime) / 1000, 0, MAX_FRAME_DT);
    this.lastTime = now;
    this.accumulator += frameDt;

    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < MAX_SUBSTEPS) {
      for (const fn of this.updates) fn(FIXED_DT);
      this.accumulator -= FIXED_DT;
      this.simTime += FIXED_DT;
      steps++;
    }
    if (steps === MAX_SUBSTEPS) this.accumulator = 0;
    const t1 = performance.now();
    const alpha = this.accumulator / FIXED_DT;
    for (const fn of this.frames) fn(alpha, frameDt);
    const t2 = performance.now();

    this.bloomKick = damp(this.bloomKick, 0, 7, frameDt);
    this.bloom.strength = this.baseBloomStrength + this.bloomKick;
    this.composer.render(frameDt);
    const end = performance.now(), work = end - now, pr = this.prof;
    pr.sim = t1 - now; pr.frame = t2 - t1; pr.render = end - t2; pr.steps = steps;
    this.workMs += (work - this.workMs) * 0.05; // CPU time of a frame, smoothed (the display wait is not in it)
  };
}
