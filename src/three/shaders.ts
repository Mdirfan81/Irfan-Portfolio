/**
 * GLSL for the journey scene. Kept apart from the React code so the scene file
 * reads as a description of the layers, and this one as how each is drawn.
 */

/** A quad that covers the view whatever the camera is doing. */
export const SCREEN_VERTEX = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/**
 * Domain-warped fractal noise: noise that is fed back in as its own
 * coordinates, twice. The folds that come out of that are what make it read as
 * gas rather than as fog.
 */
export const NEBULA_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uAspect;
  uniform vec2 uShift;
  uniform vec2 uFocus;
  uniform vec3 uDeep;
  uniform vec3 uTone;
  uniform vec3 uGlow;
  uniform vec3 uHot;
  varying vec2 vUv;

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float gain = 0.5;
    // Each octave is turned as well as scaled, which hides the noise grid.
    mat2 turn = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++) {
      value += gain * noise(p);
      p = turn * p;
      gain *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) * 1.7 + uShift;
    float t = uTime;

    vec2 q = vec2(
      fbm(p + vec2(0.0, t * 0.03)),
      fbm(p + vec2(5.2, 1.3) - t * 0.026)
    );
    vec2 r = vec2(
      fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 0.045),
      fbm(p + 3.0 * q + vec2(8.3, 2.8) - t * 0.038)
    );
    float f = fbm(p + 2.6 * r);

    // Brightest behind the constellation, so the figure sits inside the cloud.
    vec2 c = (vUv - uFocus) * vec2(uAspect, 1.0);
    float core = exp(-dot(c, c) * 2.6);

    float density = smoothstep(0.26, 0.84, f) * (0.4 + 0.6 * core) + core * 0.16;

    vec3 color = mix(uDeep, uTone, smoothstep(0.3, 0.78, f));
    color = mix(color, uGlow, smoothstep(0.5, 1.0, length(q)) * 0.5);
    color = mix(color, uHot, r.y * r.y * r.y * 0.8);
    color += uTone * core * 0.2;

    gl_FragColor = vec4(color, clamp(density, 0.0, 1.0));
  }
`;

/** Stretches the small nebula buffer over the view. */
export const SCREEN_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  varying vec2 vUv;

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    vec4 gas = texture2D(uMap, vUv);
    // A pixel of grain breaks up the banding a stretched gradient would show.
    float alpha = gas.a * uOpacity + (hash(gl_FragCoord.xy) - 0.5) * 0.012;
    gl_FragColor = vec4(gas.rgb, clamp(alpha, 0.0, 1.0));
    #include <colorspace_fragment>
  }
`;

/** Shared by the star points and, with STREAK defined, their trails. */
export const STAR_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uTravel;
  uniform float uStretch;
  uniform float uDepth;
  uniform float uNear;
  uniform float uPixels;
  uniform float uOpacity;
  attribute vec4 aSeed;
  #ifdef STREAK
    attribute float aEnd;
  #endif
  varying float vAlpha;
  varying float vTint;

  void main() {
    vec3 p = position;
    // Wrap: a star that passes the camera reappears at the far end.
    p.z = mod(p.z + uTravel, uDepth) - uDepth + uNear;
    // Faded at both ends so the wrap is never seen happening.
    float fade = smoothstep(uNear - uDepth, uNear - uDepth + 18.0, p.z)
      * (1.0 - smoothstep(uNear - 9.0, uNear - 1.5, p.z));
    vTint = aSeed.z;

    #ifdef STREAK
      p.z -= aEnd * uStretch * (0.6 + aSeed.y);
      vAlpha = fade * uOpacity * (1.0 - aEnd) * smoothstep(0.12, 1.4, abs(uStretch)) * 0.75;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    #else
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      float twinkle = 0.62 + 0.38 * sin(uTime * (0.7 + aSeed.x * 2.2) + aSeed.w * 6.2831);
      float size = (0.035 + aSeed.y * aSeed.y * 0.13) * uPixels / -mv.z;
      gl_PointSize = max(size, 1.6);
      // Below the smallest drawable point a star dims instead of shrinking.
      vAlpha = fade * uOpacity * twinkle * min(size / 1.6, 1.0);
      gl_Position = projectionMatrix * mv;
    #endif
  }
