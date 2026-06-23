# GRIND HOUSE — ECONOMY DESIGN v2 (FINAL, for approval)

*Design only — not implemented. Produced by a multi-lens design pass (token economist · idle-game economist · anti-abuse adversary · growth · legal) + a 3-angle adversarial red-team, then revised to fix every fatal flaw. Dollar figures assume launch anchors: 1B supply, FDV ~$1M → $GRIND ≈ $0.001, SOL ≈ $150. All USD values are server-converted to $GRIND off a TWAP oracle so the dollar feel holds at any price.*

---

## TL;DR (degen pitch)
Run your factory, hit your daily streak, and a real green number lands every day from your first session — no paywall, no waiting. The more degens buy boosts and pulls, the bigger the house's $GRIND vault — and that exact vault pays the daily floor and the Friday Top-10. The house burns its cut, so supply bleeds while you bleed nothing: **spenders fund winners, bots starve, chart goes up.**

## How a player experiences it
- **Day 1 (free, $0 in):** connect wallet → build machines that print free CASH → first qualifying action unlocks the **Daily Drop** (guaranteed ~$1 floor) + **1 free Jackpot spin** (EV ~$0.50, can hit $5–$50). First session ends GREEN. You also get a flex card to post on X for a bigger airdrop.
- **Week 1 (free tier):** Daily Drop is a streak ladder, **$1.00 → $2.50/day** at D7+. Miss a day = drop one rung (soft, never reset to zero). Still paid nothing.
- **When you want the real money (opt-in, paid):** buy the **Operator License** (~$7.50/wk, in SOL) + a refundable **~$10 slashable bond**, then buy **Surge multipliers** to grind harder and climb the leaderboard.
- **Friday "Payout Night":** house tallies the week's vault → **65% back to players** (daily floor + Everybody Pool + Top-10), **35% house margin (burned)**. Top-10 grinders win $90 → $630, posted with shareable cards.

---

## The full system

### A. The daily win (source + structure)
The Daily Drop is **one FIXED global pool, split pro-rata by grind-score**, with a per-wallet **floor** (the day-1 promise) and a streak **ceiling** (the visible ladder). There is no fixed per-wallet payout to multiply — adding wallets just dilutes everyone's slice (kills the sybil hole).

- Streak **ceiling** ladder (USD): $1.00 / 1.25 / 1.50 / 1.75 / 2.00 / 2.25 / **$2.50** (D1→D7+); ×1.25 if you ran a paid Surge.
- **Floor:** every verified wallet gets ≥ ~$1.00 on day 1 (bootstrap-funded).
- **Soft streak decay:** miss a day = −1 rung (not zero); 1 free freeze / 14 days.
- **Free Jackpot:** 1 free spin/day (never purchasable → legal AMOE posture), value-pegged, per-wallet EV ≤ 0.3× license; daily-replenished fixed faucet so a farm spinning together collapses its own EV.

**Funding + counter-cyclical bootstrap (no new mint):** daily win = 65% of the prior period's sink vault + a bootstrap top-up from the pre-allocated **40% Season Pool (400M)**. Rule:
`bootstrap(week) = clamp(TargetFloorPool − organic_recycled, 0, SeasonBudgetCap)` — spends MORE when volume is low (defends the feel in a bear), retreats to ~0 when sinks cover the floor (self-extinguishing). Budget caps **halve each 8-week season** (S1 6.0M/wk → 0), ≈96M lifetime, well under the 400M pool.

**Master anti-drain rule — "house always ahead":** a wallet's lifetime claims (Drop + Jackpot + Everybody + Top-10) **≤ 0.67 × lifetime net sink spend + a one-time ~$5 FounderGrant per verified human.** The FounderGrant funds the genuine free day-1 feel; after it's used, you can only ever claim ≤ 0.67× what you spent. Aging a wallet no longer grants a perpetual faucet.

### B. The $GRIND sinks (house income)
CASH = free build/upgrade currency. $GRIND is only ever spent on the boost/status/competition layer:

