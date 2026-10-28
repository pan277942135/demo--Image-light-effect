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
  intensity: number;       // Overall brightness (0.1 - 2.0, default 0.85)
  speed: number;           // Animation speed (0.05 - 1.5, default 0.35)
  scale: number;           // Mesh cell frequency/density (0.4 - 3.0, default 1.15)
  topColor: string;        // Sky/upper water tint (default #06B6D4)
  bottomColor: string;     // Ground/lower water tint (default #059669)
  highlightColor: string;  // Sunlight focus/node color (default #FEF08A)
  nodeSparkle: number;     // Intensity of intersection vertex glints (0.0 - 1.5, default 0.8)
  meshSharpness: number;   // Caustic ridge sharpness (0.2 - 1.5, default 0.85)
  centerClarity: number;   // Attenuation at image center (0.0 = full uniform coverage, 0.5 = slight relief, default 0.15)
  blendMode: "screen" | "lighter" | "normal" | "overlay" | "soft-light";
}

export const DEFAULT_SUBMERGED_CONFIG: SubmergedCausticsConfig = {
  intensity: 0.88,
  speed: 0.32,
  scale: 1.15,
  topColor: "#00d4ff",
  bottomColor: "#059669",
  highlightColor: "#fff1a8",
  nodeSparkle: 0.85,
  meshSharpness: 0.9,
  centerClarity: 0.15,
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
// Returns vec3(d1, d2, nodeIntensity)
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
      // Fluid undulating motion for each seed point
      o = 0.5 + 0.45 * sin(t * 1.5 + 6.2831 * o);
      vec2 r = g + o - f;
      float d = dot(r, r);

      if (d < md) {
        md = d;
        mr = r;
        mg = g;
      }
    }
  }

  // Second pass: find second closest cell for sharp border ridges and vertex nodes
  float md2 = 8.0;
  for (int j = -2; j <= 2; j++) {
    for (int i = -2; i <= 2; i++) {
      vec2 g = mg + vec2(float(i), float(j));
      vec2 o = hash2(n + g);
      o = 0.5 + 0.45 * sin(t * 1.5 + 6.2831 * o);
      vec2 r = g + o - f;

      if (dot(mr - r, mr - r) > 0.00001) {
        // Distance to the bisector line between the two cells
        float d = dot(0.5 * (mr + r), normalize(r - mr));
        md2 = min(md2, d);
      }
    }
  }

  // Node intensity: maximum at triple intersections / cell vertices
  float node = exp(-max(0.0, md2) * 14.0);

  return vec3(sqrt(md), md2, node);
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / max(1.0, u_resolution.y);

  // Correct aspect ratio for isotropic hexagonal caustic shapes
  vec2 p = uv;
  p.x *= aspect;

  float t = u_time * 0.8;

  // Organic domain warping: simulated surface water ripples
  vec2 warp1 = vec2(
    noise2d(p * 2.2 + vec2(t * 0.4, t * 0.3)),
    noise2d(p * 2.2 + vec2(-t * 0.35, t * 0.45))
  );

  vec2 warp2 = vec2(
    noise2d(p * 4.5 + warp1 * 0.6 + vec2(t * 0.2, -t * 0.25)),
    noise2d(p * 4.5 + warp1 * 0.6 + vec2(-t * 0.28, t * 0.32))
  );

  vec2 causticsCoord = p * (u_scale * 4.0) + warp1 * 0.35 + warp2 * 0.15;

  // Octave 1: Major caustic network
  vec3 v1 = voronoi(causticsCoord, t * 0.9);
  // Octave 2: Finer secondary wavelets
  vec3 v2 = voronoi(causticsCoord * 1.85 + vec2(1.7, 3.2), t * 1.35 + 2.4);

  // Caustic ridge formula: intense razor-sharp bright edges
  float ridge1 = 1.0 - smoothstep(0.0, 0.18 / max(0.1, u_meshSharpness), v1.y);
  ridge1 = pow(ridge1, 2.2);

  float ridge2 = 1.0 - smoothstep(0.0, 0.14 / max(0.1, u_meshSharpness), v2.y);
  ridge2 = pow(ridge2, 2.4);

  // Combine octaves with organic depth
  float causticPattern = ridge1 * 0.75 + ridge2 * 0.45 + (ridge1 * ridge2) * 1.2;

  // Vertex hotspots (shining star-burst nodes where caustics meet)
  float nodes = (v1.z * 1.4 + v2.z * 0.8 + (v1.z * v2.z) * 3.0) * u_nodeSparkle;

  // Vertical color gradient:
  // Top (uv.y -> 0 in standard UV or 1 depending on coord, here uv.y = 0 is top)
  // Let top be uv.y close to 0, bottom uv.y close to 1
  float verticalFactor = clamp(uv.y * 1.1 - 0.05, 0.0, 1.0);
  vec3 waterBaseColor = mix(u_topColor, u_bottomColor, verticalFactor);

  // Center clarity attenuation (keeps subject visible while enjoying rich surround caustics)
  vec2 centerVec = (uv - vec2(0.5, 0.5)) * vec2(aspect, 1.0);
  float distToCenter = length(centerVec);
  float centerMask = mix(1.0, smoothstep(0.1, 0.75, distToCenter), u_centerClarity);

  // Edge vignetting / edge boost (edges naturally gather more refractive light)
  float edgeBoost = 1.0 + 0.45 * smoothstep(0.25, 0.8, distToCenter);

  // Combine color layers
  // 1. Water color web
  vec3 webColor = waterBaseColor * (causticPattern * 1.35);

  // 2. Sunlight highlight glints at intersections
  vec3 sunGlint = u_highlightColor * (nodes * 2.2 + pow(causticPattern, 3.0) * 1.1);

  // Total luminance
  vec3 finalRgb = (webColor + sunGlint) * u_intensity * centerMask * edgeBoost;

  // Alpha for composite blending
  float alpha = clamp(
    (causticPattern * 0.75 + nodes * 1.2) * u_intensity * centerMask * edgeBoost,
    0.0,
    1.0
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
