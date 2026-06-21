/* =====================================================================
   GRIND HOUSE — Solana wallet + token layer
   Works TODAY for wallet connect. Token claim/deposit/stake are wired
   but gated on config: pre-launch, $GRIND is a banked claimable balance;
   at TGE you flip GH.token.launched + paste the mint + treasury and the
   live paths turn on. No code changes needed beyond config.js.
   ===================================================================== */
import { GH, isLive, canClaim } from "./config.js";
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
      ? "$GRIND is live. Claim your banked balance to your wallet."
      : "Pre-launch: every gate you clear banks claimable $GRIND. Withdraw at TGE.";
  }
}

/* ---------- claim flow ---------- */
export async function claim(game) {
  if (!canClaim()) {
    openClaimAtLaunch();
    return;
  }
  if (!game.state.wallet) { await connect(game); if (!game.state.wallet) return; }
  // === LIVE PATH (enable at TGE) ===
  // Server-authoritative: ask backend for a partially-signed claim tx,
  // co-sign with the wallet, submit. Treasury never trusts the client.
  try {
    const resp = await fetch("/api/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wallet: game.state.wallet, amount: game.state.grind }),
    });
    if (!resp.ok) throw new Error("claim endpoint not live");
    const { txBase64 } = await resp.json();
    const web3 = await loadWeb3();
    const tx = web3.Transaction.from(Uint8Array.from(atob(txBase64), c => c.charCodeAt(0)));
    const signed = await provider.signTransaction(tx);
    const conn = new web3.Connection(GH.token.rpc, "confirmed");
    const sig = await conn.sendRawTransaction(signed.serialize());
    await conn.confirmTransaction(sig, "confirmed");
    game.state.grind = 0; save(game.state, true); refreshWalletUI(game.state);
    alert("Claimed! Tx: " + sig);
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
      ? "Install a Solana wallet to lock in your claimable $GRIND for launch. You don't need one to play — only to withdraw at TGE."
      : `Linked to <b>${name}</b> · <span class="mono">${shortKey(pk, 5)}</span>. Your banked $GRIND is reserved for this wallet. Grind now, claim at launch.`}</p>
    <div class="m-row">
      ${needInstall
        ? `<a class="cta" href="https://phantom.app/" target="_blank" rel="noopener">GET PHANTOM</a><button class="cta ghost x">LATER</button>`
        : `<button class="cta x">KEEP GRINDING</button>`}
    </div>
  </div>`;
  wrap.addEventListener("click", (e) => { if (e.target === wrap || e.target.classList.contains("x")) { wrap.classList.remove("show"); setTimeout(() => wrap.remove(), 200); } });
  root.appendChild(wrap); requestAnimationFrame(() => wrap.classList.add("show"));
}

export function openClaimAtLaunch() {
  const root = $("#modalRoot"); if (!root) return;
  const wrap = document.createElement("div"); wrap.className = "modal-wrap";
  wrap.innerHTML = `<div class="modal">
    <h2 class="m-title">THE TOKEN ISN'T LIVE YET — THAT'S YOUR EDGE.</h2>
    <p class="m-body">$GRIND launches at TGE. Until then, every gate you clear banks <b>claimable $GRIND</b>. The season pool halves every week, so the earliest houses bank the deepest. Grind now. Claim at launch.</p>
    <div class="m-row"><button class="cta x">KEEP GRINDING</button></div>
  </div>`;
  wrap.addEventListener("click", (e) => { if (e.target === wrap || e.target.classList.contains("x")) { wrap.classList.remove("show"); setTimeout(() => wrap.remove(), 200); } });
  root.appendChild(wrap); requestAnimationFrame(() => wrap.classList.add("show"));
}

// expose claim for the bank button (bound in play.html after import)
window.GH_claim = (game) => claim(game);