| Sink | Price (USD) | Effect | ~% vol |
|---|---|---|---|
| **SURGE multiplier** (headline) | $0.15 / $0.40 / $1.50 / $6.00 | ×1.5 / ×2 / ×3 / ×5 on **CASH output + grind-score** (never a withdrawable amount) | 45% |
| Blueprint Gacha | $0.25/pull | permanent CASH modifier, published odds, 18+ | 20% |
| Operator License (weekly money-tier entry) | ~$7.50 (in SOL) | unlocks Top-10 + Everybody Pool | 14% |
| Overclock-Skip | $0.05–$2.00 | buy next CASH overclock | 8% |
| Prestige Ignition | $0.50 | keep a blueprint line through reset | 4% |
| Refinery Catalyst | $0.08 | instant-finish / refill offline | 3% |
| Cosmetic skins | $0.10–$3.00 | vanity / screenshot bait | 4% |
| Streak Insurance | $0.12 | extra streak freeze | 2% |

**SURGE (the paid multiplier) — legal keystone:** Surge multiplies **CASH output + grind-SCORE (the ranking metric)**, NOT any withdrawable prize. Its **leaderboard-rank contribution is capped at ×2** (CASH-economy contribution is the full ×5), so **money can't buy #1** — a free skill/time grinder can top the board. The exact "pay token → multiply a withdrawable share of others' money" (Howey/gambling) structure exists nowhere. Caps: 1 active Surge/wallet; +10%/repurchase within 7d; ~$400/day spend ceiling.

### C. The closed loop — universal sink split
Every $GRIND into any sink splits:

| Slice | % | Destination |
|---|---|---|
| Daily Drop Pool | 40% | recycled to daily claimers |
| Top-10 Prize | 15% | skill/time-ranked graded prize |
| **Everybody Pool** | 10% | lottery among all non-Top-10 licensed grinders (the long-tail feel) |
| **BURN** | 20% | destroyed → deflation |
| Treasury/Buyback | 15% | 70% → buyback&burn |

**House net margin = 35%.** The 65% recycled is already-circulating $GRIND — redistribution mints nothing.

**Worked week (5,000 licensed wallets, ~$9,000 sinks = 9,000,000 $GRIND):**
- Daily Drop 3.6M ($3,600) · Top-10 1.35M ($1,350) · Everybody 0.9M ($900) — recycled
- **Burn 1.8M ($1,800)** + treasury 1.35M (70% = $945 buyback&burn)
- **House nets +3.15M/wk (35%). Only 65% ever leaves to players → the house structurally cannot lose.**
- **~2.92M $GRIND destroyed/week, zero new mint → net-deflationary once organic sinks cover the floor** (~1.5%/month, scales with DAU).
- **Bear stress (volume −70% & price −80%):** counter-cyclical bootstrap rises to defend the floor (spends down the capped Season Pool in the launch window only); median daily win stays > $0 in every cell; by S3 the same shock is deflationary. This is the disclosed trade: the Season Pool is a capped shock absorber, never able to zero the token.

### D. Weekly Top-10 graded split
**The honest number:** "The Top-10 split **15% of every $GRIND spent each week** — and it grows with volume." (The old "1%" was wrong math; if you want a "~1%" headline, 1st place ≈ 1.35% of weekly volume, so "≈1% to the top grinder" is defensible.)

Worked (9M weekly sinks → 1.35M pool ≈ $1,350):

| Rank | % | ~USD | | Rank | % | ~USD |
|---|---|---|---|---|---|---|
| 1 | 24% | $324 | | 6 | 7% | $95 |
| 2 | 17% | $230 | | 7 | 6% | $81 |
| 3 | 13% | $176 | | 8 | 5.5% | $74 |
| 4 | 10% | $135 | | 9 | 4.75% | $64 |
| 5 | 8% | $108 | | 10 | 4.75% | $64 |

(At ~8k DAU the pool ~doubles → 1st ≈ $630.) Ranked by **server-verified grind-SCORE** (CASH output × time × capped-Surge), not spend, not chance. Qualify: active license 7d, grind ≥4/7 days, wallet age ≥7d + proof-of-human. **Prize ≤ 1.0× your net sink spend (disclosed: "a competition, not an investment"); unawarded headroom BURNS** (kills collusion recapture). Sybil clusters collapse to one entity + stake slashed.

