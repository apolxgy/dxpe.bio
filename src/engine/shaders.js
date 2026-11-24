const NOISE =  `
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
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
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }
`;

export const SKY_VERT =  `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const SKY_FRAG =  `
  uniform float uTime;
  uniform float uHeat;
  varying vec3 vDir;

  ${NOISE}

  void main() {
    vec3 d = normalize(vDir);
    float up = d.y * 0.5 + 0.5;

    vec3 deep = vec3(0.010, 0.011, 0.014);
    vec3 warm = vec3(0.062, 0.068, 0.082);
    vec3 col = mix(deep, warm, pow(up, 2.2));

    float horizon = exp(-abs(d.y + 0.08) * 6.5);
    float drift = fbm(d.xz * 2.4 + vec2(uTime * 0.02, uTime * 0.013));
    col += vec3(0.86, 0.91, 1.0) * horizon * (0.05 + drift * 0.14) * uHeat;

    float cool = exp(-abs(d.y - 0.55) * 4.0) * smoothstep(0.9, -0.2, d.z);
    col += vec3(0.83, 0.69, 0.22) * cool * 0.035 * uHeat;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export const STARS_VERT =  `
  attribute float aSize;
  attribute float aSeed;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vColor = aColor;
    vTwinkle = 0.65 + 0.35 * sin(uTime * (0.6 + aSeed * 2.4) + aSeed * 31.0);
    gl_PointSize = aSize * uPixelRatio * (180.0 / max(1.0, -mv.z)) * uOpacity;
  }
`;

export const STARS_FRAG =  `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d);
    gl_FragColor = vec4(vColor, a * vTwinkle * uOpacity);
  }
`;

export const FIELD_VERT =  `
  uniform float uTime;
  uniform float uMix;
  uniform float uPixelRatio;
  uniform float uAmp;
  varying float vH;
  varying float vFade;

  ${NOISE}

  void main() {
    vec3 p = position;
    vec2 q = p.xy * 0.05;

    float n = fbm(q + vec2(uTime * 0.045, uTime * 0.03));
    float ripple = sin(length(p.xy) * 0.16 - uTime * 0.9) * 0.5 + 0.5;
    float h = (n * 0.85 + ripple * 0.75) * uMix;

    p.z += h * uAmp;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    vH = clamp(h * 1.35, 0.0, 1.0);
    float dist = length(p.xy);
    vFade = smoothstep(92.0, 12.0, dist) * uMix;

    gl_PointSize = min(15.0, (0.9 + vH * 3.4) * uPixelRatio * (150.0 / max(1.0, -mv.z)));
  }
`;

export const FIELD_FRAG =  `
  varying float vH;
  varying float vFade;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.06, d);
    if (a < 0.01) discard;

    vec3 ember = vec3(0.44, 0.47, 0.54);
    vec3 acid = vec3(1.0, 1.0, 1.0);
    vec3 pale = vec3(0.99, 0.99, 1.0);
    vec3 col = mix(ember, acid, smoothstep(0.15, 0.72, vH));
    col = mix(col, pale, smoothstep(0.86, 1.0, vH) * 0.75);

    gl_FragColor = vec4(col, a * vFade * (0.10 + vH * 0.42));
  }
`;

export const FINAL_FRAG =  `
  uniform sampler2D tDiffuse;
  uniform vec2 uRes;
  uniform float uTime;
  uniform float uGrain;
  uniform float uVignette;
  uniform float uAberration;
  uniform float uInvert;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    vec2 uv = vUv;
    vec2 c = uv - 0.5;
    float r2 = dot(c, c);

    vec2 off = c * r2 * uAberration;
    vec3 col;
    col.r = texture2D(tDiffuse, uv + off).r;
    col.g = texture2D(tDiffuse, uv).g;
    col.b = texture2D(tDiffuse, uv - off).b;

    float vig = smoothstep(1.05, 0.18, length(c) * 1.22);
    col *= mix(1.0 - uVignette, 1.0, vig);

    float n = hash(uv * uRes + mod(uTime, 100.0) * 37.0);
    col += (n - 0.5) * uGrain * (1.0 - vig * 0.35);

    col *= 1.0 - 0.012 * step(0.5, fract(uv.y * uRes.y * 0.5));

    float ink = smoothstep(0.012, 0.30, dot(col, vec3(0.299, 0.587, 0.114)));
    vec3 print = mix(vec3(1.0), vec3(0.02), ink);
    col = mix(col, print, uInvert);

    gl_FragColor = vec4(col, 1.0);
  }
`;
