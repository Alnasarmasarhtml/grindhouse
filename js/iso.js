/* =====================================================================
   GRIND HOUSE — THE YARD · isometric math (no engine, no bundler)
   2:1 dimetric diamond grid of upright, pre-projected sprites.
   The ONLY place grid formulas live.
   ===================================================================== */
export const TILE_W = 128, TILE_H = 64, GRID = 6;
export const DIAMOND = "polygon(50% 0,100% 50%,50% 100%,0 50%)";

// origin keeps every plot at positive coords inside #yardCam
export const ORIGIN_X = 320, ORIGIN_Y = 36;
export const CONTENT_W = ORIGIN_X * 2;                 // 640
export const CONTENT_H = ORIGIN_Y + GRID * TILE_H + 120; // grid + headroom for tall sprites

// canonical plot map (lineId -> [col,row]); spirals up-and-back, dock at front
export const LAYOUT = {
  t0: [2, 5], t1: [3, 4], t2: [1, 4], t3: [2, 3], t4: [0, 3],
  t5: [1, 2], t6: [3, 2], t7: [0, 1], t8: [1, 0], dock: [3, 5],
};

export function toScreen(col, row) {
  return { x: ORIGIN_X + (col - row) * (TILE_W / 2), y: ORIGIN_Y + (col + row) * (TILE_H / 2) };
}
export function zOf(col, row) { return (col + row) * 10; }

// every plot coord (for building the ground once)
export function allPlots() {
  const out = [];
  for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) out.push([c, r]);
  return out;
}
