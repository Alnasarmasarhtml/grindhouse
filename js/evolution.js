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

// stage 0|1 → the small rig render; stage 2|3 → the monumental refinery render
export function artSrc(lineId, copies) {
  const st = stageFor(copies);
  return `assets/iso/${lineId}_${st >= 2 ? "s4" : "s1"}.webp`;
}
