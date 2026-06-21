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
    claimEnabled: false,          // <<< flip true once the claim backend+signer is live & devnet-verified
    burnAddress: "1nc1nerator11111111111111111111111111111111",
    // ---- bind at launch (see docs/LAUNCH.md) — REAL earning also needs the backend below ----
    programId: "",                // <<< Anchor program (license PDA + claim ceiling)
    treasuryAta: "",              // <<< treasury $GRIND token account
    claimHotWallet: "",           // <<< capped hot wallet that pays claims (holds ~1-2 epochs float)
    api: "",                      // <<< backend base URL (https). "" => DEMO even if launched
    priceOracle: "",              // <<< DEX/TWAP oracle id for the value-peg. "" => keep claimEnabled false
    links: {
      dexscreener: "",
      pumpfun: "",
      raydium: "",
      x: "https://x.com/",
      telegram: "https://t.me/",
      docs: "#tokenomics",
    },
  },

  /* ---------------- ON-CHAIN ECONOMY (anti-drain) ----------------
     The token only enters circulation via a SERVER time-drip → claim,
     and only for a wallet that paid a per-epoch on-chain license.
     Gameplay/skill does NOT mint claimable token (client is untrusted).
     This makes botting EV ≤ 0 at any price. See docs/LAUNCH.md. */
  chain: {
    activation: {                  // the "account tax" — PAID IN $GRIND (max token utility) — kills free botting
      enabled: true,
      licenseName: "Operator License",
      recurring: true,             // per-epoch, not lifetime
      payIn: "token",              // license is bought in $GRIND, NOT SOL → forces buy pressure + a hard sink
      feeSolValue: 0.1,            // cost/epoch denominated in SOL-VALUE; actual $GRIND = feeSolValue ÷ tokenPriceInSol (server reads oracle)
      feeTokenBurn: true,          // the license $GRIND is BURNED → deflation; set receiver to send to treasury instead
      tiers: [
        { id: "operator", feeSolValue: 0.1, epochCapMult: 1.0, claimCooldownH: 24 },
        { id: "foreman",  feeSolValue: 0.5, epochCapMult: 1.8, claimCooldownH: 12 },
        { id: "kingpin",  feeSolValue: 2.0, epochCapMult: 3.0, claimCooldownH: 6  },
      ],
      refundable: false,
      receiver: "",                // "" => burn (feeTokenBurn); else a treasury pubkey
    },
    earn: {
      mode: "time-drip",           // accrual = f(activation_ts, now, tier) — NOT gameplay
      epochHours: 168,             // 1 week season epoch
      epochCapTokens: 8000,        // per-wallet ceiling / epoch
      valuePegMarginFactor: 0.5,   // claimable VALUE/epoch ≤ 0.5 × fee value (price-independent)
      globalEpochFaucet: 4_000_000,// FIXED total emittable / epoch across ALL wallets (sybil-proof)
      globalFaucetHalfLifeEpochs: 1,
      perAccountLifetimeCap: 12000, // one license can't amortize into profit
      diminishingAfterPct: 60,
      minAccountAgeH: 24,
    },
    claim: {
      burnBps: 300,                // 3% burned on claim
      minClaimTokens: 100,
      vestHours: 0,
      perDayTreasuryOutflowCap: 200000,
    },
    blueprint: { priceSol: 0.1, toBuyback: true }, // Blueprint pull = 0.1 SOL → 100% buyback & burn
    buyback: { pctOfRevenue: 70 }, // activation SOL + cosmetic SOL → buyback&burn
    api: { activate: "/api/activate", nonce: "/api/nonce", accrual: "/api/accrual",
           claim: "/api/claim", spend: "/api/spend", status: "/api/status", price: "/api/price" },
  },

  /* ---------------- ECONOMY KNOBS ---------------- */
  economy: {
    startingCash: 50,             // enough to place your first machine
    costGrowth: 1.11,             // cost_next = base * growth^owned (Moderate — steeper so you can't max in 30 min; ~3x slower than 1.09 to stack a line)
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
// HONEST gate: "live" needs the mint AND the backend (api) AND the value-peg oracle.
// No backend/oracle => DEMO automatically. There is no half-live state.
export const isLive = () => GH.token.launched === true && !!GH.token.mint && !!GH.token.api && !!GH.token.priceOracle;
export const canClaim = () => isLive() && GH.token.claimEnabled === true;
export const apiBase = () => (GH.token.api || "").replace(/\/$/, "");
export const currentEpoch = () => Math.floor((Date.now() / 3600000) / GH.chain.earn.epochHours);
export const isActivated = (s) => !!s?.license?.active && !!s?.license?.sig && (s?.license?.epoch === currentEpoch());