### E. Why bots can't drain it (EV)
Five locks: (1) house-always-ahead 0.67× invariant, (2) fixed pro-rata Drop (more bots = smaller slices), (3) value-pegged aggregate-capped jackpot, (4) **slashable ~$10 stake burned on cluster flag** (10k farm = ~$100k at risk), (5) skill/time-predominant rank (Surge rank ≤×2).
- **Bot, recurring:** after the one-time $5 FounderGrant, a no-spend bot earns only the diluted jackpot (~$2.25, shrinking) vs −$8.30+ recurring cost → **≈ −$6/wallet/epoch, more negative as the farm grows.** To earn from the Drop it must spend, but 0.67× guarantees it spends ≥1.5× what it gets back. **No farm size or season is EV-positive.** 10k farm ≈ −$60k/epoch + $100k at-risk stake.
- **Human, free tier:** ~$1–2.50/day floor + $0.50 jackpot, $0 in → **purely EV-positive.** Money-tier grinder is ~fee-neutral but feels the wins + jackpot + rank climb + free game.

### F. Demo now (kept honest)
Demo stays a free practice score (no token, resets at launch, "claimable" never appears). Add a **zero-token-risk Airdrop-Multiplier engine** from the 10% community bucket (100M), a fixed pool split by multiplier-weight (gaming it only dilutes your own peers → no inflation):
- Base = log-scaled demo grind-score, per-wallet cap 0.1% of pool.
- Multiplier stack (total cap ×5): **X-Share +0.5×/post (cap +1.0×)** via game-generated flex card with a unique signed code (account >30d, >20 followers, tweet live 30d, one-time code, **card shows rank/weight only — no $ figure**); Referral +0.10×/side (cap +1.5×, referee must hit a milestone); Streak (+0.5×); Quest follow/join/hold (+0.3×); wallet-at-snapshot (+0.1×).
- TGE snapshot: pre-launch CASH discarded; only verified wallet-bound weight carries over.

### G. Legal / optics guardrails
Banned words (UI + influencer contracts): income, yield, dividend, returns, "guaranteed $X/day," invest. Headline reward is always **CASH + RANK**; $GRIND payouts framed as **skill-contest prizes / fee rebates** with a permanent "may be $0" microlabel. Skill-predominant Top-10 (not chance, not spend). License = entry fee. VRF jackpot = the only chance element → free-to-enter (AMOE), published odds, 18+. Gacha published odds + 18+. **Hard geo-block US + restricted set for withdrawable features; Surge is CASH+score only everywhere (defensible globally).** AML screening on payouts; KYC above ~$600/yr/wallet. **No half-live state: until the custody backend ships, demo only.** Crypto-specialized counsel (securities + gaming + AML) signs off before any live payout.

---

## Open decisions for the owner (with my recommended default)
1. **Kill the literal "1%" headline?** → **Recommended: kill it**, market the true "Top-10 split 15% of weekly volume, growing." (If you love "1%," we tune so 1st ≈ 1% of volume and say "~1% to the top grinder.")
2. **Day-1 floor $1.00 vs higher?** → **Recommended: $1.00** (rising to $2.50 on streak). Higher feels better but spends the Season Pool faster.
3. **Prize liquidity split?** → **Recommended: 50% liquid / 50% 7-day vesting** (halves chart sell-pressure while still feeling like real cash). Dial to 70/30 if the chart is strong.
4. **Stake size ~$10 vs higher?** → **Recommended: ~$10 slashable** (real cost, not refundable carry); raise to ~$25 if sybil pressure is heavy post-launch.

## Build impact
- **Buildable in the demo NOW (no backend):** full CASH idle game (already done) + the Airdrop-Multiplier engine (grind-score, log base, X-share via signed-code tweet check, referral milestone, streak, quest, wallet) + flex-card generator + streak system + banned-copy/geo/18+ enforcement — all UI showing **weight only, no $**.
- **Config changes vs current `js/config.js`:** replace the single time-drip with the universal sink split (40/15/10/20/15) + fixed-global-pro-rata Daily Drop, wrap every claim in the 0.67× house-always-ahead invariant, add counter-cyclical bootstrap, re-key all prices to USD-via-oracle, add Surge rank-cap (×2), Everybody Pool, slashable stake, FounderGrant ledger.
- **Needs the custody BACKEND at launch (multi-week):** token mint + 7 API endpoints + TWAP oracle + HSM claim signer + workers (bootstrap calc, house-always-ahead ledger, jackpot faucet, grind-score, Top-10 tally w/ rebate-cap-burn, Everybody lottery, cluster detection + slashing, buyback executor, AML/KYC). **No half-live state until it ships.**
