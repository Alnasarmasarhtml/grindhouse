/* =====================================================================
   GRIND HOUSE — game content
   The 9-tier supply chain (raw scrap -> refined $GRIND bullion).
   Each LINE produces a product; line i>=1 consumes the product below it.
   Surplus of every line is sold at the dock; refining higher = more $.
   ===================================================================== */

// tier ladder. cost/rate/sell tuned for a gentle exponential climb.
export const LINES = [
  { id: "t0", tier: 0, machine: "SCRAP RIG",       product: "Scrap",         icon: "assets/img/t0_scrap.png",
    baseCost: 50,      baseRate: 1.00, sell: 1,        input: 0, unlockPrev: 0,  blurb: "Rips raw scrap out of the dirt. Where every empire starts." },
  { id: "t1", tier: 1, machine: "ARC SMELTER",     product: "Iron Ingot",    icon: "assets/img/t1_iron.png",
    baseCost: 600,     baseRate: 0.85, sell: 6,        input: 2, unlockPrev: 5,  blurb: "Melts scrap into clean iron. First taste of real value." },
  { id: "t2", tier: 2, machine: "PLASMA FORGE",    product: "Steel Billet",  icon: "assets/img/t2_steel.png",
    baseCost: 7.2e3,   baseRate: 0.75, sell: 42,       input: 2, unlockPrev: 5,  blurb: "Forges iron into structural steel under a plasma arc." },
  { id: "t3", tier: 3, machine: "NANO DRAWER",     product: "Copper Wire",   icon: "assets/img/t3_wire.png",
    baseCost: 9.0e4,   baseRate: 0.65, sell: 280,      input: 2, unlockPrev: 8,  blurb: "Draws steel-grade copper into conductive wire." },
  { id: "t4", tier: 4, machine: "ASSEMBLY DECK",   product: "Circuit Board", icon: "assets/img/t4_circuit.png",
    baseCost: 1.1e6,   baseRate: 0.55, sell: 1.9e3,    input: 3, unlockPrev: 8,  blurb: "Lays wire into live circuit boards. Things start glowing." },
  { id: "t5", tier: 5, machine: "FAB CORE",        product: "Microchip",     icon: "assets/img/t5_chip.png",
    baseCost: 1.4e7,   baseRate: 0.50, sell: 1.25e4,   input: 2, unlockPrev: 10, blurb: "Etches circuits into silicon. The keystone of the house." },
  { id: "t6", tier: 6, machine: "GOLD MINT",       product: "Gold Bar",      icon: "assets/img/t6_gold.png",
    baseCost: 1.8e8,   baseRate: 0.44, sell: 8.0e4,    input: 3, unlockPrev: 10, blurb: "Casts chip yield into solid bullion. Now you're printing." },
  { id: "t7", tier: 7, machine: "CASH PRESS",      product: "Cash Brick",    icon: "assets/img/t7_cash.png",
    baseCost: 2.3e9,   baseRate: 0.38, sell: 5.2e5,    input: 2, unlockPrev: 12, blurb: "Stamps gold into banded bricks of hard cash." },
  { id: "t8", tier: 8, machine: "GRIND REFINERY",  product: "$GRIND Bullion",icon: "assets/img/t8_grind.png",
    baseCost: 3.0e10,  baseRate: 0.32, sell: 3.4e6,    input: 3, unlockPrev: 12, blurb: "Refines cash into pure $GRIND bullion. The final product." },
];

// per-line OVERCLOCK upgrade: each level multiplies that line's output.
export const OVERCLOCK = {
  mult: 1.8,          // x1.8 output per level
  base: 1000,         // CASH cost of first level (scaled by line.baseCost below)
  growth: 7.5,        // cost growth per level (steep — these are power spikes)
  maxLevel: 12,
};

// BLUEPRINTS — the $GRIND sink / gacha. Permanent, persist through prestige.
// Pull odds are PUBLISHED (shown in-game). Effects stack multiplicatively.
export const BLUEPRINT_COST = 2500;   // $GRIND per pull (pre-launch: banked $GRIND)
export const BLUEPRINTS = {
  rarities: [
    { key: "common",    label: "Common",    color: "#9aa3b2", odds: 0.60 },
    { key: "rare",      label: "Rare",      color: "#18E0FF", odds: 0.27 },
    { key: "epic",      label: "Epic",      color: "#8A5BFF", odds: 0.10 },
    { key: "legendary", label: "Legendary", color: "#FF2EC4", odds: 0.025 },
    { key: "mythic",    label: "Mythic",    color: "#B6FF3C", odds: 0.005 },
  ],
  // each card grants a permanent global modifier. effect applied = base^count.
  cards: [
    { id: "overdrive",  name: "Overdrive Coil",   rarity: "common",    effect: "outputMult",  value: 1.15, desc: "+15% output, all lines." },
    { id: "midas",      name: "Midas Filter",     rarity: "common",    effect: "sellMult",    value: 1.15, desc: "+15% sell price, all goods." },
    { id: "flux",       name: "Flux Capacitor",   rarity: "rare",      effect: "outputMult",  value: 1.35, desc: "+35% output, all lines." },
    { id: "vault",      name: "Vault Skim",       rarity: "rare",      effect: "sellMult",    value: 1.35, desc: "+35% sell price." },
    { id: "warp",       name: "Time Warp Drive",  rarity: "epic",      effect: "offlineMult", value: 1.5,  desc: "+50% offline earnings cap." },
    { id: "reactor",    name: "Fusion Reactor",   rarity: "epic",      effect: "outputMult",  value: 1.75, desc: "+75% output, all lines." },
    { id: "goldrush",   name: "Gold Rush Chip",   rarity: "legendary", effect: "sellMult",    value: 2.25, desc: "x2.25 sell price. The big one." },
    { id: "singularity",name: "Singularity Core", rarity: "mythic",    effect: "outputMult",  value: 3.0,  desc: "x3 output, all lines. Mythic." },
  ],
};

