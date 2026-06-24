/* =====================================================================
   GRIND HOUSE — REWARDS UI
   The REWARDS panel: daily-login ladder, the two fortune wheels (crisp SVG),
   the Surge shop, and the live vault/burn ticker (the closed loop, visible).
   ===================================================================== */
import { GH } from "./config.js";
import * as Rewards from "./rewards.js";
import * as Audio from "./audio.js";
import { toast } from "./ui.js";

let G = null;
const $ = (s, r = document) => r.querySelector(s);
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const fmt = (n) => { n = Math.floor(n || 0);
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B"; if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K"; return "" + n; };

/* local modal (mirrors ui.js) */
function modal(html, cls = "") {
  const root = $("#modalRoot"); const wrap = el("div", "modal-wrap " + cls);
  wrap.innerHTML = `<div class="modal">${html}</div>`;
  wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
  root.appendChild(wrap); requestAnimationFrame(() => wrap.classList.add("show"));
  function close() { wrap.classList.remove("show"); setTimeout(() => wrap.remove(), 250); }
  return { wrap, close };
}

/* ---------- mount: build the panel once ---------- */
export function mountRewards(game) {
  G = game;
  const root = $("#rewardsPanel"); if (!root) return;
  root.innerHTML = `
    <div class="rw-grid">
      <div class="rw-card rw-login"><h3>DAILY LOGIN</h3><div id="rwLogin"></div></div>
      <div class="rw-card rw-wheels">
        <h3>FORTUNE WHEEL</h3>
        <div class="rw-wheelbtns">
          <button id="rwFree" class="cta rw-spin"><span class="lbl">FREE SPIN</span><span class="sub" id="rwFreeSub">1/day</span></button>
          <button id="rwPaid" class="btn rw-spin paid"><span class="lbl">PAID SPIN</span><span class="sub" id="rwPaidSub"></span></button>
        </div>
        <p class="rw-fine">Free wheel pays from a capped daily pot. Paid spins cost $GRIND and win boosts &amp; speed-ups — the $GRIND is split to <b>burn + treasury + the prize pools</b>.</p>
      </div>
      <div class="rw-card rw-surge"><h3>SURGE — BUY A MULTIPLIER</h3><div id="rwSurge" class="rw-surgegrid"></div>
        <p class="rw-fine">Surge multiplies your <b>output</b> (and rank score). One active at a time. $GRIND spent → burn + treasury + pools.</p></div>
      <div class="rw-card rw-vault"><h3>THE HOUSE VAULT <span class="rw-live"><span class="live-dot"></span>LIVE</span></h3><div id="rwVault"></div>
        <p class="rw-fine">Every $GRIND spent in the house splits 40% daily wins · 15% top-10 · 10% everybody · <b>20% burned</b> · 15% treasury. Spenders fund winners; the house burns its cut.</p></div>
    </div>`;
  $("#rwFree").addEventListener("click", () => openWheel("free"));
  $("#rwPaid").addEventListener("click", () => openWheel("paid"));
  renderSurge(); renderLogin(); renderVault(); refreshRewards(game);
}

