// Small helpers used everywhere. Text follows the current language (i18n.js).
import { t } from "./i18n.js";

const group = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

// 1234567 -> "1 234 567 so'm"
export function som(n) {
  if (n == null || isNaN(n)) return "—";
  return `${group(n)} ${t("som")}`;
}

// 4200000 -> "4,2 mln so'm"
export function mln(n) {
  if (n == null || isNaN(n)) return "—";
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2).replace(/\.?0+$/, "").replace(".", ",")} ${t("mln")}`;
  return som(n);
}

export function pct(x, digits = 1) {
  if (x == null || isNaN(x)) return "—";
  return (x > 0 ? "+" : "") + Number(x).toFixed(digits).replace(".", ",") + "%";
}

export function unitName(unit) {
  return t({ kg: "unit_kg", litre: "unit_litre", "10 pcs": "unit_10pcs" }[unit] ?? "unit_kg");
}
export function perUnit(unit) {
  return t({ kg: "per_kg", litre: "per_litre", "10 pcs": "per_10pcs" }[unit] ?? "per_kg");
}
export function qtyText(q, unit) {
  return `${group(Number(q))} ${unitName(unit)}`;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Escape text before putting it into HTML (seller names come from users)
export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// "2026-10-01" -> "Okt 2026" / "окт 2026" / "Oct 2026"
export function monthName(d) {
  const [y, m] = String(d).split("-");
  return `${t("months").split(",")[Number(m) - 1]} ${y}`;
}

// Count a number up on screen (used by the agent cards and stats)
export function countUp(el, to, format = (v) => group(v), ms = 700) {
  const start = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - start) / ms);
    el.textContent = format(to * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  setTimeout(() => { el.textContent = format(to); }, ms + 100);   // always end on the real number (background tabs pause animations)
}
