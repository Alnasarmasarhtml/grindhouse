/* =====================================================================
   GRIND HOUSE — UI layer (rendering + juice)
   Builds machine cards, animates HUD counters, fires modals & particles.
   Receives `game` in mount(); never imports game.js (no circular deps).
   ===================================================================== */
import { GH, isLive } from "./config.js";
import { LINES, OVERCLOCK, BLUEPRINTS, ACHIEVEMENTS, TICKER, BLUEPRINT_COST } from "./data.js";
import * as Eco from "./economy.js";
import { fmt, fmtCash, fmtGrind, fmtRate, fmtTime, shortKey } from "./format.js";
import * as Solana from "./solana.js";
import { save } from "./save.js";

let G = null;
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const disp = { cash: 0, grind: 0 }; // tweened display values

export function mount(game) {
  G = game;
  buildTicker();
  // global controls
  $("#shipBtn")?.addEventListener("click", () => G.shipIt());
  $("#pullBtn")?.addEventListener("click", () => G.pullBlueprint());
  $("#soundBtn")?.addEventListener("click", (e) => { const on = G.toggleSound(); const b = e.currentTarget; b.classList.toggle("on", on); b.textContent = on ? "♪" : "♪̶"; b.title = on ? "Sound on" : "Sound off"; });
  $("#walletBtn")?.addEventListener("click", () => Solana.connect(G));
  $("#overdriveBtn")?.addEventListener("click", () => G.overdrive());
  $("#resetBtn")?.addEventListener("click", () => { if (confirm("Wipe this House and start over? This cannot be undone.")) G.hardReset(); });
  // tabs
  document.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => switchTab(b.dataset.tab)));
  disp.cash = G.state.cash; disp.grind = G.state.grind;
  Solana.refreshWalletUI(G.state);
  wireGlossary();
  $("#helpBtn")?.addEventListener("click", openHelp);
  $("#objective")?.addEventListener("click", () => { const f = $("#objective")?.dataset.flash; if (f) flashEl(f); });
}

function switchTab(name) {
  document.querySelectorAll("[data-panel]").forEach(p => p.classList.toggle("active", p.dataset.panel === name));
  document.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
}

/* ---------------- TICKER ---------------- */
function buildTicker() {
  const t = $("#ticker"); if (!t) return;
  const items = (window.GH_TICKER || TICKER);
  t.innerHTML = items.concat(items).map(x => `<span>${x}</span><b>◆</b>`).join("");
}

/* ---------------- HUD (every frame) ---------------- */
export function updateHUD(state, flows) {
  // ease the big counters toward their true value (the roll-up = dopamine)
  disp.cash += (state.cash - disp.cash) * 0.18;
  disp.grind += (state.grind - disp.grind) * 0.2;
  if (Math.abs(state.cash - disp.cash) < 0.5) disp.cash = state.cash;
  if (Math.abs(state.grind - disp.grind) < 0.01) disp.grind = state.grind;
  setText("#cash", fmtCash(disp.cash));
  // show the BOOSTED rate so OVERDRIVE/Surge are visible
  const od = GH.economy.overdrive;
  const odOn = (state.overdriveUntil || 0) > Date.now();
  const odMult = odOn ? od.mult : 1;
  setText("#cashRate", fmtRate(flows.income * odMult));
  const cr = $("#cashRate"); if (cr) cr.classList.toggle("boosted", odOn);
  setText("#grind", fmtGrind(disp.grind));
  // energy
  const e = state.energy ?? 0, em = GH.economy.energy.max;
  setText("#energy", `${Math.floor(e)}/${em}`);
  const eb = $("#energyBar i"); if (eb) eb.style.width = `${(e / em) * 100}%`;
  // OVERDRIVE button state
  const ob = $("#overdriveBtn");
  if (ob) {
    const left = (state.overdriveUntil || 0) - Date.now();
    const txt = ob.querySelector(".od-txt");
    if (left > 0) {
      ob.classList.add("active"); ob.classList.remove("ready", "cant");
      if (txt) txt.textContent = `×${od.mult} · ${Math.ceil(left / 1000)}s`;
    } else {
      ob.classList.remove("active");
      const ready = e >= od.energyCost;
      ob.classList.toggle("ready", ready); ob.classList.toggle("cant", !ready);
      if (txt) txt.textContent = "OVERDRIVE";
    }
  }
  // ship button state
  const ship = $("#shipBtn");
  if (ship) {
    const ready = Eco.canShip(state);
    ship.classList.toggle("ready", ready);
    const payout = Eco.prestigePayout(state.runCash);
    setText("#shipPayout", ready ? `+${fmtGrind(payout)} $GRIND` : `bank ${fmtCash(GH.economy.prestige.minRunCashToShip)} this run`);
  }
  // pull button affordability
  const pull = $("#pullBtn"); if (pull) pull.classList.toggle("disabled", state.grind < BLUEPRINT_COST);
}

