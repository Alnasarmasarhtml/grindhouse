/* =====================================================================
   GRIND HOUSE — THE YARD · world coordinates
   The yard is now a real generated MAP (a refinery platform adrift in
   space, animated). Machines are placed on the map's actual flat slabs —
   organic positions, NOT an abstract tile grid. Coordinates are fractions
   of the 16:9 backdrop so they stay locked to the platform at any zoom.
   ===================================================================== */
export const CONTENT_W = 1600, CONTENT_H = 900;   // matches the 16:9 backdrop/loop

// organic machine plots — points on the platform's flat top surface, hand-placed
// to dodge the lava channels and read as a natural isometric base (a spread
// diamond, front → back). x,y are fractions of the backdrop.
export const PLOT = {
  // a clean isometric 3×3 lattice on the platform's top surface (follows the
  // map's own perspective → reads as a diamond base, never a screen-square).
  t0: { x: 0.483, y: 0.560 },                       // front
  t1: { x: 0.404, y: 0.501 }, t2: { x: 0.569, y: 0.484 },
  t3: { x: 0.325, y: 0.441 }, t4: { x: 0.490, y: 0.425 }, t5: { x: 0.655, y: 0.408 },
  t6: { x: 0.411, y: 0.366 }, t7: { x: 0.576, y: 0.349 },
  t8: { x: 0.497, y: 0.290 },                       // back apex (grandest)
};
export const PLOTS = ["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"];

export function toScreen(id) {
  const p = PLOT[id];
  return { x: p.x * CONTENT_W, y: p.y * CONTENT_H };
}
// painter z-sort: lower on the map (greater y) draws in front
export function zOf(id) { return Math.round(PLOT[id].y * 1000); }
