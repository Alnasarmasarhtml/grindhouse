/* =====================================================================
   GRIND HOUSE — Solana wallet + token layer
   Works TODAY for wallet connect. Activation/claim/spend are wired but
   gated on config: pre-launch this is a free DEMO (the in-game number is a
   practice score, NOT a claimable token). At launch you bind the mint +
   treasury + backend (api) + oracle in config.js and the live, server-
   authoritative paths turn on. Real earning needs the backend, not just a flag.
   ===================================================================== */
import { GH, isLive, canClaim, isActivated, apiBase, currentEpoch } from "./config.js";
import { fmtGrind, shortKey } from "./format.js";
import { save } from "./save.js";

const $ = (s) => document.querySelector(s);

/* ---------- provider detection (Phantom / Solflare / Backpack) ---------- */
function getProvider() {
  if (window.phantom?.solana?.isPhantom) return { p: window.phantom.solana, name: "Phantom" };
  if (window.solana?.isPhantom) return { p: window.solana, name: "Phantom" };
  if (window.solflare?.isSolflare) return { p: window.solflare, name: "Solflare" };
  if (window.backpack?.isBackpack) return { p: window.backpack, name: "Backpack" };
  if (window.solana) return { p: window.solana, name: "Wallet" };
  return null;
}

let provider = null;

export async function connect(game) {
  const found = getProvider();
  if (!found) {
    openConnectModal(game, true);
    return;
  }
  provider = found.p;
  try {
    const res = await provider.connect();
    const pk = (res?.publicKey || provider.publicKey)?.toString();
    if (!pk) throw new Error("no pubkey");
    game.state.wallet = pk;
    save(game.state, true);
    refreshWalletUI(game.state);
    if (isLive()) tryReadBalance(pk);
    else openConnectModal(game, false, found.name, pk);
  } catch (e) {
    console.warn("[grindhouse] connect failed", e);
  }
}

export async function disconnect(game) {
  try { await provider?.disconnect?.(); } catch (_) {}
  game.state.wallet = null; save(game.state, true); refreshWalletUI(game.state);
}
export const connectWallet = connect; // alias (parallel to GREYMARKET chain.js)

/* ---------- ACTIVATION — the per-epoch Operator License ("account tax") ----------
   PAID IN $GRIND (≈feeSolValue worth, BURNED) → real token utility + buy pressure.
   DEMO: nothing moves on-chain; honest "opens at launch" modal.
   LIVE: the backend prices the license in $GRIND from the oracle (feeSolValue ÷
   token price) and builds the burn tx; the client only co-signs — it can't forge
   the amount. Backend licenses the wallet for THIS epoch on confirm. */
export async function payActivation(game, tierId = "operator") {
  const a = GH.chain.activation;
  const tier = a.tiers.find(t => t.id === tierId) || a.tiers[0];
  if (!isLive()) { openActivateAtLaunch(tier); return { ok: false, reason: "demo" }; }
  if (!game.state.wallet) { await connect(game); if (!game.state.wallet) return { ok: false, reason: "no-wallet" }; }
  try {
    const resp = await fetch(apiBase() + GH.chain.api.activate, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ wallet: game.state.wallet, tier: tier.id, epoch: currentEpoch() }),
    });
    if (!resp.ok) throw new Error("activation not built");
    const { txBase64, tokenAmount } = await resp.json();   // server priced + built the $GRIND burn tx
    const web3 = await loadWeb3();
    const tx = web3.Transaction.from(Uint8Array.from(atob(txBase64), c => c.charCodeAt(0)));
    const signed = await provider.signTransaction(tx);
    const conn = new web3.Connection(GH.token.rpc, "confirmed");
    const sig = await conn.sendRawTransaction(signed.serialize());
    await conn.confirmTransaction(sig, "confirmed");   // backend watches confirm + licenses this epoch
    game.state.license = { active: true, tier: tier.id, sig, epoch: currentEpoch(), ts: Date.now() };
    game.state.epochDripStart = Date.now();
    save(game.state, true); refreshWalletUI(game.state);
    return { ok: true, sig, tokenAmount, epoch: currentEpoch() };
  } catch (e) { console.warn("[grindhouse] activation failed", e); openActivateAtLaunch(tier); return { ok: false, reason: String(e) }; }
}

/* ---------- Blueprint pull paid in SOL → 100% buyback & burn (live only) ---------- */
export async function payBlueprint(game) {
  const price = GH.chain.blueprint?.priceSol ?? 0.1;
  if (!isLive()) return { ok: true, demo: true };   // demo: free (caller rolls locally)
  if (!game.state.wallet) { await connect(game); if (!game.state.wallet) return { ok: false }; }
  try {
    const web3 = await loadWeb3();
    const conn = new web3.Connection(GH.token.rpc, "confirmed");
    const from = new web3.PublicKey(game.state.wallet);
    const to = new web3.PublicKey(GH.token.treasury);   // buyback pool
    const tx = new web3.Transaction().add(web3.SystemProgram.transfer({
      fromPubkey: from, toPubkey: to, lamports: Math.round(price * web3.LAMPORTS_PER_SOL),
    }));
    tx.feePayer = from; tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
    const signed = await provider.signTransaction(tx);
    const sig = await conn.sendRawTransaction(signed.serialize());
    await conn.confirmTransaction(sig, "confirmed");
    return { ok: true, sig };
  } catch (e) { console.warn("[grindhouse] blueprint pay failed", e); return { ok: false, reason: String(e) }; }
}

