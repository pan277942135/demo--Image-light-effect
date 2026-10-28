/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from "react";
import { WaterStage } from "./components/WaterStage";
import { TopBar } from "./components/TopBar";
import { HudControl } from "./components/HudControl";
import {
  PRESETS,
  BACKGROUNDS,
  DEFAULT_FISH_CATCH_CONFIG,
  DEFAULT_SUBMERGED_CONFIG,
  type Preset,
  type BackgroundItem,
  type FishCatchCausticsConfig,
  type SubmergedCausticsConfig,
} from "./constants/presets";
import { toggleAmbientSound } from "./utils/ambientAudio";
import type { WaterCausticsOptions } from "./water-caustics";
import type { DiffusionStatus } from "./water-caustics/fish-catch-caustics";
import { Eye, Info, Sparkles } from "lucide-react";

export default function App() {
  // Independent configuration for standard WebGL scenes
  const [standardOptions, setStandardOptions] = useState<WaterCausticsOptions>(
    PRESETS[2]?.options || PRESETS[0].options
  );

  // Independent configuration for dedicated Fish Catch Recognition scene
  const [fishCatchConfig, setFishCatchConfig] = useState<FishCatchCausticsConfig>(
    DEFAULT_FISH_CATCH_CONFIG
  );

  // Independent configuration for dedicated Submerged Mesh Caustic scene (新场景)
  const [submergedConfig, setSubmergedConfig] = useState<SubmergedCausticsConfig>(
    DEFAULT_SUBMERGED_CONFIG
  );

  const [isPaused, setIsPaused] = useState(false);
  const [currentBackground, setCurrentBackground] = useState<BackgroundItem>(
    BACKGROUNDS[0] // Now bass-caustic-photo or fish-catch-photo
  );
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);

  const [rendererType, setRendererType] = useState<string>("webgl");
  const [rendererError, setRendererError] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(60);

  const [diffusionStatus, setDiffusionStatus] = useState<DiffusionStatus>("SPREADING");
  const [diffusionProgress, setDiffusionProgress] = useState<number>(0);
  const [replayTrigger, setReplayTrigger] = useState<number>(0);

  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHudVisible, setIsHudVisible] = useState(true);
  const [showHint, setShowHint] = useState(true);

  const isSubmergedMesh = Boolean(
    currentBackground.isSubmergedMesh ||
    currentBackground.id === "bass-caustic-photo" ||
    currentBackground.id === "submerged-caustic-mesh"
  );

  const isFishCatch = Boolean(
    !isSubmergedMesh && (
      currentBackground.isFishCatch ||
      currentBackground.id === "fish-catch-recognition" ||
      currentBackground.id === "fish-catch-photo"
    )
  );

  // Auto-hide hint after 6 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 7000);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === "h" || e.key === "H") {
        setIsHudVisible((prev) => !prev);
      } else if (e.key === " ") {
        e.preventDefault();
        if (isFishCatch) {
          handleReplayDiffusion();
        } else {
          setIsPaused((prev) => !prev);
        }
      } else if (e.key === "r" || e.key === "R") {
        handleReset();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFishCatch]);

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleToggleSound = () => {
    const nextState = toggleAmbientSound();
    setIsMuted(!nextState);
  };

  const handleReset = () => {
    if (isSubmergedMesh) {
      setSubmergedConfig({ ...DEFAULT_SUBMERGED_CONFIG });
      setIsPaused(false);
    } else if (isFishCatch) {
      setFishCatchConfig({ ...DEFAULT_FISH_CATCH_CONFIG });
      handleReplayDiffusion();
    } else {
      setStandardOptions({ ...PRESETS[2].options });
      setIsPaused(false);
    }
  };

  const handleReplayDiffusion = useCallback(() => {
    setReplayTrigger((prev) => prev + 1);
  }, []);

  const handleChangeStandardOptions = useCallback(
    (opts: Partial<WaterCausticsOptions>) => {
      setStandardOptions((prev) => ({ ...prev, ...opts }));
    },
    []
  );

  const handleChangeFishCatchConfig = useCallback(
    (opts: Partial<FishCatchCausticsConfig>) => {
      setFishCatchConfig((prev) => ({ ...prev, ...opts }));
    },
    []
  );

  const handleChangeSubmergedConfig = useCallback(
    (opts: Partial<SubmergedCausticsConfig>) => {
      setSubmergedConfig((prev) => ({ ...prev, ...opts }));
    },
    []
  );

  const handleSelectBackground = (bg: BackgroundItem) => {
    setCurrentBackground(bg);
    if (bg.isFishCatch || bg.id === "fish-catch-recognition" || bg.id === "fish-catch-photo") {
      handleReplayDiffusion();
    }
  };

  const handleApplyPreset = (preset: Preset) => {
    if (preset.id === "submerged-caustic-mesh") {
      setSubmergedConfig({ ...DEFAULT_SUBMERGED_CONFIG });
      const matchingBg = BACKGROUNDS.find((b) => b.id === preset.backgroundId) || BACKGROUNDS[0];
      setCurrentBackground(matchingBg);
      setIsPaused(false);
    } else if (preset.id === "fish-catch-recognition") {
      setFishCatchConfig({
        ...DEFAULT_FISH_CATCH_CONFIG,
      });
      const matchingBg = BACKGROUNDS.find((b) => b.id === preset.backgroundId);
      if (matchingBg) {
        setCurrentBackground(matchingBg);
      }
      handleReplayDiffusion();
    } else {
      setStandardOptions({ ...preset.options });
      const matchingBg = BACKGROUNDS.find((b) => b.id === preset.backgroundId);
      if (matchingBg) {
        setCurrentBackground(matchingBg);
      }
    }
  };

  const handleUploadCustomImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomImageUrl(url);
      setCurrentBackground({
        id: "custom",
        name: "自定义照片",
        type: "custom",
      });
    }
  };

  const handleRendererDetected = useCallback(
    (kind: string, error?: string) => {
      setRendererType(kind);
      if (error) {
        setRendererError(error);
      } else {
        setRendererError(null);
      }
    },
    []
  );

  const handleDiffusionStatusChange = useCallback(
    (status: DiffusionStatus, progress: number) => {
      setDiffusionStatus(status);
      setDiffusionProgress(progress);
    },
    []
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#070b0e] font-sans select-none">
      {/* Caustics Stage with Background and Overlay */}
      <WaterStage
        options={standardOptions}
        fishCatchConfig={fishCatchConfig}
        submergedConfig={submergedConfig}
        isPaused={isPaused}
        background={currentBackground}
        customImageUrl={customImageUrl}
        onRendererDetected={handleRendererDetected}
        onFpsUpdate={setFps}
        onDiffusionStatusChange={handleDiffusionStatusChange}
        replayTrigger={replayTrigger}
      />

      {/* Top Bar with Repo info, Badges & Quick actions */}
      <TopBar
        isMuted={isMuted}
        onToggleSound={handleToggleSound}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        isHudVisible={isHudVisible}
        onToggleHud={() => setIsHudVisible((prev) => !prev)}
        rendererType={rendererType}
        fps={fps}
      />

      {/* Unsupported Renderer Fallback Banner */}
      {rendererType === "unsupported" && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 w-[min(36rem,calc(100vw-2rem))] bg-rose-900/90 backdrop-blur-md border border-rose-500/50 text-rose-100 p-3.5 rounded-xl shadow-2xl text-xs flex items-start gap-2.5">
          <Info className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">渲染提示</p>
            <p className="text-rose-200 leading-relaxed">
              当前渲染引擎加载异常 ({rendererError || "硬件加速未开启"})。照片仍可正常预览。
            </p>
          </div>
        </div>
      )}

      {/* HUD Parameter Deck (Sliding & Collapsible) */}
      <HudControl
        options={standardOptions}
        onChangeOptions={handleChangeStandardOptions}
        fishCatchConfig={fishCatchConfig}
        onChangeFishCatchConfig={handleChangeFishCatchConfig}
        submergedConfig={submergedConfig}
        onChangeSubmergedConfig={handleChangeSubmergedConfig}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused((prev) => !prev)}
        onReset={handleReset}
        currentBackground={currentBackground}
        onSelectBackground={handleSelectBackground}
        onUploadCustomImage={handleUploadCustomImage}
        onApplyPreset={handleApplyPreset}
        isVisible={isHudVisible}
        diffusionStatus={diffusionStatus}
        diffusionProgress={diffusionProgress}
        onReplayDiffusion={handleReplayDiffusion}
      />

      {/* Unhide HUD button when hidden */}
      {!isHudVisible && (
        <button
          type="button"
          onClick={() => setIsHudVisible(true)}
          className="fixed bottom-4 left-4 z-30 p-2.5 rounded-full bg-neutral-900/80 backdrop-blur-md border border-white/20 text-white shadow-xl hover:bg-neutral-800 transition-all flex items-center gap-2 text-xs"
        >
          <Eye className="w-4 h-4 text-emerald-300" />
          <span className="font-medium pr-1">展开控制面板 (H)</span>
        </button>
      )}

      {/* Interaction Hint */}
      {showHint && (
        <div className="fixed bottom-4 right-4 z-20 pointer-events-none hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-neutral-300 shadow-lg animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
          <span>
            {isSubmergedMesh
              ? "水下双色焦散网格覆裹 · [H] 折叠面板 · 节点金斑微波流转"
              : isFishCatch
              ? "点击照片重新铺开 · [H] 折叠面板 · 阳光微风波光持续播放"
              : "点击水面产生微波 · [H] 隐藏面板 · [空格] 暂停"}
          </span>
        </div>
      )}
    </div>
  );
}
