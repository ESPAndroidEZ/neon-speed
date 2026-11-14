import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import type { Engine } from '../core/engine';
import { qualityNow } from '../core/quality';

const shader = {
  uniforms: { tDiffuse: { value: null }, blur: { value: 0 }, vignette: { value: 0.4 }, aberration: { value: 0.0014 }, grain: { value: 0.035 }, time: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float blur, vignette, aberration, grain, time; varying vec2 vUv;
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
    c *= 1.0 - vignette * smoothstep(0.35, 0.95, r * 1.35);
    c += (hash(vUv * 1000.0) - 0.5) * grain;
    gl_FragColor = vec4(c, 1.0);
  }`,
};

/** One final pass before output: radial speed blur, chromatic aberration, vignette and film grain. */
export class FinalFx {
  private readonly pass = new ShaderPass(shader);
  private t = 0;

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
  }
}
