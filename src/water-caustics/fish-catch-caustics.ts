/**
 * Fish Catch Recognition (渔见识别) - High-Fidelity Water-Light Aura & Caustics Shader Engine
 *
 * Specific Enhancements:
 * 1. Shader-level Chromatic Blend: Blue light + Sunlight Pale-Gold + Aquatic Emerald Green
 *    interwoven seamlessly via fluid wave normals and solar catch, avoiding harsh color separation.
 * 2. Enhanced Bottom-up Linear Gradient Mask:
 *    Rich, organic caustics and shimmering light spots pool heavily at the bottom photo/waterline
 *    and smoothly attenuate upwards to keep the catch and angler crystal clear.
 * 3. Natural Light Spots (光斑):
 *    Shimmering morning sun bokeh light spots floating gently with micro-breeze undulation.
 * 4. Four-Sided Fluid Perimeter Aura:
 *    Refined four-sided luminous wave ribbon matching reference design with Screen blend mode.
 * 5. Lifecycle: Bottom-to-top spread (0-1200ms) -> Perpetual natural micro-breeze shimmering.
 */

import { parseCssColor } from "./color";
import { createFullscreenTriangle, createProgram, getGl } from "./gl";
import { FISH_CATCH_FRAG_SRC, VERT_SRC } from "./shaders";

export interface FishCatchCausticsConfig {
  sceneId: "fish-catch-recognition";
  displayName: "鱼获识别";
  spreadDurationMs: number; // 1200ms spread
  intensity: number; // 0.85 (glow intensity)
  speed: number; // 0.65 (fluid ripple speed)
  marginRatio: number; // ~0.042 (distance from photo edge)
  glowSize: number; // ~14px (bloom width)
  goldColor: string; // "#FEF08A" (morning sunlight pale gold)
  cyanColor: string; // "#38BDF8" (morning sky/water blue)
  greenColor: string; // "#2DD4BF" (aquatic emerald green)
  bottomMaskStrength: number; // 1.0 (enhanced bottom-to-top linear gradient mask)
  blendRatio: number; // 0.75 (intertwine blue, green, and golden light)
  causticsDensity: number; // 0.85
  blendMode: string; // "screen"
}

export const DEFAULT_FISH_CATCH_CONFIG: FishCatchCausticsConfig = {
  sceneId: "fish-catch-recognition",
  displayName: "鱼获识别",
  spreadDurationMs: 1100,
  intensity: 0.92,
  speed: 0.65,
  marginRatio: 0.040,
  glowSize: 24, // Wider aura envelope matching user requirement (范围比原视频大)
  goldColor: "#FEF08A",
  cyanColor: "#38BDF8",
  greenColor: "#2DD4BF",
  bottomMaskStrength: 0.85,
  blendRatio: 0.75,
  causticsDensity: 0.85,
  blendMode: "screen",
};

export type DiffusionStatus = "SPREADING" | "STABLE_PLAYING";

export interface FishCatchEngineHandle {
  canvas: HTMLCanvasElement;
  readonly rendererKind: "webgl" | "canvas2d";
  readonly status: DiffusionStatus;
  readonly progress: number;
  readonly isPaused: boolean;
  replay: () => void;
  pause: () => void;
  resume: () => void;
  updateConfig: (next: Partial<FishCatchCausticsConfig>) => void;
  resize: () => void;
  destroy: () => void;
}

interface Point {
  x: number;
  y: number;
  nx: number;
  ny: number;
  tParam: number;
}

