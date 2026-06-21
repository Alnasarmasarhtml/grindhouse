/* =====================================================================
   GRIND HOUSE — THE YARD · isometric base view (P1)
   A view-layer over the SAME economy: one tier = one building,
   state.lines[id].copies = that building's LEVEL. Reuses Game actions.
   Built once (renderYard) then mutated surgically (refreshYard).
   ===================================================================== */
import { TILE_W, TILE_H, DIAMOND, LAYOUT, ORIGIN_X, CONTENT_W, CONTENT_H, toScreen, zOf, allPlots } from "./iso.js";
import { LINES, OVERCLOCK } from "./data.js";
import { GH } from "./config.js";
import * as Eco from "./economy.js";
import { fmtCash, fmtRate } from "./format.js";
import { artSrc, stageClass, stageFor, STAGE_NAME } from "./evolution.js";
import * as UI from "./ui.js";

const _stage = {};   // last-seen evolution stage per building (to fire the level-up beat)

let G = null, mounted = false, built = false;
let activeView = "list";
let cam = { px: 0, py: 0, z: 1 };
const $ = (s, r = document) => r.querySelector(s);
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };

export function isYardActive() { return activeView === "yard"; }
export function getBuildingEl(lineId) { return document.getElementById(`bldg-${lineId}`); }

export function mountYard(game) {
  G = game;
  const yard = $("#yard"); if (!yard) return;
  mounted = true; activeView = "yard";          // the yard is the always-on centerpiece
  $("#yardRecenter")?.addEventListener("click", () => fitToViewport());
  // delegated tap on buildings → inspector
  $("#yardBldgs")?.addEventListener("click", (e) => {
    const b = e.target.closest(".bldg"); if (!b) return;
    openInspector(b.dataset.line);
  });
  // close inspector on outside tap
  document.addEventListener("click", (e) => {
    const ins = $("#inspector");
    if (ins?.classList.contains("open") && !e.target.closest("#inspector") && !e.target.closest(".bldg")) closeInspector();
  });
  bindPan(yard);
}

// kept for compatibility; yard is always visible now → just (re)fit
export function setView() { if (!built) renderYard(G.state, G.flows, G); refreshYard(G.state, G.flows); fitToViewport(); }

// ---- build once ----
export function renderYard(state, flows, game) {
  G = game || G;
  const ground = $("#yardTiles"); const bld = $("#yardBldgs");
  if (!ground || !bld) return;
  const camEl = $("#yardCam"); if (camEl) { camEl.style.width = CONTENT_W + "px"; camEl.style.height = CONTENT_H + "px"; }
  // tiles
  ground.innerHTML = "";
  for (const [c, r] of allPlots()) {
    const p = toScreen(c, r);
    const t = el("div", "yard-tile");
    t.style.left = (p.x - TILE_W / 2) + "px"; t.style.top = (p.y - TILE_H / 2) + "px";
    ground.appendChild(t);
  }
  // dock prop
  bld.innerHTML = "";
  const dk = toScreen(...LAYOUT.dock);
  const dock = el("div", "bldg dock", `<div class="bldg-art dock-art"></div><span class="bldg-pill mono">DOCK</span>`);
  dock.style.left = dk.x + "px"; dock.style.top = dk.y + "px"; dock.style.setProperty("--z", zOf(...LAYOUT.dock));
  bld.appendChild(dock);
  // buildings (one per tier)
  LINES.forEach((L, i) => {
    const [c, r] = LAYOUT[L.id];
    const p = toScreen(c, r);
    const cp = state.lines[L.id]?.copies || 0;
    const b = el("div", "bldg " + stageClass(cp));
    b.id = `bldg-${L.id}`; b.dataset.line = L.id; b.dataset.tier = i;
    b.style.left = p.x + "px"; b.style.top = p.y + "px"; b.style.setProperty("--z", zOf(c, r));
    b.innerHTML = `
      <span class="ready-ring"></span>
      <img class="bldg-art" src="${artSrc(L.id, cp)}" alt="${L.machine}" draggable="false" loading="lazy"
           onerror="this.onerror=null;this.src='${L.icon}'">
      <span class="bldg-lock">🔒</span>
      <span class="bldg-pill mono"></span>
      <span class="bldg-rate mono"></span>`;
    bld.appendChild(b);
    _stage[L.id] = stageFor(cp);
  });
  built = true;
}