/* ---------- daily login ---------- */
function renderLogin() {
  const wrap = $("#rwLogin"); if (!wrap) return;
  const info = Rewards.loginInfo(G.state);
  const rows = info.ladder.map((r, i) => {
    const isNext = info.claimable && i === info.rung;
    const num = r.grind != null ? fmt(r.grind) : "";
    const bon = r.surge ? "⚡" : (r.perk ? "⏩" : "");
    const bonName = r.surge ? (GH.rewards.surge.tiers[r.surge]?.name || "Surge") : (r.perk ? (GH.rewards.perks[r.perk]?.name || "Perk") : "");
    return `<div class="rw-day ${isNext ? "next" : ""} ${r.big ? "big" : ""} ${i < info.rung ? "past" : ""}" title="Day ${i + 1}: ${num} $GRIND${bonName ? " + " + bonName : ""}">
      <span class="rw-d">D${i + 1}</span><span class="rw-r">${num}</span>${bon ? `<span class="rw-b">${bon}</span>` : ""}</div>`;
  }).join("");
  wrap.innerHTML = `<div class="rw-ladder">${rows}</div>
    <button id="rwClaim" class="cta ${info.claimable ? "" : "disabled"}">${info.claimable ? "CLAIM TODAY" : "COME BACK TOMORROW"}</button>`;
  const b = $("#rwClaim");
  if (info.claimable) b.addEventListener("click", () => {
    const r = Rewards.claimLogin(G); if (!r) return;
    Audio.play("collect"); toast(`Day ${r.rung + 1}: ${r.res.text}`);
    G.recompute?.(); G.refresh?.(); G.saveNow?.(); renderLogin(); renderVault(); refreshRewards(G);
  });
}

/* ---------- surge shop ---------- */
function renderSurge() {
  const wrap = $("#rwSurge"); if (!wrap) return;
  const tiers = Rewards.surgeList();
  wrap.innerHTML = Object.entries(tiers).map(([id, t]) =>
    `<button class="rw-surgebtn" data-surge="${id}"><b>×${t.mult}</b><span>${t.hours}h</span><em class="mono">${fmt(t.costGrind)} $GRIND</em></button>`
  ).join("");
  wrap.querySelectorAll("[data-surge]").forEach(b => b.addEventListener("click", () => {
    const r = Rewards.buySurge(G, b.dataset.surge);
    if (r.err) { Audio.play("err"); toast(r.err); return; }
    Audio.play("upgrade"); toast(r.res.text); G.recompute?.(); G.refresh?.(); G.saveNow?.(); renderVault(); refreshRewards(G);
  }));
}

/* ---------- vault ticker ---------- */
function renderVault() {
  const wrap = $("#rwVault"); if (!wrap) return;
  const v = G.state.vault, fw = Rewards.freeInfo(G.state);
  wrap.innerHTML = `
    <div class="rw-vrow"><span>🔥 Burned total</span><b class="mono">${fmt(v.burnedTotal)}</b></div>
    <div class="rw-vrow"><span>🔥 Burned today</span><b class="mono">${fmt(v.burnedToday)}</b></div>
    <div class="rw-vrow"><span>🏆 Top-10 pool</span><b class="mono">${fmt(v.top10Pool)}</b></div>
    <div class="rw-vrow"><span>👥 Everybody pool</span><b class="mono">${fmt(v.everybodyPool)}</b></div>
    <div class="rw-vrow"><span>💧 Daily-drop pool</span><b class="mono">${fmt(v.dropPool)}</b></div>
    <div class="rw-vrow"><span>🎡 Free pot left today</span><b class="mono">${fmt(fw.potLeft)} / ${fmt(GH.rewards.freeWheel.dailyPotGrind)}</b></div>`;
}

