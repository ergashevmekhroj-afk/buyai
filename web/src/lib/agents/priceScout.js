// AGENT 2: PRICE SCOUT
// For every product, looks at live seller offers ONLY in the regions the buyer ticked,
// and ranks them by total delivered cost:
//     cost = price x quantity bought + delivery fee
// where "quantity bought" is at least the seller's minimum order.
import { offersFor } from "../db.js";

export const SUSPICIOUS_LOW = -20;   // same line as the Market Analyst's "very cheap, check quality" flag

export async function scout(order, regionIds) {
  const productIds = order.items.map((it) => it.product_id);
  const offers = await offersFor(productIds, regionIds);

  const lines = order.items.map((item) => {
    const candidates = offers
      .filter((o) => o.product_id === item.product_id)
      .map((o) => {
        const buyQty = Math.max(item.quantity, Number(o.min_qty));
        return { ...o, buyQty, goodsCost: o.price_som * buyQty, cost: o.price_som * buyQty + o.delivery_fee_som };
      })
      .sort((a, b) => a.cost - b.cost);
    // An offer 20%+ BELOW the official price is suspicious (quality? weight?), so it is not recommended;
    // it stays in the list (the Market Analyst flags it) and is used only if nothing else exists.
    const trusted = candidates.find((o) => o.vs_official_pct == null || o.vs_official_pct > SUSPICIOUS_LOW);
    return { item, candidates, best: trusted ?? candidates[0] ?? null };
  });

  // Delivery is paid once per seller, even if we buy two products from the same seller
  const sellersUsed = new Map();
  for (const l of lines) if (l.best) sellersUsed.set(l.best.seller_id, l.best.delivery_fee_som);
  const goods = lines.reduce((s, l) => s + (l.best ? l.best.goodsCost : 0), 0);
  const delivery = [...sellersUsed.values()].reduce((s, f) => s + f, 0);

  // Saving vs paying the official regional average for the same quantity (delivery not included)
  const savings = lines.reduce((s, l) =>
    s + (l.best && l.best.official_avg_som ? (l.best.official_avg_som - l.best.price_som) * l.best.buyQty : 0), 0);

  return { lines, goods, delivery, total: goods + delivery, savings, offersChecked: offers.length };
}

// Budget only, no quantities ("8 mln bor, sabzavotlar kerak"): split the money evenly over the products
// that have a seller, and turn each share into a quantity at that seller's price:
//     quantity = (share - delivery fee) / price, at least the seller's minimum order.
// The Scout then runs again with these quantities (the cheapest seller can change with the quantity).
export function fitBudget(order, scoutResult) {
  const withSeller = scoutResult.lines.filter((l) => l.best);
  const share = withSeller.length ? order.cash_som / withSeller.length : 0;
  const items = order.items.map((it) => {
    const best = scoutResult.lines.find((l) => l.item.product_id === it.product_id)?.best;
    if (!best) return { ...it, quantity: 1 };                       // no seller: it shows "no offer" anyway
    const q = Math.floor((share - best.delivery_fee_som) / best.price_som);
    return { ...it, quantity: Math.max(q, Number(best.min_qty)) };
  });
  return { order: { ...order, items }, share, products: withSeller.length };
}
