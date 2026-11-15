/**
 * GLSL for the precipitation system. Rain and snow share one vertex shader: world-space wrap (see precipMath),
 * fades at the volume edges / near the lens / far away, kills under tunnel roofs and inside the player's car, then
 * a quad stretched along the drop's velocity relative to the camera (fall minus camera velocity). Every time
 * frequency is a multiple of 0.02 so the CPU clock can wrap at 100 pi without a visible jump.
 */

const COVER = /* glsl */ `
uniform vec4 uCar;
uniform vec4 uTunA;
uniform vec4 uTunB;
float segIn(vec2 p, vec2 a, vec2 b){
  vec2 ab = b - a; float t = dot(p - a, ab) / max(dot(ab, ab), 1e-4);
  return (t < 0.0 || t > 1.0) ? 1e6 : length(p - a - ab * t);
}
float covered(vec3 wp){
  vec3 dc = wp - uCar.xyz;
  if (dot(dc.xz, dc.xz) < uCar.w * uCar.w && dc.y < 1.6 && dc.y > -1.0) return 1.0;
  if (uTunB.z <= 0.0 || wp.y > uTunB.w) return 0.0;
  float d = min(segIn(wp.xz, uTunA.xy, uTunA.zw), segIn(wp.xz, uTunA.zw, uTunB.xy));
  return d < uTunB.z ? 1.0 : 0.0;
}
`;

export const STREAK_VERT = /* glsl */ `
attribute vec4 seed;
uniform vec3 uCentre; uniform vec3 uBox; uniform vec3 uDrift; uniform vec3 uCamPos; uniform vec3 uRel;
uniform float uTime; uniform float uWidth; uniform float uExposure; uniform float uMinLen; uniform float uMaxLen;
uniform float uDensity; uniform float uTurb; uniform float uRound; uniform float uPix; uniform float uEdge; uniform float uFar;
varying vec2 vUv; varying float vA;
${COVER}
void main(){
  vec3 lo = uCentre - 0.5 * uBox;
  vec3 wp = lo + mod(seed.xyz * uBox + uDrift - lo, uBox);
  vec3 e = min(wp - lo, lo + uBox - wp) / uEdge;
  float a = clamp(min(min(e.x, e.y), e.z), 0.0, 1.0);
  float ph = seed.w * 6.2832;
  wp += uTurb * vec3(sin(uTime * 0.9 + ph * 7.0) + 0.5 * sin(uTime * 2.1 + ph * 3.0), 0.4 * sin(uTime * 1.3 + ph * 5.0), cos(uTime * 0.7 + ph * 11.0) + 0.5 * cos(uTime * 1.7 + ph * 2.0));
  vec3 toCam = uCamPos - wp; float dist = max(length(toCam), 1e-3);
  a *= smoothstep(0.6, 2.0, dist) * (1.0 - smoothstep(uFar * 0.5, uFar, dist));
  if (seed.w > uDensity || covered(wp) > 0.5) a = 0.0;
  if (a < 0.002) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vA = 0.0; vUv = vec2(0.0); return; }
  float sp = length(uRel); vec3 d = sp > 1e-3 ? uRel / sp : vec3(0.0, -1.0, 0.0);
  float len = clamp(sp * uExposure, uMinLen, uMaxLen);
  vec3 side = cross(d, toCam / dist); float sl = length(side);
  side = sl > 1e-3 ? side / sl : vec3(1.0, 0.0, 0.0);
  float w = max(uWidth, dist * uPix);   // never thinner than ~1 px: thin far streaks do not shimmer
  a *= uWidth / w;                       // same energy when widened
  float along = mix(uRound * w, -(len + uRound * w), position.y);
  vec3 p = wp + d * along + side * (w * position.x);
  vUv = position.xy; vA = a;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const STREAK_FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uAlpha; uniform float uRound;
varying vec2 vUv; varying float vA;
void main(){
  float streak = (1.0 - vUv.x * vUv.x) * (1.0 - 0.75 * vUv.y);
  float flake = 1.0 - smoothstep(0.15, 1.0, length(vec2(vUv.x, vUv.y * 2.0 - 1.0)));
  float a = mix(streak, flake, uRound) * vA * uAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor, a);
}`;

