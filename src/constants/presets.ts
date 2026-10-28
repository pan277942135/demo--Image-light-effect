import type { WaterCausticsOptions } from "../water-caustics";
import {
  DEFAULT_FISH_CATCH_CONFIG,
  FROZEN_EFFECT_01_CONFIG,
  type FishCatchCausticsConfig,
} from "../water-caustics/fish-catch-caustics";
import {
  DEFAULT_SUBMERGED_CONFIG,
  type SubmergedCausticsConfig,
} from "../water-caustics/submerged-caustic-mesh";

export {
  DEFAULT_FISH_CATCH_CONFIG,
  FROZEN_EFFECT_01_CONFIG,
  type FishCatchCausticsConfig,
  DEFAULT_SUBMERGED_CONFIG,
  type SubmergedCausticsConfig,
};

export interface Preset {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  backgroundId: string;
  options: WaterCausticsOptions;
}

export const PRESETS: Preset[] = [
  {
    id: "fish-catch-recognition",
    name: "效果01：鱼获识别 (四周光效冻结版)",
    subtitle: "四周流转光效 · 冻结版本01 · 蓝绿金交织",
    description: "【渔见实拍照 (默认推荐)】已冻结配置01：spreadDurationMs: 1200, intensity: 1.50, speed: 1.00, marginRatio: 0.015, glowSize: 48, goldColor: #FEF08A, cyanColor: #38BDF8, greenColor: #2DD4BF, bottomMaskStrength: 1.00, blendRatio: 0.75, blendMode: overlay",
    backgroundId: "fish-catch-photo",
    options: {
      intensity: 1.50,
      speed: 1.00,
      scale: 0.45,
      color: "#FEF08A",
      tint: "#38BDF8",
      tintStrength: 0.75,
      blendMode: "overlay",
    },
  },
  {
    id: "submerged-caustic-mesh",
    name: "水下光织 (沉浸焦散网)",
    subtitle: "全域双色波光网 · 碧蓝透绿 · 节点星芒",
    description: "参考实拍照：发丝级高密度焦散光丝，顶部碧蓝、底部翡翠绿与交织节点日光金斑，主体清晰镂空保护。",
    backgroundId: "bass-caustic-photo",
    options: {
      intensity: 1.15,
      speed: 0.26,
      scale: 1.25,
      color: "#fff1a8",
      tint: "#00d4ff",
      tintStrength: 0.45,
      blendMode: "screen",
    },
  },
  {
    id: "default-seafloor",
    name: "Bikini Bottom",
    subtitle: "Original Demo Defaults",
    description: "The classic sunny overhead seafloor with scattered rocks from the repo demo.",
    backgroundId: "seafloor",
    options: {
      intensity: 1.2,
      speed: 1.0,
      scale: 1.0,
      color: "#f8fff6",
      tint: "#3a8b8a",
      tintStrength: 0.05,
      blendMode: "screen",
    },
  },
  {
    id: "resort-pool",
    name: "Resort Pool",
    subtitle: "Crystal Clear Mosaic",
    description: "Vibrant high-contrast turquoise ripples across swimming pool tiles.",
    backgroundId: "pool",
    options: {
      intensity: 1.4,
      speed: 1.15,
      scale: 1.5,
      color: "#ecfeff",
      tint: "#06b6d4",
      tintStrength: 0.1,
      blendMode: "screen",
    },
  },
  {
    id: "tropical-lagoon",
    name: "Tropical Shallows",
    subtitle: "White Sand & Sunlight",
    description: "Intense midday sun refracting over shallow emerald atoll waters.",
    backgroundId: "lagoon",
    options: {
      intensity: 1.6,
      speed: 1.25,
      scale: 1.25,
      color: "#ffffff",
      tint: "#14b8a6",
      tintStrength: 0.12,
      blendMode: "screen",
    },
  },
  {
    id: "sunset-shallows",
    name: "Golden Hour",
    subtitle: "Warm Amber Glow",
    description: "Low afternoon rays casting warm golden webs across the seafloor.",
    backgroundId: "seafloor",
    options: {
      intensity: 1.35,
      speed: 0.8,
      scale: 1.1,
      color: "#fef08a",
      tint: "#0284c7",
      tintStrength: 0.08,
      blendMode: "screen",
    },
  },
  {
    id: "deep-abyss",
    name: "Midnight Abyss",
    subtitle: "Slow Oceanic Swell",
    description: "Deep, brooding ocean depths with gentle luminous bioluminescent currents.",
    backgroundId: "abyss",
    options: {
      intensity: 0.95,
      speed: 0.45,
      scale: 0.8,
      color: "#a5f3fc",
      tint: "#0f172a",
      tintStrength: 0.35,
      blendMode: "screen",
    },
  },
  {
    id: "emerald-cenote",
    name: "Emerald Cenote",
    subtitle: "Submerged Cavern",
    description: "Hidden underground spring with rich green tint and focused sunbeams.",
    backgroundId: "coral",
    options: {
      intensity: 1.3,
      speed: 0.7,
      scale: 0.95,
      color: "#d1fae5",
      tint: "#065f46",
      tintStrength: 0.22,
      blendMode: "screen",
    },
  },
  {
    id: "storm-surge",
    name: "Storm Surge",
    subtitle: "Turbulent Surface",
    description: "Rapid, turbulent waves under stormy dark waters.",
    backgroundId: "abyss",
    options: {
      intensity: 1.85,
      speed: 2.1,
      scale: 0.7,
      color: "#e0f2fe",
      tint: "#1e293b",
      tintStrength: 0.25,
      blendMode: "screen",
    },
  },
];

