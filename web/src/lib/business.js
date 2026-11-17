// BuyAI business model in numbers: how we earn (B2) and what one user costs us (B4).
// Every number here is a PLAN or an ESTIMATE, not real revenue. Change them in this one file.
// Prices checked 18 Nov 2026: Gemini 3.8 Flash $0.75 / $3.75 per 1M tokens (intro price to 31 Dec 2026,
// third-party price tables; confirm on ai.google.dev). Vercel Pro $20/month, Supabase Pro $25/month.

export const USD_SOM = 12000;              // rough exchange rate used only for these estimates

// ---------- how we earn ----------
export const SELLER_FEE = 0.01;            // planned: seller pays 1% of an order that came through BuyAI
export const BANK_FEE_USD = 15;            // planned: bank pays per approved loan referral (buyer's rate is the same)
export const DATA_SUB_USD = 30;            // planned: monthly price-data subscription (banks, wholesalers, analysts)
export const PREMIUM_USD = 10;             // planned: multi-branch business, per month

// ---------- what one plan costs us ----------
// One "plan" = 1 AI call to read the sentence + 1 AI call to write the explanation.
// Token counts measured from our prompts (system prompt + data summary), rounded up.
const TOKENS_IN = 4000, TOKENS_OUT = 700;
const PRICE_IN = 0.75 / 1e6, PRICE_OUT = 3.75 / 1e6;   // USD per token, Gemini 3.8 Flash
export const AI_USD_PER_PLAN = TOKENS_IN * PRICE_IN + TOKENS_OUT * PRICE_OUT;   // ≈ $0.0056

// Hosting is a fixed monthly cost shared by everyone: Vercel Pro + Supabase Pro.
export const HOSTING_USD_MONTH = 20 + 25;
// Voice: VoiceLab 2,000 free credits a month now; above that, the browser's own voice (free) takes over.

// ---------- one typical business per month ----------
export const PLANS_PER_MONTH = 30;              // assumption: about one purchase plan a day
export const BUYS_SOM_MONTH = 20_000_000;       // assumption: a choyxona buys ~20 mln so'm of food a month via BuyAI

// Unit economics for N active businesses (default 1,000). Returns USD per business per month.
export function unitEconomics(businesses = 1000) {
  const ai = AI_USD_PER_PLAN * PLANS_PER_MONTH;
  const hosting = HOSTING_USD_MONTH / businesses;
  const cost = ai + hosting;
  const revenue = (BUYS_SOM_MONTH * SELLER_FEE) / USD_SOM;   // seller fee only; bank, data, premium are extra
  return { ai, hosting, cost, revenue, margin: revenue - cost, businesses };
}

// What BuyAI would earn from the seller fee on one plan (shown under the plan, in so'm).
export const feeOnPlan = (totalSom) => Math.round(totalSom * SELLER_FEE);
