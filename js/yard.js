/* =====================================================================
   GRIND HOUSE — THE YARD · living map view
   A real generated map (animated refinery platform in space) is the world.
   Each machine sits on its own flat slab (organic plot) with a foundation
   pad; tapping one opens a premium detail modal (image + stats + upgrades).
   Built once (renderYard) then mutated surgically (refreshYard).
   ===================================================================== */
import { CONTENT_W, CONTENT_H, PLOT, PLOTS, toScreen, zOf } from "./iso.js";
import { LINES, OVERCLOCK } from "./data.js";
import { GH } from "./config.js";
import * as Eco from "./economy.js";
import { fmtCash, fmtRate } from "./format.js";
import { artSrc, stageClass, stageFor, STAGE_NAME, STAGE_LV } from "./evolution.js";
import * as UI from "./ui.js";

const _stage = {};   // last-seen evolution stage per building (to fire the level-up beat)
let G = null, mounted = false, built = false;
let cam = { px: 0, py: 0, z: 1 };
const $ = (s, r = document) => r.querySelector(s);
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };

export function isYardActive() { return true; }
export function getBuildingEl(lineId) { return document.getElementById(`bldg-${lineId}`); }

export function mountYard(game) {
  G = game;
  const yard = $("#yard"); if (!yard) return;
  mounted = true;
  $("#yardRecenter")?.addEventListener("click", () => fitToViewport());
  // delegated tap on a machine → detail modal
  $("#yardBldgs")?.addEventListener("click", (e) => {
    const b = e.target.closest(".bldg"); if (!b) return;
    openInspector(b.dataset.line);
  });
  $("#insScrim")?.addEventListener("click", closeInspector);
  bindPan(yard);
  setHudOffset();
  window.addEventListener("resize", () => { setHudOffset(); fitToViewport(); });
}

// measure the sticky HUD + ticker so the map pins exactly beneath them
function setHudOffset() {
  const hud = document.querySelector(".hud"), tick = document.querySelector(".tickerbar");
  const h = (hud ? hud.offsetHeight : 0) + (tick ? tick.offsetHeight : 0);
  if (h) document.documentElement.style.setProperty("--hud-h", h + "px");
}

// kept for compatibility; yard is always visible → just (re)fit
export function setView() { if (!built) renderYard(G.state, G.flows, G); refreshYard(G.state, G.flows); fitToViewport(); }

