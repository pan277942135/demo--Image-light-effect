/**
 * Submerged Caustic Mesh Engine
 * Dedicated, completely isolated renderer for full-field underwater sun caustic networks.
 * Features:
 * - Cellular Voronoi caustic webbing with dynamic domain warping
 * - Dual-tone gradient: Aqua/Cyan upper atmosphere + Emerald Green lower depths
 * - Blazing sunlight focal hotspots at caustic cell intersection vertices
 * - Independent lifecycle, zero coupling with fish-catch-caustics.ts
 */

export interface SubmergedCausticsConfig {
  intensity: number;       // Overall brightness (0.1 - 2.5, default 1.15)
  speed: number;           // Animation speed (0.05 - 1.5, default 0.26)
  scale: number;           // Mesh cell frequency/density (0.5 - 3.0, default 1.25)
  topColor: string;        // Sky/upper water tint (default #00D4FF)
  bottomColor: string;     // Ground/lower water tint (default #059669)
  highlightColor: string;  // Sunlight focus/node color (default #FFF1A8)
  nodeSparkle: number;     // Intensity of intersection vertex glints (0.0 - 2.5, default 1.2)
  meshSharpness: number;   // Caustic ridge sharpness (0.3 - 2.5, default 1.3)
  centerClarity: number;   // Attenuation at image center (0.0 = uniform coverage, 1.0 = clear subject, default 0.72)
  blendMode: "screen" | "lighter" | "normal" | "overlay" | "soft-light";
}

export const DEFAULT_SUBMERGED_CONFIG: SubmergedCausticsConfig = {
  intensity: 1.15,
  speed: 0.26,
  scale: 1.25,
  topColor: "#00d4ff",
  bottomColor: "#059669",
  highlightColor: "#fff1a8",
  nodeSparkle: 1.2,
  meshSharpness: 1.3,
  centerClarity: 0.72,
  blendMode: "screen",
};

export interface SubmergedMeshHandle {
  canvas: HTMLCanvasElement;
  updateConfig: (newConfig: Partial<SubmergedCausticsConfig>) => void;
  destroy: () => void;
  pause: () => void;
  resume: () => void;
  rendererKind: "webgl" | "canvas2d";
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) / 255;
    const g = parseInt(clean[1] + clean[1], 16) / 255;
    const b = parseInt(clean[2] + clean[2], 16) / 255;
    return [r, g, b];
  }
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return [isNaN(r) ? 1 : r, isNaN(g) ? 1 : g, isNaN(b) ? 1 : b];
}