export const SPLASH_VERT = /* glsl */ `
attribute vec4 seed;
uniform vec3 uCentre; uniform vec2 uBox; uniform float uClock; uniform float uDensity; uniform vec3 uCamPos;
uniform vec4 uRoad; uniform vec3 uRoadT;
varying vec2 vUv; varying float vA; varying float vR;
${COVER}
float h11(float n){ return fract(sin(n * 12.9898) * 43758.5453); }
void main(){
  float c = uClock + seed.w; float cyc = floor(c); float ph = c - cyc;
  vec2 s = fract(seed.xy + vec2(h11(cyc + seed.z * 17.0), h11(cyc * 1.37 + seed.z * 31.0)));
  vec2 lo = uCentre.xz - 0.5 * uBox;
  vec2 xz = lo + mod(s * uBox - lo, uBox);
  vec2 e = min(xz - lo, lo + uBox - xz) / 3.0;
  vec2 rel = xz - uRoad.xz; vec2 t = uRoadT.xy;
  float along = dot(rel, t); float lat = rel.x * t.y - rel.y * t.x;
  vec3 wp = vec3(xz.x, uRoad.y + along * uRoadT.z + 0.05, xz.y);
  float dist = length(uCamPos - wp);
  float a = clamp(min(e.x, e.y), 0.0, 1.0) * (1.0 - smoothstep(uRoad.w - 1.2, uRoad.w, abs(lat))) * (1.0 - ph) * smoothstep(2.5, 6.0, dist) * (1.0 - smoothstep(14.0, 20.0, dist));
  if (seed.z > uDensity || covered(wp) > 0.5 || uRoad.w <= 0.0) a = 0.0;
  if (a < 0.002) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vA = 0.0; vUv = vec2(0.0); vR = 0.0; return; }
  vR = 0.04 + 0.2 * sqrt(ph);
  float size = vR + 0.06;
  vUv = position.xy * size; vA = a;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp + vec3(vUv.x, 0.0, vUv.y), 1.0);
}`;

export const SPLASH_FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uAlpha;
varying vec2 vUv; varying float vA; varying float vR;
void main(){
  float d = length(vUv);
  float a = (1.0 - smoothstep(0.0, 0.03, abs(d - vR))) * vA * uAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor, a);
}`;

/** Windscreen droplets: a full-screen pass in clip space, procedural cells that bead, slide a little and dry. */
export const DROPS_VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export const DROPS_FRAG = /* glsl */ `
uniform float uTime; uniform float uAlpha; uniform float uAspect;
varying vec2 vUv;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
void main(){
  vec2 uv = vUv * vec2(uAspect, 1.0) * 6.0;
  vec2 id = floor(uv); vec2 f = fract(uv) - 0.5;
  float n = h21(id);
  float life = fract(uTime * (0.1 + 0.08 * fract(n * 7.0)) + n * 5.0);
  vec2 c = vec2(fract(n * 3.7) - 0.5, fract(n * 13.0) - 0.5) * 0.6;
  c.y -= life * life * 0.25;
  float r = 0.05 + 0.07 * fract(n * 31.0);
  float d = length((f - c) * vec2(1.0, 0.85));
  float drop = (1.0 - smoothstep(r * 0.7, r, d)) * (1.0 - life) * step(0.5, fract(n * 71.0));
  float rim = drop * smoothstep(r * 0.2, r * 0.9, d);
  float a = (0.3 * drop + 0.7 * rim) * uAlpha * smoothstep(0.0, 0.25, vUv.y);
  if (a < 0.003) discard;
  gl_FragColor = vec4(0.82, 0.9, 1.0, a);
}`;
