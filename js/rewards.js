/* =====================================================================
   GRIND HOUSE — REWARDS ENGINE
   Daily login · free wheel ($/day pot cap) · paid wheel (perks, fee→sink)
   · surge multipliers · closed-loop vault accounting.
   DEMO-honest: every payout is practice-$GRIND (off-chain score, NOT a token,
   resets at launch). The vault math mirrors docs/ECONOMY_v2.md so the on-chain
   split slots in unchanged at launch. All numbers come from GH.rewards.
   ===================================================================== */
import { GH, dayIndex } from "./config.js";
import * as Eco from "./economy.js";

const R = () => GH.rewards;
const now = () => Date.now();

/* ---------- weighted RNG ---------- */
function rollSegment(segments) {
  const total = segments.reduce((s, x) => s + (x.weight || 0), 0);
  let r = Math.random() * total;
  for (let i = 0; i < segments.length; i++) { r -= segments[i].weight || 0; if (r <= 0) return i; }
  return segments.length - 1;
}

/* ---------- daily roll-over ---------- */
export function dailyReset(game) {
  const s = game.state, d = dayIndex();
  if (s.vault.day !== d) {
    s.vault.day = d; s.vault.burnedToday = 0; s.vault.freePaidToday = 0;
  }
  if (s.rewards.freePotDay !== d) {
    s.rewards.freePotDay = d; s.rewards.freePotLeft = R().freeWheel.dailyPotGrind;
  }
}

/* ---------- closed-loop: route spent $GRIND through the universal sink split ---------- */
function sinkSpend(s, amount) {
  const sp = R().loop.sinkSplit, v = s.vault;
  const burn = amount * sp.burn;
  v.burnedTotal += burn; v.burnedToday += burn;
  v.treasuryTotal += amount * sp.treasury;
  v.dropPool += amount * sp.dailyDrop;
  v.top10Pool += amount * sp.top10;
  v.everybodyPool += amount * sp.everybody;
  s.rewards.spentGrind += amount;
}

/* ---------- grant any prize segment; returns a human result {kind,text,amount} ---------- */
export function grantPrize(game, seg) {
  const s = game.state;
  if (seg.grind != null) {
    let g = seg.grind;
    s.grind += g; s.lifetimeGrind = (s.lifetimeGrind || 0) + g; s.rewards.claimedGrind += g;
    return { kind: "grind", amount: g, text: `+${g} $GRIND` };
  }
  if (seg.surge) return activateSurge(s, seg.surge);
  if (seg.perk) return grantPerk(game, seg.perk);
  return { kind: "none", text: "No prize" };
}

function activateSurge(s, id) {
  const t = R().surge.tiers[id]; if (!t) return { kind: "none", text: "—" };
  const until = now() + t.hours * 3600000;
  const cur = s.rewards.surge;
  // keep the better of (current active) vs (new): higher mult wins; equal → extend
  if (!(cur.until > now()) || t.mult > cur.mult || (t.mult === cur.mult && until > cur.until)) {
    s.rewards.surge = { id, mult: t.mult, until };
  }
  return { kind: "surge", text: `${t.name} active`, amount: t.mult };
}

function grantPerk(game, id) {
  const s = game.state;
  if (id === "speed") {
    const off = Eco.offlineEarnings(s, R().perks.speed.hours * 3600);
    const c = Math.max(0, off.cash || 0);
    s.cash += c; s.runCash += c; s.lifetimeCash += c;
    return { kind: "perk", text: `Speed-up · +${fmtShort(c)} CASH` };
  }
  if (id === "cash2") {
    const p = R().perks.cash2;
    s.rewards.cashRush = { mult: p.mult, until: now() + p.hours * 3600000 };
    return { kind: "perk", text: `Cash Rush ×${p.mult} 1h` };
  }
  if (id === "blueprint") {
    try { const res = Eco.rollBlueprint(); s.blueprints[res.card.id] = (s.blueprints[res.card.id] || 0) + 1;
      s.stats.totalPulls = (s.stats.totalPulls || 0) + 1; return { kind: "perk", text: `Blueprint: ${res.card.name}` }; }
    catch (_) { return { kind: "perk", text: "Blueprint" }; }
  }
  return { kind: "none", text: R().perks[id]?.desc || "No prize" };
}