/* ---------------- MACHINE CARDS ---------------- */
export function renderLines(state, flows, game) {
  const root = $("#lines"); if (!root) return;
  root.innerHTML = "";
  LINES.forEach((L, i) => root.appendChild(card(L, i, state, flows)));
  bindCards();
}

function card(L, i, state, flows) {
  const ls = state.lines[L.id];
  const unlocked = Eco.isUnlocked(state, i);
  const c = el("div", "card" + (unlocked ? "" : " locked") + (ls.copies ? " owned" : ""), "");
  c.id = `card-${L.id}`;
  c.dataset.line = L.id;
  c.style.setProperty("--tier", i);

  const surplus = flows.surplus[i] || 0;
  const lineIncome = surplus * L.sell * (flows.sellMult || 1);
  const starved = flows.bottleneck >= 0 && i > flows.bottleneck && (flows.caps[i] > 0);

  c.innerHTML = `
    <div class="card-glow"></div>
    <div class="card-icon"><img src="${L.icon}" alt="${L.product}" loading="lazy"><span class="tier-badge">T${i}</span></div>
    <div class="card-main">
      <div class="card-head"><span class="machine">${L.machine}</span><span class="owned-pill" id="own-${L.id}">×${ls.copies}</span></div>
      <div class="card-sub">makes <b>${L.product}</b></div>
      <div class="prodbar"><i></i></div>
      <div class="card-foot">
        <span class="rate" id="rate-${L.id}">${lineIncome > 0 ? "+" + fmtRate(lineIncome) : (starved ? "⚠ starved" : "idle")}</span>
        <span class="ms" id="ms-${L.id}">${milestoneLabel(ls.copies)}</span>
      </div>
    </div>
    <div class="card-actions">
      <button class="btn buy" data-line="${L.id}" data-q="1"><span class="lbl">BUY</span><span class="cost" id="cost-${L.id}"></span></button>
      <div class="buy-split">
        <button class="btn mini" data-line="${L.id}" data-q="10">×10</button>
        <button class="btn mini" data-line="${L.id}" data-q="max">MAX</button>
      </div>
      <button class="btn oc" data-line="${L.id}"><span class="lbl">OVERCLOCK</span><span class="oc-lvl" id="oc-${L.id}">Lv ${ls.overclock}</span><span class="cost" id="occost-${L.id}"></span><i class="hlp" data-help="overclock" title="What's this?">?</i></button>
      <button class="btn mg" data-line="${L.id}">MERGE 3 → 1× T${i + 1}<i class="hlp" data-help="merge" title="What's this?">?</i></button>
    </div>
    ${unlocked ? "" : `<div class="lock"><div class="lock-i">🔒</div><div>LOCKED · own <b>${L.unlockPrev} ${LINES[i - 1]?.machine || ""}</b> to open</div></div>`}
  `;
  return c;
}

function milestoneLabel(copies) {
  const ms = GH.economy.milestones;
  for (const t of ms) if (copies < t) return `→ ${t} for ×2`;
  return "max ×2 bonus";
}

function bindCards() {
  document.querySelectorAll(".card .buy, .card .mini").forEach(b =>
    b.addEventListener("click", () => G.buy(b.dataset.line, b.dataset.q === "max" ? "max" : +b.dataset.q)));
  document.querySelectorAll(".card .oc").forEach(b => b.addEventListener("click", () => G.overclock(b.dataset.line)));
  document.querySelectorAll(".card .mg").forEach(b => b.addEventListener("click", () => G.merge(b.dataset.line)));
}

