/* =====================================================================
   GRIND HOUSE — game controller + main loop
   Owns state, runs the delta-time loop, exposes player actions.
   UI is driven from here; ui.js never imports this (controls are bound
   by passing `Game` into UI.mount).
   ===================================================================== */
import { GH, isLive } from "./config.js";
import { LINES, OVERCLOCK, BLUEPRINTS, ACHIEVEMENTS, RARITY_INDEX, BLUEPRINT_COST } from "./data.js";
import * as Eco from "./economy.js";
import { load, save, freshState, wipe } from "./save.js";
import * as UI from "./ui.js";
import * as Audio from "./audio.js";
import * as Solana from "./solana.js";
import * as Yard from "./yard.js";
import * as Rewards from "./rewards.js";
import * as RewardsUI from "./rewardsui.js";

export const Game = {
  state: null,
  flows: null,
  _lastTs: 0,
  _acc: { ach: 0, render: 0, save: 0 },

  init() {
    this.state = load();
    Audio.init(this.state.settings.sound);
    // offline accrual
    const now = Date.now();
    const elapsed = (now - (this.state.lastSeen || now)) / 1000;
    UI.mount(this);
    Yard.mountYard(this);
    Rewards.dailyReset(this);
    if (!this.state.ackRisk) UI.disclaimer(() => { this.state.ackRisk = true; save(this.state, true); UI.initFTUE(this); });
    else UI.initFTUE(this);
    this.recompute();
    if (elapsed > 60 && Eco.incomePerSec(this.state) > 0) {
      const off = Eco.offlineEarnings(this.state, elapsed);
      if (off.cash > 0) {
        this._pendingOffline = off;
        UI.welcomeBack(off, () => {
          this.state.cash += off.cash;
          this.state.runCash += off.cash;
          this.state.lifetimeCash += off.cash;
          Audio.play("collect");
          this.recompute(); this.refresh(); save(this.state, true);
        });
      }
    }
    this.renderStructure();
    Yard.fitToViewport();
    this._lastTs = performance.now();
    requestAnimationFrame(this.tick.bind(this));
    window.addEventListener("beforeunload", () => save(this.state, true));
    document.addEventListener("visibilitychange", () => { if (document.hidden) save(this.state, true); });
  },

  tick(ts) {
    let dt = (ts - this._lastTs) / 1000;
    this._lastTs = ts;
    if (dt > 1) dt = 1;               // clamp big stalls (offline handled separately)
    const odMult = (this.state.overdriveUntil > Date.now()) ? GH.economy.overdrive.mult : 1;
    const inc = this.flows.income * Rewards.activeBoostMult(this.state) * odMult;
    if (inc > 0) {
      const gain = inc * dt;
      this.state.cash += gain;
      this.state.runCash += gain;
      this.state.lifetimeCash += gain;
    }
    // energy regen
    this.state.energy = Eco.currentEnergy(this.state, Date.now());
    this.state.energyTs = Date.now();

    // throttled subsystems
    this._acc.ach += dt; this._acc.save += dt; this._acc.render += dt;
    if (this._acc.ach >= 0.7) { this._acc.ach = 0; this.checkAch(); }
    if (this._acc.render >= 0.25) { this._acc.render = 0; this.refresh(); }
    if (this._acc.save >= GH.save.autosaveMs / 1000) { this._acc.save = 0; save(this.state); }

    UI.updateHUD(this.state, this.flows);
    requestAnimationFrame(this.tick.bind(this));
  },

  recompute() { this.flows = Eco.computeFlows(this.state); },
  // build-once: full DOM construction (init, ship reset, blueprint, view switch)
  renderStructure() {
    this.recompute();
    UI.renderLines(this.state, this.flows, this);
    Yard.renderYard(this.state, this.flows, this);
    UI.renderBlueprints(this.state);
    UI.renderAchievements(this.state);
    RewardsUI.mountRewards(this);
    UI.updateHUD(this.state, this.flows);
  },
  // surgical: per-action + throttled tick — NO innerHTML teardown (keeps the yard alive @60fps)
  refresh() {
    this.recompute();
    Rewards.dailyReset(this);
    UI.refreshCardStates(this.state, this.flows);
    Yard.refreshYard(this.state, this.flows);
    RewardsUI.refreshRewards(this);
    UI.updateHUD(this.state, this.flows);
  },
  saveNow() { save(this.state, true); },

  // OVERDRIVE — spend energy for a short ×N CASH burst (the "juice for big moves")
  overdrive() {
    const od = GH.economy.overdrive;
    if (!od.enabled) return;
    if (this.state.overdriveUntil > Date.now()) { UI.toast(`Overdrive ×${od.mult} already running`); return; }
    if ((this.state.energy ?? 0) < od.energyCost) { UI.toast(`Need ${od.energyCost} energy`); Audio.play("err"); return; }
    this.state.energy = Math.max(0, (this.state.energy ?? 0) - od.energyCost);
    this.state.energyTs = Date.now();
    this.state.overdriveUntil = Date.now() + od.seconds * 1000;
    Audio.play("ship");
    UI.toast(`⚡ OVERDRIVE ×${od.mult} for ${od.seconds}s!`);
    this.refresh(); save(this.state, true);
  },
  overdriveLeftMs() { return Math.max(0, (this.state.overdriveUntil || 0) - Date.now()); },

  /* -------- ACTIONS -------- */
  buy(lineId, qty) {
    const idx = LINES.findIndex(l => l.id === lineId);
    const L = LINES[idx];
    const ls = this.state.lines[lineId];
    if (!Eco.isUnlocked(this.state, idx)) return;
    let count = qty;
    if (qty === "max") count = Math.max(1, Eco.affordableCopies(L, ls.copies, this.state.cash));
    const cost = Eco.bulkCost(L, ls.copies, count);
    if (this.state.cash < cost - 1e-6) { UI.toast("Not enough CASH"); Audio.play("err"); return; }
    this.state.cash -= cost;
    ls.copies += count;
    Audio.play("buy");
    UI.pulse(`#card-${lineId}`);
    this.recompute(); this.refresh(); save(this.state);
  },

  overclock(lineId) {
    const L = LINES.find(l => l.id === lineId);
    const ls = this.state.lines[lineId];
    if (ls.overclock >= OVERCLOCK.maxLevel) { UI.toast("Max overclock"); return; }
    const cost = Eco.overclockCost(L, ls.overclock);
    if (this.state.cash < cost - 1e-6) { UI.toast("Not enough CASH"); Audio.play("err"); return; }
    this.state.cash -= cost;
    ls.overclock++;
    Audio.play("upgrade");
    UI.pulse(`#card-${lineId}`);
    this.recompute(); this.refresh(); save(this.state);
  },

  merge(lineId) {
    const idx = LINES.findIndex(l => l.id === lineId);
    if (idx >= LINES.length - 1) { UI.toast("Top tier — can't merge higher"); return; }
    const ls = this.state.lines[lineId];
    const need = GH.economy.mergeCount;
    if (ls.copies < need) { UI.toast(`Need ${need} to merge`); Audio.play("err"); return; }
    const next = this.state.lines[LINES[idx + 1].id];
    ls.copies -= need;
    next.copies += 1;
    next.merges = (next.merges || 0) + 1;
    this.state.stats.totalMerges = (this.state.stats.totalMerges || 0) + 1;
    Audio.play("merge");
    UI.mergeBurst(`#card-${LINES[idx + 1].id}`);
    this.recompute(); this.refresh(); save(this.state, true);
  },

  shipIt() {
    if (!Eco.canShip(this.state)) { UI.toast("Floor not ready to ship"); return; }
    const payout = Eco.prestigePayout(this.state.runCash);
    UI.shipConfirm(payout, Eco.projectedGlobalMult(this.state), () => {
      // reset floor, keep meta
      const keep = {
        grind: this.state.grind + payout,
        lifetimeGrind: (this.state.lifetimeGrind || 0) + payout,
        lifetimeCash: this.state.lifetimeCash,
        prestigeWeight: (this.state.prestigeWeight || 0) + payout,
        totalPrestiges: (this.state.totalPrestiges || 0) + 1,
        blueprints: this.state.blueprints,
        achievements: this.state.achievements,
        stats: this.state.stats,
        settings: this.state.settings,
        wallet: this.state.wallet,
        staking: this.state.staking,
        rewards: this.state.rewards,   // daily login / wheels / surge survive a SHIP IT
        vault: this.state.vault,
        createdTs: this.state.createdTs,
      };
      const ns = freshState();
      Object.assign(ns, keep);
      ns.cash = GH.economy.startingCash;
      ns.runCash = 0;
      this.state = ns;
      Audio.play("ship");
      UI.shipFlash(payout);
      this.recompute(); this.renderStructure(); save(this.state, true);
    });
  },

  pullBlueprint() {
    // Blueprints are a SOL sink → 100% buyback & burn. Live: pay 0.1 SOL, then roll. Demo: free roll.
    if (isLive()) { Solana.payBlueprint(this).then(r => { if (r && r.ok && !r.demo) this._rollBlueprint(); }); return; }
    this._rollBlueprint();
  },
  _rollBlueprint() {
    const res = Eco.rollBlueprint();
    this.state.blueprints[res.card.id] = (this.state.blueprints[res.card.id] || 0) + 1;
    this.state.stats.totalPulls = (this.state.stats.totalPulls || 0) + 1;
    this.state.stats.bestRarity = Math.max(this.state.stats.bestRarity ?? -1, res.rarityIndex);
    Audio.play(res.rarityIndex >= 3 ? "legendary" : "pull");
    UI.blueprintResult(res, () => { this.recompute(); this.renderStructure(); save(this.state, true); });
  },

  checkAch() {
    UI.updateObjective(this.state, Eco.buildAchStats(this.state));
    const newly = Eco.checkAchievements(this.state);
    for (const a of newly) {
      this.state.achievements[a.id] = true;
      this.state.grind += a.grind;
      this.state.lifetimeGrind = (this.state.lifetimeGrind || 0) + a.grind;
      Audio.play("achieve");
      UI.achievement(a);
    }
    if (newly.length) { this.recompute(); UI.renderAchievements(this.state); UI.updateHUD(this.state, this.flows); save(this.state, true); }
  },

  toggleSound() {
    this.state.settings.sound = !this.state.settings.sound;
    Audio.setEnabled(this.state.settings.sound);
    save(this.state, true);
    return this.state.settings.sound;
  },

  hardReset() { wipe(); location.reload(); },

  // expose helpers to UI
  eco: Eco,
};

window.addEventListener("DOMContentLoaded", () => Game.init());
