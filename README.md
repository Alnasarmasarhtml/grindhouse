# GRIND HOUSE — $GRIND

> Grind scrap into money. Run a neon refinery that turns raw junk all the way up to **$GRIND**, the real token on Solana. The house never sleeps.

A premium idle / incremental crypto game (conceptual cousin of Steam's *Supply Chain Idle*), rebuilt as a Solana play-to-bank game with a **hyperreal × neon-cyberpunk** look.

## The hook
- **CASH** — off-chain in-game fuel. Earned forever, explodes to astronomical numbers, *never withdrawable.* This is the game.
- **$GRIND** — the real SPL token. Fixed **1,000,000,000** supply, mint authority revoked, earned **only at gated events** (prestige, milestones, weekly halving season pool). No per-second emission → playing can never flood the market. This is the deliberate fix for why Axie/StepN/Pixels died.
- Value is fed by **buyback-and-burn from real revenue**, not new-player deposits.

## Play
```bash
python3 -m http.server 8080
# landing: http://localhost:8080
# game:    http://localhost:8080/play.html
```
Pure static, no build step. Saves locally (crash-safe dual-slot).

## Status: pre-launch / token-ready
The token isn't live yet. Players **grind now and bank claimable $GRIND**, claimable at TGE. To go live, see **[docs/LAUNCH.md](docs/LAUNCH.md)** — it's a handful of steps, almost all in `js/config.js`.

## Structure
```
index.html        landing site
play.html         the game
css/base.css      design system (tokens, FX, modals)
css/site.css      landing styles
css/game.css      game screen styles
js/config.js      ⟵ all launch config lives here (drop in CA at TGE)
js/data.js        9-tier ladder, recipes, upgrades, blueprints, achievements
js/economy.js     supply-chain flow sim, cost curves, multipliers, prestige
js/game.js        controller + main loop + actions
js/ui.js          rendering + juice (counters, cards, modals, particles)
js/solana.js      wallet connect + claim/balance (config-gated)
js/save.js        crash-safe save system
js/audio.js       synth SFX (no audio files)
assets/img        GPT Image 2 art (4K/2K)
assets/video      Seedance 2.0 motion (synced audio)
docs/LAUNCH.md    the go-live playbook
docs/COPY.md      copy source of truth
```

## Disclaimer
GRIND HOUSE is a game; $GRIND is a volatile token; neither is an investment. Entertainment first. Only spend what you can afford to lose.