// lightweight per-frame-ish refresh (no rebuild) — costs, affordability, rates
export function refreshCardStates(state, flows) {
  LINES.forEach((L, i) => {
    const cd = $(`#card-${L.id}`); if (!cd) return;
    const ls = state.lines[L.id];
    const unlocked = Eco.isUnlocked(state, i);
    cd.classList.toggle("locked", !unlocked);
    cd.classList.toggle("owned", ls.copies > 0);
    if (!unlocked) return;
    cd.querySelector(".lock")?.remove();   // surgical refresh: drop the lock overlay once unlocked (no full rebuild now)
    const c1 = Eco.bulkCost(L, ls.copies, 1);
    setText(`#cost-${L.id}`, fmtCash(c1));
    setText(`#own-${L.id}`, `×${ls.copies}`);
    setText(`#oc-${L.id}`, `Lv ${ls.overclock}`);
    setText(`#occost-${L.id}`, ls.overclock >= OVERCLOCK.maxLevel ? "MAX" : fmtCash(Eco.overclockCost(L, ls.overclock)));
    setText(`#ms-${L.id}`, milestoneLabel(ls.copies));
    const surplus = flows.surplus[i] || 0;
    const lineIncome = surplus * L.sell * (flows.sellMult || 1);
    const starved = flows.bottleneck >= 0 && i > flows.bottleneck && flows.caps[i] > 0;
    setText(`#rate-${L.id}`, lineIncome > 0 ? "+" + fmtRate(lineIncome) : (starved ? "⚠ feed it" : (ls.copies ? "idle" : "—")));
    // affordability
    const buyBtn = cd.querySelector(".buy");
    if (buyBtn) buyBtn.classList.toggle("can", state.cash >= c1);
    const ocBtn = cd.querySelector(".oc");
    if (ocBtn) ocBtn.classList.toggle("can", ls.overclock < OVERCLOCK.maxLevel && state.cash >= Eco.overclockCost(L, ls.overclock));
    const mgBtn = cd.querySelector(".mg");
    if (mgBtn) { const can = ls.copies >= GH.economy.mergeCount && i < LINES.length - 1; mgBtn.classList.toggle("can", can); mgBtn.disabled = !can; }
    // production bar animation speed
    const bar = cd.querySelector(".prodbar i");
    if (bar) bar.style.animationPlayState = (flows.flow[i] > 0) ? "running" : "paused";
  });
}

/* ---------------- BLUEPRINTS PANEL ---------------- */
export function renderBlueprints(state) {
  const root = $("#bpList"); if (!root) return;
  setText("#bpCost", isLive() ? `${GH.chain.blueprint?.priceSol ?? 0.1} SOL` : "FREE · DEMO");
  // odds table
  const odds = $("#bpOdds");
  if (odds && !odds.dataset.built) {
    odds.dataset.built = "1";
    odds.innerHTML = BLUEPRINTS.rarities.map(r =>
      `<span class="odd" style="--rc:${r.color}">${r.label} <b>${(r.odds * 100).toFixed(1)}%</b></span>`).join("");
  }
  root.innerHTML = BLUEPRINTS.cards.map(c => {
    const owned = state.blueprints[c.id] || 0;
    const rc = BLUEPRINTS.rarities.find(r => r.key === c.rarity);
    return `<div class="bp ${owned ? "have" : "dim"}" style="--rc:${rc.color}">
      <div class="bp-top"><span class="bp-name">${c.name}</span><span class="bp-rar">${rc.label}</span></div>
      <div class="bp-desc">${c.desc}</div>
      <div class="bp-own">${owned ? `OWNED ×${owned}` : "—"}</div>
    </div>`;
  }).join("");
}

/* ---------------- ACHIEVEMENTS PANEL ---------------- */
export function renderAchievements(state) {
  const root = $("#achList"); if (!root) return;
  const done = ACHIEVEMENTS.filter(a => state.achievements[a.id]).length;
  setText("#achCount", `${done}/${ACHIEVEMENTS.length}`);
  root.innerHTML = ACHIEVEMENTS.map(a => {
    const got = state.achievements[a.id];
    return `<div class="ach ${got ? "got" : ""}">
      <div class="ach-ic">${got ? "★" : "☆"}</div>
      <div><div class="ach-n">${a.name}</div><div class="ach-d">${a.desc}</div></div>
      <div class="ach-r">+${a.grind}</div>
    </div>`;
  }).join("");
}

