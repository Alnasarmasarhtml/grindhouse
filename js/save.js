/* =====================================================================
   GRIND HOUSE — save system
   Supply Chain Idle's #1 sin was losing 413h of progress. We do NOT
   do that: dual-slot writes (primary + backup), validated load,
   versioned, with export/import for future cloud sync.
   ===================================================================== */
import { GH } from "./config.js";
import { LINES } from "./data.js";

const KEY = GH.save.key;
const BACKUP = KEY + ".bak";

export function freshState() {
  const lines = {};
  for (const L of LINES) lines[L.id] = { copies: 0, overclock: 0, merges: 0 };
  // start with one Scrap Rig so the floor is never truly empty after first place
  const now = Date.now();
  return {
    v: 1,
    cash: GH.economy.startingCash,
    runCash: 0,            // cash earned THIS run (drives prestige)
    lifetimeCash: 0,       // cash earned across all runs (achievements)
    grind: 0,              // banked claimable $GRIND
    lifetimeGrind: 0,
    lines,
    prestigeWeight: 0,
    totalPrestiges: 0,
    blueprints: {},        // cardId -> count
    achievements: {},      // id -> true
    energy: GH.economy.energy.base,
    energyTs: now,
    staking: { locked: 0, until: 0 },
    stats: { totalMerges: 0, totalPulls: 0, bestRarity: -1 },
    settings: { sound: GH.flags.soundDefaultOn },
    wallet: null,          // connected pubkey (string) once linked
    onboarded: false,      // has seen the welcome/how-to-play card
    onboardDone: false,    // has cleared the full objective-nudge sequence
    createdTs: now,
    lastSeen: now,
  };
}

export function load() {
  const raw = read(KEY) || read(BACKUP);
  if (!raw) return freshState();
  try {
    const s = JSON.parse(raw);
    return migrate(reconcile(s));
  } catch (e) {
    console.warn("[grindhouse] save parse failed, trying backup", e);
    const b = read(BACKUP);
    if (b) { try { return migrate(reconcile(JSON.parse(b))); } catch (_) {} }
    return freshState();
  }
}

// make sure every line exists even if data.js gained tiers since last save
function reconcile(s) {
  const base = freshState();
  const merged = { ...base, ...s };
  merged.lines = { ...base.lines, ...(s.lines || {}) };
  merged.stats = { ...base.stats, ...(s.stats || {}) };
  merged.settings = { ...base.settings, ...(s.settings || {}) };
  merged.staking = { ...base.staking, ...(s.staking || {}) };
  merged.blueprints = s.blueprints || {};
  merged.achievements = s.achievements || {};
  return merged;
}

function migrate(s) {
  // future schema migrations keyed on s.v go here
  s.v = 1;
  return s;
}

let lastWrite = 0;
export function save(state, force = false) {
  const now = Date.now();
  if (!force && now - lastWrite < 800) return; // throttle hot calls
  lastWrite = now;
  state.lastSeen = now;
  const json = JSON.stringify(state);
  // backup the previous primary BEFORE overwriting (crash-safe rotation)
  const prev = read(KEY);
  if (prev) write(BACKUP, prev);
  write(KEY, json);
}

export function wipe() {
  try { localStorage.removeItem(KEY); localStorage.removeItem(BACKUP); } catch (_) {}
}

/* export / import (string blob) for manual cloud / device transfer */
export function exportSave(state) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}
export function importSave(blob) {
  try { return reconcile(JSON.parse(decodeURIComponent(escape(atob(blob.trim()))))); }
  catch (e) { return null; }
}

function read(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
function write(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