/* ---------- the SVG wheel (color-coded wedges, upright value+name labels) ---------- */
function shortG(n) { n = Math.floor(n || 0); if (n >= 1000) { const k = n / 1000; return (k % 1 ? k.toFixed(1) : k) + "K"; } return "" + n; }
function segDisplay(seg) {
  if (seg.grind != null) {
    const jack = seg.grind >= 5000;
    return { main: shortG(seg.grind), sub: jack ? "JACKPOT" : "$GRIND", wedge: jack ? "#251a05" : "#1b1407", color: jack ? "#FFD970" : "#FFCE6A" };
  }
  if (seg.surge) { const t = GH.rewards.surge.tiers[seg.surge]; return { main: "×" + (t ? t.mult : ""), sub: "SURGE", wedge: "#181327", color: "#B79BFF" }; }
  if (seg.perk === "speed")     return { main: "⏩", sub: "SPEED-UP",  wedge: "#0b1c22", color: "#5BE3FF" };
  if (seg.perk === "cash2")     return { main: "×2", sub: "CASH RUSH", wedge: "#0c1d13", color: "#5BE38C" };
  if (seg.perk === "blueprint") return { main: "◈",  sub: "BLUEPRINT", wedge: "#221029", color: "#FF7FDC" };
  if (seg.perk === "none")      return { main: "✕",  sub: "MISS",      wedge: "#141319", color: "#7E7A70" };
  return { main: (seg.label || "").toString(), sub: "", wedge: "#141319", color: "#ECE8DF" };
}
function buildWheel(segments) {
  const N = segments.length, seg = 360 / N, cx = 180, cy = 180, r = 168;
  const pt = (ang, rad) => { const a = ang * Math.PI / 180; return [cx + rad * Math.sin(a), cy - rad * Math.cos(a)]; };
  let slices = "", labels = "";
  for (let i = 0; i < N; i++) {
    const a0 = i * seg - seg / 2, a1 = i * seg + seg / 2;
    const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r);
    const d = segDisplay(segments[i]);
    slices += `<path d="M${cx} ${cy} L${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z" fill="${d.wedge}" stroke="#2c2838" stroke-width="1.2"/>`;
    const rot = i * seg, flip = rot > 90 && rot < 270;
    const vy = cy - r * 0.66, ny = vy + 16, ctrY = (vy + ny) / 2;
    const tf = flip ? `rotate(${rot} ${cx} ${cy}) rotate(180 ${cx} ${ctrY})` : `rotate(${rot} ${cx} ${cy})`;
    const v = `<text x="${cx}" y="${flip ? ny : vy}" text-anchor="middle" class="rw-segv" fill="${d.color}">${d.main}</text>`;
    const n = d.sub ? `<text x="${cx}" y="${flip ? vy : ny}" text-anchor="middle" class="rw-segn">${d.sub}</text>` : "";
    labels += `<g transform="${tf}">${v}${n}</g>`;
  }
  return `<svg viewBox="0 0 360 360" class="rw-wheelsvg">
    <defs><radialGradient id="rwSheen" cx="50%" cy="40%" r="62%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity=".07"/><stop offset="70%" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <circle cx="${cx}" cy="${cy}" r="${r + 8}" fill="#0a090e" stroke="#F5A623" stroke-width="4"/>
    <g class="rw-rotor" data-rot="0">${slices}${labels}</g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#rwSheen)" pointer-events="none"/>
    <circle cx="${cx}" cy="${cy}" r="30" fill="#15151a" stroke="#F5A623" stroke-width="2.5"/>
    <text x="${cx}" y="${cy + 7}" text-anchor="middle" class="rw-hub">$</text>
  </svg>
  <div class="rw-pointer"></div>`;
}
function spinTo(rotor, idx, N, done) {
  const seg = 360 / N;
  const target = (360 - ((idx * seg) % 360)) % 360;
  const jitter = (Math.random() - 0.5) * seg * 0.55;
  let cur = +rotor.dataset.rot || 0;
  let next = cur - (cur % 360) + 5 * 360 + target + jitter;
  while (next <= cur + 360) next += 360;
  rotor.dataset.rot = next;
  rotor.style.transition = "transform 4.4s cubic-bezier(.12,.84,.22,1)";
  rotor.style.transform = `rotate(${next}deg)`;
  let fired = false; const fin = () => { if (fired) return; fired = true; done(); };
  rotor.addEventListener("transitionend", fin, { once: true });
  setTimeout(fin, 4700);
}