/* ---------------- MODALS ---------------- */
function modal(html, cls = "") {
  const root = $("#modalRoot");
  const wrap = el("div", "modal-wrap " + cls);
  wrap.innerHTML = `<div class="modal">${html}</div>`;
  wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
  root.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add("show"));
  function close() { wrap.classList.remove("show"); setTimeout(() => wrap.remove(), 250); }
  return { wrap, close };
}

export function disclaimer(onAck) {
  const m = modal(`
    <h2 class="m-title">BEFORE YOU GRIND — STRAIGHT TALK.</h2>
    <p class="m-body">$GRIND is a <b>volatile token</b> and can go to zero. GRIND HOUSE is a game — entertainment first. Right now it's a <b>free demo</b>: the $GRIND you grind is your <b>airdrop at launch</b>, claimed by activating an Operator License — capped and not guaranteed. Never spend what you can't afford to lose.</p>
    <button class="cta big-cta ack">I UNDERSTAND — LET'S GRIND</button>
  `, "disc");
  m.wrap.querySelector(".ack").addEventListener("click", () => { onAck(); m.close(); });
}

export function welcomeBack(off, onCollect) {
  const m = modal(`
    <h2 class="m-title">THE HOUSE NEVER SLEPT.</h2>
    <p class="m-body">While you were gone, your floor kept grinding for <b>${fmtTime(off.cappedSec)}</b>.</p>
    <div class="m-prize"><span class="big">${fmtCash(off.cash)}</span><small>banked</small></div>
    <button class="cta big-cta">COLLECT</button>
  `, "welcome");
  m.wrap.querySelector(".cta").addEventListener("click", () => { onCollect(); coinShower(); m.close(); });
}

export function shipConfirm(payout, projMult, onConfirm) {
  const m = modal(`
    <h2 class="m-title">SHIP IT?</h2>
    <p class="m-body">Wipe the floor. Bank a <b>permanent ×${projMult.toFixed(2)}</b> multiplier and a <b>${fmtGrind(payout)} $GRIND</b> payout. Your next run climbs higher than this one ever could.</p>
    <div class="m-row"><button class="cta ghost no">NOT YET</button><button class="cta yes">SHIP IT</button></div>
  `, "ship");
  m.wrap.querySelector(".yes").addEventListener("click", () => { onConfirm(); m.close(); });
  m.wrap.querySelector(".no").addEventListener("click", m.close);
}

export function blueprintResult(res, done) {
  const rc = BLUEPRINTS.rarities.find(r => r.key === res.rarity);
  const m = modal(`
    <div class="pull-card" style="--rc:${rc.color}">
      <div class="pull-shine"></div>
      <img src="assets/img/blueprint.png" onerror="this.style.display='none'" alt="">
      <div class="pull-rar" style="color:${rc.color}">${rc.label}</div>
      <div class="pull-name">${res.card.name}</div>
      <div class="pull-eff">${res.card.desc}</div>
    </div>
    <div class="m-row"><button class="cta ghost ok">NICE</button><button class="cta again">PULL AGAIN</button></div>
  `, "pull " + res.rarity);
  if (res.rarityIndex >= 3) confettiBurst(rc.color);
  m.wrap.querySelector(".ok").addEventListener("click", () => { done(); m.close(); });
  m.wrap.querySelector(".again").addEventListener("click", () => { done(); m.close(); setTimeout(() => G.pullBlueprint(), 260); });
}

export function achievement(a) {
  const t = el("div", "ach-toast", `<div class="at-ic">★</div><div><div class="at-n">${a.name}</div><div class="at-d">${a.desc} · +${a.grind} $GRIND</div></div>`);
  $("#fxRoot").appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, 4200);
}

export function toast(msg) {
  const t = el("div", "toast", msg);
  $("#fxRoot").appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 1600);
}

/* ---------------- JUICE / FX ---------------- */
export function pulse(sel) { const e = $(sel); if (!e) return; e.classList.remove("pulse"); void e.offsetWidth; e.classList.add("pulse"); }

export function mergeBurst(sel) {
  const e = $(sel); if (!e) return;
  pulse(sel);
  const r = e.getBoundingClientRect();
  for (let i = 0; i < 18; i++) spark(r.left + r.width / 2, r.top + r.height / 2, ["#FF2EC4", "#18E0FF", "#B6FF3C"][i % 3]);
}