const VS_SOURCE = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = (a_position + 1.0) * 0.5;
  // Flip Y for standard texture orientation
  v_uv.y = 1.0 - v_uv.y;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FS_SOURCE = `
precision highp float;

varying vec2 v_uv;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_intensity;
uniform float u_scale;
uniform vec3 u_topColor;
uniform vec3 u_bottomColor;
uniform vec3 u_highlightColor;
uniform float u_nodeSparkle;
uniform float u_meshSharpness;
uniform float u_centerClarity;

// Fast pseudo-random hash
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

// 2D Simplex-like noise for organic water currents
float noise2d(vec2 p) {
  const float K1 = 0.366025404;
  const float K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * h * vec3(dot(a, hash2(i)), dot(b, hash2(i + o)), dot(c, hash2(i + 1.0)));
  return dot(n, vec3(70.0));
}

// Voronoi cellular distance field with feature vertex detection
// Returns vec3(minDistToCenter, distToBorderRidge, nodeIntensity)
vec3 voronoi(vec2 x, float t) {
  vec2 n = floor(x);
  vec2 f = fract(x);

  vec2 mg, mr;
  float md = 8.0;

  // First pass: find closest cell
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash2(n + g);
      // Fluid undulating harmonic motion
      o = 0.5 + 0.44 * sin(t * 1.55 + 6.28318 * o);
      vec2 r = g + o - f;
      float d = dot(r, r);

      if (d < md) {
        md = d;
        mr = r;
        mg = g;
      }
    }
  }

  // Second pass: find distance to bisector line
  float md2 = 8.0;
  for (int j = -2; j <= 2; j++) {
    for (int i = -2; i <= 2; i++) {
      vec2 g = mg + vec2(float(i), float(j));
      vec2 o = hash2(n + g);
      o = 0.5 + 0.44 * sin(t * 1.55 + 6.28318 * o);
      vec2 r = g + o - f;

      if (dot(mr - r, mr - r) > 0.00001) {
        float d = dot(0.5 * (mr + r), normalize(r - mr));
        md2 = min(md2, d);
      }
    }
  }

  // Vertex node intensity: sharp peak at triple-intersections
  float node = exp(-max(0.0, md2) * 26.0);

  return vec3(sqrt(md), md2, node);
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / max(1.0, u_resolution.y);

  // Correct aspect ratio for isotropic hexagonal caustic shapes
  vec2 p = uv;
  p.x *= aspect;

  float t = u_time * 0.75;

  // Organic domain warping: simulated multi-layered surface wave motion
  vec2 warp1 = vec2(
    noise2d(p * 5.5 + vec2(t * 0.35, t * 0.28)),
    noise2d(p * 5.5 + vec2(-t * 0.32, t * 0.40))
  );

  vec2 warp2 = vec2(
    noise2d(p * 11.0 + warp1 * 0.5 + vec2(t * 0.18, -t * 0.22)),
    noise2d(p * 11.0 + warp1 * 0.5 + vec2(-t * 0.25, t * 0.28))
  );

  // Micro-mesh coordinate: high frequency for fine filamentous web (~20-30 cells across)
  float baseDensity = 18.5 * u_scale;
  vec2 causticsCoord = p * baseDensity + warp1 * 0.32 + warp2 * 0.14;

  // Octave 1: Major fine caustic network
  vec3 v1 = voronoi(causticsCoord, t * 0.92);
  // Octave 2: Secondary micro-wavelets for organic complexity
  vec3 v2 = voronoi(causticsCoord * 1.72 + vec2(1.9, 3.4), t * 1.28 + 1.8);

  // Razor-sharp physical caustic ridge formula (hair-thin filaments, not wide light pipes!)
  float sharpness = max(0.2, u_meshSharpness);
  float dist1 = max(0.0, v1.y);
  float dist2 = max(0.0, v2.y);

  // Dual-tier ridge curve: tight exponential core + smoothstep halo
  float core1 = exp(-dist1 * (52.0 * sharpness));
  float halo1 = pow(1.0 - smoothstep(0.0, 0.048 / sharpness, dist1), 2.8);
  float ridge1 = core1 * 0.72 + halo1 * 0.58;

  float core2 = exp(-dist2 * (68.0 * sharpness));
  float halo2 = pow(1.0 - smoothstep(0.0, 0.038 / sharpness, dist2), 2.6);
  float ridge2 = core2 * 0.65 + halo2 * 0.50;

  // Combine octaves: complex interwoven web with subtle interference peaks
  float causticPattern = max(ridge1 * 0.90, ridge2 * 0.65) + (ridge1 * ridge2) * 1.35;

  // Vertex hotspots: pinpoint diamond/star glints where caustic ridges intersect
  float nodes = (pow(v1.z, 1.8) * 1.6 + pow(v2.z, 2.0) * 0.9 + pow(ridge1 * ridge2, 2.0) * 1.5) * u_nodeSparkle;

  // Vertical chromatic transition:
  // Top: vibrant oceanic cyan/aqua (sky and upper light)
  // Bottom: lush emerald green (submerged weed and lower depths)
  float verticalFactor = clamp(uv.y * 1.15 - 0.05 + sin(p.x * 2.5 + t * 0.4) * 0.03, 0.0, 1.0);
  vec3 waterBaseColor = mix(u_topColor, u_bottomColor, smoothstep(0.18, 0.82, verticalFactor));

  // Subject Center Mask: Angler and Bass are in the central core
  // Center clarity attenuation keeps the subject crisp and clear, while edges, sky, and grass have rich caustics
  vec2 subjectCenter = vec2(0.5 * aspect, 0.47);
  vec2 centerVec = (vec2(p.x, uv.y) - subjectCenter) * vec2(1.0, 1.15);
  float distToCenter = length(centerVec);

  // Smooth subject relief: center receives soft subtle caustics (~20%) so fish and angler remain distinct
  float subjectHole = smoothstep(0.14, 0.60, distToCenter);
  float centerClarityMask = mix(1.0, mix(0.18, 1.0, subjectHole), u_centerClarity);

  // Border & vignette boost (outer perimeter and frame gather richer refractive light)
  float borderBoost = 1.0 + 0.55 * smoothstep(0.25, 0.78, distToCenter);

  // Color composition:
  // 1. Filament web tinted by top-to-bottom cyan-to-emerald gradient
  vec3 webColor = waterBaseColor * (causticPattern * 1.45);

  // 2. Pinpoint sunlight diamond glints at node intersections
  vec3 sunGlint = u_highlightColor * (nodes * 2.3);

  // Total luminous intensity with subject mask and border boost
  float totalScale = u_intensity * centerClarityMask * borderBoost;
  vec3 finalRgb = (webColor + sunGlint) * totalScale;

  // Soft tone-mapping to prevent blinding solid-white blowout while maintaining vivid luminescence
  finalRgb = finalRgb / (1.0 + finalRgb * 0.25);

  // Alpha for composite blending
  float alpha = clamp(
    (causticPattern * 0.85 + nodes * 0.90) * totalScale,
    0.0,
    0.98
  );

  gl_FragColor = vec4(finalRgb, alpha);
}
`;

