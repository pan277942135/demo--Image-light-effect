import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  mountWaterCaustics,
  type WaterCausticsHandle,
  type WaterCausticsOptions,
} from "../water-caustics";
import {
  createFishCatchOverlay,
  type FishCatchEngineHandle,
  type DiffusionStatus,
  type FishCatchCausticsConfig,
} from "../water-caustics/fish-catch-caustics";
import {
  createSubmergedMeshOverlay,
  type SubmergedMeshHandle,
  type SubmergedCausticsConfig,
  DEFAULT_SUBMERGED_CONFIG,
} from "../water-caustics/submerged-caustic-mesh";
import type { BackgroundItem } from "../constants/presets";

interface WaterStageProps {
  options: WaterCausticsOptions;
  fishCatchConfig: FishCatchCausticsConfig;
  submergedConfig?: SubmergedCausticsConfig;
  isPaused: boolean;
  background: BackgroundItem;
  customImageUrl?: string | null;
  onRendererDetected: (kind: string, error?: string) => void;
  onFpsUpdate: (fps: number) => void;
  onDiffusionStatusChange?: (status: DiffusionStatus, progress: number) => void;
  replayTrigger?: number;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

export const WaterStage: React.FC<WaterStageProps> = ({
  options,
  fishCatchConfig,
  submergedConfig = DEFAULT_SUBMERGED_CONFIG,
  isPaused,
  background,
  customImageUrl,
  onRendererDetected,
  onFpsUpdate,
  onDiffusionStatusChange,
  replayTrigger,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const photoContainerRef = useRef<HTMLDivElement>(null);

  // General WebGL water caustics handle (for other scenes)
  const handleRef = useRef<WaterCausticsHandle | null>(null);

  // Dedicated Canvas 2D fish-catch caustics handle
  const fishCatchHandleRef = useRef<FishCatchEngineHandle | null>(null);

  // Dedicated WebGL submerged-mesh caustics handle
  const submergedHandleRef = useRef<SubmergedMeshHandle | null>(null);

  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);
  const [photoAspectRatio, setPhotoAspectRatio] = useState<number>(941 / 1672);
  const [isShaking, setIsShaking] = useState(false);
  const shakeTimeoutRef = useRef<number | null>(null);

  const isSubmergedMesh = Boolean(
    background.isSubmergedMesh ||
    background.id === "bass-caustic-photo" ||
    background.id === "submerged-caustic-mesh"
  );

  const isFishCatch = Boolean(
    !isSubmergedMesh && (
      background.isFishCatch ||
      background.id === "fish-catch-recognition" ||
      background.id === "fish-catch-photo"
    )
  );

  const triggerShake = useCallback(() => {
    setIsShaking(false);
    requestAnimationFrame(() => {
      setIsShaking(true);
      if (shakeTimeoutRef.current) {
        clearTimeout(shakeTimeoutRef.current);
      }
      shakeTimeoutRef.current = window.setTimeout(() => {
        setIsShaking(false);
      }, 920);
    });
  }, []);

  // Replay fish catch diffusion and trigger photo shake
  useEffect(() => {
    if (isFishCatch && fishCatchHandleRef.current && replayTrigger) {
      fishCatchHandleRef.current.replay();
      triggerShake();
    }
  }, [replayTrigger, isFishCatch, triggerShake]);

  // Mount effect depending on scene
  useEffect(() => {
    // 1. Cleanup any previous instances
    if (handleRef.current) {
      handleRef.current.destroy();
      handleRef.current = null;
    }
    if (fishCatchHandleRef.current) {
      fishCatchHandleRef.current.destroy();
      fishCatchHandleRef.current = null;
    }
    if (submergedHandleRef.current) {
      submergedHandleRef.current.destroy();
      submergedHandleRef.current = null;
    }

    // 2. Initialize Submerged Mesh Caustics Scene (WebGL Shader Network)
    if (isSubmergedMesh) {
      if (!photoContainerRef.current) return;
      try {
        const handle = createSubmergedMeshOverlay(
          photoContainerRef.current,
          submergedConfig
        );
        submergedHandleRef.current = handle;
        onRendererDetected(handle.rendererKind || "webgl");
        if (isPaused) {
          handle.pause();
        }
      } catch (err) {
        console.error("Failed to mount submerged-mesh caustics:", err);
        onRendererDetected("unsupported", String(err));
      }

      return () => {
        if (submergedHandleRef.current) {
          submergedHandleRef.current.destroy();
          submergedHandleRef.current = null;
        }
      };
    }

    // 3. Initialize Fish Catch Scene (Canvas 2D)
    if (isFishCatch) {
      if (!photoContainerRef.current) return;
      try {
        const handle = createFishCatchOverlay(
          photoContainerRef.current,
          fishCatchConfig,
          (status, progress) => {
            onDiffusionStatusChange?.(status, progress);
          }
        );
        fishCatchHandleRef.current = handle;
        onRendererDetected(handle.rendererKind || "webgl");
      } catch (err) {
        console.error("Failed to mount fish-catch caustics:", err);
        onRendererDetected("unsupported", String(err));
      }

      return () => {
        if (fishCatchHandleRef.current) {
          fishCatchHandleRef.current.destroy();
          fishCatchHandleRef.current = null;
        }
      };
    }

    // 4. Initialize Standard WebGL Scenes
    if (!containerRef.current) return;
    try {
      const handle = mountWaterCaustics(containerRef.current, {
        ...options,
      });
      handleRef.current = handle;

      const kind = handle.canvas.dataset.waterCaustics || "webgl";
      const err = handle.canvas.dataset.waterCausticsError;
      onRendererDetected(kind, err);

      if (isPaused) {
        handle.pause();
      }
    } catch (err) {
      console.error("Failed to mount standard water-caustics:", err);
      onRendererDetected("unsupported", String(err));
    }

    return () => {
      if (handleRef.current) {
        handleRef.current.destroy();
        handleRef.current = null;
      }
    };
  }, [isSubmergedMesh, isFishCatch, background.id]);

  // Sync config updates
  useEffect(() => {
    if (isSubmergedMesh && submergedHandleRef.current) {
      submergedHandleRef.current.updateConfig(submergedConfig);
    } else if (isFishCatch && fishCatchHandleRef.current) {
      fishCatchHandleRef.current.updateConfig(fishCatchConfig);
    } else if (handleRef.current) {
      handleRef.current.setOptions(options);
    }
  }, [options, fishCatchConfig, submergedConfig, isSubmergedMesh, isFishCatch]);

  // Sync pause state for active scenes
  useEffect(() => {
    if (isSubmergedMesh && submergedHandleRef.current) {
      if (isPaused) {
        submergedHandleRef.current.pause();
      } else {
        submergedHandleRef.current.resume();
      }
    } else if (!isFishCatch && handleRef.current) {
      if (isPaused) {
        handleRef.current.pause();
      } else {
        handleRef.current.resume();
      }
    }
  }, [isPaused, isSubmergedMesh, isFishCatch]);

  // Measure FPS
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animId = 0;

    const measure = (now: number) => {
      frameCount++;
      if (now - lastTime >= 1000) {
        const currentFps = Math.round((frameCount * 1000) / (now - lastTime));
        onFpsUpdate(currentFps);
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(measure);
    };

    animId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(animId);
  }, [onFpsUpdate]);