export function shipFlash(payout) {
  const f = el("div", "ship-flash", `<div class="sf-in"><div class="sf-t">SHIPPED</div><div class="sf-p">+${fmtGrind(payout)} $GRIND</div></div>`);
  $("#fxRoot").appendChild(f);
  requestAnimationFrame(() => f.classList.add("show"));
  confettiBurst("#FFD24A");
  setTimeout(() => { f.classList.remove("show"); setTimeout(() => f.remove(), 500); }, 1700);
}

function coinShower() {
  for (let i = 0; i < 26; i++) {
    setTimeout(() => {
      const c = el("div", "coin", "");
      c.style.left = Math.random() * 100 + "vw";
      c.style.setProperty("--dur", (1 + Math.random() * 1.2) + "s");
      c.style.setProperty("--rot", (Math.random() * 720 - 360) + "deg");
      $("#fxRoot").appendChild(c);
      setTimeout(() => c.remove(), 2400);
    }, i * 40);
  }
}

function confettiBurst(color) {
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  for (let i = 0; i < 40; i++) spark(cx, cy, [color, "#FF2EC4", "#18E0FF", "#B6FF3C", "#FFD24A"][i % 5], true);
}

function spark(x, y, color, big = false) {
  const s = el("div", "spark", "");
  s.style.left = x + "px"; s.style.top = y + "px";
  s.style.background = color;
  const ang = Math.random() * Math.PI * 2, dist = (big ? 120 : 60) + Math.random() * (big ? 220 : 90);
  s.style.setProperty("--dx", Math.cos(ang) * dist + "px");
  s.style.setProperty("--dy", Math.sin(ang) * dist + "px");
  if (big) s.style.boxShadow = `0 0 8px ${color}`;
  $("#fxRoot").appendChild(s);
  setTimeout(() => s.remove(), 900);
}

/* =====================================================================
   FTUE — onboarding (welcome card · first-buy coachmark · objective bar ·
   help sheet · tap-to-learn glossary). Reuses modal()/toast()/pulse().
   One highlight at a time; never blocks a tap; nudges count, don't nag.
   ===================================================================== */
const GLOSSARY = {
  cash:      "Game money. Earn it selling, spend it building. Can't be cashed out — that's why it's safe to print forever.",
  grind:     "The real Solana coin. Fixed 1B. Bank now, claim to your wallet at launch.",
  energy:    "Juice for OVERDRIVE. Tap ⚡ OVERDRIVE on the yard to spend it for a ×3 CASH burst. Refills on its own.",
  merge:     "Smash 3 of the same machine into 1 of the next tier. How you climb.",
  shipit:    "Reset the floor for a permanent boost + a $GRIND drop. Not a reset — a power-up.",
  overclock: "Pay CASH to make one machine print faster. Forever.",
  blueprint: "Spend $GRIND on a card that buffs you forever. Odds are public. Buffs survive every SHIP IT.",
  link:      "Feed one machine's output into the next. Chains print way more than loners.",
};

// next-action nudges. done(stats,state) reads the same snapshot as achievements.
const NUDGES = [
  { label: "Drop your first Scrap Rig",
    count: () => "0/1",
    done:  (st) => st.totalMachines >= 1,
    flash: "#card-t0",
    toast: "IT'S ALIVE. Money incoming.",
    onComplete: () => clearCoach() },
  { label: "Own 5 Scrap Rigs → unlocks Iron",
    count: (st, s) => `${Math.min(5, s.lines.t0?.copies || 0)}/5`,
    done:  (st, s) => (s.lines.t0?.copies || 0) >= 5,
    flash: "#card-t0",
    toast: "IRON UNLOCKED. Link it up to print more. ↑",
    flashOnDone: "#card-t1" },
  { label: "Link Iron into Scrap to print more",
    done:  (st) => st.deepestTier >= 1,
    flash: "#card-t1",
    toast: "CHAINED. Now it really moves." },
  { label: "Merge 3 rigs into 1 better machine",
    count: (st) => `${Math.min(1, st.totalMerges)}/1`,
    done:  (st) => st.totalMerges >= 1,
    flash: ".card .mg",
    toast: "FUSION. That's the real climb." },
  { label: "Walled out? Hit SHIP IT for your first $GRIND",
    done:  (st) => st.totalPrestiges >= 1,
    flash: "#shipBtn",
    toast: "SHIPPED. +$GRIND banked toward your launch airdrop. Run it back." },
];