export function createSubmergedMeshOverlay(
  container: HTMLElement,
  initialConfig: SubmergedCausticsConfig = DEFAULT_SUBMERGED_CONFIG
): SubmergedMeshHandle {
  let config = { ...initialConfig };
  let isDestroyed = false;
  let isRunning = true;
  let animId = 0;
  let startTime = performance.now();
  let pausedTime = 0;
  let lastTime = startTime;

  // Create canvas element
  const canvas = document.createElement("canvas");
  canvas.className = "submerged-caustics-canvas absolute inset-0 w-full h-full pointer-events-none z-10";
  canvas.style.position = "absolute";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.mixBlendMode = config.blendMode;
  canvas.style.pointerEvents = "none";
  canvas.setAttribute("aria-hidden", "true");

  container.appendChild(canvas);

  // Attempt WebGL initialization
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
    powerPreference: "high-performance",
  });

  if (!gl) {
    console.warn("WebGL not available for submerged mesh caustics, falling back to Canvas 2D");
    return createFallback2DHandle(canvas, config);
  }

  // Compile shaders
  function createShader(glCtx: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
    const s = glCtx.createShader(type);
    if (!s) return null;
    glCtx.shaderSource(s, source);
    glCtx.compileShader(s);
    if (!glCtx.getShaderParameter(s, glCtx.COMPILE_STATUS)) {
      console.error("Shader compile failed:", glCtx.getShaderInfoLog(s));
      glCtx.deleteShader(s);
      return null;
    }
    return s;
  }

  const vs = createShader(gl, gl.VERTEX_SHADER, VS_SOURCE);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, FS_SOURCE);

  if (!vs || !fs) {
    return createFallback2DHandle(canvas, config);
  }

  const program = gl.createProgram();
  if (!program) {
    return createFallback2DHandle(canvas, config);
  }

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link failed:", gl.getProgramInfoLog(program));
    return createFallback2DHandle(canvas, config);
  }

  gl.useProgram(program);

  // Full-screen quad geometry
  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  const aPosition = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  // Uniform locations
  const uResolution = gl.getUniformLocation(program, "u_resolution");
  const uTime = gl.getUniformLocation(program, "u_time");
  const uIntensity = gl.getUniformLocation(program, "u_intensity");
  const uScale = gl.getUniformLocation(program, "u_scale");
  const uTopColor = gl.getUniformLocation(program, "u_topColor");
  const uBottomColor = gl.getUniformLocation(program, "u_bottomColor");
  const uHighlightColor = gl.getUniformLocation(program, "u_highlightColor");
  const uNodeSparkle = gl.getUniformLocation(program, "u_nodeSparkle");
  const uMeshSharpness = gl.getUniformLocation(program, "u_meshSharpness");
  const uCenterClarity = gl.getUniformLocation(program, "u_centerClarity");

  // Resize handler
  function resize() {
    if (!canvas.parentElement) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl?.viewport(0, 0, width, height);
    }
  }

  const resizeObserver = new ResizeObserver(() => {
    resize();
  });
  resizeObserver.observe(container);
  resize();

  // Render loop
  function render(now: number) {
    if (isDestroyed) return;

    if (isRunning) {
      const dt = (now - lastTime) * 0.001;
      lastTime = now;
      pausedTime += dt * config.speed;

      gl!.viewport(0, 0, canvas.width, canvas.height);
      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);

      gl!.useProgram(program);

      // Set uniforms
      gl!.uniform2f(uResolution, canvas.width, canvas.height);
      gl!.uniform1f(uTime, pausedTime);
      gl!.uniform1f(uIntensity, config.intensity);
      gl!.uniform1f(uScale, config.scale);

      const topRgb = hexToRgb(config.topColor);
      gl!.uniform3f(uTopColor, topRgb[0], topRgb[1], topRgb[2]);

      const botRgb = hexToRgb(config.bottomColor);
      gl!.uniform3f(uBottomColor, botRgb[0], botRgb[1], botRgb[2]);

      const highRgb = hexToRgb(config.highlightColor);
      gl!.uniform3f(uHighlightColor, highRgb[0], highRgb[1], highRgb[2]);

      gl!.uniform1f(uNodeSparkle, config.nodeSparkle);
      gl!.uniform1f(uMeshSharpness, config.meshSharpness);
      gl!.uniform1f(uCenterClarity, config.centerClarity);

      gl!.drawArrays(gl!.TRIANGLES, 0, 6);
    } else {
      lastTime = now;
    }

    animId = requestAnimationFrame(render);
  }

  animId = requestAnimationFrame(render);

  return {
    canvas,
    rendererKind: "webgl",
    updateConfig(newConfig: Partial<SubmergedCausticsConfig>) {
      config = { ...config, ...newConfig };
      if (newConfig.blendMode) {
        canvas.style.mixBlendMode = newConfig.blendMode;
      }
    },
    destroy() {
      isDestroyed = true;
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      if (gl) {
        if (vs) gl.deleteShader(vs);
        if (fs) gl.deleteShader(fs);
        if (program) gl.deleteProgram(program);
        if (posBuffer) gl.deleteBuffer(posBuffer);
      }
      canvas.remove();
    },
    pause() {
      isRunning = false;
    },
    resume() {
      isRunning = true;
      lastTime = performance.now();
    },
  };
}

