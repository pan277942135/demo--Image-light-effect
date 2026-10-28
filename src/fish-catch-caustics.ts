/**
 * 渔见实拍照 (默认推荐02版本)：
 * 
 * import { createFishCatchOverlay, FROZEN_EFFECT_02_CONFIG } from "./fish-catch-caustics";
 * 
 * const photoContainer = document.getElementById("photo-container");
 * 
 * const overlay = createFishCatchOverlay(photoContainer, {
 *   sceneId: "fish-catch-recognition",
 *   displayName: "鱼获识别",
 *   spreadDurationMs: 1200,
 *   intensity: 1.80,
 *   speed: 1.00,
 *   marginRatio: 0.015,
 *   glowSize: 45,
 *   goldColor: "#4d9b91",
 *   cyanColor: "#d89913",
 *   greenColor: "#719fbc",
 *   bottomMaskStrength: 1.00,
 *   blendRatio: 0.80,
 *   blendMode: "overlay",
 * });
 * 
 * ---
 * 
 * 效果01版本 (经典晨光金蓝)：
 * import { FROZEN_EFFECT_01_CONFIG } from "./fish-catch-caustics";
 */

export * from "./water-caustics/fish-catch-caustics";
export { createFishCatchOverlay, FROZEN_EFFECT_01_CONFIG, FROZEN_EFFECT_02_CONFIG } from "./water-caustics/fish-catch-caustics";