/* ---------- DAILY LOGIN ---------- */
export function loginInfo(s) {
  const d = dayIndex(), L = R().dailyLogin;
  const claimable = L.enabled && s.rewards.lastLoginDay !== d;
  // which rung you'd claim next
  let rung = s.rewards.loginStreak || 0;
  if (s.rewards.lastLoginDay >= 0 && d - s.rewards.lastLoginDay > 1) {
    rung = L.softDecay ? Math.max(0, rung - 1) : 0;   // missed a day
  } else if (s.rewards.lastLoginDay >= 0) {
    rung = (rung + 1) % L.ladder.length;              // consecutive → next rung
  }
  return { claimable, rung, reward: L.ladder[rung], ladder: L.ladder, streak: rung };
}
export function claimLogin(game) {
  const s = game.state, info = loginInfo(s);
  if (!info.claimable) return null;
  s.rewards.loginStreak = info.rung;
  s.rewards.lastLoginDay = dayIndex();
  const res = grantPrize(game, info.reward);
  return { rung: info.rung, reward: info.reward, res };
}

/* ---------- FREE WHEEL ---------- */
export function freeInfo(s) {
  const d = dayIndex();
  const potLeft = (s.rewards.freePotDay === d) ? s.rewards.freePotLeft : R().freeWheel.dailyPotGrind;
  return { canSpin: R().freeWheel.enabled && s.rewards.freeSpinDay !== d, potLeft, segments: R().freeWheel.segments };
}
export function spinFree(game) {
  const s = game.state, fw = R().freeWheel;
  if (!freeInfo(s).canSpin) return { err: "Come back tomorrow for your free spin" };
  dailyReset(game);
  const idx = rollSegment(fw.segments);
  const seg = { ...fw.segments[idx] };
  // clamp grind prizes to the remaining daily pot (the cap), with a floor
  if (seg.grind != null) {
    seg.grind = Math.max(fw.floorGrind, Math.min(seg.grind, Math.max(fw.floorGrind, Math.floor(s.rewards.freePotLeft))));
    s.rewards.freePotLeft = Math.max(0, s.rewards.freePotLeft - seg.grind);
  }
  s.rewards.freeSpinDay = dayIndex();
  const res = grantPrize(game, seg);
  return { index: idx, seg, res };
}

/* ---------- PAID WHEEL ---------- */
export function paidInfo(s) {
  const c = R().paidWheel.costGrind;
  return { cost: c, canAfford: s.grind >= c - 1e-6, segments: R().paidWheel.segments };
}
export function spinPaid(game) {
  const s = game.state, pw = R().paidWheel;
  if (!pw.enabled) return { err: "Disabled" };
  if (s.grind < pw.costGrind - 1e-6) return { err: "Not enough $GRIND" };
  s.grind -= pw.costGrind;
  sinkSpend(s, pw.costGrind);             // fee → burn + treasury + pools (closed loop)
  s.vault.freePaidToday += pw.costGrind;
  const idx = rollSegment(pw.segments);
  const seg = pw.segments[idx];
  const res = grantPrize(game, seg);
  return { index: idx, seg, res };
}

/* ---------- DIRECT SURGE BUY ---------- */
export function surgeList() { return R().surge.tiers; }
export function buySurge(game, id) {
  const s = game.state, t = R().surge.tiers[id];
  if (!t) return { err: "Unknown" };
  if (s.grind < t.costGrind - 1e-6) return { err: "Not enough $GRIND" };
  s.grind -= t.costGrind;
  sinkSpend(s, t.costGrind);
  const res = activateSurge(s, id);
  return { ok: true, res };
}

/* ---------- active-multiplier read (used by the income tick) ---------- */
export function surgeMult(s) { const x = s?.rewards?.surge; return (x && x.until > now()) ? x.mult : 1; }
export function cashMult(s) { const x = s?.rewards?.cashRush; return (x && x.until > now()) ? x.mult : 1; }
export function activeBoostMult(s) { return surgeMult(s) * cashMult(s); }
export function surgeRemainingMs(s) { const x = s?.rewards?.surge; return (x && x.until > now()) ? x.until - now() : 0; }

function fmtShort(n) {
  n = Math.floor(n || 0);
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return "" + n;
}