function toRgba(hexOrCss: string, alpha: number): string {
  if (hexOrCss.startsWith("#")) {
    let hex = hexOrCss.slice(1);
    if (hex.length === 3) {
      hex = hex.split("").map((c) => c + c).join("");
    }
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return hexOrCss;
}

/**
 * Smooth rounded perimeter anchor points for the photo
 */
function generatePerimeterPath(
  width: number,
  height: number,
  margin: number,
  cornerR: number,
  subdivisions: number = 260
): Point[] {
  const left = margin;
  const right = width - margin;
  const top = margin;
  const bottom = height - margin;
  const r = Math.min(cornerR, (right - left) / 2, (bottom - top) / 2);

  const straightW = right - left - 2 * r;
  const straightH = bottom - top - 2 * r;
  const cornerArc = (Math.PI / 2) * r;
  const totalPerimeter = 2 * straightW + 2 * straightH + 4 * cornerArc;

  const points: Point[] = [];

  for (let i = 0; i < subdivisions; i++) {
    const s = (i / subdivisions) * totalPerimeter;
    let x = 0;
    let y = 0;
    let nx = 0;
    let ny = 0;

    const len1 = straightW / 2;
    const len2 = len1 + cornerArc;
    const len3 = len2 + straightH;
    const len4 = len3 + cornerArc;
    const len5 = len4 + straightW;
    const len6 = len5 + cornerArc;
    const len7 = len6 + straightH;
    const len8 = len7 + cornerArc;

    if (s < len1) {
      x = left + r + straightW / 2 + s;
      y = bottom;
      nx = 0;
      ny = 1;
    } else if (s < len2) {
      const arcDist = s - len1;
      const angle = (arcDist / cornerArc) * (Math.PI / 2);
      const cx = right - r;
      const cy = bottom - r;
      x = cx + Math.sin(angle) * r;
      y = cy + Math.cos(angle) * r;
      nx = Math.sin(angle);
      ny = Math.cos(angle);
    } else if (s < len3) {
      const dist = s - len2;
      x = right;
      y = bottom - r - dist;
      nx = 1;
      ny = 0;
    } else if (s < len4) {
      const arcDist = s - len3;
      const angle = (arcDist / cornerArc) * (Math.PI / 2);
      const cx = right - r;
      const cy = top + r;
      x = cx + Math.cos(angle) * r;
      y = cy - Math.sin(angle) * r;
      nx = Math.cos(angle);
      ny = -Math.sin(angle);
    } else if (s < len5) {
      const dist = s - len4;
      x = right - r - dist;
      y = top;
      nx = 0;
      ny = -1;
    } else if (s < len6) {
      const arcDist = s - len5;
      const angle = (arcDist / cornerArc) * (Math.PI / 2);
      const cx = left + r;
      const cy = top + r;
      x = cx - Math.sin(angle) * r;
      y = cy - Math.cos(angle) * r;
      nx = -Math.sin(angle);
      ny = -Math.cos(angle);
    } else if (s < len7) {
      const dist = s - len6;
      x = left;
      y = top + r + dist;
      nx = -1;
      ny = 0;
    } else if (s < len8) {
      const arcDist = s - len7;
      const angle = (arcDist / cornerArc) * (Math.PI / 2);
      const cx = left + r;
      const cy = bottom - r;
      x = cx - Math.sin(angle) * r;
      y = cy + Math.cos(angle) * r;
      nx = -Math.sin(angle);
      ny = Math.sin(angle);
    } else {
      const dist = s - len8;
      x = left + r + dist;
      y = bottom;
      nx = 0;
      ny = 1;
    }

    points.push({
      x,
      y,
      nx,
      ny,
      tParam: i / subdivisions,
    });
  }

  return points;
}

/**
 * Creates and mounts the Fish Catch Recognition Water Caustics Engine
 */
export function createFishCatchOverlay(
  container: HTMLElement,
  initialConfig: Partial<FishCatchCausticsConfig> = {},
  onStatusChange?: (status: DiffusionStatus, progress: number) => void
): FishCatchEngineHandle {
  let config: FishCatchCausticsConfig = {
    ...DEFAULT_FISH_CATCH_CONFIG,
    ...initialConfig,
  };

  // Primary Shader Canvas
  const shaderCanvas = document.createElement("canvas");
  shaderCanvas.setAttribute("aria-hidden", "true");
  shaderCanvas.dataset.waterCaustics = "webgl";
  shaderCanvas.dataset.waterCausticsScene = "fish-catch-recognition";

  Object.assign(shaderCanvas.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    display: "block",
    pointerEvents: "none",
    mixBlendMode: config.blendMode || "screen",
  });

  // Secondary Accents 2D Canvas (Sparkle nodes and bottom flourishes matching user reference photo)
  const accentCanvas = document.createElement("canvas");
  accentCanvas.setAttribute("aria-hidden", "true");
  Object.assign(accentCanvas.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    display: "block",
    pointerEvents: "none",
    mixBlendMode: config.blendMode || "screen",
  });

  container.appendChild(shaderCanvas);
  container.appendChild(accentCanvas);

  const accentCtx = accentCanvas.getContext("2d", { alpha: true });

  let status: DiffusionStatus = "SPREADING";
  let progress = 0;
  let startTime = performance.now();
  let pausedAtTime = 0;
  let isPaused = false;
  let rafId = 0;
  let isDestroyed = false;

  let lastW = 0;
  let lastH = 0;
  let cachedPerimeter: Point[] = [];

  // Sparkle Nodes along perimeter
  const SPARKLE_COUNT = 16;
  const sparkles = Array.from({ length: SPARKLE_COUNT }, (_, idx) => ({
    id: idx,
    baseParam: idx / SPARKLE_COUNT,
    speed: 0.012 + (idx % 3) * 0.007,
    size: 2.2 + (idx % 4) * 0.7,
    phase: Math.random() * Math.PI * 2,
  }));

  // Setup WebGL Shader
  let gl: WebGLRenderingContext | null = getGl(shaderCanvas);
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let rendererKind: "webgl" | "canvas2d" = "webgl";

  if (gl) {
    try {
      program = createProgram(gl, VERT_SRC, FISH_CATCH_FRAG_SRC);
      gl.useProgram(program);
      buffer = createFullscreenTriangle(gl, program);

      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
    } catch (err) {
      console.warn("WebGL initialization for FishCatch failed, falling back to 2D:", err);
      gl = null;
      rendererKind = "canvas2d";
    }
  } else {
    rendererKind = "canvas2d";
  }

  // Uniform locations cache
  let uTime: WebGLUniformLocation | null = null;
  let uResolution: WebGLUniformLocation | null = null;
  let uIntensity: WebGLUniformLocation | null = null;
  let uSpreadProgress: WebGLUniformLocation | null = null;
  let uSpeed: WebGLUniformLocation | null = null;
  let uMarginRatio: WebGLUniformLocation | null = null;
  let uGlowSize: WebGLUniformLocation | null = null;
  let uGoldColor: WebGLUniformLocation | null = null;
  let uCyanColor: WebGLUniformLocation | null = null;
  let uGreenColor: WebGLUniformLocation | null = null;
  let uBottomMaskStrength: WebGLUniformLocation | null = null;
  let uBlendRatio: WebGLUniformLocation | null = null;

  if (gl && program) {
    uTime = gl.getUniformLocation(program, "u_time");
    uResolution = gl.getUniformLocation(program, "u_resolution");
    uIntensity = gl.getUniformLocation(program, "u_intensity");
    uSpreadProgress = gl.getUniformLocation(program, "u_spread_progress");
    uSpeed = gl.getUniformLocation(program, "u_speed");
    uMarginRatio = gl.getUniformLocation(program, "u_margin_ratio");
    uGlowSize = gl.getUniformLocation(program, "u_glow_size");
    uGoldColor = gl.getUniformLocation(program, "u_gold_color");
    uCyanColor = gl.getUniformLocation(program, "u_cyan_color");
    uGreenColor = gl.getUniformLocation(program, "u_green_color");
    uBottomMaskStrength = gl.getUniformLocation(program, "u_bottom_mask_strength");
    uBlendRatio = gl.getUniformLocation(program, "u_blend_ratio");
  }

  const resize = () => {
    if (isDestroyed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = container.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));

    const pixelW = cssW * dpr;
    const pixelH = cssH * dpr;

    if (shaderCanvas.width !== pixelW || shaderCanvas.height !== pixelH) {
      shaderCanvas.width = pixelW;
      shaderCanvas.height = pixelH;
    }
    if (accentCanvas.width !== pixelW || accentCanvas.height !== pixelH) {
      accentCanvas.width = pixelW;
      accentCanvas.height = pixelH;
    }

    if (gl) {
      gl.viewport(0, 0, pixelW, pixelH);
    }

    if (cssW !== lastW || cssH !== lastH) {
      lastW = cssW;
      lastH = cssH;
      const margin = Math.min(cssW, cssH) * config.marginRatio;
      const cornerR = Math.min(cssW, cssH) * 0.12;
      cachedPerimeter = generatePerimeterPath(cssW, cssH, margin, cornerR, 280);
    }
  };

  const renderAccents = (timeSec: number, activeCoverage: number) => {
    if (!accentCtx || isDestroyed || cachedPerimeter.length === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = lastW;
    const h = lastH;

    accentCtx.save();
    accentCtx.scale(dpr, dpr);
    accentCtx.clearRect(0, 0, w, h);

    if (activeCoverage <= 0.05) {
      accentCtx.restore();
      return;
    }

    const rightBranchEnd = 0.5 * activeCoverage;
    const leftBranchStart = 1.0 - 0.5 * activeCoverage;

    // 1. Shimmering water sparkle dew nodes along perimeter
    accentCtx.globalCompositeOperation = "screen";

    for (let i = 0; i < sparkles.length; i++) {
      const sp = sparkles[i];
      const pPos = (sp.baseParam + timeSec * sp.speed) % 1.0;

      const isRightActive = pPos <= rightBranchEnd;
      const isLeftActive = pPos >= leftBranchStart;
      if (!isRightActive && !isLeftActive) continue;

      const idx = Math.min(
        cachedPerimeter.length - 1,
        Math.max(0, Math.round(pPos * cachedPerimeter.length))
      );
      const pt = cachedPerimeter[idx];

      const pulse = 0.65 + 0.35 * Math.sin(timeSec * 3.4 + sp.phase);
      const isGold = pPos > 0.45;
      const pColor = isGold ? "#fef08a" : "#e0f2fe";
      const pGlow = isGold ? config.goldColor : config.cyanColor;

      // Soft halo
      accentCtx.beginPath();
      accentCtx.arc(pt.x, pt.y, sp.size * 3.2 * pulse, 0, Math.PI * 2);
      accentCtx.fillStyle = toRgba(pGlow, 0.42 * pulse * config.intensity);
      accentCtx.fill();

      // Sharp core
      accentCtx.beginPath();
      accentCtx.arc(pt.x, pt.y, sp.size * 1.15 * pulse, 0, Math.PI * 2);
      accentCtx.fillStyle = pColor;
      accentCtx.globalAlpha = 0.92 * pulse * config.intensity;
      accentCtx.fill();
    }

    // 2. Delicate bottom center flourishing motif (matching user reference design)
    const bottomMid = cachedPerimeter[0];
    if (bottomMid && activeCoverage > 0.15) {
      const bPulse = 0.75 + 0.25 * Math.sin(timeSec * 2.4);

      // Core center glowing point
      accentCtx.beginPath();
      accentCtx.arc(bottomMid.x, bottomMid.y, 3.0 * bPulse, 0, Math.PI * 2);
      accentCtx.fillStyle = "#ffffff";
      accentCtx.shadowColor = config.goldColor;
      accentCtx.shadowBlur = 8;
      accentCtx.globalAlpha = 0.95 * config.intensity;
      accentCtx.fill();

      // Water line wings (~ · ~)
      accentCtx.beginPath();
      accentCtx.moveTo(bottomMid.x - 38, bottomMid.y);
      accentCtx.quadraticCurveTo(bottomMid.x - 19, bottomMid.y - 2.2, bottomMid.x - 6, bottomMid.y);
      accentCtx.moveTo(bottomMid.x + 6, bottomMid.y);
      accentCtx.quadraticCurveTo(bottomMid.x + 19, bottomMid.y + 2.2, bottomMid.x + 38, bottomMid.y);
      accentCtx.strokeStyle = toRgba(config.goldColor, 0.65 * config.intensity);
      accentCtx.lineWidth = 1.3;
      accentCtx.stroke();

      // Wing tip pearls
      accentCtx.beginPath();
      accentCtx.arc(bottomMid.x - 38, bottomMid.y, 1.4, 0, Math.PI * 2);
      accentCtx.arc(bottomMid.x + 38, bottomMid.y, 1.4, 0, Math.PI * 2);
      accentCtx.fillStyle = "#ffffff";
      accentCtx.shadowColor = config.goldColor;
      accentCtx.shadowBlur = 4;
      accentCtx.fill();
    }

    accentCtx.restore();
  };

  const render = (timeSec: number, spreadProgress: number) => {
    if (isDestroyed) return;

    const goldRgb = parseCssColor(config.goldColor);
    const cyanRgb = parseCssColor(config.cyanColor);
    const greenRgb = parseCssColor(config.greenColor);

    // 1. Render WebGL Shader
    if (gl && program) {
      gl.useProgram(program);
      gl.uniform1f(uTime, timeSec);
      gl.uniform2f(uResolution, shaderCanvas.width, shaderCanvas.height);
      gl.uniform1f(uIntensity, config.intensity);
      gl.uniform1f(uSpreadProgress, spreadProgress);
      gl.uniform1f(uSpeed, config.speed);
      gl.uniform1f(uMarginRatio, config.marginRatio);
      gl.uniform1f(uGlowSize, config.glowSize);
      gl.uniform3f(uGoldColor, goldRgb[0], goldRgb[1], goldRgb[2]);
      gl.uniform3f(uCyanColor, cyanRgb[0], cyanRgb[1], cyanRgb[2]);
      gl.uniform3f(uGreenColor, greenRgb[0], greenRgb[1], greenRgb[2]);
      gl.uniform1f(uBottomMaskStrength, config.bottomMaskStrength);
      gl.uniform1f(uBlendRatio, config.blendRatio);

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // 2. Render Secondary Accents & Sparkles
    renderAccents(timeSec, spreadProgress);
  };

  const loop = (now: number) => {
    if (isDestroyed || isPaused) return;

    const elapsed = now - startTime;
    const timeSec = elapsed * 0.001 * config.speed;

    if (elapsed < config.spreadDurationMs) {
      status = "SPREADING";
      progress = elapsed / config.spreadDurationMs;
      onStatusChange?.(status, progress);
      render(timeSec, progress);
    } else {
      status = "STABLE_PLAYING";
      progress = 1.0;
      onStatusChange?.(status, 1.0);
      render(timeSec, 1.0);
    }

    rafId = requestAnimationFrame(loop);
  };

  const replay = () => {
    if (isDestroyed) return;
    cancelAnimationFrame(rafId);
    startTime = performance.now();
    status = "SPREADING";
    progress = 0;
    isPaused = false;
    onStatusChange?.(status, 0);
    resize();
    rafId = requestAnimationFrame(loop);
  };

  const pause = () => {
    if (isPaused || isDestroyed) return;
    isPaused = true;
    pausedAtTime = performance.now();
    cancelAnimationFrame(rafId);
  };

  const resume = () => {
    if (!isPaused || isDestroyed) return;
    isPaused = false;
    startTime += performance.now() - pausedAtTime;
    rafId = requestAnimationFrame(loop);
  };

  // Mount
  resize();
  startTime = performance.now();
  rafId = requestAnimationFrame(loop);

  const observer = new ResizeObserver(() => {
    if (isDestroyed) return;
    resize();
  });
  observer.observe(container);

  return {
    canvas: shaderCanvas,
    get rendererKind() {
      return rendererKind;
    },
    get status() {
      return status;
    },
    get progress() {
      return progress;
    },
    get isPaused() {
      return isPaused;
    },
    replay,
    pause,
    resume,
    updateConfig(next: Partial<FishCatchCausticsConfig>) {
      if (isDestroyed) return;
      config = { ...config, ...next };
      if (next.blendMode) {
        shaderCanvas.style.mixBlendMode = config.blendMode;
        accentCanvas.style.mixBlendMode = config.blendMode;
      }
    },
    resize,
    destroy() {
      if (isDestroyed) return;
      isDestroyed = true;
      cancelAnimationFrame(rafId);
      observer.disconnect();
      if (gl) {
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
      }
      shaderCanvas.remove();
      accentCanvas.remove();
    },
  };
}