// ---- build once ----
export function renderYard(state, flows, game) {
  G = game || G;
  const bld = $("#yardBldgs"); if (!bld) return;
  const camEl = $("#yardCam"); if (camEl) { camEl.style.width = CONTENT_W + "px"; camEl.style.height = CONTENT_H + "px"; }
  // make sure the looping map plays (poster shows until the mp4 is available)
  const vid = $("#yardBg");
  if (vid && vid.tagName === "VIDEO") { vid.muted = true; const p = vid.play?.(); if (p && p.catch) p.catch(() => {}); }

  bld.innerHTML = "";
  LINES.forEach((L, i) => {
    if (!PLOT[L.id]) return;
    const p = toScreen(L.id);
    const cp = state.lines[L.id]?.copies || 0;
    const b = el("div", "bldg " + stageClass(cp));
    b.id = `bldg-${L.id}`; b.dataset.line = L.id; b.dataset.tier = i;
    b.style.left = p.x + "px"; b.style.top = p.y + "px"; b.style.setProperty("--z", zOf(L.id));
    b.innerHTML = `
      <span class="bldg-plot"></span>
      <span class="ready-ring"></span>
      <span class="bldg-shadow"></span>
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
    // visual evolution: swap art tier + stage class on threshold cross, fire the beat
    const st = stageFor(ls.copies);
    if (_stage[L.id] !== st) {
      const from = _stage[L.id] ?? st; _stage[L.id] = st;
      const img = b.querySelector(".bldg-art"); if (img) img.src = artSrc(L.id, ls.copies);
      b.classList.remove("stage-0", "stage-1", "stage-2", "stage-3"); b.classList.add("stage-" + st);
      if (placed && st > from) evolveBuilding(L, from, st);
    }
    const pill = b.querySelector(".bldg-pill");
    if (pill) pill.textContent = placed ? `Lv ${ls.copies}` : (unlocked ? "BUILD" : "");
    const surplus = flows.surplus[i] || 0;
    const rate = surplus * L.sell * (flows.sellMult || 1);
    const starved = flows.bottleneck >= 0 && i > flows.bottleneck && flows.caps[i] > 0;
    const rEl = b.querySelector(".bldg-rate");
    if (rEl) rEl.textContent = rate > 0 ? "+" + fmtRate(rate) : (starved ? "⚠ feed it" : "");
    const c1 = Eco.bulkCost(L, ls.copies, 1);
    b.classList.toggle("can", unlocked && state.cash >= c1);
  });
  if ($("#inspector")?.classList.contains("open")) renderInspector(); // keep open modal live
}

// ---- the "it levels up" beat ----
function evolveBuilding(L, from, to) {
  const b = document.getElementById(`bldg-${L.id}`); if (!b) return;
  b.classList.remove("evolving"); void b.offsetWidth; b.classList.add("evolving");
  try { UI.mergeBurst(`#bldg-${L.id}`); } catch (_) {}
  try { UI.toast(`${L.machine} → ${STAGE_NAME[to]} · STAGE ${to + 1}`); } catch (_) {}
}

// ---- detail modal (image + stats + upgrades) ----
let inspectLine = null;
function openInspector(lineId) {
  inspectLine = lineId; renderInspector();
  $("#inspector")?.classList.add("open"); $("#insScrim")?.classList.add("open");
}
function closeInspector() {
  $("#inspector")?.classList.remove("open"); $("#insScrim")?.classList.remove("open");
  inspectLine = null;
}
function renderInspector() {
  const ins = $("#inspector"); if (!ins || !inspectLine) return;
  const i = LINES.findIndex(l => l.id === inspectLine); const L = LINES[i];
  const s = G.state; const ls = s.lines[L.id];
  const unlocked = Eco.isUnlocked(s, i);
  const cp = ls.copies || 0;
  const st = stageFor(cp);
  const heroSrc = artSrc(L.id, cp);

  if (!unlocked) {
    const prev = LINES[i - 1];
    ins.innerHTML = `
      <button class="ins-x" aria-label="Close">✕</button>
      <div class="ins-hero locked">
        <div class="ins-disc"></div>
        <img class="ins-mach" src="${heroSrc}" alt="" draggable="false"
             onerror="this.onerror=null;this.src='${L.icon}'">
        <span class="ins-lockbig">🔒</span>
      </div>
      <div class="ins-body">
        <div class="ins-titlerow"><h3 class="ins-name">${L.machine}</h3><span class="ins-tier">TIER ${i + 1}</span></div>
        <p class="ins-locked">Locked — own <b>${L.unlockPrev} ${prev?.machine || ""}</b> to unlock this machine.</p>
      </div>`;
    ins.querySelector(".ins-x")?.addEventListener("click", closeInspector);
    return;
  }

  const c1 = Eco.bulkCost(L, cp, 1);
  const surplus = G.flows.surplus[i] || 0;
  const rate = surplus * L.sell * (G.flows.sellMult || 1);
  const ocMax = ls.overclock >= OVERCLOCK.maxLevel;
  const ocCost = Eco.overclockCost(L, ls.overclock);
  const canMerge = cp >= GH.economy.mergeCount && i < LINES.length - 1;
  // stage progress toward the next visual evolution
  const nextLv = STAGE_LV[st + 1];
  const prevLv = STAGE_LV[st] || 0;
  const stagePct = nextLv ? Math.max(0, Math.min(100, ((cp - prevLv) / (nextLv - prevLv)) * 100)) : 100;
  const stageNote = nextLv ? `Evolves at Lv ${nextLv}` : "Fully evolved";

  ins.innerHTML = `
    <button class="ins-x" aria-label="Close">✕</button>
    <div class="ins-hero stage-${st}">
      <div class="ins-disc"></div>
      <img class="ins-mach" src="${heroSrc}" alt="${L.machine}" draggable="false"
           onerror="this.onerror=null;this.src='${L.icon}'">
      <span class="ins-stagebadge mono">${STAGE_NAME[st]} · ${st + 1}/4</span>
    </div>
    <div class="ins-body">
      <div class="ins-titlerow"><h3 class="ins-name">${L.machine}</h3><span class="ins-tier">TIER ${i + 1}</span></div>
      <p class="ins-makes">Refines <b>${L.product}</b> · <b>Lv ${cp}</b></p>

      <div class="ins-stats">
        <div class="ins-stat"><span>OUTPUT</span><b class="live">${rate > 0 ? "+" + fmtRate(rate) : "idle"}</b></div>
        <div class="ins-stat"><span>LEVEL</span><b>${cp}</b></div>
        <div class="ins-stat"><span>OVERCLOCK</span><b>${ls.overclock || 0}/${OVERCLOCK.maxLevel}</b></div>
        <div class="ins-stat"><span>STAGE</span><b>${st + 1}/4</b></div>
      </div>

      <div class="ins-stagebar" title="${stageNote}">
        <div class="ins-stagebar-fill" style="width:${stagePct}%"></div>
        <span class="ins-stagebar-cap">${stageNote}</span>
      </div>

      <div class="ins-actions">
        <button class="cta ins-buy">${cp ? "UPGRADE" : "BUILD"}<span class="mono">${fmtCash(c1)}</span></button>
        <div class="ins-split">
          <button class="btn ins-buy10">+10</button>
          <button class="btn ins-buymax">MAX</button>
        </div>
        <button class="btn ins-oc">${ocMax ? "OVERCLOCK · MAX" : `OVERCLOCK Lv ${ls.overclock || 0}`}<span class="mono">${ocMax ? "" : fmtCash(ocCost)}</span><i class="hlp" data-help="overclock" title="Spend CASH to permanently boost this machine's output.">?</i></button>
        <button class="btn ins-mg" ${canMerge ? "" : "disabled"}>MERGE ${GH.economy.mergeCount} → 1× ${LINES[i + 1]?.machine || "—"}<i class="hlp" data-help="merge" title="Fuse ${GH.economy.mergeCount} levels of this machine into one level of the next tier up.">?</i></button>
      </div>
    </div>`;
  ins.querySelector(".ins-x")?.addEventListener("click", closeInspector);
  ins.querySelector(".ins-buy")?.addEventListener("click", () => { G.buy(L.id, 1); });
  ins.querySelector(".ins-buy10")?.addEventListener("click", () => { G.buy(L.id, 10); });
  ins.querySelector(".ins-buymax")?.addEventListener("click", () => { G.buy(L.id, "max"); });
  ins.querySelector(".ins-oc")?.addEventListener("click", () => { G.overclock(L.id); });
  ins.querySelector(".ins-mg")?.addEventListener("click", () => { G.merge(L.id); });
}

// ---- camera: fit + pan, clamped so it never goes tiny or absurdly close ----
// default framing centers on the PLATFORM (not the empty void) so the base is
// always the prominent subject — this is the floor for zoom-out.
const FOCUS = { x0: 0.15, x1: 0.85, y0: 0.05, y1: 0.98 };
const Z_MAX = 2.0;
let zFit = 1;
export function fitToViewport() {
  const yard = $("#yard"), camEl = $("#yardCam"); if (!yard || !camEl) return;
  const vw = yard.clientWidth, vh = yard.clientHeight;
  if (!vw || !vh) { requestAnimationFrame(fitToViewport); return; }
  const fw = (FOCUS.x1 - FOCUS.x0) * CONTENT_W, fh = (FOCUS.y1 - FOCUS.y0) * CONTENT_H;
  zFit = Math.min(vw / fw, vh / fh);                   // frame the platform
  cam.z = zFit;
  const fcx = (FOCUS.x0 + FOCUS.x1) / 2 * CONTENT_W, fcy = (FOCUS.y0 + FOCUS.y1) / 2 * CONTENT_H;
  cam.px = vw / 2 - fcx * cam.z;
  cam.py = vh / 2 - fcy * cam.z;
  applyCam();
}
function clampPan() {
  const yard = $("#yard"); if (!yard) return;
  const vw = yard.clientWidth, vh = yard.clientHeight;
  const cw = CONTENT_W * cam.z, ch = CONTENT_H * cam.z;
  // keep the map covering the viewport (center it when smaller than the view)
  if (cw <= vw) cam.px = (vw - cw) / 2; else cam.px = Math.min(0, Math.max(vw - cw, cam.px));
  if (ch <= vh) cam.py = (vh - ch) / 2; else cam.py = Math.min(0, Math.max(vh - ch, cam.py));
}
function applyCam() {
  clampPan();
  const c = $("#yardCam"); if (c) c.style.transform = `translate3d(${cam.px}px,${cam.py}px,0) scale(${cam.z})`;
}
function zoomAt(cx, cy, factor) {
  const lo = zFit, hi = Z_MAX;                          // never zoom out past the platform framing
  const nz = Math.min(hi, Math.max(lo, cam.z * factor));
  const k = nz / cam.z;
  cam.px = cx - (cx - cam.px) * k; cam.py = cy - (cy - cam.py) * k;
  cam.z = nz; applyCam();
}
function bindPan(yard) {
  let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
  yard.addEventListener("pointerdown", (e) => { dragging = true; sx = e.clientX; sy = e.clientY; ox = cam.px; oy = cam.py; });
  yard.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    cam.px = ox + (e.clientX - sx); cam.py = oy + (e.clientY - sy); applyCam();
  });
  const end = () => { dragging = false; };
  yard.addEventListener("pointerup", end); yard.addEventListener("pointerleave", end);
  yard.addEventListener("wheel", (e) => {
    e.preventDefault();
    const r = yard.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.1 : 0.9);
  }, { passive: false });
}
