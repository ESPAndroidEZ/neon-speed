import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import type { Engine } from '../core/engine';

const shader = {
  uniforms: { tDiffuse: { value: null }, strength: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float strength; varying vec2 vUv;
  void main(){
    vec2 d = vUv - 0.5;
    float r = length(d);
    float k = strength * smoothstep(0.12, 0.75, r);
    vec4 c = texture2D(tDiffuse, vUv);
    vec4 acc = c;
    for (int i = 1; i <= 7; i++) acc += texture2D(tDiffuse, vUv - d * k * 0.06 * float(i));
    gl_FragColor = mix(c, acc / 8.0, min(1.0, strength * 1.2));
  }`,
};

/** Radial speed streaks at the screen edges, inserted before the output pass. Strength 0..1. */
export class SpeedPass {
  private readonly pass = new ShaderPass(shader);

  constructor(engine: Engine) {
    engine.composer.insertPass(this.pass, engine.composer.passes.length - 1);
  }

  set strength(v: number) {
    this.pass.uniforms.strength.value = v;
    this.pass.enabled = v > 0.01;
  }
}