/* ---------- server-authoritative status (drip/caps/cooldown) ---------- */
export async function getStatus(pk) {
  if (!isLive()) return null;
  try { const r = await fetch(apiBase() + GH.chain.api.status + "?wallet=" + pk); return r.ok ? await r.json() : null; }
  catch (_) { return null; }
}

/* ---------- token sink (live = on-chain burn/transfer; demo = caller debits locally) ---------- */
export async function spendToken(game, sinkId, amount) {
  if (!isLive()) return { ok: true, demo: true };   // caller does the local sandbox debit
  if (!game.state.wallet) { await connect(game); if (!game.state.wallet) return { ok: false, reason: "no-wallet" }; }
  try {
    const resp = await fetch(apiBase() + GH.chain.api.spend, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ wallet: game.state.wallet, sink: sinkId, amount }),
    });
    if (!resp.ok) throw new Error("spend not built");
    const { txBase64 } = await resp.json();
    const web3 = await loadWeb3();
    const tx = web3.Transaction.from(Uint8Array.from(atob(txBase64), c => c.charCodeAt(0)));
    const signed = await provider.signTransaction(tx);
    const conn = new web3.Connection(GH.token.rpc, "confirmed");
    const sig = await conn.sendRawTransaction(signed.serialize());
    await conn.confirmTransaction(sig, "confirmed");
    return { ok: true, sig };
  } catch (e) { console.warn("[grindhouse] spend failed", e); return { ok: false, reason: String(e) }; }
}

export function refreshWalletUI(state) {
  const btn = $("#walletBtn");
  if (btn) {
    if (state.wallet) { btn.textContent = shortKey(state.wallet, 4); btn.classList.add("connected"); }
    else { btn.textContent = "CONNECT WALLET"; btn.classList.remove("connected"); }
  }
  // bank panel
  const bank = $("#bankPanel");
  if (bank) {
    $("#bankBalance") && ($("#bankBalance").textContent = fmtGrind(state.grind));
    $("#bankWallet") && ($("#bankWallet").textContent = state.wallet ? shortKey(state.wallet, 5) : "not connected");
    const claimBtn = $("#claimBtn");
    if (claimBtn) {
      if (!canClaim()) { claimBtn.textContent = "CLAIM AT LAUNCH"; claimBtn.classList.add("disabled"); }
      else { claimBtn.textContent = "CLAIM $GRIND"; claimBtn.classList.remove("disabled"); }
    }
    const status = $("#bankStatus");
    if (status) status.textContent = isLive()
      ? "$GRIND is live. Activated Operators earn a real, capped weekly drip — claim it to your wallet."
      : "Free demo. This number is a practice score — NOT claimable $GRIND, and it resets at launch. At TGE, activated Operators earn a real, capped weekly $GRIND drip.";
  }
}

/* ---------- claim flow ---------- */
export async function claim(game) {
  if (!canClaim()) { openClaimAtLaunch(); return; }
  if (!game.state.wallet) { await connect(game); if (!game.state.wallet) return; }
  if (!isActivated(game.state)) { openActivateAtLaunch(GH.chain.activation.tiers[0]); return; }
  // === LIVE PATH — SERVER-AUTHORITATIVE ===
  // The server re-derives the claimable amount from its TIME-DRIP ledger and
  // returns a partially-signed tx from the capped claim hot wallet. The client
  // NEVER asserts an amount (that was the old bug). Treasury never trusts the client.
  try {
    const nres = await fetch(apiBase() + GH.chain.api.nonce + "?wallet=" + game.state.wallet);
    if (!nres.ok) throw new Error("nonce endpoint not live");
    const { nonce } = await nres.json();
    const resp = await fetch(apiBase() + GH.chain.api.claim, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ wallet: game.state.wallet, nonce }),   // NO amount — server decides
    });
    if (!resp.ok) throw new Error("claim endpoint not live");
    const { txBase64, amount, burned } = await resp.json();
    const web3 = await loadWeb3();
    const tx = web3.Transaction.from(Uint8Array.from(atob(txBase64), c => c.charCodeAt(0)));
    try { await provider.signMessage?.(new TextEncoder().encode(`claim:${GH.ticker}:${game.state.wallet}:${nonce}`)); } catch (_) {}
    const signed = await provider.signTransaction(tx);
    const conn = new web3.Connection(GH.token.rpc, "confirmed");
    const sig = await conn.sendRawTransaction(signed.serialize());
    await conn.confirmTransaction(sig, "confirmed");
    // server watches the chain and debits its ledger once; client just reconciles display
    game.state.lastClaimTs = Date.now();
    game.state.lifetimeClaimed = (game.state.lifetimeClaimed || 0) + (amount || 0);
    game.state.grind = 0; save(game.state, true); refreshWalletUI(game.state);
    simpleModal("CLAIMED", `+${fmtGrind(amount || 0)} $GRIND sent to your wallet · ${fmtGrind(burned || 0)} burned (3%).`, "NICE");
  } catch (e) {
    console.warn("[grindhouse] claim path not live yet:", e);
    openClaimAtLaunch();
  }
}