function openWheel(mode) {
  const isFree = mode === "free";
  const info = isFree ? Rewards.freeInfo(G.state) : Rewards.paidInfo(G.state);
  const segs = info.segments;
  const cost = isFree ? 0 : info.cost;
  const m = modal(`
    <div class="rw-wheelmodal ${mode}">
      <h2 class="m-title">${isFree ? "FREE WHEEL" : "PAID WHEEL"}</h2>
      <div class="rw-wheelstage">${buildWheel(segs)}</div>
      <div class="rw-result" id="rwResult">${isFree ? "One free spin a day." : "Win boosts &amp; speed-ups."}</div>
      <button class="cta big-cta rw-go" id="rwGo">${isFree ? "SPIN (FREE)" : `SPIN · ${fmt(cost)} $GRIND`}</button>
      <button class="cta ghost rw-close" id="rwCloseBtn">CLOSE</button>
    </div>`, "wheel");
  const rotor = m.wrap.querySelector(".rw-rotor");
  const go = m.wrap.querySelector("#rwGo");
  const res = m.wrap.querySelector("#rwResult");
  m.wrap.querySelector("#rwCloseBtn").addEventListener("click", m.close);
  let spinning = false;
  // disable if not available
  if (isFree && !info.canSpin) { go.classList.add("disabled"); go.textContent = "COME BACK TOMORROW"; }
  if (!isFree && !info.canAfford) { go.classList.add("disabled"); go.textContent = "NOT ENOUGH $GRIND"; }
  go.addEventListener("click", () => {
    if (spinning || go.classList.contains("disabled")) return;
    spinning = true; go.classList.add("disabled"); res.textContent = "…";
    Audio.play("pull");
    const out = isFree ? Rewards.spinFree(G) : Rewards.spinPaid(G);
    if (out.err) { spinning = false; go.classList.remove("disabled"); res.textContent = out.err; Audio.play("err"); return; }
    spinTo(rotor, out.index, segs.length, () => {
      res.innerHTML = `<b class="rw-won">${out.res.text}</b>`;
      Audio.play(out.res.kind === "grind" && out.res.amount >= 1000 ? "legendary" : "collect");
      G.recompute?.(); G.refresh?.(); G.saveNow?.(); renderVault(); refreshRewards(G);
      // allow another paid spin if affordable; free is one-per-day
      if (!isFree) {
        const pi = Rewards.paidInfo(G.state);
        if (pi.canAfford) { go.classList.remove("disabled"); go.textContent = `SPIN AGAIN · ${fmt(pi.cost)} $GRIND`; spinning = false; }
        else { go.textContent = "NOT ENOUGH $GRIND"; }
      } else { go.textContent = "COME BACK TOMORROW"; }
    });
  });
}

/* ---------- live refresh (called from the game tick) ---------- */
export function refreshRewards(game) {
  G = game || G; if (!G) return;
  const li = Rewards.loginInfo(G.state), fi = Rewards.freeInfo(G.state), pi = Rewards.paidInfo(G.state);
  const free = $("#rwFree"), fsub = $("#rwFreeSub"), paid = $("#rwPaid"), psub = $("#rwPaidSub");
  if (free) free.classList.toggle("ready", fi.canSpin);
  if (fsub) fsub.textContent = fi.canSpin ? "READY" : "tomorrow";
  if (psub) psub.textContent = `${fmt(pi.cost)} $GRIND`;
  if (paid) paid.classList.toggle("disabled", !pi.canAfford);
  // surge timer + affordability
  const rem = Rewards.surgeRemainingMs(G.state);
  document.querySelectorAll("#rwSurge [data-surge]").forEach(b => {
    const t = GH.rewards.surge.tiers[b.dataset.surge];
    b.classList.toggle("cant", G.state.grind < t.costGrind);
  });
  // tab "ready" dot
  const tab = document.querySelector('[data-tab="rewards"]');
  if (tab) tab.classList.toggle("has-ready", li.claimable || fi.canSpin);
  // HUD surge badge
  const badge = $("#surgeBadge");
  if (badge) {
    const mult = Rewards.surgeMult(G.state);
    if (mult > 1 && rem > 0) { badge.style.display = ""; badge.textContent = `⚡×${mult} ${Math.ceil(rem / 60000)}m`; }
    else badge.style.display = "none";
  }
}
export function refreshVaultTicker() { try { renderVault(); } catch (_) {} }