// ACHIEVEMENTS — secretly permanent buffs (reward $GRIND + small global mult).
// trigger(state) -> bool. Checked each tick; one-time.
export const ACHIEVEMENTS = [
  { id: "first_blood", name: "First Blood",        desc: "Place your first machine.",            grind: 50,    mult: 1.00, test: s => s.totalMachines >= 1 },
  { id: "ten_rigs",    name: "Tooled Up",          desc: "Own 10 machines.",                     grind: 100,   mult: 1.01, test: s => s.totalMachines >= 10 },
  { id: "millionaire", name: "Millionaire",        desc: "Bank $1,000,000 lifetime.",            grind: 250,   mult: 1.02, test: s => s.lifetimeCash >= 1e6 },
  { id: "first_link",  name: "Supply Lines",       desc: "Run a 3-tier chain.",                  grind: 150,   mult: 1.01, test: s => s.deepestTier >= 3 },
  { id: "merge1",      name: "Fusion",             desc: "Perform your first merge.",            grind: 200,   mult: 1.02, test: s => s.totalMerges >= 1 },
  { id: "chip",        name: "Keystone",           desc: "Unlock the Fab Core (Microchips).",    grind: 400,   mult: 1.03, test: s => s.deepestTier >= 5 },
  { id: "billionaire", name: "Billionaire",        desc: "Bank $1,000,000,000 lifetime.",        grind: 600,   mult: 1.03, test: s => s.lifetimeCash >= 1e9 },
  { id: "first_ship",  name: "Ship It",            desc: "Prestige for the first time.",         grind: 500,   mult: 1.05, test: s => s.totalPrestiges >= 1 },
  { id: "gold",        name: "Now We're Printing", desc: "Unlock the Gold Mint.",                grind: 800,   mult: 1.04, test: s => s.deepestTier >= 6 },
  { id: "blueprint1",  name: "Blueprinted",        desc: "Open your first blueprint pack.",      grind: 300,   mult: 1.02, test: s => s.totalPulls >= 1 },
  { id: "legendary",   name: "Heavy Plates",       desc: "Pull a Legendary blueprint.",          grind: 1200,  mult: 1.06, test: s => s.bestRarity >= 3 },
  { id: "refinery",    name: "Pure Product",       desc: "Unlock the Grind Refinery (T8).",      grind: 2000,  mult: 1.08, test: s => s.deepestTier >= 8 },
  { id: "trillion",    name: "Trillionaire",       desc: "Bank $1,000,000,000,000 lifetime.",    grind: 1500,  mult: 1.05, test: s => s.lifetimeCash >= 1e12 },
  { id: "ship5",       name: "Repeat Offender",    desc: "Prestige 5 times.",                    grind: 1750,  mult: 1.07, test: s => s.totalPrestiges >= 5 },
  { id: "hundred",     name: "Floor Boss",         desc: "Own 100 of a single line.",            grind: 1000,  mult: 1.05, test: s => s.maxLineCopies >= 100 },
  { id: "merge10",     name: "Fusion Addict",      desc: "Merge 10 times.",                      grind: 1100,  mult: 1.05, test: s => s.totalMerges >= 10 },
  { id: "mythic",      name: "Singularity",        desc: "Pull a Mythic blueprint.",             grind: 4000,  mult: 1.12, test: s => s.bestRarity >= 4 },
  { id: "googol",      name: "Off The Charts",     desc: "Bank $1e30 lifetime.",                 grind: 3000,  mult: 1.08, test: s => s.lifetimeCash >= 1e30 },
  { id: "ship25",      name: "Kingpin",            desc: "Prestige 25 times.",                   grind: 5000,  mult: 1.15, test: s => s.totalPrestiges >= 25 },
  { id: "whale",       name: "House Always Wins",  desc: "Bank 1,000,000 $GRIND lifetime.",        grind: 10000, mult: 1.20, test: s => s.lifetimeGrind >= 1e6 },
];

// rarity index for "bestRarity" comparisons
export const RARITY_INDEX = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };

// rotating marquee one-liners (overwritten by copy pack if provided)
export const TICKER = [
  "GRIND NOW · CASH OUT AT LAUNCH",
  "EARLY HOUSES EARN FROM THE FATTEST POOLS",
  "JUNK IN · REAL COIN OUT",
  "IT PRINTS WHILE YOU SLEEP",
  "1B COINS, EVER · MINT SWITCHED OFF",
  "RESET YOUR FLOOR · COME BACK RICHER",
  "WEEKLY POOL HALVES · EARLY IS REAL",
  "MERGE 3 · MAKE 1 · MAKE MORE",
  "REAL REVENUE BUYS & BURNS $GRIND",
  "SHIP IT ISN'T A RESET · IT'S A MULTIPLIER",
  "PLAYING NEVER FLOODS THE MARKET",
  "THE HOUSE NEVER SLEEPS · NEITHER DOES YOUR STACK",
  "A GAME WITH A COIN · NOT FINANCIAL ADVICE",
];
