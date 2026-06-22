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
  // centered on the nine foundation pads BAKED INTO the map art — an organic,
  // staggered scatter of lit plots (not a rigid grid) so each machine sits on
  // a real foundation. Back row sits clear of the deck edge → headroom above.
  t0: { x: 0.510, y: 0.760 }, t1: { x: 0.410, y: 0.750 }, t2: { x: 0.620, y: 0.750 }, // front
  t3: { x: 0.340, y: 0.630 }, t4: { x: 0.470, y: 0.630 }, t5: { x: 0.590, y: 0.630 }, // middle
  t6: { x: 0.370, y: 0.510 }, t7: { x: 0.610, y: 0.520 }, t8: { x: 0.490, y: 0.500 }, // back (grandest at centre)
};
export const PLOTS = ["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"];

export function toScreen(id) {
  const p = PLOT[id];
  return { x: p.x * CONTENT_W, y: p.y * CONTENT_H };
}
// painter z-sort: lower on the map (greater y) draws in front
export function zOf(id) { return Math.round(PLOT[id].y * 1000); }
