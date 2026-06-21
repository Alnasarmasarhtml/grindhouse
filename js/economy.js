/* =====================================================================
   GRIND HOUSE — economy engine (pure functions, no DOM)
   Models the supply chain as a steady-state flow: each line produces;
   line i consumes the product of line i-1. Surplus is sold at the dock.
   This is the beloved ratio-tuning loop — but forgiving (no hard walls:
   a starved line just runs slower and the UI flags the bottleneck).
   ===================================================================== */
import { GH } from "./config.js";
import { LINES, OVERCLOCK, BLUEPRINTS, ACHIEVEMENTS, RARITY_INDEX } from "./data.js";

const E = GH.economy;

/* ---------- costs ---------- */
export function copyCost(line, owned) {
  return line.baseCost * Math.pow(E.costGrowth, owned);
}
// cost to buy `count` copies starting from `owned` (geometric series)
export function bulkCost(line, owned, count) {
  const r = E.costGrowth;
  const a = line.baseCost * Math.pow(r, owned);
  return a * (Math.pow(r, count) - 1) / (r - 1);
}
// how many copies you can afford with `cash`
export function affordableCopies(line, owned, cash) {
  const r = E.costGrowth;
  const a = line.baseCost * Math.pow(r, owned);
  // a*(r^n -1)/(r-1) <= cash  ->  n <= log_r( cash*(r-1)/a + 1 )
  const n = Math.floor(Math.log(cash * (r - 1) / a + 1) / Math.log(r));
  return Math.max(0, n);
}
export function overclockCost(line, level) {
  // scaled to the line's economy so it stays a meaningful spike at every tier
  return line.baseCost * OVERCLOCK.base / 1000 * Math.pow(OVERCLOCK.growth, level) * 5;
}

/* ---------- blueprint effect products ---------- */
export function blueprintProducts(state) {
  let outputMult = 1, sellMult = 1, offlineMult = 1;
  const owned = state.blueprints || {};
  for (const card of BLUEPRINTS.cards) {
    const c = owned[card.id] || 0;
    if (!c) continue;
    const m = Math.pow(card.value, c);
    if (card.effect === "outputMult") outputMult *= m;
    else if (card.effect === "sellMult") sellMult *= m;
    else if (card.effect === "offlineMult") offlineMult *= m;
  }
  return { outputMult, sellMult, offlineMult };
}

/* ---------- achievement multiplier product ---------- */
export function achievementMult(state) {
  let m = 1;
  for (const a of ACHIEVEMENTS) if (state.achievements?.[a.id]) m *= a.mult;
  return m;
}

/* ---------- per-line multiplier ---------- */
export function milestonesPassed(copies) {
  let n = 0;
  for (const t of E.milestones) if (copies >= t) n++;
  return n;
}
export function lineMult(ls) {
  const oc = Math.pow(OVERCLOCK.mult, ls.overclock || 0);
  const ms = Math.pow(E.milestoneMult, milestonesPassed(ls.copies || 0));
  const mg = Math.pow(E.mergeBonus, ls.merges || 0);
  return oc * ms * mg;
}

/* ---------- global output multiplier ---------- */
export function globalOutputMult(state) {
  const prestige = 1 + E.prestige.globalMultPerWeight * (state.prestigeWeight || 0);
  const bp = blueprintProducts(state);
  return prestige * achievementMult(state) * bp.outputMult;
}

/* ---------- the core flow simulation ----------
   returns { caps, flow, surplus, income, bottleneck } */