export interface BackgroundItem {
  id: string;
  name: string;
  subtitle?: string;
  type: "image" | "svg" | "gradient" | "color" | "custom";
  src?: string;
  cssStyle?: React.CSSProperties;
  isFishCatch?: boolean;
  isSubmergedMesh?: boolean;
}

export const BACKGROUNDS: BackgroundItem[] = [
  {
    id: "fish-catch-photo",
    name: "【渔见实拍照 (默认推荐)】",
    subtitle: "湖泊鱼获实拍 · 四周光效冻结版01 (Overlay)",
    type: "image",
    src: "/assets/aistudio/content_4f0bda4d.jpg",
    isFishCatch: true,
  },
  {
    id: "bass-caustic-photo",
    name: "鲈鱼实拍对照图 (新参考)",
    subtitle: "全域水下焦散网格实拍效果",
    type: "image",
    src: "/assets/aistudio/file_00000000721c8211b87c16d11ab3573e_fe604d9b.png",
    isSubmergedMesh: true,
  },
  {
    id: "fish-catch-recognition",
    name: "渔见效果图 (参考对照)",
    subtitle: "四边金蓝光缕对照",
    type: "image",
    src: "/assets/aistudio/file_000000000984820e82ddd50ab52f613c_05aa5c6d.png",
    isFishCatch: true,
  },
  {
    id: "seafloor",
    name: "Original Seafloor",
    subtitle: "Overhead Sun",
    type: "image",
    src: "/seafloor.jpg",
  },
  {
    id: "pool",
    name: "Pool Mosaic",
    type: "svg",
    cssStyle: {
      backgroundColor: "#0ea5e9",
      backgroundImage: `
        radial-gradient(ellipse at center, rgba(56, 189, 248, 0.45) 0%, rgba(3, 105, 161, 0.7) 100%),
        repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.28) 0, rgba(255, 255, 255, 0.28) 1.5px, transparent 1.5px, transparent 32px),
        repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.28) 0, rgba(255, 255, 255, 0.28) 1.5px, transparent 1.5px, transparent 32px),
        repeating-linear-gradient(45deg, rgba(14, 165, 233, 0.12) 0, rgba(14, 165, 233, 0.12) 16px, transparent 16px, transparent 32px)
      `,
      backgroundSize: "cover, 32px 32px, 32px 32px, 32px 32px",
    },
  },
  {
    id: "lagoon",
    name: "White Sand Beach",
    type: "gradient",
    cssStyle: {
      background: "radial-gradient(circle at 50% 30%, #fef3c7 0%, #fde68a 35%, #e2d9b6 70%, #b8af8a 100%)",
    },
  },
  {
    id: "coral",
    name: "Emerald Trench",
    type: "gradient",
    cssStyle: {
      background: "radial-gradient(circle at 50% 40%, #064e3b 0%, #022c22 60%, #011713 100%)",
    },
  },
  {
    id: "abyss",
    name: "Midnight Trench",
    type: "gradient",
    cssStyle: {
      background: "radial-gradient(circle at 50% 35%, #0f172a 0%, #030712 70%, #000000 100%)",
    },
  },
  {
    id: "pure-black",
    name: "Void (Shader Only)",
    type: "color",
    cssStyle: {
      backgroundColor: "#05070a",
    },
  },
];