let _objIdx = 0, _objInit = false;

// called once after the disclaimer ack (from game.js)
export function initFTUE(game) {
  G = game;
  const s = game.state;
  if (s.onboardDone) return;          // veteran — only the ? button remains
  if (!s.onboarded) { welcomeFTUE(); return; }
  // returning mid-onboarding
  if (Eco.buildAchStats(s).totalMachines === 0) coachFirstBuy();
}

// ---- I-1 · welcome / how-to-play in 10 seconds ----
export function welcomeFTUE() {
  const m = modal(`
    <h2 class="m-title">WELCOME TO THE HOUSE</h2>
    <div class="ftue-rows">
      <div class="ftue-row"><span class="ftue-ic"><img src="assets/img/t0_scrap.png" alt=""></span><div><b>BUILD machines.</b><span>They grind junk into money, even offline.</span></div></div>
      <div class="ftue-row"><span class="ftue-ic"><img src="assets/img/cash.png" alt=""></span><div><b>THEY PRINT.</b><span>24/7, asleep or away. The house never stops.</span></div></div>
      <div class="ftue-row"><span class="ftue-ic"><img src="assets/img/token.png" alt=""></span><div><b>BANK $GRIND.</b><span>The real Solana coin. Claim it at launch.</span></div></div>
    </div>
    <button class="cta big-cta ftue-go">LET'S GRIND →</button>
    <div class="ftue-foot">Free to play. No wallet to start. <a class="ftue-skip">skip</a></div>
  `, "welcome ftue-welcome");
  m.wrap.querySelector(".ftue-go").addEventListener("click", () => {
    G.state.onboarded = true; _objInit = false; save(G.state, true);
    m.close(); coachFirstBuy();
  });
  m.wrap.querySelector(".ftue-skip").addEventListener("click", () => {
    G.state.onboarded = true; G.state.onboardDone = true; save(G.state, true);
    clearCoach(); $("#objective")?.classList.remove("show"); m.close();
  });
}

// ---- I-2 · coachmark spotlight on the first BUY ----
export function coachFirstBuy() {
  clearCoach();
  const card = $("#card-t0"); if (!card) return;
  const scrim = el("div", "coach-scrim", "");
  document.body.appendChild(scrim);
  card.classList.add("coach-spot");
  const buy = card.querySelector(".buy");
  if (buy) {
    const lab = el("div", "coach-label", "Tap to drop your first machine →");
    buy.appendChild(lab);
    pulse("#card-t0 .buy");
    // gentle re-pulse if they hesitate
    G._coachT = setInterval(() => { if ($(".coach-spot")) pulse("#card-t0 .buy"); }, 6000);
  }
}
export function clearCoach() {
  if (G && G._coachT) { clearInterval(G._coachT); G._coachT = null; }
  document.querySelector(".coach-scrim")?.remove();
  const c = document.querySelector(".coach-spot");
  if (c) { c.classList.remove("coach-spot"); c.querySelector(".coach-label")?.remove(); }
}

// ---- I-3 · objective bar (driven each ach tick from game.js) ----
export function updateObjective(state, stats) {
  const bar = $("#objective"); if (!bar) return;
  if (!state.onboarded || state.onboardDone) { bar.classList.remove("show"); return; }
  let idx = NUDGES.findIndex(n => !n.done(stats, state));
  if (idx === -1) {                              // full sequence cleared
    bar.classList.remove("show");
    state.onboardDone = true; save(state, true);
    clearCoach();
    return;
  }
  bar.classList.add("show");
  if (!_objInit) { _objIdx = idx; _objInit = true; renderObjective(idx, state, stats); return; }
  while (_objIdx < idx) {                        // one or more nudges just completed
    const c = NUDGES[_objIdx];
    if (c) { c.onComplete?.(); if (c.toast) toast(c.toast); if (c.flashOnDone) flashEl(c.flashOnDone); }
    _objIdx++;
  }
  renderObjective(idx, state, stats);
}
function renderObjective(idx, state, stats) {
  const bar = $("#objective"); if (!bar) return;
  const n = NUDGES[idx];
  const cnt = n.count ? `<span class="obj-count">${n.count(stats, state)}</span>` : "";
  bar.innerHTML = `<span class="obj-k">NEXT ▸</span><span class="obj-t">${n.label}</span>${cnt}`;
  bar.dataset.flash = n.flash || "";
}