export function computeFlows(state) {
  const gMult = globalOutputMult(state);
  const sellMult = blueprintProducts(state).sellMult;
  const n = LINES.length;
  const caps = new Array(n).fill(0);
  const flow = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    const ls = state.lines[LINES[i].id];
    if (!ls || !ls.copies) continue;
    caps[i] = LINES[i].baseRate * ls.copies * lineMult(ls) * gMult;
  }
  // forward pass: a line can't exceed what the line below can feed it
  flow[0] = caps[0];
  for (let i = 1; i < n; i++) {
    if (caps[i] <= 0) { flow[i] = 0; continue; }
    const maxFromBelow = LINES[i].input > 0 ? flow[i - 1] / LINES[i].input : Infinity;
    flow[i] = Math.min(caps[i], maxFromBelow);
  }
  // surplus + income
  const surplus = new Array(n).fill(0);
  let income = 0;
  for (let i = 0; i < n; i++) {
    const consumedByNext = (i < n - 1) ? flow[i + 1] * LINES[i + 1].input : 0;
    surplus[i] = Math.max(0, flow[i] - consumedByNext);
    income += surplus[i] * LINES[i].sell * sellMult;
  }
  // bottleneck = lowest line that's starved (running below capacity due to input)
  let bottleneck = -1;
  for (let i = 1; i < n; i++) {
    if (caps[i] > 0 && flow[i] < caps[i] * 0.995) { bottleneck = i - 1; break; }
  }
  return { caps, flow, surplus, income, bottleneck, gMult, sellMult };
}

export function incomePerSec(state) { return computeFlows(state).income; }

/* ---------- unlocking ---------- */
export function isUnlocked(state, idx) {
  if (idx === 0) return true;
  const prev = state.lines[LINES[idx - 1].id];
  return (prev?.copies || 0) >= LINES[idx].unlockPrev;
}

/* ---------- prestige ---------- */
export function prestigePayout(runCash) {
  const p = E.prestige;
  if (runCash < p.minRunCashToShip) return 0;
  return Math.floor(p.K * Math.pow(runCash / p.SCALE, p.EXP));
}
export function canShip(state) { return (state.runCash || 0) >= E.prestige.minRunCashToShip; }
export function projectedGlobalMult(state) {
  const gain = prestigePayout(state.runCash || 0);
  const newWeight = (state.prestigeWeight || 0) + gain;
  return 1 + E.prestige.globalMultPerWeight * newWeight;
}

/* ---------- offline ---------- */
export function offlineEarnings(state, elapsedSec) {
  const bp = blueprintProducts(state);
  const stakingBonus = state.staking?.locked ? E.offlineCapHoursStaking : E.offlineCapHours;
  const capSec = stakingBonus * 3600 * bp.offlineMult;
  const sec = Math.min(elapsedSec, capSec);
  const rate = incomePerSec(state);
  return { cash: rate * sec, cappedSec: sec, capSec, rate };
}

/* ---------- energy ---------- */
export function currentEnergy(state, now) {
  const dt = (now - (state.energyTs || now)) / 1000;
  const regen = dt * E.energy.regenPerSec;
  return Math.min(E.energy.max, (state.energy ?? E.energy.base) + regen);
}

/* ---------- blueprint roll (published odds) ---------- */
export function rollBlueprint(rng = Math.random) {
  const roll = rng();
  let acc = 0, rarity = "common";
  for (const r of BLUEPRINTS.rarities) { acc += r.odds; if (roll <= acc) { rarity = r.key; break; } }
  const pool = BLUEPRINTS.cards.filter(c => c.rarity === rarity);
  const card = pool[Math.floor(rng() * pool.length)] || BLUEPRINTS.cards[0];
  return { card, rarity, rarityIndex: RARITY_INDEX[rarity] };
}

/* ---------- achievements check ---------- */
export function checkAchievements(state) {
  const unlocked = [];
  const stats = buildAchStats(state);
  for (const a of ACHIEVEMENTS) {
    if (state.achievements?.[a.id]) continue;
    if (a.test(stats)) unlocked.push(a);
  }
  return unlocked;
}
export function buildAchStats(state) {
  let totalMachines = 0, maxLineCopies = 0, deepestTier = -1;
  LINES.forEach((L, i) => {
    const c = state.lines[L.id]?.copies || 0;
    totalMachines += c;
    if (c > maxLineCopies) maxLineCopies = c;
    if (c > 0) deepestTier = Math.max(deepestTier, i);
  });
  return {
    totalMachines, maxLineCopies, deepestTier,
    lifetimeCash: state.lifetimeCash || 0,
    lifetimeGrind: state.lifetimeGrind || 0,
    totalMerges: state.stats?.totalMerges || 0,
    totalPulls: state.stats?.totalPulls || 0,
    bestRarity: state.stats?.bestRarity ?? -1,
    totalPrestiges: state.totalPrestiges || 0,
  };
}