  // Handle pointer down (replay diffusion in fish catch scene, subtle ripple in standard)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isFishCatch) {
        // Replay the upward scan diffusion and trigger tactile photo shake
        fishCatchHandleRef.current?.replay();
        triggerShake();
        return;
      }

      // Subtle ripple for standard scenes
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const newRipple: Ripple = {
        id: ++rippleIdRef.current,
        x,
        y,
        size: 140,
      };

      setRipples((prev) => [...prev.slice(-4), newRipple]);

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 900);
    },
    [isFishCatch, triggerShake]
  );

  // Compute background styling for standard scenes
  const getStandardBackgroundStyle = (): React.CSSProperties => {
    if (background.id === "custom" && customImageUrl) {
      return {
        backgroundImage: `url(${customImageUrl})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
      };
    }

    if (background.type === "image" && background.src) {
      return {
        backgroundColor: "#d8d0ae",
        backgroundImage: `url("${background.src}")`,
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
      };
    }

    return background.cssStyle || {};
  };

  // If Submerged Mesh Caustics Scene: Frame the photo with immersive dual-tone ambient aura
  if (isSubmergedMesh) {
    const photoSrc =
      customImageUrl ||
      background.src ||
      "/assets/aistudio/file_00000000721c8211b87c16d11ab3573e_fe604d9b.png";

    return (
      <div
        className="fixed inset-0 w-full h-full bg-[#04080b] flex items-center justify-center overflow-hidden p-2 sm:p-5 select-none"
        onPointerDown={handlePointerDown}
      >
        {/* Dual-tone atmospheric background aura matching top/bottom colors */}
        <div
          className="absolute w-[min(94vw,720px)] h-[min(94vh,980px)] pointer-events-none rounded-3xl opacity-60 blur-3xl transition-opacity duration-1000"
          style={{
            background: `radial-gradient(ellipse at 50% 20%, ${submergedConfig.topColor}33 0%, transparent 60%),
                         radial-gradient(ellipse at 50% 80%, ${submergedConfig.bottomColor}33 0%, transparent 60%)`,
          }}
        />

        {/* Real photo container with submerged caustic canvas overlay */}
        <div
          ref={photoContainerRef}
          id="photo-container"
          className="relative max-h-[88vh] h-full max-w-full rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-white/20 bg-neutral-900 group cursor-pointer flex items-center justify-center transition-shadow hover:shadow-[0_0_40px_rgba(6,182,212,0.35)]"
          style={{ aspectRatio: `${photoAspectRatio}` }}
        >
          {/* Photo kept 100% visible and uncropped */}
          <img
            src={photoSrc}
            alt="水下折射实拍对照照片"
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth && img.naturalHeight) {
                setPhotoAspectRatio(img.naturalWidth / img.naturalHeight);
              }
            }}
            className="w-full h-full object-cover select-none pointer-events-none"
            draggable={false}
          />

          {/* Interactive Replay & Guidance Pill */}
          <div className="absolute top-3.5 left-3.5 z-10 pointer-events-none px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-cyan-400/30 text-[11px] text-cyan-200 flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-medium text-white/95">
              水下光织 · 全域双色波光网 (顶部碧蓝 · 底部翡翠 · 节点金斑)
            </span>
          </div>

          {/* Bottom badge indicator */}
          <div className="absolute bottom-3 right-3 z-10 pointer-events-none px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] text-neutral-300 flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>沉浸焦散 · 独立 Shader 引擎</span>
          </div>
        </div>
      </div>
    );
  }

  // If Fish Catch Scene: Frame the real photo with high fidelity
  if (isFishCatch) {
    const photoSrc =
      customImageUrl ||
      background.src ||
      "/assets/aistudio/content_4f0bda4d.jpg";

    return (
      <div
        className="fixed inset-0 w-full h-full bg-[#05090c] flex items-center justify-center overflow-hidden p-2 sm:p-5 select-none"
        onPointerDown={handlePointerDown}
      >
        {/* Outer wide-spread atmospheric water reflection aura (范围比原视频大) */}
        <div
          className="absolute w-[min(90vw,650px)] h-[min(90vh,950px)] pointer-events-none rounded-3xl opacity-50 blur-3xl transition-opacity duration-1000"
          style={{
            background:
              "radial-gradient(ellipse at 50% 70%, rgba(56, 189, 248, 0.25) 0%, rgba(254, 240, 138, 0.16) 40%, rgba(45, 212, 191, 0.12) 65%, transparent 80%)",
          }}
        />

        {/* Real photo container with tactile spring shockwave shake & four-sided water aura */}
        <div
          ref={photoContainerRef}
          id="photo-container"
          className={`relative max-h-[88vh] h-full max-w-full rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-neutral-900 group cursor-pointer flex items-center justify-center transition-shadow ${
            isShaking ? "animate-photo-shake shadow-[0_0_50px_rgba(56,189,248,0.35)]" : "shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
          }`}
          style={{ aspectRatio: `${photoAspectRatio}` }}
        >
          {/* Real Photo kept 100% visible and uncropped */}
          <img
            src={photoSrc}
            alt="渔见真实鱼获识别照片"
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth && img.naturalHeight) {
                setPhotoAspectRatio(img.naturalWidth / img.naturalHeight);
              }
            }}
            className="w-full h-full object-cover select-none pointer-events-none"
            draggable={false}
          />

          {/* Interactive Replay & Motion Guidance Pill */}
          <div className="absolute top-3.5 left-3.5 z-10 pointer-events-none px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-md border border-white/15 text-[11px] text-cyan-200 flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
            <span className="font-medium text-white/95">
              {isShaking
                ? "四周光效流转展开 · 照片微震反馈中..."
                : "水光固定四周 · 持续流转中 (点击照片重新触发)"}
            </span>
          </div>

          {/* Bottom badge indicator */}
          <div className="absolute bottom-3 right-3 z-10 pointer-events-none px-2.5 py-1 rounded-md bg-black/55 backdrop-blur-md border border-white/10 text-[10px] text-neutral-300 flex items-center gap-1.5 opacity-75 group-hover:opacity-100 transition-opacity">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>渔见 AI · 宽幅水光常驻流转</span>
          </div>
        </div>
      </div>
    );
  }

  // Standard Scenes
  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      className="fixed inset-0 w-full h-full overflow-hidden select-none cursor-pointer"
      style={getStandardBackgroundStyle()}
      role="img"
      aria-label="Scene with shimmering water caustics"
    >
      {/* Ripples for standard scenes */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2 animate-ping"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            border: "1.5px solid rgba(255, 255, 255, 0.35)",
            boxShadow:
              "0 0 20px rgba(165, 243, 252, 0.4), inset 0 0 15px rgba(255, 255, 255, 0.3)",
            animationDuration: "0.9s",
          }}
        />
      ))}
    </div>
  );
};
