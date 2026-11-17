// FINAL ADVICE: one clear "when to buy" line per product, computed in code from what the agents found.
//   - forecast says the price will RISE next month  -> buy today or tomorrow, and how much that saves
//   - forecast says it will FALL                    -> wait until early next month (N days), unless the buyer needs it sooner
//   - no forecast (only Tashkent city has one)      -> use the last 3 months' official trend as a hint
// Forecasts are a simple seasonal estimate, so the screen labels them "taxmin" / estimate.

const MOVE = 1;   // changes under 1% count as "stable" (same rule as the Market Analyst)

const daysToNextMonth = (today = new Date()) =>
  Math.round((new Date(today.getFullYear(), today.getMonth() + 1, 1) - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 864e5);

export function finalAdvice(order, scoutResult, analysis, today = new Date()) {
  const waitDays = daysToNextMonth(today);
  const items = scoutResult.lines.filter((l) => l.best).map((l) => {
    const pa = analysis.products.find((p) => p.product_id === l.item.product_id);
    const cost = l.best.goodsCost;
    const outlook = pa?.outlookPct;
    const trend = pa?.trends.length ? pa.trends.reduce((s, t) => s + t.change3m, 0) / pa.trends.length : null;
    const base = { product_id: l.item.product_id, seller: l.best.seller_name, region_id: l.best.region_id, price: l.best.price_som };

    if (outlook != null && outlook > MOVE) return { ...base, action: "now", reason: "rising", pct: outlook, save: cost * outlook / 100 };
    if (outlook != null && outlook < -MOVE) {
      if (order.deadline_days != null && order.deadline_days < waitDays)          // needed before prices drop
        return { ...base, action: "now", reason: "deadline", days: order.deadline_days, pct: outlook };
      return { ...base, action: "wait", reason: "falling", days: waitDays, pct: outlook, save: cost * -outlook / 100 };
    }
    if (outlook != null) return { ...base, action: "any", reason: "stable", pct: outlook };
    if (trend != null && trend > MOVE) return { ...base, action: "now", reason: "trend_up", pct: trend };
    if (trend != null && trend < -MOVE) return { ...base, action: "any", reason: "trend_down", pct: trend };
    return { ...base, action: "any", reason: "no_data" };
  });

  const timingSave = items.reduce((s, it) => s + (it.save ?? 0), 0);
  return { items, timingSave, waitDays };
}
