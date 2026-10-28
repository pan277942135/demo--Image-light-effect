import React, { useState } from "react";
import {
  Sliders,
  Sparkles,
  Image as ImageIcon,
  Code2,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Check,
  Upload,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Lock,
} from "lucide-react";
import { PRESETS, BACKGROUNDS, type Preset, type BackgroundItem } from "../constants/presets";
import type { WaterCausticsOptions } from "../water-caustics";
import type {
  FishCatchCausticsConfig,
  DiffusionStatus,
} from "../water-caustics/fish-catch-caustics";
import {
  DEFAULT_SUBMERGED_CONFIG,
  type SubmergedCausticsConfig,
} from "../water-caustics/submerged-caustic-mesh";

interface HudControlProps {
  options: WaterCausticsOptions;
  onChangeOptions: (opts: Partial<WaterCausticsOptions>) => void;
  fishCatchConfig: FishCatchCausticsConfig;
  onChangeFishCatchConfig: (opts: Partial<FishCatchCausticsConfig>) => void;
  submergedConfig?: SubmergedCausticsConfig;
  onChangeSubmergedConfig?: (opts: Partial<SubmergedCausticsConfig>) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onReset: () => void;
  currentBackground: BackgroundItem;
  onSelectBackground: (bg: BackgroundItem) => void;
  onUploadCustomImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onApplyPreset: (preset: Preset) => void;
  isVisible: boolean;
  diffusionStatus?: DiffusionStatus;
  diffusionProgress?: number;
  onReplayDiffusion?: () => void;
}

type TabType = "controls" | "scenes" | "presets" | "code";

const BLEND_MODES = [
  { value: "screen", label: "Screen (推荐，自然透光)" },
  { value: "normal", label: "Normal (常规)" },
  { value: "overlay", label: "Overlay (叠加)" },
  { value: "soft-light", label: "Soft Light (柔光)" },
  { value: "color-dodge", label: "Color Dodge (颜色减淡)" },
  { value: "lighter", label: "Lighter (加亮)" },
];

const FISH_HIGHLIGHT_SWATCHES = [
  { label: "日光淡金 (清晨)", color: "#EDE6D2" },
  { label: "柔和浅暖白", color: "#D7EBE4" },
  { label: "浅青白", color: "#DCEEE8" },
  { label: "晨曦微金", color: "#F3ECD8" },
  { label: "自然日光", color: "#F7F6EE" },
  { label: "纯白", color: "#FFFFFF" },
];

const FISH_TINT_SWATCHES = [
  { label: "低饱和青绿", color: "#63968F" },
  { label: "柔和湖水绿", color: "#5F9D95" },
  { label: "清晨水色", color: "#6AA39B" },
  { label: "深潭青翠", color: "#4B7C75" },
  { label: "微澜浅青", color: "#7BAFA8" },
  { label: "海蓝透绿", color: "#3A8B8A" },
];

const FISH_GREEN_SWATCHES = [
  { label: "清晨水绿", color: "#2DD4BF" },
  { label: "翠绿水纹", color: "#10B981" },
  { label: "柔和湖绿", color: "#5F9D95" },
  { label: "浅青碧绿", color: "#6EE7B7" },
  { label: "自然水青", color: "#34D399" },
];

const SUBMERGED_TOP_SWATCHES = [
  { label: "碧蓝水光 (推荐)", color: "#00D4FF" },
  { label: "清澈湖蓝", color: "#06B6D4" },
  { label: "明澈天青", color: "#38BDF8" },
  { label: "深湖湛蓝", color: "#0284C7" },
  { label: "浅青微澜", color: "#22D3EE" },
];

const SUBMERGED_BOTTOM_SWATCHES = [
  { label: "翡翠绿 (推荐)", color: "#059669" },
  { label: "水草翠绿", color: "#10B981" },
  { label: "深林倒影绿", color: "#047857" },
  { label: "薄荷青翠", color: "#34D399" },
  { label: "青碧湖水", color: "#14B8A6" },
];

