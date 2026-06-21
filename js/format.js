/* =====================================================================
   GRIND HOUSE — number & time formatting
   The roll-up of a giant number IS the dopamine. Tabular, suffixed,
   never jittery. K / M / B / T then aa, ab, ... then scientific.
   ===================================================================== */

const SHORT = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];

// generate two-letter suffixes aa, ab, ... zz for the far reaches
function twoLetter(i) {
  const a = Math.floor(i / 26);
  const b = i % 26;
  return String.fromCharCode(97 + a) + String.fromCharCode(97 + b);
}

/** Format a positive number into a compact idle-game string. */
export function fmt(n, opts = {}) {
  const { decimals = 2, prefix = "", plus = false } = opts;
  if (n === Infinity) return prefix + "∞";
  if (!isFinite(n) || isNaN(n)) return prefix + "0";
  const sign = n < 0 ? "-" : plus ? "+" : "";
  n = Math.abs(n);
  if (n < 1000) {
    // small numbers: show ints cleanly, fractions with 1-2 decimals
    const s = n < 10 && n % 1 !== 0 ? n.toFixed(1) : Math.floor(n).toLocaleString("en-US");
    return sign + prefix + s;
  }
  const group = Math.floor(Math.log10(n) / 3);
  if (group < SHORT.length) {
    const scaled = n / Math.pow(1000, group);
    return sign + prefix + trimZeros(scaled.toFixed(decimals)) + SHORT[group];
  }
  const twoIdx = group - SHORT.length;
  if (twoIdx < 26 * 26) {
    const scaled = n / Math.pow(1000, group);
    return sign + prefix + trimZeros(scaled.toFixed(decimals)) + twoLetter(twoIdx);
  }
  // astronomical -> scientific
  return sign + prefix + n.toExponential(2).replace("e+", "e");
}

function trimZeros(s) {
  return s.replace(/\.?0+$/, "");
}

/** Money flavour. */
export const fmtCash = (n, o = {}) => fmt(n, { prefix: "$", ...o });
/** Token flavour (whole-ish). */
export const fmtGrind = (n, o = {}) => fmt(n, { decimals: 2, ...o });

/** Compact rate, e.g. "$1.2M/s". */
export const fmtRate = (n) => fmtCash(n) + "/s";

/** seconds -> "2h 14m" / "3d 4h" / "12s". */
export function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

/** short pubkey: Ax9f…3kQp */
export function shortKey(k, n = 4) {
  if (!k) return "";
  return k.length <= n * 2 + 1 ? k : `${k.slice(0, n)}…${k.slice(-n)}`;
}

/** smooth eased number tween for the HUD counters. */
export function lerp(a, b, t) { return a + (b - a) * t; }
