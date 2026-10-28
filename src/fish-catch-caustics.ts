/**
 * 渔见实拍照 (默认推荐) - 四周光效冻结版效果01
 * 
 * 使用方式：
 * import { createFishCatchOverlay } from "./fish-catch-caustics";
 * 
 * const photoContainer = document.getElementById("photo-container");
 * 
 * const overlay = createFishCatchOverlay(photoContainer, {
 *   sceneId: "fish-catch-recognition",
 *   displayName: "鱼获识别",
 *   spreadDurationMs: 1200,
 *   intensity: 1.50,
 *   speed: 1.00,
 *   marginRatio: 0.015,
 *   glowSize: 48,
 *   goldColor: "#FEF08A",
 *   cyanColor: "#38BDF8",
 *   greenColor: "#2DD4BF",
 *   bottomMaskStrength: 1.00,
 *   blendRatio: 0.75,
 *   blendMode: "overlay",
 * });
 */

export * from "./water-caustics/fish-catch-caustics";
export { createFishCatchOverlay } from "./water-caustics/fish-catch-caustics";