// ---- surgical update ----
export function refreshYard(state, flows) {
  if (!mounted || !built) return;
  LINES.forEach((L, i) => {
    const b = document.getElementById(`bldg-${L.id}`); if (!b) return;
    const ls = state.lines[L.id];
    const unlocked = Eco.isUnlocked(state, i);
    const placed = (ls.copies || 0) > 0;
    b.classList.toggle("locked", !unlocked);
    b.classList.toggle("placed", placed);
    // visual evolution: swap art tier + stage class on threshold cross, fire the level-up beat
    const st = stageFor(ls.copies);
    if (_stage[L.id] !== st) {
      const from = _stage[L.id] ?? st; _stage[L.id] = st;
      const img = b.querySelector(".bldg-art"); if (img) img.src = artSrc(L.id, ls.copies);
      b.classList.remove("stage-0", "stage-1", "stage-2", "stage-3"); b.classList.add("stage-" + st);
      if (placed && st > from) evolveBuilding(L, from, st);
    }
    // level pill
    const pill = b.querySelector(".bldg-pill");
    if (pill) pill.textContent = placed ? `Lv ${ls.copies}` : (unlocked ? "BUILD" : "");
    // live rate
    const surplus = flows.surplus[i] || 0;
    const rate = surplus * L.sell * (flows.sellMult || 1);
    const starved = flows.bottleneck >= 0 && i > flows.bottleneck && flows.caps[i] > 0;
    const rEl = b.querySelector(".bldg-rate");
    if (rEl) rEl.textContent = rate > 0 ? "+" + fmtRate(rate) : (starved ? "⚠ feed it" : "");
    // affordable → ready ring (the "tap me" tell)
    const c1 = Eco.bulkCost(L, ls.copies, 1);
    const canBuy = unlocked && state.cash >= c1;
    b.classList.toggle("can", canBuy);
  });
  if ($("#inspector")?.classList.contains("open")) renderInspector(); // keep open sheet live
}

// ---- the "it levels up" beat ----
function evolveBuilding(L, from, to) {
  const b = document.getElementById(`bldg-${L.id}`); if (!b) return;
  b.classList.remove("evolving"); void b.offsetWidth; b.classList.add("evolving");
  try { UI.mergeBurst(`#bldg-${L.id}`); } catch (_) {}
  try { UI.toast(`${L.machine} → ${STAGE_NAME[to]} · STAGE ${to + 1}`); } catch (_) {}
}

