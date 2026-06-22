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
  // a TRUE isometric 3×3 lattice computed on the deck's top-surface diamond
  // (corners back 50,30 · right 79,47 · front 50,65 · left 21,47), inset with
  // margin. Front (t0) → back (t8) by depth; reads as a clean grid, not scattered.
  t0: { x: 0.500, y: 0.565 },                                                        // front
  t1: { x: 0.419, y: 0.518 }, t2: { x: 0.581, y: 0.518 },
  t3: { x: 0.338, y: 0.470 }, t4: { x: 0.500, y: 0.470 }, t5: { x: 0.662, y: 0.470 },
  t6: { x: 0.419, y: 0.422 }, t7: { x: 0.581, y: 0.422 },
  t8: { x: 0.500, y: 0.375 },                                                        // back (grandest)
};
export const PLOTS = ["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"];

export function toScreen(id) {
  const p = PLOT[id];
  return { x: p.x * CONTENT_W, y: p.y * CONTENT_H };
}
// painter z-sort: lower on the map (greater y) draws in front
export function zOf(id) { return Math.round(PLOT[id].y * 1000); }
