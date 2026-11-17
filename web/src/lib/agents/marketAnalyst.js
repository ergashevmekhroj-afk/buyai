// AGENT 3: MARKET ANALYST
// Compares offers with the OFFICIAL regional average (stat.uz), shows the recent trend
// and the 1-3 month outlook, and gives a buy-now / wait signal.
import { officialHistory, forecastsFor } from "../db.js";

export const FLAG_HIGH = 20;   // offer 20%+ above official average -> warn "overpriced"
export const FLAG_LOW = -20;   // 20%+ below -> "very cheap, check quality"
const MOVE = 1;                // outlook change under 1% counts as "stable" (1% of a big order is real money)

function monthStart(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; }

export async function analyse(order, scoutResult, regionIds, ref) {
  const productIds = order.items.map((it) => it.product_id);
  const sources = ref.sources.filter((s) => regionIds.includes(s.region_id));
  const [history, forecasts] = await Promise.all([
    sources.length ? officialHistory(productIds, sources.map((s) => s.source_id), "2025-06-01") : [],
    forecastsFor(productIds),
  ]);

  // Forecasts exist for Tashkent city only (seasonal model); we use them as the outlook
  const thisMonth = iso(monthStart(new Date()));
  const nextMonth = iso(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1));

  const products = order.items.map((item) => {
    const pid = item.product_id;
    const line = scoutResult.lines.find((l) => l.item.product_id === pid);

    // trend: change over the last 3 published months, per ticked region with data
    const trends = sources.map((s) => {
      const rows = history.filter((h) => h.source_id === s.source_id && h.product_id === pid && h.price_som != null);
      if (rows.length < 4) return null;
      const last = rows[rows.length - 1], before = rows[rows.length - 4];
      return { region_id: s.region_id, month: last.month, price: last.price_som,
               change3m: 100 * (last.price_som - before.price_som) / before.price_som };
    }).filter(Boolean);

    // outlook from the forecast table (estimate)
    const f = forecasts.filter((x) => x.product_id === pid);
    const fNow = f.find((x) => x.month === thisMonth), fNext = f.find((x) => x.month === nextMonth);
    const outlookPct = fNow && fNext ? 100 * (fNext.price_som - fNow.price_som) / fNow.price_som : null;

    let signal = "neutral";
    if (outlookPct != null && outlookPct > MOVE) signal = "buy";
    if (outlookPct != null && outlookPct < -MOVE) signal = "wait";
    if (order.deadline_days != null && order.deadline_days <= 7) signal = "buy";   // needed soon: no point waiting

    // flags on the offers the Scout looked at
    const flagged = (line?.candidates ?? []).filter((o) =>
      o.vs_official_pct != null && (o.vs_official_pct >= FLAG_HIGH || o.vs_official_pct <= FLAG_LOW));

    return { product_id: pid, trends, forecast: f, outlookPct, signal, flagged };
  });

  return { products, flaggedCount: products.reduce((s, p) => s + p.flagged.length, 0) };
}
