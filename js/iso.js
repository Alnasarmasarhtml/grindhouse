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
  // hand-placed by the user in edit mode, then snapped to a perfect isometric
  // lattice (least-squares fit) for dead-even spacing. A diamond 3×3: t7 back,
  // t5/t8 sides, t0 front, t3 centre.
  t0: { x: 0.5068, y: 0.7973 },
  t1: { x: 0.3974, y: 0.6809 }, t2: { x: 0.6088, y: 0.6748 },
  t3: { x: 0.4993, y: 0.5585 }, t4: { x: 0.6013, y: 0.4360 }, t5: { x: 0.7107, y: 0.5524 },
  t6: { x: 0.3899, y: 0.4421 }, t7: { x: 0.4918, y: 0.3197 },
  t8: { x: 0.2879, y: 0.5646 },
};
export const PLOTS = ["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"];

export function toScreen(id) {
  const p = PLOT[id];
  return { x: p.x * CONTENT_W, y: p.y * CONTENT_H };
}
// painter z-sort: lower on the map (greater y) draws in front
export function zOf(id) { return Math.round(PLOT[id].y * 1000); }