// ---- inspector (per-building action sheet) ----
let inspectLine = null;
function openInspector(lineId) { inspectLine = lineId; renderInspector(); $("#inspector")?.classList.add("open"); }
function closeInspector() { $("#inspector")?.classList.remove("open"); inspectLine = null; }
function renderInspector() {
  const ins = $("#inspector"); if (!ins || !inspectLine) return;
  const i = LINES.findIndex(l => l.id === inspectLine); const L = LINES[i];
  const s = G.state; const ls = s.lines[L.id];
  const unlocked = Eco.isUnlocked(s, i);
  if (!unlocked) {
    const prev = LINES[i - 1];
    ins.innerHTML = `<div class="ins-head"><b>${L.machine}</b><button class="ins-x">✕</button></div>
      <p class="ins-locked">🔒 Locked · own <b>${L.unlockPrev} ${prev?.machine || ""}</b> to open</p>`;
    ins.querySelector(".ins-x")?.addEventListener("click", closeInspector);
    return;
  }
  const c1 = Eco.bulkCost(L, ls.copies, 1);
  const surplus = G.flows.surplus[i] || 0;
  const rate = surplus * L.sell * (G.flows.sellMult || 1);
  const ocMax = ls.overclock >= OVERCLOCK.maxLevel;
  const ocCost = Eco.overclockCost(L, ls.overclock);
  const canMerge = ls.copies >= GH.economy.mergeCount && i < LINES.length - 1;
  ins.innerHTML = `
    <div class="ins-head"><img src="${L.icon}" alt=""><div><b>${L.machine}</b><span class="ins-sub">makes ${L.product} · <b>Lv ${ls.copies}</b></span></div><button class="ins-x">✕</button></div>
    <div class="ins-rate mono">${rate > 0 ? "+" + fmtRate(rate) : "idle"}</div>
    <div class="ins-actions">
      <button class="cta ins-buy">${ls.copies ? "UPGRADE" : "BUILD"}<span class="mono">${fmtCash(c1)}</span></button>
      <div class="ins-split">
        <button class="btn ins-buy10">+10</button>
        <button class="btn ins-buymax">MAX</button>
      </div>
      <button class="btn ins-oc">${ocMax ? "OVERCLOCK · MAX" : `OVERCLOCK Lv ${ls.overclock}`}<span class="mono">${ocMax ? "" : fmtCash(ocCost)}</span><i class="hlp" data-help="overclock">?</i></button>
      <button class="btn ins-mg" ${canMerge ? "" : "disabled"}>MERGE 3 → 1× ${LINES[i + 1]?.machine || ""}<i class="hlp" data-help="merge">?</i></button>
    </div>`;
  ins.querySelector(".ins-x")?.addEventListener("click", closeInspector);
  ins.querySelector(".ins-buy")?.addEventListener("click", () => { G.buy(L.id, 1); });
  ins.querySelector(".ins-buy10")?.addEventListener("click", () => { G.buy(L.id, 10); });
  ins.querySelector(".ins-buymax")?.addEventListener("click", () => { G.buy(L.id, "max"); });
  ins.querySelector(".ins-oc")?.addEventListener("click", () => { G.overclock(L.id); });
  ins.querySelector(".ins-mg")?.addEventListener("click", () => { G.merge(L.id); });
}

// ---- camera: fit + pan ----
export function fitToViewport() {
  const yard = $("#yard"), camEl = $("#yardCam"); if (!yard || !camEl) return;
  const vw = yard.clientWidth, vh = yard.clientHeight;
  if (!vw || !vh) { requestAnimationFrame(fitToViewport); return; }   // wait for layout
  const z = Math.min(vw / CONTENT_W, vh / CONTENT_H, 1.4);
  cam.z = Math.max(0.5, z);
  cam.px = (vw - CONTENT_W * cam.z) / 2;
  cam.py = (vh - CONTENT_H * cam.z) / 2;
  applyCam();
}
function applyCam() {
  const c = $("#yardCam"); if (c) c.style.transform = `translate3d(${cam.px}px,${cam.py}px,0) scale(${cam.z})`;
}
function bindPan(yard) {
  let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = 0;
  yard.addEventListener("pointerdown", (e) => { dragging = true; moved = 0; sx = e.clientX; sy = e.clientY; ox = cam.px; oy = cam.py; });
  yard.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - sx, dy = e.clientY - sy; moved += Math.abs(dx) + Math.abs(dy);
    cam.px = ox + dx; cam.py = oy + dy; applyCam();
  });
  const end = () => { dragging = false; };
  yard.addEventListener("pointerup", end); yard.addEventListener("pointerleave", end);
  // wheel zoom (desktop)
  yard.addEventListener("wheel", (e) => { e.preventDefault(); cam.z = Math.min(1.4, Math.max(0.5, cam.z * (e.deltaY < 0 ? 1.08 : 0.93))); applyCam(); }, { passive: false });
}
