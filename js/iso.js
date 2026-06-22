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
  // an isometric diamond lattice mapped onto the clean deck's top plane. Each
  // machine gets its own matching foundation pad (one consistent sprite) placed
  // here, so pad+machine cohere and align. Back row sits inboard → sky headroom.
  t0: { x: 0.480, y: 0.630 },                                                        // front
  t1: { x: 0.385, y: 0.585 }, t2: { x: 0.575, y: 0.585 },
  t3: { x: 0.290, y: 0.535 }, t4: { x: 0.480, y: 0.535 }, t5: { x: 0.670, y: 0.535 },
  t6: { x: 0.385, y: 0.485 }, t7: { x: 0.575, y: 0.485 },
  t8: { x: 0.480, y: 0.440 },                                                        // back (grandest)
};
export const PLOTS = ["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"];

export function toScreen(id) {
  const p = PLOT[id];
  return { x: p.x * CONTENT_W, y: p.y * CONTENT_H };
}
// painter z-sort: lower on the map (greater y) draws in front
export function zOf(id) { return Math.round(PLOT[id].y * 1000); }
