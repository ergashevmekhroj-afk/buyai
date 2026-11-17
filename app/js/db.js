// All database reads and writes in one place.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm";
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run(query) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

// Reference data, loaded once when the page opens
export async function loadReference() {
  const [regions, products, sources, benchmark, loanTypes, loanRates, rules, markets, offers, official] = await Promise.all([
    run(supabase.from("regions").select("*").order("sort_order")),
    run(supabase.from("products").select("*").order("name_uz")),
    run(supabase.from("sources").select("*")),
    run(supabase.from("benchmark").select("*")),
    run(supabase.from("loan_rate_types").select("*")),
    run(supabase.from("loan_rates").select("*").order("rate_pct")),
    run(supabase.from("business_rules").select("*")),
    run(supabase.from("markets").select("*").order("name")),
    // a light list of live offers for the dashboard numbers
    run(supabase.from("active_offers").select("offer_id, seller_id, is_demo, product_id, region_id, price_som")),
    // how many official prices we hold (count only, no rows)
    supabase.from("official_prices").select("*", { count: "exact", head: true }),
  ]);
  if (official.error) throw new Error(official.error.message);
  return { regions, products, sources, benchmark, loanTypes, loanRates, rules, markets, offers, officialCount: official.count };
}

// Recent official history of one source (dashboard: price movers)
export function sourceHistory(sourceId, fromMonth) {
  return run(supabase.from("official_prices").select("product_id, month, price_som")
    .eq("source_id", sourceId).gte("month", fromMonth).order("month"));
}

// Live offers (demo + real) for some products, only in the ticked regions
export function offersFor(productIds, regionIds) {
  return run(supabase.from("active_offers").select("*")
    .in("product_id", productIds).in("region_id", regionIds));
}

// All live offers for one product (Market tab)
export function offersForProduct(productId) {
  return run(supabase.from("active_offers").select("*").eq("product_id", productId).order("price_som"));
}

// Official monthly prices of some products from some sources, from a given month
export function officialHistory(productIds, sourceIds, fromMonth) {
  return run(supabase.from("official_prices").select("*")
    .in("product_id", productIds).in("source_id", sourceIds)
    .gte("month", fromMonth).order("month"));
}

export function forecastsFor(productIds) {
  return run(supabase.from("forecasts").select("*").in("product_id", productIds).order("month"));
}

// The only write path: a seller posts (or replaces) an offer
export function postOffer(o) {
  return run(supabase.rpc("post_offer", {
    p_seller_name: o.name, p_phone: o.phone, p_region_id: o.region, p_market_name: o.market,
    p_product_id: o.product, p_price_som: o.price, p_min_qty: o.minQty, p_delivery_fee_som: o.fee,
  }));
}
