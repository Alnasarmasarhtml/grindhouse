# GRIND HOUSE — On-chain readiness & launch checklist

## TL;DR (read this first)
The **client** is contract-ready: connect wallet, the Operator-License activation flow, the
server-authoritative claim, token sinks, and demo/live gating all exist and flip from one
config object (`js/config.js`). **But real on-chain earning is NOT just "flip a flag."**
It requires a **custody-grade backend** (below). Until that backend exists, is HSM-signed, and
passes the devnet failure suite, leave `token.api = ""` (or `priceOracle = ""`) and the game
stays an **honest free DEMO** — every in-game number is a *practice score*, never a token.

## Why a backend is mandatory (the anti-drain core)
A client-only idle game gives the server nothing to verify, so **gameplay/skill does NOT mint
claimable token**. Instead, claimable token is a **server-side time-drip**:

```
claimable = f(activation_timestamp, elapsed_time, tier)
            clamped by  per-wallet epoch cap
                     ·  VALUE peg (oracle): claimable value/epoch ≤ 0.5 × license fee value
                     ·  fixed GLOBAL epoch faucet split across active wallets (sybil-proof)
                     ·  lifetime cap (≈1.5× epoch cap)
                     ·  diminishing returns past 60%, min account age, cooldown, per-day outflow cap
```

Result: **botting EV ≤ 0 at any token price.** Every farm account must pay a recurring
per-epoch **Operator License** (SOL → treasury) *before* it can earn; 70% of that SOL +
cosmetic revenue buys back & burns. The harder bots farm, the more they pre-pay the treasury.

## The "account tax" (Operator License)
- Recurring **per-epoch** (1 week), not lifetime. Base `0.05 SOL` (≈$8). Tiers raise the cap
  proportionally (never a profit lever). Post-liquidity, turn on a burned `feeToken` so the
  gate cost scales with price. All knobs in `GH.chain.activation` / `GH.chain.earn` / `GH.chain.claim`.

## Token has real in-game value (demand, not just gacha)
Spend $GRIND on power: Blueprint gacha (exists) + planned Refinery Catalyst / Prestige Ignition /
Season Boost (constants ready to wire as `Solana.spendToken` sinks). Sinks > faucet → earned token is mostly recycled into burns.

## Trust boundary
Client = UI + free demo (untrusted; localStorage is forgeable and buys nothing). Server/contract =
authoritative for accrual + claim. The claim is server-built and partial-signed from a **capped
hot wallet**; the client never asserts an amount (that bug is fixed in `solana.js`).

## Required backend endpoints (the multi-week build)
`/api/activate` · `/api/nonce` · `/api/accrual` · `/api/status` · `/api/claim` · `/api/spend` · `/api/price`
Plus: time-drip accrual worker, DEX/TWAP price oracle reader (value peg), HSM/KMS claim signer,
server-watch-and-debit on confirm (replay/double-claim proof), buyback-and-burn cron, CORS for the
Pages origin. **There is deliberately NO gameplay-accrual endpoint** — the server can't trust client play.

## Launch checklist
**A. Devnet dry-run (mandatory):** set `network:"devnet"`, paste devnet mint/treasury/treasuryAta/
claimHotWallet/programId/priceOracle, point `token.api` at staging, `launched:true`, `claimEnabled:false`.
Stand up all 7 endpoints + drip worker. Then run the **failure suite** with curl (independent of any
client guard): forged balance → server amount only; reused nonce → reject; replayed tx → PDA reject, no
double-debit; over epoch cap / value-peg / global faucet / per-day outflow → clamped/reject; claim before
24h or without current-epoch license → reject; second outstanding claim → prior invalidated.

**B. Mainnet flip (client = config only):** `network:"mainnet-beta"` + paid RPC; paste mainnet
mint/treasury/treasuryAta/claimHotWallet/programId/priceOracle (confirm `decimals`); set `token.api` =
prod (CORS allows Pages origin); confirm mint+freeze authority revoked, LP burned; fund claimHotWallet
with only ~1–2 epochs float (cold pool behind 2-of-N); smoke-test connect → activate → small claim
(3% burn visible) → one sink burn; then `claimEnabled:true`.

**C. Before announcing:** secrets are server/HSM-only (only pubkeys in `config.js`); per-day outflow
cap + anomaly alerts wired; demo labels disappear and the word "claimable" never shows while `!isLive()`;
buyback cron live with a public burn dashboard; pre-launch localStorage demo scores are **discarded**
(never converted to supply).

**GO/NO-GO:** no backend (or no oracle) ⇒ both games stay honest DEMO. There is no half-live state.

## What I need from you at launch
mint · treasury pubkey · treasury ATA · claimHotWallet pubkey · decimals · programId · priceOracle ·
cluster · backend base URL — **and confirmation of who builds/operates the backend** (it's a separate,
multi-week, key-custody build, not part of the client).