`;

export const STAR_FRAGMENT = /* glsl */ `
  uniform vec3 uStar;
  uniform vec3 uTint;
  varying float vAlpha;
  varying float vTint;

  void main() {
    #ifdef STREAK
      float shape = 1.0;
    #else
      float d = length(gl_PointCoord - 0.5) * 2.0;
      float shape = 1.0 - smoothstep(0.0, 1.0, d);
      shape *= shape;
    #endif
    vec3 color = mix(uStar, uTint, step(0.6, vTint) * 0.75);
    gl_FragColor = vec4(color, shape * vAlpha);
    #include <colorspace_fragment>
  }
`;

/**
 * 'position' is the figure being left and 'aTo' the one being approached.
 * Every star crosses on its own schedule and its own curved path, so a
 * regrouping reads as a swarm in flight rather than a cross-fade.
 */
export const CONSTELLATION_VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uMix;
  uniform float uIntro;
  uniform float uWarp;
  uniform float uPixels;
  attribute vec3 aTo;
  attribute vec4 aSeed;
  varying float vAlpha;
  varying float vPick;

  float ease(float t) {
    return t * t * (3.0 - 2.0 * t);
  }

  void main() {
    // Staggered: each star leaves a little after the one before it.
    float e = ease(clamp((uMix - aSeed.x * 0.4) / 0.6, 0.0, 1.0));
    vec3 p = mix(position, aTo, e);

    // In flight a star swings round the figure's axis, drifts off its line and
    // surges toward the viewer; all three are zero at both ends of the trip.
    float arc = sin(e * 3.14159265);
    vec3 dir = normalize(aSeed.yzw - 0.5 + 0.0001);
    float angle = arc * (aSeed.y - 0.5) * 2.6;
    float c = cos(angle);
    float s = sin(angle);
    p.xy = mat2(c, s, -s, c) * p.xy;
    p += dir * arc * 2.8;
    p.z += arc * (1.0 + aSeed.z * 4.0);

    // At rest the figure breathes; a fast scroll shakes it loose a little.
    p += dir * (sin(uTime * (0.4 + aSeed.x) + aSeed.w * 6.2831) * 0.03 + uWarp * aSeed.y * 0.32);

    // The opening: stars arrive from all around and settle into the figure.
    float formed = ease(clamp((uIntro - aSeed.w * 0.45) / 0.55, 0.0, 1.0));
    vec3 scattered = dir * (6.0 + aSeed.x * 16.0);
    scattered.z *= 0.5;
    p = mix(scattered, p, formed);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float twinkle = 0.7 + 0.3 * sin(uTime * (1.0 + aSeed.z * 2.5) + aSeed.x * 40.0);
    float size = (0.05 + aSeed.w * aSeed.w * 0.1) * uPixels / -mv.z;
    gl_PointSize = max(size, 1.5);
    vAlpha = twinkle * (0.3 + 0.7 * formed) * (1.0 - arc * 0.25);
    vPick = aSeed.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const CONSTELLATION_FRAGMENT = /* glsl */ `
  uniform vec3 uTone;
  uniform vec3 uAlt;
  uniform vec3 uCore;
  uniform float uLight;
  varying float vAlpha;
  varying float vPick;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float soft = 1.0 - smoothstep(0.0, 1.0, d);
    soft *= soft;

    vec3 color = mix(uTone, uAlt, step(0.7, vPick));
    // A white-hot centre on the dark theme; on the light one, plain ink.
    color = mix(color, uCore, soft * 0.65 * (1.0 - uLight));
    gl_FragColor = vec4(color, soft * vAlpha * mix(0.62, 0.8, uLight));
    #include <colorspace_fragment>
  }
`;
