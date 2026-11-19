import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import type { Engine } from '../core/engine';
import { grade } from '../core/grade';
import { look } from '../core/looks';
import { qualityNow } from '../core/quality';

const shader = {
  uniforms: { tDiffuse: { value: null }, blur: { value: 0 }, vignette: { value: 0.4 }, aberration: { value: 0.0014 }, grain: { value: 0.03 }, time: { value: 0 }, contrast: { value: 1 }, shadowTint: { value: [1, 1, 1] }, highlightTint: { value: [1, 1, 1] }, streak: { value: 0 }, texel: { value: 0.0007 }, sat: { value: 1 }, tint: { value: [1, 1, 1] } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float blur, vignette, aberration, grain, time, sat, contrast, streak, texel; uniform vec3 tint, shadowTint, highlightTint; varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + time) * 43758.5453); }
  void main(){
    vec2 d = vUv - 0.5;
    float r = length(d);
    float k = blur * smoothstep(0.1, 0.75, r);
    // chromatic aberration grows toward the edges and with speed blur
    vec2 off = d * (aberration + blur * 0.004) * r * 6.0;
    vec3 c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
    vec3 acc = c;
    for (int i = 1; i <= 6; i++) acc += texture2D(tDiffuse, vUv - d * k * 0.06 * float(i)).rgb;
    c = mix(c, acc / 7.0, min(1.0, blur * 1.2));
    // weather colour grade: desaturate and tint (cool in snow) without touching the highlights' shape
    float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(lum), c, sat) * tint;
    // anamorphic streaks: horizontal smear of the brightest lights, cyan to magenta across the frame
    if (streak > 0.0) {
      vec3 s = vec3(0.0);
      for (int i = 1; i <= 14; i++) {
        float o = float(i) * texel * 9.0;
        float w = exp(-float(i) * 0.22);
        vec3 a = texture2D(tDiffuse, vUv + vec2(o, 0.0)).rgb, b = texture2D(tDiffuse, vUv - vec2(o, 0.0)).rgb;
        s += (min(max(a - 1.6, 0.0), vec3(1.2)) + min(max(b - 1.6, 0.0), vec3(1.2))) * w; // capped per tap: a headlight at 6x HDR used to smear into a screen-wide white blob
      }
      c += s * streak * 0.22 * mix(vec3(0.35, 0.8, 1.0), vec3(1.0, 0.45, 0.85), vUv.x);
    }
    // split toning and contrast around mid grey (the curve keeps highlights from clipping)
    float l2 = clamp(dot(c, vec3(0.2126, 0.7152, 0.0722)), 0.0, 4.0);
    c *= mix(shadowTint, highlightTint, smoothstep(0.05, 0.9, l2));
    c = (c - 0.18) * contrast + 0.18;
    c = max(c, vec3(0.0));
    c *= 1.0 - vignette * smoothstep(0.35, 0.95, r * 1.35);
    c += (hash(vUv * 1000.0) - 0.5) * grain;
    gl_FragColor = vec4(c, 1.0);
  }`,
};

/** One final pass before output: radial speed blur, chromatic aberration, vignette and film grain. */
export class FinalFx {
  private readonly pass = new ShaderPass(shader);
  private t = 0;
  /** Render width in pixels: sets the streak step. Updated by the engine on resize. */
  width = 1280;

  constructor(engine: Engine) {
    engine.composer.insertPass(this.pass, engine.composer.passes.length - 1);
  }

  /** speed blur strength 0..1 (set every frame); everything else follows the quality tier. */
  update(dt: number, blur: number): void {
    const u = this.pass.uniforms;
    this.pass.enabled = qualityNow().fx;
    this.t = (this.t + dt) % 100;
    u.time.value = this.t;
    u.blur.value = blur;
    u.tint.value = grade.tint;
    u.sat.value = grade.saturation * look.saturation;
    u.contrast.value = look.contrast;
    u.shadowTint.value = look.shadowTint;
    u.highlightTint.value = look.highlightTint;
    u.streak.value = qualityNow().streaks ? look.streak * grade.glowK : 0;
    u.grain.value = look.grain;
    u.texel.value = 1 / Math.max(480, this.width);
  }
}