const SUBMERGED_HIGHLIGHT_SWATCHES = [
  { label: "日光淡金 (推荐)", color: "#FFF1A8" },
  { label: "晨曦纯金", color: "#FEF08A" },
  { label: "明艳日芒", color: "#FDE047" },
  { label: "白昼核心", color: "#FFFFFF" },
  { label: "温暖暖阳", color: "#FED7AA" },
];

export const HudControl: React.FC<HudControlProps> = ({
  options,
  onChangeOptions,
  fishCatchConfig,
  onChangeFishCatchConfig,
  submergedConfig = DEFAULT_SUBMERGED_CONFIG,
  onChangeSubmergedConfig,
  isPaused,
  onTogglePause,
  onReset,
  currentBackground,
  onSelectBackground,
  onUploadCustomImage,
  onApplyPreset,
  isVisible,
  diffusionStatus = "STABLE_PLAYING",
  diffusionProgress = 1.0,
  onReplayDiffusion,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("controls");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

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

  if (!isVisible) return null;

  // Current values
  const currentIntensity = isSubmergedMesh
    ? submergedConfig.intensity
    : isFishCatch
    ? fishCatchConfig.intensity
    : options.intensity ?? 1.2;
  const currentSpeed = isSubmergedMesh
    ? submergedConfig.speed
    : isFishCatch
    ? fishCatchConfig.speed
    : options.speed ?? 1.0;
  const currentScale = isSubmergedMesh
    ? submergedConfig.scale
    : options.scale ?? 1.0;
  const currentTintStrength = options.tintStrength ?? 0.05;
  const currentColor = options.color ?? "#f8fff6";
  const currentTint = options.tint ?? "#3a8b8a";
  const currentBlend = isSubmergedMesh
    ? submergedConfig.blendMode
    : isFishCatch
    ? fishCatchConfig.blendMode
    : options.blendMode ?? "screen";

  const handleUpdate = (updates: any) => {
    if (isSubmergedMesh) {
      onChangeSubmergedConfig?.(updates);
    } else if (isFishCatch) {
      onChangeFishCatchConfig(updates);
    } else {
      onChangeOptions(updates);
    }
  };

  const generatedCode = isSubmergedMesh
    ? `// 水下光织 (沉浸焦散网) - 极细发丝级焦散网 + 碧蓝翡翠双色 + 主体清晰镂空
import { createSubmergedMeshOverlay } from "./water-caustics/submerged-caustic-mesh";

const photoContainer = document.getElementById("photo-container");

const overlay = createSubmergedMeshOverlay(photoContainer, {
  intensity: ${submergedConfig.intensity.toFixed(2)},
  speed: ${submergedConfig.speed.toFixed(2)},
  scale: ${submergedConfig.scale.toFixed(2)},
  meshSharpness: ${submergedConfig.meshSharpness.toFixed(2)},
  centerClarity: ${submergedConfig.centerClarity.toFixed(2)},
  nodeSparkle: ${submergedConfig.nodeSparkle.toFixed(2)},
  topColor: "${submergedConfig.topColor}",
  bottomColor: "${submergedConfig.bottomColor}",
  highlightColor: "${submergedConfig.highlightColor}",
  blendMode: "${submergedConfig.blendMode}",
});`
    : isFishCatch
    ? `// 【渔见实拍照 (默认推荐)】四周光效冻结版效果01
import { createFishCatchOverlay } from "./fish-catch-caustics";

const photoContainer = document.getElementById("photo-container");

const overlay = createFishCatchOverlay(photoContainer, {
  sceneId: "fish-catch-recognition",
  displayName: "鱼获识别",
  spreadDurationMs: 1200,
  intensity: ${fishCatchConfig.intensity.toFixed(2)},
  speed: ${fishCatchConfig.speed.toFixed(2)},
  marginRatio: ${fishCatchConfig.marginRatio.toFixed(3)},
  glowSize: ${fishCatchConfig.glowSize},
  goldColor: "${fishCatchConfig.goldColor}",
  cyanColor: "${fishCatchConfig.cyanColor}",
  greenColor: "${fishCatchConfig.greenColor || "#2DD4BF"}",
  bottomMaskStrength: ${(fishCatchConfig.bottomMaskStrength ?? 1.0).toFixed(2)},
  blendRatio: ${(fishCatchConfig.blendRatio ?? 0.75).toFixed(2)},
  blendMode: "${currentBlend}",
});`
    : `import { mountWaterCaustics } from "water-caustics";

const scene = document.getElementById("scene");

const water = mountWaterCaustics(scene, {
  intensity: ${currentIntensity.toFixed(2)},
  speed: ${currentSpeed.toFixed(2)},
  scale: ${currentScale.toFixed(2)},
  color: "${currentColor}",
  tint: "${currentTint}",
  tintStrength: ${currentTintStrength.toFixed(2)},
  blendMode: "${currentBlend}",
});`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <aside
      className={`fixed z-20 left-3 sm:left-4 bottom-3 sm:bottom-4 w-[calc(100vw-1.5rem)] sm:w-[25rem] max-w-[27rem] transition-all duration-300 ${
        isCollapsed ? "translate-y-0" : ""
      }`}
      aria-label="Caustic controls"
    >
      <div className="bg-[#0f1b20]/85 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden text-neutral-100 flex flex-col">
        {/* HUD Header */}
        <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between bg-black/25">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${
                isFishCatch
                  ? "text-emerald-300 bg-emerald-950/70 border-emerald-500/40"
                  : "text-cyan-300 bg-cyan-950/60 border-cyan-500/30"
              }`}
            >
              {isFishCatch ? "四周光效冻结版 01" : "npm · water-caustics"}
            </span>
            <span className="text-xs font-medium text-neutral-300">
              {isFishCatch ? "四周水光控制" : "HUD Control"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              title={isCollapsed ? "展开面板" : "折叠面板"}
            >
              {isCollapsed ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* HUD Body */}
        {!isCollapsed && (
          <>
            {/* Tabs Navigation */}
            <div className="flex items-center border-b border-white/10 px-2 pt-2 gap-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("controls")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg transition-colors border-b-2 font-medium ${
                  activeTab === "controls"
                    ? "border-emerald-400 text-emerald-300 bg-white/5"
                    : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                调参
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("scenes")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg transition-colors border-b-2 font-medium ${
                  activeTab === "scenes"
                    ? "border-emerald-400 text-emerald-300 bg-white/5"
                    : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                场景 (Scenes)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("presets")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg transition-colors border-b-2 font-medium ${
                  activeTab === "presets"
                    ? "border-emerald-400 text-emerald-300 bg-white/5"
                    : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                预设 (Presets)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("code")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg transition-colors border-b-2 font-medium ${
                  activeTab === "code"
                    ? "border-emerald-400 text-emerald-300 bg-white/5"
                    : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                代码
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-3.5 max-h-[50vh] sm:max-h-[56vh] overflow-y-auto space-y-3 text-xs">
              {/* TAB 1: CONTROLS */}
              {activeTab === "controls" && (
                <div className="space-y-3">
                  {/* Fish Catch Recognition Status Bar */}
                  {isFishCatch && (
                    <div className="p-2.5 rounded-xl bg-black/45 border border-emerald-500/35 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
                            {diffusionStatus === "SPREADING" ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
                                <span>四周光效舒展推进 ({Math.round(diffusionProgress * 100)}%)</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                                <span>光效固定四周 · 宽幅水光持续流转</span>
                              </>
                            )}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={onReplayDiffusion}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white text-[10px] font-semibold transition-all border border-emerald-400/40 shadow-lg active:scale-95"
                          title="开始识别：四周光效流转展开"
                        >
                          <RefreshCw className="w-3 h-3" />
                          开始识别
                        </button>
                      </div>

                      {/* Visual Subtitle & Features */}
                      <div className="pt-1 border-t border-white/10 flex items-center justify-between text-[10px] text-neutral-300">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          光效常驻不退场 · 永久流转
                        </span>
                        <span className="text-cyan-300">包络范围加宽 · 晨光金蓝双流</span>
                      </div>
                    </div>
                  )}

                  {/* Intensity */}
                  <label className="block space-y-1">
                    <div className="flex justify-between items-center text-neutral-300 font-medium">
                      <span>{isSubmergedMesh ? "水下光织强度 (Intensity)" : isFishCatch ? "光丝辉度 (Intensity)" : "Intensity (水光强度)"}</span>
                      <span className="font-mono text-emerald-300">
                        {currentIntensity.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max={isSubmergedMesh ? "2.50" : isFishCatch ? "2.50" : "2.5"}
                      step="0.02"
                      value={currentIntensity}
                      onChange={(e) =>
                        handleUpdate({ intensity: Number(e.target.value) })
                      }
                      className="w-full accent-emerald-400 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-neutral-400">
                      <span>柔和 (0.40)</span>
                      <span className="text-emerald-400">
                        {isSubmergedMesh ? "样照推荐 1.15" : isFishCatch ? "效果01冻结 1.50" : "默认 1.20"}
                      </span>
                      <span>明亮 (2.00)</span>
                    </div>
                  </label>

                  {/* Speed */}
                  <label className="block space-y-1">
                    <div className="flex justify-between items-center text-neutral-300 font-medium">
                      <span>流动速率 (Wave Speed)</span>
                      <span className="font-mono text-emerald-300">
                        {currentSpeed.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max={isSubmergedMesh ? "1.20" : isFishCatch ? "1.60" : "2.5"}
                      step="0.02"
                      value={currentSpeed}
                      onChange={(e) =>
                        handleUpdate({ speed: Number(e.target.value) })
                      }
                      className="w-full accent-emerald-400 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-neutral-400">
                      <span>微澜悠缓 (0.15)</span>
                      <span className="text-emerald-400">
                        {isSubmergedMesh ? "样照推荐 0.26" : isFishCatch ? "样片效果 0.65" : "默认 1.00"}
                      </span>
                      <span>活跃流动 (1.00)</span>
                    </div>
                  </label>

                  {/* Specialized Submerged Caustic Mesh Controls */}
                  {isSubmergedMesh ? (
                    <>
                      {/* Density / Scale */}
                      <label className="block space-y-1">
                        <div className="flex justify-between items-center text-neutral-300 font-medium">
                          <span>网格细密度 (Mesh Density)</span>
                          <span className="font-mono text-emerald-300">
                            {submergedConfig.scale.toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.4"
                          max="2.5"
                          step="0.05"
                          value={submergedConfig.scale}
                          onChange={(e) =>
                            handleUpdate({ scale: Number(e.target.value) })
                          }
                          className="w-full accent-emerald-400 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-neutral-400">
                          <span>稀疏大网 (0.6)</span>
                          <span className="text-emerald-400">发丝微网 1.25</span>
                          <span>超高密细纹 (2.2)</span>
                        </div>
                      </label>

                      {/* Mesh Sharpness */}
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block space-y-1">
                          <div className="flex justify-between items-center text-neutral-300 font-medium text-[11px]">
                            <span>光丝精细锐度</span>
                            <span className="font-mono text-emerald-300">
                              {submergedConfig.meshSharpness.toFixed(2)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.4"
                            max="2.5"
                            step="0.05"
                            value={submergedConfig.meshSharpness}
                            onChange={(e) =>
                              handleUpdate({ meshSharpness: Number(e.target.value) })
                            }
                            className="w-full accent-emerald-400 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                          />
                        </label>

                        {/* Center Clarity Mask */}
                        <label className="block space-y-1">
                          <div className="flex justify-between items-center text-neutral-300 font-medium text-[11px]">
                            <span>主体清晰镂空</span>
                            <span className="font-mono text-emerald-300">
                              {submergedConfig.centerClarity.toFixed(2)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.0"
                            max="1.0"
                            step="0.02"
                            value={submergedConfig.centerClarity}
                            onChange={(e) =>
                              handleUpdate({ centerClarity: Number(e.target.value) })
                            }
                            className="w-full accent-emerald-400 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                          />
                        </label>
                      </div>

                      {/* Node Sparkle */}
                      <label className="block space-y-1">
                        <div className="flex justify-between items-center text-neutral-300 font-medium">
                          <span>交汇节点星芒 (Node Sparkle)</span>
                          <span className="font-mono text-emerald-300">
                            {submergedConfig.nodeSparkle.toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.0"
                          max="2.5"
                          step="0.05"
                          value={submergedConfig.nodeSparkle}
                          onChange={(e) =>
                            handleUpdate({ nodeSparkle: Number(e.target.value) })
                          }
                          className="w-full accent-emerald-400 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-neutral-400">
                          <span>平缓无星 (0.0)</span>
                          <span className="text-emerald-400">钻石点芒 1.20</span>
                          <span>耀目焦点 (2.2)</span>
                        </div>
                      </label>
                    </>
                  ) : isFishCatch ? (
                    <>
                      {/* Enhanced Bottom-to-Top Linear Gradient Mask */}
                      <label className="block space-y-1">
                        <div className="flex justify-between items-center text-neutral-300 font-medium">
                          <span>底部向上渐变遮罩 (Bottom Gradient Mask)</span>
                          <span className="font-mono text-emerald-300">
                            {(fishCatchConfig.bottomMaskStrength ?? 1.0).toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.30"
                          max="2.00"
                          step="0.05"
                          value={fishCatchConfig.bottomMaskStrength ?? 1.0}
                          onChange={(e) =>
                            onChangeFishCatchConfig({ bottomMaskStrength: Number(e.target.value) })
                          }
                          className="w-full accent-emerald-400 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-neutral-400">
                          <span>轻微 (0.50)</span>
                          <span className="text-emerald-400">增强自然融合 1.00</span>
                          <span>强力沉底 (1.80)</span>
                        </div>
                      </label>

                      {/* Blue + Gold + Green Light Mixing Ratio */}
                      <label className="block space-y-1">
                        <div className="flex justify-between items-center text-neutral-300 font-medium">
                          <span>蓝金水光混合比例 (Chromatic Blend Ratio)</span>
                          <span className="font-mono text-emerald-300">
                            {(fishCatchConfig.blendRatio ?? 0.75).toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.20"
                          max="1.00"
                          step="0.05"
                          value={fishCatchConfig.blendRatio ?? 0.75}
                          onChange={(e) =>
                            onChangeFishCatchConfig({ blendRatio: Number(e.target.value) })
                          }
                          className="w-full accent-emerald-400 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-neutral-400">
                          <span>晨蓝绿主导 (0.35)</span>
                          <span className="text-emerald-400">金蓝交织 0.75</span>
                          <span>暖金耀目 (1.00)</span>
                        </div>
                      </label>

                      <div className="grid grid-cols-2 gap-2">
                        <label className="block space-y-1">
                          <div className="flex justify-between items-center text-neutral-300 font-medium text-[11px]">
                            <span>光晕扩散 (Bloom)</span>
                            <span className="font-mono text-emerald-300">
                              {fishCatchConfig.glowSize}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min="6"
                            max="64"
                            step="1"
                            value={fishCatchConfig.glowSize}
                            onChange={(e) =>
                              onChangeFishCatchConfig({ glowSize: Number(e.target.value) })
                            }
                            className="w-full accent-emerald-400 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                          />
                        </label>

                        <label className="block space-y-1">
                          <div className="flex justify-between items-center text-neutral-300 font-medium text-[11px]">
                            <span>贴边距离 (Margin)</span>
                            <span className="font-mono text-emerald-300">
                              {(fishCatchConfig.marginRatio * 100).toFixed(1)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.005"
                            max="0.080"
                            step="0.005"
                            value={fishCatchConfig.marginRatio}
                            onChange={(e) =>
                              onChangeFishCatchConfig({ marginRatio: Number(e.target.value) })
                            }
                            className="w-full accent-emerald-400 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                          />
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Scale */}
                      <label className="block space-y-1">
                        <div className="flex justify-between items-center text-neutral-300 font-medium">
                          <span>Scale (光纹尺度/细密度)</span>
                          <span className="font-mono text-emerald-300">
                            {currentScale.toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="1.8"
                          step="0.02"
                          value={currentScale}
                          onChange={(e) =>
                            handleUpdate({ scale: Number(e.target.value) })
                          }
                          className="w-full accent-emerald-400 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                        />
                      </label>

                      {/* Tint Strength */}
                      <label className="block space-y-1">
                        <div className="flex justify-between items-center text-neutral-300 font-medium">
                          <span>Tint Strength (水色浸润度)</span>
                          <span className="font-mono text-emerald-300">
                            {currentTintStrength.toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.0"
                          max="0.40"
                          step="0.01"
                          value={currentTintStrength}
                          onChange={(e) =>
                            handleUpdate({ tintStrength: Number(e.target.value) })
                          }
                          className="w-full accent-emerald-400 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
                        />
                      </label>
                    </>
                  )}

                  {/* Colors Section */}
                  {isSubmergedMesh ? (
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <div className="text-[11px] font-semibold text-emerald-300 flex items-center justify-between">
                        <span>三波段光学渐变 (天空碧蓝 · 深水翡翠 · 节点淡金)</span>
                        <span className="text-[10px] text-neutral-400">高保真色谱</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {/* 1. Top Aqua/Cyan Color */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-neutral-300 block font-medium">顶部碧蓝</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={submergedConfig.topColor}
                              onChange={(e) =>
                                handleUpdate({ topColor: e.target.value })
                              }
                              className="w-6 h-6 rounded cursor-pointer border border-white/20 bg-transparent p-0"
                            />
                            <span className="font-mono text-[9px] text-neutral-300 truncate">
                              {submergedConfig.topColor}
                            </span>
                          </div>
                          <div className="flex gap-1 flex-wrap pt-0.5">
                            {SUBMERGED_TOP_SWATCHES.slice(0, 3).map((swatch) => (
                              <button
                                key={swatch.color}
                                type="button"
                                title={swatch.label}
                                onClick={() => handleUpdate({ topColor: swatch.color })}
                                className="w-3 h-3 rounded-full border border-white/30 hover:scale-125 transition-transform"
                                style={{ backgroundColor: swatch.color }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* 2. Bottom Emerald Color */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-neutral-300 block font-medium">底部翡翠</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={submergedConfig.bottomColor}
                              onChange={(e) =>
                                handleUpdate({ bottomColor: e.target.value })
                              }
                              className="w-6 h-6 rounded cursor-pointer border border-white/20 bg-transparent p-0"
                            />
                            <span className="font-mono text-[9px] text-neutral-300 truncate">
                              {submergedConfig.bottomColor}
                            </span>
                          </div>
                          <div className="flex gap-1 flex-wrap pt-0.5">
                            {SUBMERGED_BOTTOM_SWATCHES.slice(0, 3).map((swatch) => (
                              <button
                                key={swatch.color}
                                type="button"
                                title={swatch.label}
                                onClick={() => handleUpdate({ bottomColor: swatch.color })}
                                className="w-3 h-3 rounded-full border border-white/30 hover:scale-125 transition-transform"
                                style={{ backgroundColor: swatch.color }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* 3. Sunlight Highlight Color */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-neutral-300 block font-medium">日光金芒</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={submergedConfig.highlightColor}
                              onChange={(e) =>
                                handleUpdate({ highlightColor: e.target.value })
                              }
                              className="w-6 h-6 rounded cursor-pointer border border-white/20 bg-transparent p-0"
                            />
                            <span className="font-mono text-[9px] text-neutral-300 truncate">
                              {submergedConfig.highlightColor}
                            </span>
                          </div>
                          <div className="flex gap-1 flex-wrap pt-0.5">
                            {SUBMERGED_HIGHLIGHT_SWATCHES.slice(0, 3).map((swatch) => (
                              <button
                                key={swatch.color}
                                type="button"
                                title={swatch.label}
                                onClick={() => handleUpdate({ highlightColor: swatch.color })}
                                className="w-3 h-3 rounded-full border border-white/30 hover:scale-125 transition-transform"
                                style={{ backgroundColor: swatch.color }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : isFishCatch ? (
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <div className="text-[11px] font-semibold text-emerald-300 flex items-center justify-between">
                        <span>三色水光混溶光谱 (金色 · 绿色 · 蓝色)</span>
                        <span className="text-[10px] text-neutral-400">Shader实时混溶</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {/* 1. Sunlight Pale Gold */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-neutral-300 block font-medium">阳光淡金</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={fishCatchConfig.goldColor}
                              onChange={(e) =>
                                onChangeFishCatchConfig({ goldColor: e.target.value })
                              }
                              className="w-6 h-6 rounded cursor-pointer border border-white/20 bg-transparent p-0"
                            />
                            <span className="font-mono text-[9px] text-neutral-300 truncate">
                              {fishCatchConfig.goldColor}
                            </span>
                          </div>
                          <div className="flex gap-1 flex-wrap pt-0.5">
                            {FISH_HIGHLIGHT_SWATCHES.slice(0, 3).map((swatch) => (
                              <button
                                key={swatch.color}
                                type="button"
                                title={swatch.label}
                                onClick={() => onChangeFishCatchConfig({ goldColor: swatch.color })}
                                className="w-3 h-3 rounded-full border border-white/30 hover:scale-125 transition-transform"
                                style={{ backgroundColor: swatch.color }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* 2. Aquatic Emerald Green */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-neutral-300 block font-medium">清晨水绿</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={fishCatchConfig.greenColor || "#2DD4BF"}
                              onChange={(e) =>
                                onChangeFishCatchConfig({ greenColor: e.target.value })
                              }
                              className="w-6 h-6 rounded cursor-pointer border border-white/20 bg-transparent p-0"
                            />
                            <span className="font-mono text-[9px] text-neutral-300 truncate">
                              {fishCatchConfig.greenColor || "#2DD4BF"}
                            </span>
                          </div>
                          <div className="flex gap-1 flex-wrap pt-0.5">
                            {FISH_GREEN_SWATCHES.slice(0, 3).map((swatch) => (
                              <button
                                key={swatch.color}
                                type="button"
                                title={swatch.label}
                                onClick={() => onChangeFishCatchConfig({ greenColor: swatch.color })}
                                className="w-3 h-3 rounded-full border border-white/30 hover:scale-125 transition-transform"
                                style={{ backgroundColor: swatch.color }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* 3. Morning Sky Blue */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-neutral-300 block font-medium">晨曦水蓝</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={fishCatchConfig.cyanColor}
                              onChange={(e) =>
                                onChangeFishCatchConfig({ cyanColor: e.target.value })
                              }
                              className="w-6 h-6 rounded cursor-pointer border border-white/20 bg-transparent p-0"
                            />
                            <span className="font-mono text-[9px] text-neutral-300 truncate">
                              {fishCatchConfig.cyanColor}
                            </span>
                          </div>
                          <div className="flex gap-1 flex-wrap pt-0.5">
                            {FISH_TINT_SWATCHES.slice(0, 3).map((swatch) => (
                              <button
                                key={swatch.color}
                                type="button"
                                title={swatch.label}
                                onClick={() => onChangeFishCatchConfig({ cyanColor: swatch.color })}
                                className="w-3 h-3 rounded-full border border-white/30 hover:scale-125 transition-transform"
                                style={{ backgroundColor: swatch.color }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/10">
                      <div>
                        <div className="flex items-center justify-between text-neutral-300 mb-1">
                          <span className="text-[11px] font-medium">高光颜色</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={currentColor}
                            onChange={(e) => handleUpdate({ color: e.target.value })}
                            className="w-7 h-7 rounded-lg cursor-pointer border border-white/20 bg-transparent p-0"
                          />
                          <span className="font-mono text-[11px] text-neutral-300">
                            {currentColor}
                          </span>
                        </div>
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {FISH_HIGHLIGHT_SWATCHES.map((swatch) => (
                            <button
                              key={swatch.color}
                              type="button"
                              title={swatch.label}
                              onClick={() => handleUpdate({ color: swatch.color })}
                              className="w-3.5 h-3.5 rounded-full border border-white/30 transition-transform hover:scale-125"
                              style={{ backgroundColor: swatch.color }}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-neutral-300 mb-1">
                          <span className="text-[11px] font-medium">主水色调</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={currentTint}
                            onChange={(e) => handleUpdate({ tint: e.target.value })}
                            className="w-7 h-7 rounded-lg cursor-pointer border border-white/20 bg-transparent p-0"
                          />
                          <span className="font-mono text-[11px] text-neutral-300">
                            {currentTint}
                          </span>
                        </div>
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {FISH_TINT_SWATCHES.map((swatch) => (
                            <button
                              key={swatch.color}
                              type="button"
                              title={swatch.label}
                              onClick={() => handleUpdate({ tint: swatch.color })}
                              className="w-3.5 h-3.5 rounded-full border border-white/30 transition-transform hover:scale-125"
                              style={{ backgroundColor: swatch.color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Blend Mode */}
                  <div className="pt-2 border-t border-white/10">
                    <label className="block text-neutral-300 font-medium mb-1">
                      混合模式 (Blend Mode)
                    </label>
                    <select
                      value={currentBlend}
                      onChange={(e) => handleUpdate({ blendMode: e.target.value })}
                      className="w-full bg-neutral-900 border border-white/20 rounded-lg px-2.5 py-1.5 text-neutral-200 text-xs focus:outline-none focus:border-emerald-400"
                    >
                      {BLEND_MODES.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* TAB 2: SCENES */}
              {activeTab === "scenes" && (
                <div className="space-y-3">
                  <p className="text-[11px] text-neutral-400">
                    选择场景以查看不同透明叠加效果：
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => onSelectBackground(bg)}
                        className={`p-2 rounded-xl border text-left flex flex-col justify-end h-24 transition-all overflow-hidden relative group ${
                          currentBackground.id === bg.id
                            ? "border-emerald-400 ring-2 ring-emerald-400/40"
                            : "border-white/10 hover:border-white/30"
                        }`}
                      >
                        {bg.src ? (
                          <img
                            src={bg.src}
                            alt={bg.name}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div
                            className="absolute inset-0 w-full h-full"
                            style={bg.cssStyle}
                          />
                        )}
                        <div className="relative z-10 bg-black/75 px-2 py-1 rounded backdrop-blur-md w-full">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-white">
                              {bg.name}
                            </span>
                            {bg.isFishCatch && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/30 text-emerald-300 rounded font-bold">
                                V1
                              </span>
                            )}
                          </div>
                          {bg.subtitle && (
                            <p className="text-[9px] text-neutral-300 truncate">
                              {bg.subtitle}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Upload custom background */}
                  <div className="pt-2 border-t border-white/10">
                    <label className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-white/20 rounded-xl hover:bg-white/5 cursor-pointer text-neutral-300 hover:text-white transition-colors">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-medium">
                        上传自定义测试照片
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={onUploadCustomImage}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 3: PRESETS */}
              {activeTab === "presets" && (
                <div className="space-y-2">
                  <p className="text-[11px] text-neutral-400 mb-2">
                    预设环境氛围：
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onApplyPreset(preset)}
                        className={`text-left p-2.5 rounded-xl border transition-all flex flex-col group ${
                          preset.id.startsWith("fish-catch")
                            ? "border-emerald-500/50 bg-emerald-950/25 hover:bg-emerald-950/45 ring-1 ring-emerald-500/30"
                            : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-emerald-500/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-neutral-100 group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                            {preset.id.startsWith("fish-catch") && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500 text-black uppercase">
                                效果01
                              </span>
                            )}
                            {preset.name}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-mono">
                            {preset.subtitle}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">
                          {preset.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: CODE EXPORT */}
              {activeTab === "code" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-neutral-400">
                      当前场景代码配置：
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition-colors"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-3 h-3" /> 已复制!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> 复制代码
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-2.5 bg-black/60 border border-white/10 rounded-xl text-[10px] font-mono text-emerald-200 overflow-x-auto whitespace-pre leading-relaxed">
                    {generatedCode}
                  </pre>
                </div>
              )}
            </div>

            {/* HUD Footer Actions (Pause / Resume / Reset / Replay) */}
            <div className="p-3 border-t border-white/10 bg-black/35 flex items-center gap-2">
              {isFishCatch ? (
                <button
                  type="button"
                  onClick={onReplayDiffusion}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-lg"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  重新铺开 (1200ms) · 稳定持续播放
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onTogglePause}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors border border-white/10"
                >
                  {isPaused ? (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
                      继续
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current text-cyan-300" />
                      暂停
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={onReset}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors border border-white/10"
                title="恢复初值"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重置
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