// ---- I-5 · persistent help sheet ----
function openHelp() {
  const gloss = Object.entries({
    CASH: GLOSSARY.cash, "$GRIND": GLOSSARY.grind, MERGE: GLOSSARY.merge,
    "SHIP IT": GLOSSARY.shipit, OVERCLOCK: GLOSSARY.overclock, BLUEPRINT: GLOSSARY.blueprint,
    "LINK / CHAIN": GLOSSARY.link, ENERGY: GLOSSARY.energy,
  }).map(([k, v]) => `<div class="help-g"><b>${k}</b><span>${v}</span></div>`).join("");
  const m = modal(`
    <h2 class="m-title">HOW TO RUN THE HOUSE</h2>
    <div class="ftue-rows help-loop">
      <div class="ftue-row"><span class="ftue-ic"><img src="assets/img/t0_scrap.png" alt=""></span><div><b>BUILD machines.</b><span>They grind junk into money, even offline.</span></div></div>
      <div class="ftue-row"><span class="ftue-ic"><img src="assets/img/cash.png" alt=""></span><div><b>THEY PRINT.</b><span>24/7, asleep or away.</span></div></div>
      <div class="ftue-row"><span class="ftue-ic"><img src="assets/img/token.png" alt=""></span><div><b>BANK $GRIND.</b><span>What you grind is your launch airdrop.</span></div></div>
    </div>
    <p class="help-one"><b>CASH builds</b> (game money, can't cash out). <b>$GRIND pays</b> (the real coin — what you grind is your airdrop, claimed at launch).</p>
    <div class="help-gloss">${gloss}</div>
    <div class="m-row"><button class="cta ghost help-replay">Replay tutorial</button><button class="cta help-ok">GOT IT</button></div>
    <p class="help-reassure">Lost? You can't break it. Tap, build, print.</p>
    <p class="help-fine">This is a game, not financial advice.</p>
  `, "help-sheet");
  m.wrap.querySelector(".help-ok").addEventListener("click", m.close);
  m.wrap.querySelector(".help-replay").addEventListener("click", () => {
    m.close();
    G.state.onboardDone = false; _objInit = false; save(G.state, true);
    welcomeFTUE();
  });
}

// ---- I-4 · tap-to-learn glossary popovers (wired to [data-help]) ----
function wireGlossary() {
  // delegated + capture so it works on dynamically-rendered cards AND blocks the host button's action
  document.addEventListener("click", (e) => {
    const h = e.target.closest && e.target.closest("[data-help]");
    if (!h) return;
    e.stopPropagation(); e.preventDefault();
    showGloss(h, h.dataset.help);
  }, true);
}
function showGloss(anchor, key) {
  document.querySelector(".gloss-pop")?.remove();
  const txt = GLOSSARY[key]; if (!txt) return;
  const pop = el("div", "gloss-pop", txt);
  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  const pw = Math.min(260, window.innerWidth - 24);
  pop.style.width = pw + "px";
  let left = r.left + r.width / 2 - pw / 2;
  left = Math.max(12, Math.min(left, window.innerWidth - pw - 12));
  pop.style.left = left + "px";
  pop.style.top = (r.bottom + 8) + "px";
  requestAnimationFrame(() => pop.classList.add("show"));
  const kill = (ev) => { if (ev.target !== anchor) { pop.remove(); document.removeEventListener("click", kill); } };
  setTimeout(() => document.addEventListener("click", kill), 0);
  setTimeout(() => pop.classList.contains("show") && pop.remove(), 6000);
}

function flashEl(sel) { const e = $(sel); if (e) { pulse(sel); e.scrollIntoView({ behavior: "smooth", block: "center" }); } }

/* ---------------- helpers ---------------- */
function setText(sel, txt) { const e = $(sel); if (e && e.textContent !== txt) e.textContent = txt; }
