/* =====================================================================
   GRIND HOUSE — THE YARD · visual evolution
   4 stages keyed to GH.economy.milestones so the art-swap co-fires with
   the ×2 milestone bonus. Only S1 + S4 are generated art; S2/S3 are CSS
   transforms of those (see css/yard.css .stage-*).
   ===================================================================== */
export const STAGE_LV = [1, 10, 25, 50];           // index = stage 0..3
export const STAGE_NAME = ["RIG", "PLANT", "WORKS", "REFINERY"];

export function stageFor(copies) {
  let s = 0; const c = copies || 0;
  for (let i = 0; i < STAGE_LV.length; i++) if (c >= STAGE_LV[i]) s = i;
  return s;
}
export function stageClass(copies) { return "stage-" + stageFor(copies); }

// Cozy machine set with the FULL 4-stage img2img chain for every tier — each
// stage grown from the previous render so a machine reads as the SAME cozy
// machine leveling up (s1→s4), same pad/angle, only bigger/brighter.
const FULL_CHAIN = new Set(["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"]);
export function artSrc(lineId, copies) {
  const st = stageFor(copies);
  if (FULL_CHAIN.has(lineId)) return `assets/iso/${lineId}_s${st + 1}.webp`;
  return `assets/iso/${lineId}_s1.webp`;
}
