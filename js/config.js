/* =====================================================================
   GRIND HOUSE — global config
   ---------------------------------------------------------------------
   Everything launch-related lives here. To go LIVE at TGE:
     1. set token.launched = true
     2. paste token.mint  (the SPL mint / contract address)
     3. paste token.treasury  (wallet that pays claims / receives deposits)
     4. fill token.links (dexscreener, pumpfun, x, telegram)
   Nothing else needs to change — the whole app reads from here.
   ===================================================================== */

export const GH = {
  name: "GRIND HOUSE",
  ticker: "$GRIND",
  shortDesc: "The underground refinery that grinds raw scrap into pure money.",

  /* ---------------- TOKEN (fill at launch) ---------------- */
  token: {
    launched: false,              // <<< flip to true at TGE
    mint: "",                     // <<< SPL mint address
    symbol: "GRIND",
    decimals: 9,
    treasury: "",                 // <<< treasury wallet pubkey
    network: "mainnet-beta",      // "mainnet-beta" | "devnet"
    rpc: "https://api.mainnet-beta.solana.com",
    // pre-launch banked balances become claimable when launched===true
    claimEnabled: false,          // <<< flip true once claim program is deployed
    burnAddress: "1nc1nerator11111111111111111111111111111111",
    links: {
      dexscreener: "",
      pumpfun: "",
      raydium: "",
      x: "https://x.com/",
      telegram: "https://t.me/",
      docs: "#tokenomics",
    },
  },

  /* ---------------- ECONOMY KNOBS ---------------- */
  economy: {
    startingCash: 50,             // enough to place your first machine
    costGrowth: 1.09,             // cost_next = base * growth^owned  (gentle)
    sellTickMs: 1000,             // how often the dock sells / cash ticks
    offlineCapHours: 4,           // base offline accrual cap
    offlineCapHoursStaking: 12,   // while staking
    // prestige: GRIND = floor(K * (lifetimeCashThisRun / SCALE) ^ EXP)
    prestige: {
      K: 4,
      SCALE: 1e9,
      EXP: 0.40,                  // flat curve => perpetual carrot
      costInflationPerLoop: 1.6,  // MUCH gentler than Supply Chain Idle's x45
      minRunCashToShip: 2.5e8,    // floor before SHIP IT unlocks
      globalMultPerWeight: 0.02,  // +2% global output per prestige weight
    },
    energy: { base: 12, regenPerSec: 1 / 6, max: 30 }, // active actions cost energy; idle does not
    mergeCount: 3,                // merge N identical -> 1 next tier
    mergeBonus: 1.5,              // permanent line multiplier per merge
    milestones: [10, 25, 50, 100, 200, 300, 500], // copies -> x2 that line
    milestoneMult: 2,
  },

  /* ---------------- SUPPLY / ALLOCATION (for the tokenomics page) ---------------- */
  supply: {
    total: 1_000_000_000,
    allocation: [
      { label: "Season Reward Pool",  pct: 40, note: "Front-loaded, halves every season. The play-to-bank engine." },
      { label: "Liquidity (burned)",  pct: 20, note: "Paired & LP tokens burned at launch." },
      { label: "Treasury / Buyback",  pct: 15, note: "Funds buyback-and-burn from real revenue." },
      { label: "Community / Airdrop",  pct: 10, note: "Pre-launch grinders + campaigns." },
      { label: "Team (vested)",        pct: 10, note: "12-month linear vest, aligned with holders." },
      { label: "Jackpot & Prizes",     pct:  5, note: "Free daily VRF jackpot + weekly leaderboard." },
    ],
    taxBurnPct: 3,                // % burned on withdrawal
    buybackPctOfRevenue: 70,      // % of cosmetic SOL revenue -> buyback&burn
  },

  /* ---------------- FEATURE FLAGS ---------------- */
  flags: {
    showJackpot: true,
    showLeaderboard: true,
    showStaking: true,
    soundDefaultOn: false,
  },

  save: { key: "grindhouse.save.v1", autosaveMs: 5000 },
};

// convenience: are we live on-chain yet?
export const isLive = () => GH.token.launched === true && !!GH.token.mint;
export const canClaim = () => isLive() && GH.token.claimEnabled === true;
