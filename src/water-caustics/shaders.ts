export const VERT_SRC = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

/**
 * Overhead-sun caustics as one continuous sheet.
 * Each octave is rotated by an irrational angle, domain-warped, then
 * sampled along incommensurate directions — never axis-aligned sin(x)*sin(y),
 * so no tile grid. Keep in lockstep with caustic-field.ts.
 */
export const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_scale;
uniform vec3 u_color;
uniform vec3 u_tint;
uniform float u_tint_strength;

vec2 rotate(vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

float octave(vec2 uv, float t, float fi) {
  vec2 p = rotate(uv, 0.41 + fi * 2.39996323);
  for (int k = 0; k < 2; k++) {
    float fk = float(k);
    vec2 w = vec2(
      sin(p.y * (1.17 + fi * 0.19 + fk * 0.13) + p.x * (0.23 + fi * 0.07) + t * (0.31 + fi * 0.05) + fi * 1.61 + fk),
      cos(p.x * (0.89 + fi * 0.17 + fk * 0.11) - p.y * (0.29 + fi * 0.09) - t * (0.27 + fi * 0.04) + fi * 1.13)
    );
    p += w * (0.46 / (1.0 + fi * 0.16 + fk * 0.11));
  }
  vec2 d1 = vec2(1.00 + fi * 0.21, 0.33 + fi * 0.13);
  vec2 d2 = vec2(-0.51 - fi * 0.11, 1.09 + fi * 0.08);
  float ridge = sin(dot(p, d1) + t * 0.09) * sin(dot(p, d2) - t * 0.07);
  return 0.165 / (abs(ridge) * 5.6 + 0.22);
}

float field(vec2 uv, float t) {
  vec2 p = uv + vec2(
    sin(uv.y * 0.37 + t * 0.19) * 0.42,
    cos(uv.x * 0.31 - t * 0.15) * 0.42
  );
  float a = octave(p, t, 0.0);
  vec2 p2 = rotate(p * 1.61803399 + vec2(1.83, -1.27), 1.17809725);
  float b = octave(p2, t * 0.79, 1.0);
  vec2 p3 = rotate(p * 2.61803399 + vec2(2.54, -0.74), 1.54809725);
  float c = octave(p3, t * 0.62, 2.0);
  float acc = max(a * 1.12, b * 0.78) + c * 0.34;
  return pow(clamp(acc, 0.0, 1.95), 1.45);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 res = u_resolution;
  vec2 uv = (frag * 2.0 - res) / max(res.y, 1.0);
  uv *= 1.72 * u_scale;

  float t = u_time * 0.36;
  float c = field(uv, t);
  float veins = smoothstep(0.15, 1.08, c);
  float haze = smoothstep(0.03, 0.78, c) * 0.3;
  float glow = (veins * 0.9 + haze) * u_intensity;
  vec3 rgb = mix(u_tint, u_color, clamp(glow, 0.0, 1.0));
  float alpha = clamp(u_tint_strength + glow * (0.88 - u_tint_strength * 0.35), 0.0, 1.0);

  gl_FragColor = vec4(rgb, alpha);
}
`;

/**
 * Fish Catch Caustics Fragment Shader
 * - Multi-spectral chromatic blend: Blue light + Emerald Green + Sunlight Pale-Gold blended together
 * - Enhanced bottom-up linear gradient mask (pools rich at bottom photo/waterline, fades smoothly upward)
 * - Shimmering natural sunlit caustic light-spots (光斑) and delicate perimeter fluid aura
 * - Seamless integration with photo layer under Screen / Lighter blend mode
 */
export const FISH_CATCH_FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_spread_progress;
uniform float u_speed;
uniform float u_margin_ratio;
uniform float u_glow_size;
uniform vec3 u_gold_color;
uniform vec3 u_cyan_color;
uniform vec3 u_green_color;
uniform float u_bottom_mask_strength;
uniform float u_blend_ratio;

vec2 rotate(vec2 p, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

float sdRoundedBox(vec2 p, vec2 b, vec4 r) {
  r.xy = (p.x > 0.0) ? r.xy : r.zw;
  r.x  = (p.y > 0.0) ? r.x  : r.y;
  vec2 q = abs(p) - b + r.x;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Multi-octave organic water caustics for morning water ripples
float causticOctave(vec2 uv, float t, float fi) {
  vec2 p = rotate(uv, 0.45 + fi * 2.39996);
  for (int k = 0; k < 2; k++) {
    float fk = float(k);
    vec2 w = vec2(
      sin(p.y * (1.18 + fi * 0.17 + fk * 0.12) + p.x * (0.24 + fi * 0.08) + t * (0.42 + fi * 0.06) + fi * 1.57 + fk),
      cos(p.x * (0.92 + fi * 0.15 + fk * 0.10) - p.y * (0.31 + fi * 0.08) - t * (0.38 + fi * 0.05) + fi * 1.18)
    );
    p += w * (0.45 / (1.0 + fi * 0.18 + fk * 0.12));
  }
  vec2 d1 = vec2(1.02 + fi * 0.19, 0.35 + fi * 0.11);
  vec2 d2 = vec2(-0.48 - fi * 0.09, 1.12 + fi * 0.07);
  float ridge = sin(dot(p, d1) + t * 0.14) * sin(dot(p, d2) - t * 0.11);
  return 0.17 / (abs(ridge) * 5.4 + 0.22);
}

float causticField(vec2 uv, float t) {
  vec2 p = uv + vec2(
    sin(uv.y * 0.42 + t * 0.24) * 0.38,
    cos(uv.x * 0.36 - t * 0.18) * 0.38
  );
  float a = causticOctave(p, t, 0.0);
  vec2 p2 = rotate(p * 1.618 + vec2(1.72, -1.18), 1.15);
  float b = causticOctave(p2, t * 0.82, 1.0);
  vec2 p3 = rotate(p * 2.54 + vec2(2.31, -0.65), 1.52);
  float c = causticOctave(p3, t * 0.65, 2.0);
  float acc = max(a * 1.15, b * 0.82) + c * 0.38;
  return pow(clamp(acc, 0.0, 2.0), 1.35);
}

// Organic sunlit light spots (晨光水波光斑)
float lightSpotsField(vec2 uv, float t) {
  vec2 p = uv * 3.6;
  vec2 ip = floor(p);
  vec2 fp = fract(p) - 0.5;
  
  float minDist = 1.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 cellId = ip + neighbor;
      float h = hash(cellId);
      vec2 offset = vec2(
        sin(t * 1.25 + h * 6.28) * 0.32,
        cos(t * 1.55 + h * 6.28) * 0.32
      );
      vec2 diff = neighbor + offset - fp;
      float dist = length(diff);
      minDist = min(minDist, dist);
    }
  }
  float spot = smoothstep(0.65, 0.08, minDist);
  return pow(spot, 1.8);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 res = u_resolution;
  
  // Normalized UV centered
  vec2 uv = (frag * 2.0 - res) / max(res.y, 1.0);
  
  // Vertical coordinate: 0.0 at bottom, 1.0 at top
  float normY = frag.y / res.y;
  
  // Continuous fluid time (一直流转，不停止)
  float t = u_time * 0.42;

  // 1. 开始识别后从下往上扫描的能量光波 (Upward Scan Wavefront)
  // Scan position from 0.0 to 1.05
  float scanY = u_spread_progress * 1.08 - 0.04;
  
  // Upward scan wavefront beam (极具冲击力的扫描前锋光)
  float scanDist = abs(normY - scanY);
  float scanBeam = smoothstep(0.09, 0.0, scanDist) * smoothstep(0.02, 0.15, u_spread_progress);
  // Scan beam fades out smoothly right as it reaches the top
  scanBeam *= (1.0 - smoothstep(0.96, 1.02, u_spread_progress));
  
  // Upward revealed mask: As scan moves up, it progressively unlocks and ignites the water light
  // Once u_spread_progress >= 1.0, revealedMask is fully 1.0 everywhere and stays fixed!
  float revealedMask = (u_spread_progress >= 1.0) 
    ? 1.0 
    : smoothstep(normY - 0.14, normY + 0.02, scanY);
  revealedMask = clamp(revealedMask, 0.0, 1.0);
  
  // 2. 宽幅四周光环 (Four-sided wide perimeter aura - 范围比原视频大)
  vec2 halfRes = res * 0.5;
  vec2 centeredPos = frag - halfRes;
  float margin = min(res.x, res.y) * u_margin_ratio;
  vec2 boxHalf = halfRes - vec2(margin);
  float cornerR = min(res.x, res.y) * 0.12;
  
  float perimAngle = atan(centeredPos.y, centeredPos.x);
  // Organic breathing fluid waves along the four perimeter paths
  float perimWave = sin(perimAngle * 5.0 + t * 2.2) * 4.5 + cos(perimAngle * 9.0 - t * 1.5) * 2.6;
  float dBox = abs(sdRoundedBox(centeredPos, boxHalf, vec4(cornerR)) + perimWave);
  
  // Expanded multi-tier bloom for wider atmospheric range (范围更宽厚大气)
  float effectiveGlow = max(8.0, u_glow_size);
  float wideHalo = exp(-dBox * (0.07 / (effectiveGlow * 0.12))); // Broad exterior ambient halo
  float mediumBloom = exp(-dBox * (0.16 / (effectiveGlow * 0.10))); // Mid-layer radiant bloom
  float sharpCore = smoothstep(2.8, 0.3, dBox); // Brilliant crest filament
  
  float perimeterAura = (wideHalo * 0.35 + mediumBloom * 0.65 + sharpCore * 0.95) * revealedMask;
  
  // Perimeter chromatic gradient: intertwining pale-gold, sky cyan, and gentle green
  float filamentAngleT = (perimAngle + 3.14159) / 6.28318;
  float filamentGoldBias = smoothstep(0.18, 0.82, sin(filamentAngleT * 3.14159 + 0.7));
  vec3 perimeterColor = mix(u_cyan_color, u_gold_color, filamentGoldBias);
  perimeterColor = mix(perimeterColor, u_green_color, sin(filamentAngleT * 6.28 + t * 0.5) * 0.2 + 0.2);

  // 3. 底部向上的自然水面微风焦散与晨光光斑 (Bottom Caustics & Sunlit Bokeh)
  float bottomGrad = pow(clamp(1.0 - normY * 0.85, 0.0, 1.0), 1.5);
  float causticsMask = mix(0.04, 1.0, bottomGrad * u_bottom_mask_strength) * revealedMask;
  
  float cVal = causticField(uv * 1.85, t);
  float veins = smoothstep(0.16, 1.10, cVal);
  float haze = smoothstep(0.03, 0.78, cVal) * 0.35;
  float causticGlow = veins * 0.92 + haze;
  
  // Shimmering morning sunlight bokeh spots
  float spots = lightSpotsField(uv * 1.25, t * 0.85);
  float waterLight = causticGlow * 0.88 + spots * 0.95;
  
  // Bottom caustics color: delicate intertwining of blue, green, and sunlight gold
  float colorFlow = sin(uv.x * 2.2 + uv.y * 1.5 + t * 0.75) * 0.5 + 0.5;
  vec3 waterSpectrum = mix(u_cyan_color, u_green_color, clamp(colorFlow * 0.85 + 0.1, 0.0, 1.0));
  float sunCatch = smoothstep(0.28, 0.88, waterLight * 0.55 + colorFlow * 0.45);
  vec3 bottomCausticColor = mix(waterSpectrum, u_gold_color, clamp(sunCatch * u_blend_ratio, 0.0, 1.0));
  
  // 4. 向上扫描波的冲击高亮 (Upward Scan Wavefront High-energy surge)
  vec3 scanColor = mix(u_cyan_color, u_gold_color, 0.55) * 1.6 + vec3(0.35);
  float scanIntensity = scanBeam * 1.35;
  
  // 5. 组合与混合 (保持常驻流转，不消失)
  float bottomContrib = waterLight * causticsMask * 0.68;
  float perimContrib = perimeterAura * 0.86;
  
  float totalLight = (bottomContrib + perimContrib + scanIntensity) * u_intensity;
  float finalAlpha = clamp(totalLight, 0.0, 0.96);
  
  // Chromatic composition
  float totalWeight = max(0.001, bottomContrib + perimContrib + scanIntensity);
  vec3 finalRgb = (bottomCausticColor * bottomContrib + perimeterColor * perimContrib + scanColor * scanIntensity) / totalWeight;
  
  // Natural sunlit specular sparkle core (轻柔高光)
  float coreSpark = smoothstep(0.85, 1.75, totalLight);
  finalRgb = mix(finalRgb, vec3(0.99, 0.99, 0.96), coreSpark * 0.48);
  finalRgb *= (1.0 + coreSpark * 0.3);
  
  gl_FragColor = vec4(finalRgb, finalAlpha);
}
`;