/**
 * Lightweight 2D Canvas Fallback in case WebGL is unavailable
 */
function createFallback2DHandle(
  canvas: HTMLCanvasElement,
  initialConfig: SubmergedCausticsConfig
): SubmergedMeshHandle {
  let config = { ...initialConfig };
  let isDestroyed = false;
  let isRunning = true;
  let animId = 0;
  let time = 0;

  const ctx = canvas.getContext("2d");

  function render() {
    if (isDestroyed || !ctx) return;
    if (isRunning) {
      time += 0.016 * config.speed;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Render simplified caustics mesh using Canvas2D arcs and sine waves
      ctx.save();
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, config.topColor);
      grad.addColorStop(1, config.bottomColor);

      ctx.strokeStyle = grad;
      ctx.lineWidth = 2 * config.meshSharpness;
      ctx.globalAlpha = Math.min(1, config.intensity * 0.7);

      const step = 40 / config.scale;
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        for (let x = 0; x < w; x += 10) {
          const wave = Math.sin(x * 0.02 + time * 2) * Math.cos(y * 0.02 + time * 1.5) * 12;
          if (x === 0) ctx.moveTo(x, y + wave);
          else ctx.lineTo(x, y + wave);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    animId = requestAnimationFrame(render);
  }

  animId = requestAnimationFrame(render);

  return {
    canvas,
    rendererKind: "canvas2d",
    updateConfig(newConfig: Partial<SubmergedCausticsConfig>) {
      config = { ...config, ...newConfig };
      if (newConfig.blendMode) {
        canvas.style.mixBlendMode = newConfig.blendMode;
      }
    },
    destroy() {
      isDestroyed = true;
      cancelAnimationFrame(animId);
      canvas.remove();
    },
    pause() {
      isRunning = false;
    },
    resume() {
      isRunning = true;
    },
  };
}
