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
    yardView: true,               // THE YARD isometric base — toggle always available; veterans auto-open it
  },

  /* ---------------- REWARDS ENGINE (daily login · wheels · surge · vault) ----------------
     Everything here is a tunable dial — re-balance freely as the game scales (start small:
     100-200 players, not 5k). In DEMO all payouts are practice-$GRIND (off-chain score, not a
     token); at launch the same numbers are server-priced off the oracle. The closed-loop
     accounting (loop.*) mirrors docs/ECONOMY_v2.md so the on-chain split slots in unchanged. */
  rewards: {
    resetHourUTC: 0,              // when the daily roll-over happens

    // ----- DAILY LOGIN (separate from the wheel) — a 7-day streak ladder that repeats -----
    dailyLogin: {
      enabled: true,
      softDecay: true,            // miss a day → drop ONE rung (not reset to day 1)
      ladder: [                   // grind = practice-$GRIND; surge/perk = a granted boost id
        { grind: 50 },
        { grind: 80 },
        { grind: 120, surge: "spark" },
        { grind: 180 },
        { grind: 260 },
        { grind: 360, perk: "speed" },
        { grind: 600, surge: "overdrive", big: true },
      ],
    },

    // ----- FREE FORTUNE WHEEL — 1 spin/day, capped daily pot (your "$100/day") -----
    freeWheel: {
      enabled: true,
      spinsPerDay: 1,
      dailyPotGrind: 100_000,     // hard cap of practice-$GRIND the FREE wheel can pay out per day across everyone (the "$100 in tokens" cap). Once drained, free spins pay the floor only.
      floorGrind: 10,             // minimum a spin always pays even if the pot is dry
      segments: [                 // weighted; prize = grind | surge | perk
        { label: "10",     grind: 10,   weight: 30 },
        { label: "25",     grind: 25,   weight: 22 },
        { label: "50",     grind: 50,   weight: 16 },
        { label: "×1.5",   surge: "spark", weight: 9 },
        { label: "100",    grind: 100,  weight: 11 },
        { label: "250",    grind: 250,  weight: 7 },
        { label: "SPEED",  perk: "speed", weight: 3 },
        { label: "1000",   grind: 1000, weight: 2 },
      ],
    },

    // ----- PAID FORTUNE WHEEL — pay $GRIND, win PERKS (boosts/speed-ups). Fee → burn+treasury -----
    paidWheel: {
      enabled: true,
      costGrind: 250,             // per spin
      feeSplit: { burn: 0.5, treasury: 0.5 },   // the spent $GRIND is destroyed/treasuried (demo: vault accounting; live: real burn+buyback)
      segments: [                 // perks, not withdrawable token (legal keystone) — except a rare jackpot
        { label: "×1.5 SURGE", surge: "spark",     weight: 24 },
        { label: "SPEED-UP",   perk: "speed",      weight: 22 },
        { label: "×2 SURGE",   surge: "overdrive", weight: 16 },
        { label: "CASH RUSH",  perk: "cash2",      weight: 13 },
        { label: "×3 SURGE",   surge: "meltdown",  weight: 8 },
        { label: "BLUEPRINT",  perk: "blueprint",  weight: 8 },
        { label: "×5 SURGE",   surge: "kingpin",   weight: 3 },
        { label: "MISS",       perk: "none",       weight: 5 },
        { label: "5K JACKPOT", grind: 5000,        weight: 1 },
      ],
    },

    // ----- SURGE multipliers (also a direct-buy sink) -----
    surge: {
      enabled: true,
      tiers: {
        spark:     { name: "Spark ×1.5",     mult: 1.5, hours: 24,  costGrind: 150 },
        overdrive: { name: "Overdrive ×2",   mult: 2.0, hours: 24,  costGrind: 400 },
        meltdown:  { name: "Meltdown ×3",    mult: 3.0, hours: 72,  costGrind: 1500 },
        kingpin:   { name: "Kingpin ×5",     mult: 5.0, hours: 168, costGrind: 6000 },
      },
    },

    // ----- PERKS (non-multiplier rewards) -----
    perks: {
      speed: { name: "Speed-up",  desc: "Instantly bank 1h of grind" , hours: 1 },
      cash2: { name: "Cash Rush", desc: "×2 CASH for 1h", mult: 2, hours: 1 },
      blueprint: { name: "Free Blueprint", desc: "One free Blueprint pull" },
      none:  { name: "So close…", desc: "No prize this time" },
    },

    // ----- CLOSED LOOP (demo accounting that mirrors the on-chain split at launch) -----
    loop: {
      sinkSplit: { dailyDrop: 0.40, top10: 0.15, everybody: 0.10, burn: 0.20, treasury: 0.15 },
      houseAheadFactor: 0.67,     // a wallet's lifetime claims ≤ 0.67× lifetime net spend (+ founder grant) — anti-drain master rule
      founderGrantGrind: 5000,    // one-time free-starter allowance per account (the "win from day 1" feel)
      showTicker: true,           // surface the burn/vault ticker so players SEE the loop
    },
  },

  save: { key: "grindhouse.save.v1", autosaveMs: 5000 },
};

// ----- rewards helpers -----
// a stable "day index" in the configured reset timezone (UTC + resetHourUTC offset)
export const dayIndex = (now = Date.now()) =>
  Math.floor((now - GH.rewards.resetHourUTC * 3600000) / 86400000);

// convenience: are we live on-chain yet?
// HONEST gate: "live" needs the mint AND the backend (api) AND the value-peg oracle.
// No backend/oracle => DEMO automatically. There is no half-live state.
export const isLive = () => GH.token.launched === true && !!GH.token.mint && !!GH.token.api && !!GH.token.priceOracle;
export const canClaim = () => isLive() && GH.token.claimEnabled === true;
export const apiBase = () => (GH.token.api || "").replace(/\/$/, "");
export const currentEpoch = () => Math.floor((Date.now() / 3600000) / GH.chain.earn.epochHours);
export const isActivated = (s) => !!s?.license?.active && !!s?.license?.sig && (s?.license?.epoch === currentEpoch());
