# GRIND HOUSE — Launch Playbook ($GRIND on Solana)

Everything is built and **token-ready**. The game, site, art, and Solana wiring are done.
At TGE you do a handful of steps below and the whole thing flips live — **no code changes beyond `js/config.js`.**

---

## 0. What's already built

| Piece | Status | Where |
|---|---|---|
| Idle game (full economy: build, link, sell, overclock, merge, prestige, offline, achievements, blueprints) | ✅ | `play.html`, `js/*.js` |
| Landing site (hero, how-it-works, 9-tier ladder, tokenomics, roadmap, FAQ, honest-risk) | ✅ | `index.html` |
| 4K/2K art pack (hero, 9 tier products, token, currency + energy icons, blueprint) | ✅ | `assets/img/` |
| Motion (Seedance hero loop, synced audio) | ✅ | `assets/video/` |
| Wallet connect (Phantom / Solflare / Backpack) | ✅ live now | `js/solana.js` |
| Claim / balance / buyback hooks | ✅ wired, gated on config | `js/solana.js`, `js/config.js` |
| Robust crash-safe saves (dual-slot) | ✅ | `js/save.js` |

**Pre-launch UX (now):** players grind and **bank claimable $GRIND**. The Vault tab shows their balance and says "Claim at launch." This is the early-adopter FOMO engine.

---

## 1. Run it locally
```bash
cd GRINDHOUSE
python3 -m http.server 8080      # or: npx serve .
# open http://localhost:8080            (landing)
# open http://localhost:8080/play.html  (game)
```
No build step. Pure static — deploys to GitHub Pages, Vercel, Netlify, Cloudflare Pages as-is.

## 2. Deploy (static)
- **GitHub Pages:** push to a repo, Settings → Pages → deploy from `main` / root. Add a `CNAME` file with your domain.
- **Vercel/Netlify:** drag the folder in, or connect the repo. Framework preset: "Other / static". Output dir: `.`.

---

## 3. TGE — go live (the only steps that matter)

### 3a. Create the $GRIND token
Pick one:
- **pump.fun / Meteora DBC (fair launch, fastest):** create the coin, let the bonding curve seed liquidity. Copy the mint address (CA).
- **Self-mint (more control):** mint 1,000,000,000 with 9 decimals, seed a Raydium/Meteora pool, then:

### 3b. Lock it down (credibility — do all three)
- **Revoke mint authority** (so supply is truly fixed at 1B).
- **Revoke freeze authority** (so you can't freeze holders).
- **Burn the LP tokens** (so liquidity can't be pulled).
- Verify clean on **RugCheck** and **DexScreener**.

### 3c. Flip the config — `js/config.js`
```js
token: {
  launched: true,                 // <<< flips the whole app to LIVE
  mint: "YOUR_GRIND_MINT_ADDRESS",// <<< the CA
  symbol: "GRIND",
  decimals: 9,
  treasury: "YOUR_TREASURY_PUBKEY",
  network: "mainnet-beta",
  rpc: "https://YOUR_RPC",        // use a paid RPC (Helius/Triton) for production
  claimEnabled: true,             // <<< set true once the claim endpoint (3d) is live
  links: {
    dexscreener: "https://dexscreener.com/solana/YOUR_PAIR",
    pumpfun: "...", raydium: "...",
    x: "https://x.com/yourhandle",
    telegram: "https://t.me/yourgroup",
  },
}
```
That's it for the front end. The site auto-shows the CA, the Vault enables real claims, links light up, and live balance reads from chain.

### 3d. Deploy the claim backend (server-authoritative — never trust the client)
The frontend already calls `POST /api/claim` with `{wallet, amount}` and co-signs the returned tx. Stand up a tiny endpoint that:
1. Looks up the player's **banked $GRIND** from your authoritative store (port the localStorage balances to a DB at snapshot, or run a light server from day one).
2. Applies the **3% withdrawal burn**, rate-limits, and enforces per-wallet/day caps.
3. Builds a `transferChecked` (or `mintTo` from a pre-minted treasury ATA) tx, **partial-signs with the treasury key held in an HSM / KMS / cold signer** (never in the browser).
4. Returns `{ txBase64 }`. The client co-signs with the user's wallet and submits.

Reference shape (Node):
```js
// POST /api/claim  -> { txBase64 }
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { createTransferCheckedInstruction, getAssociatedTokenAddress } from "@solana/spl-token";
// 1) validate amount against authoritative banked balance + caps
// 2) build transferChecked(treasuryATA -> userATA, amount*(1-0.03), decimals)
// 3) add a burn instruction for the 3%
// 4) tx.partialSign(treasuryKeypair)  // from secure signer
// 5) return base64(tx.serialize({requireAllSignatures:false}))
```

### 3e. (Optional, recommended) automation already designed for
- **Buyback-and-burn cron:** route 70% of cosmetic SOL revenue to market-buy $GRIND and send to the burn address daily; surface it on a public dashboard.
- **Season pool:** distribute the weekly allocation by prestige-weight; halve each week.
- **Free VRF jackpot:** Switchboard VRF for the daily draw.
- **Staking PDA:** lock $GRIND for a CASH multiplier + bigger offline cap.

---

## 4. Architecture (on-chain vs off-chain)
| On-chain | Off-chain (authoritative) |
|---|---|
| $GRIND SPL mint (fixed supply, revoked authorities) | Game loop: CASH, machines, recipes, merges |
| Treasury / prize-pool / staking PDAs | Energy, offline accrual, prestige weight |
| Claim/withdraw settlement + 3% burn | Achievements, leaderboards, referrals |
| Buyback-burn + burn address | Anti-cheat / rate-limiting |
| VRF jackpot draw | "Refinery Health" faucet/sink ledger |

Casual idle games keep game logic off-chain and settle **value** on-chain. The client is never trusted for anything that mints or moves $GRIND.

## 5. Tuning the economy
All knobs live in `js/config.js` (`economy`, `supply`) and `js/data.js` (tiers, costs, blueprint odds, achievements). Adjust cost curves, prestige formula, milestone thresholds, and faucet/sink balance there.

## 6. Credits
- Images: **GPT Image 2** (4K/2K). Video: **Seedance 2.0** (synced audio). Both via OpenArt.
- Fonts: Anton (display), Chakra Petch (UI), Space Mono (numerals) — Google Fonts.
- Wordmark is CSS/SVG (not baked into renders).