/* ---------- live balance read (optional, once live) ---------- */
async function tryReadBalance(pk) {
  if (!isLive()) return;
  try {
    const web3 = await loadWeb3();
    const conn = new web3.Connection(GH.token.rpc, "confirmed");
    const owner = new web3.PublicKey(pk);
    const mint = new web3.PublicKey(GH.token.mint);
    const accs = await conn.getParsedTokenAccountsByOwner(owner, { mint });
    const bal = accs.value[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0;
    const onchain = $("#onchainBal"); if (onchain) onchain.textContent = fmtGrind(bal) + " $GRIND";
  } catch (e) { /* RPC may rate-limit; non-fatal */ }
}

/* ---------- @solana/web3.js loaded on demand (no build step) ---------- */
let _web3 = null;
async function loadWeb3() {
  if (_web3) return _web3;
  _web3 = await import("https://esm.sh/@solana/web3.js@1.95.3");
  return _web3;
}

/* ---------- modals ---------- */
function openConnectModal(game, needInstall, name, pk) {
  const root = $("#modalRoot"); if (!root) return;
  const wrap = document.createElement("div"); wrap.className = "modal-wrap";
  wrap.innerHTML = `<div class="modal">
    <h2 class="m-title">${needInstall ? "NO SOLANA WALLET FOUND" : "WALLET LINKED"}</h2>
    <p class="m-body">${needInstall
      ? "You don't need a wallet to play the demo. At launch, connect one to activate an Operator License and earn a real, capped weekly $GRIND drip."
      : `Linked to <b>${name}</b> · <span class="mono">${shortKey(pk, 5)}</span>. Earning is a free demo until launch — your number is a practice score, not $GRIND.`}</p>
    <div class="m-row">
      ${needInstall
        ? `<a class="cta" href="https://phantom.app/" target="_blank" rel="noopener">GET PHANTOM</a><button class="cta ghost x">LATER</button>`
        : `<button class="cta x">KEEP GRINDING</button>`}
    </div>
  </div>`;
  wrap.addEventListener("click", (e) => { if (e.target === wrap || e.target.classList.contains("x")) { wrap.classList.remove("show"); setTimeout(() => wrap.remove(), 200); } });
  root.appendChild(wrap); requestAnimationFrame(() => wrap.classList.add("show"));
}

/* ---------- shared modal ---------- */
function simpleModal(title, bodyHtml, btn = "KEEP PLAYING") {
  const root = $("#modalRoot"); if (!root) return;
  const wrap = document.createElement("div"); wrap.className = "modal-wrap";
  wrap.innerHTML = `<div class="modal">
    <h2 class="m-title">${title}</h2>
    <p class="m-body">${bodyHtml}</p>
    <div class="m-row"><button class="cta x">${btn}</button></div>
  </div>`;
  wrap.addEventListener("click", (e) => { if (e.target === wrap || e.target.classList.contains("x")) { wrap.classList.remove("show"); setTimeout(() => wrap.remove(), 200); } });
  root.appendChild(wrap); requestAnimationFrame(() => wrap.classList.add("show"));
}

export function openClaimAtLaunch() {
  simpleModal("THE TOKEN ISN'T LIVE YET — THAT'S YOUR EDGE.",
    "Right now this is a <b>free practice floor</b> — the number you see is a demo score, <b>not</b> a $GRIND entitlement, and it resets at launch. At TGE, activated <b>Operators</b> earn a real, <b>capped weekly drip</b> of $GRIND (the season pool halves each week — early is real). No wallet drained, no inflation, no rug.");
}

export function openActivateAtLaunch(tier) {
  const a = GH.chain.activation;
  const fee = tier?.feeSolValue ?? a.feeSolValue;
  simpleModal(`${a.licenseName.toUpperCase()} — OPENS AT LAUNCH`,
    `At launch, a per-season <b>${a.licenseName}</b> — bought in <b>$GRIND worth ≈${fee} SOL</b> and <b>burned</b> — unlocks <b>real, capped, claimable $GRIND</b> on a weekly drip. Paying in $GRIND is the whole point: it gives the coin real utility (you buy &amp; burn it to play-to-earn) and it keeps bots out, since every farming account must buy in first. <b>Right now nothing here is real money</b> — it's a free demo.`);
}

// expose for the bank/license buttons (bound in play.html after import)
window.GH_claim = (game) => claim(game);
window.GH_activate = (game, tier) => payActivation(game, tier);
window.GH_spend = (game, id, n) => spendToken(game, id, n);
