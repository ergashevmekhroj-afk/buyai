// All database reads and writes in one place.
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run(query) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

// The database API returns at most 1,000 rows per request. With thousands of offers we fetch page by page,
// so the Price Scout really sees every offer. makeQuery() must build a fresh query each time.
const PAGE = 1000;
async function runAll(makeQuery) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const page = await run(makeQuery().range(from, from + PAGE - 1));
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

// Reference data, loaded once when the page opens
export async function loadReference() {
  const [regions, products, sources, benchmark, loanTypes, loanRates, rules, markets, offerStats, official] = await Promise.all([
    run(supabase.from("regions").select("*").order("sort_order")),
    run(supabase.from("products").select("*").order("name_uz")),
    run(supabase.from("sources").select("*")),
    run(supabase.from("benchmark").select("*")),
    run(supabase.from("loan_rate_types").select("*")),
    run(supabase.from("loan_rates").select("*").order("rate_pct")),
    run(supabase.from("business_rules").select("*")),
    run(supabase.from("markets").select("*").order("name")),
    // one-row summary for the dashboard numbers (counting in the database, not downloading thousands of rows)
    run(supabase.from("offer_stats").select("*").single()),
    // how many official prices we hold (count only, no rows)
    supabase.from("official_prices").select("*", { count: "exact", head: true }),
  ]);
  if (official.error) throw new Error(official.error.message);
  return { regions, products, sources, benchmark, loanTypes, loanRates, rules, markets, offerStats, officialCount: official.count };
}

// Recent official history of one source (dashboard: price movers)
export function sourceHistory(sourceId, fromMonth) {
  return run(supabase.from("official_prices").select("product_id, month, price_som")
    .eq("source_id", sourceId).gte("month", fromMonth).order("month"));
}

// Live offers (demo + real) for some products, only in the ticked regions
export function offersFor(productIds, regionIds) {
  return runAll(() => supabase.from("active_offers").select("*")
    .in("product_id", productIds).in("region_id", regionIds).order("offer_id"));
}

// All live offers for one product (Market tab)
export function offersForProduct(productId) {
  return runAll(() => supabase.from("active_offers").select("*").eq("product_id", productId).order("price_som").order("offer_id"));
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

// ---------- sellers: login, shop profile, offers (writes need a logged-in seller) ----------
// Sellers log in with phone + password. Supabase Auth wants an email, so the phone becomes an internal
// address 998901234567@sotuvchi.buyai.local (".local" can never be a real mailbox). Sellers never see it.
export function phoneDigits(phone) {
  let d = String(phone).replace(/\D/g, "");
  if (d.length === 9) d = "998" + d;                 // 90 123 45 67 -> 998901234567
  return /^998\d{9}$/.test(d) ? d : null;
}
const loginEmail = (phone) => `${phoneDigits(phone)}@sotuvchi.buyai.local`;
const authRun = async (p) => { const { data, error } = await p; if (error) throw new Error(error.message); return data; };

export const signUp = (phone, password) => authRun(supabase.auth.signUp({ email: loginEmail(phone), password }));
export const logIn = (phone, password) => authRun(supabase.auth.signInWithPassword({ email: loginEmail(phone), password }));
export const logOut = () => supabase.auth.signOut();
export const phoneOfUser = (user) => (user?.email ?? "").split("@")[0];
// calls fn(user or null) now and whenever the login changes; returns an unsubscribe function
export function onAuth(fn) {
  supabase.auth.getSession().then(({ data }) => fn(data.session?.user ?? null));
  const { data } = supabase.auth.onAuthStateChange((_e, session) => fn(session?.user ?? null));
  return () => data.subscription.unsubscribe();
}

export const myShop = () => run(supabase.rpc("my_shop")).then((rows) => rows?.[0] ?? null);
export const saveMyShop = (s) => run(supabase.rpc("save_my_shop", {
  p_name: s.name, p_region_id: s.region, p_market_name: s.market, p_phone: s.phone, p_show_phone: s.showPhone }));
export const postOffer = (o) => run(supabase.rpc("post_offer", {
  p_product_id: o.product, p_price_som: o.price, p_min_qty: o.minQty, p_delivery_fee_som: o.fee }));
export const deleteMyOffer = (id) => run(supabase.rpc("delete_my_offer", { p_offer_id: id }));

// One seller's public card: profile + all live offers (Market tab, and "my offers" on the seller page)
export async function sellerCard(sellerId) {
  const [seller] = await run(supabase.from("sellers").select("seller_id, name, region_id, market_name, phone, is_demo, created_at").eq("seller_id", sellerId));
  const offers = await run(supabase.from("active_offers").select("*").eq("seller_id", sellerId).order("product_id"));
  return { seller, offers };
}
