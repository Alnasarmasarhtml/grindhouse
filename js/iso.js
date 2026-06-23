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
  // FINAL hand-placed layout (position + per-machine size) — set by the user in edit mode.
  t0: { x: 0.5946, y: 0.4667, s: 1.418 },
  t1: { x: 0.6178, y: 0.6762, s: 1.593 },
  t2: { x: 0.4971, y: 0.5779, s: 1.418 },
  t3: { x: 0.3979, y: 0.6908, s: 1.262 },
  t4: { x: 0.5039, y: 0.8091, s: 1.191 },
  t5: { x: 0.2951, y: 0.5652, s: 1.191 },
  t6: { x: 0.3995, y: 0.4501, s: 1.191 },
  t7: { x: 0.4998, y: 0.3510, s: 1.041 },
  t8: { x: 0.7049, y: 0.5457, s: 1.191 },
};
export const PLOTS = ["t0", "t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"];

export function toScreen(id) {
  const p = PLOT[id];
  return { x: p.x * CONTENT_W, y: p.y * CONTENT_H };
}
// painter z-sort: lower on the map (greater y) draws in front
export function zOf(id) { return Math.round(PLOT[id].y * 1000); }
// per-machine user scale (set by scroll in edit mode, baked into PLOT.s); default 1
export function scaleOf(id) { const s = PLOT[id] && PLOT[id].s; return (typeof s === "number" && s > 0) ? s : 1; }
