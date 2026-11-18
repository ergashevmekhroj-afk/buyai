// AGENT 1: PLANNER
// Reads the buyer's sentence (Uzbek Latin/Cyrillic, Russian, English) and finds:
// products + quantities, cash on hand, deadline.
// First it asks the AI (Gemini or Claude, via our server function). If that fails or is slow, it uses the
// keyword parser below, which needs no internet beyond our database.
import { AI_URL, PARSE_TIMEOUT_MS, SUPABASE_KEY } from "../config.js";

// Make apostrophes and letters uniform: o‘zbek / o'zbek / oʻzbek -> o'zbek
export function normalize(text) {
  return String(text).toLowerCase().replace(/[ʻʼ’‘`´]/g, "'").replace(/ё/g, "е");
}

const UNIT_WORDS = "kg|кг|kilo(?:gramm)?|килограмм(?:а|ов)?|litr|литр(?:а|ов)?|l|л|ta|dona|шт|штук|pcs|pieces|tonna|тонн[аы]?|t";
const NUMBER = "(\\d+(?:[.,]\\d+)?)";
const LETTER = /\p{L}/u;
// Uzbek / Russian endings allowed after a short keyword: "sutni", "рисa"...
const SHORT_SUFFIXES = ["", "ni", "ning", "dan", "ga", "da", "lar", "larni", "а", "у", "ом", "ы", "и", "е", "я", "о", "ой", "ей"];

// Read a number + unit; returns quantity in the product's unit
function toQuantity(numStr, unitWord, product) {
  let q = parseFloat(numStr.replace(",", "."));
  const u = (unitWord || "").toLowerCase();
  if (/^(tonna|тонн|t$)/.test(u)) q *= 1000;
  // eggs are priced per pack of 10: "300 ta tuxum" / "300 яиц" = 30 packs
  if (product.unit === "10 pcs") q /= 10;
  return q;
}

// Build [keyword, product] pairs, longest keyword first, so "kungaboqar yog'i" wins over "yog'"
function keywordList(products) {
  const list = [];
  for (const p of products) {
    for (const k of p.keywords.split(",")) {
      const kw = normalize(k.trim());
      if (kw) list.push({ kw, product: p });
    }
  }
  return list.sort((a, b) => b.kw.length - a.kw.length);
}

function wordEndsOk(text, end, kw) {
  const rest = text.slice(end);
  const tail = rest.match(/^\p{L}*/u)[0];
  if (tail === "") return true;
  if (kw.length >= 4) return true;             // long words: any ending is fine (guruchni, yog'ni)
  return SHORT_SUFFIXES.includes(tail);        // short words: only known endings (sutni, but not "mashina")
}

// Keyword (fallback) parser. Exported so it can be tested on its own.
export function parseWithKeywords(sentence, products) {
  const text = normalize(sentence);
  const used = new Array(text.length).fill(false);   // characters already matched
  const items = [];
  const spans = [];   // where each understood word is, so the screen can highlight it

  for (const { kw, product } of keywordList(products)) {
    let from = 0;
    while (true) {
      const i = text.indexOf(kw, from);
      if (i < 0) break;
      from = i + 1;
      const end = i + kw.length;
      if (i > 0 && LETTER.test(text[i - 1])) continue;          // must start a word
      if (!wordEndsOk(text, end, kw)) continue;
      if (used.slice(i, end).some(Boolean)) continue;           // a longer keyword already took it
      if (items.some((it) => it.product_id === product.product_id)) { used.fill(true, i, end); continue; }
      used.fill(true, i, end);

      // quantity: "200 kg guruch" (before) or "guruch 200 kg" (after)
      const before = text.slice(Math.max(0, i - 30), i).match(new RegExp(`${NUMBER}\\s*(${UNIT_WORDS})?\\s*$`));
      const after = text.slice(end).match(new RegExp(`^\\p{L}*\\s*[:\\-]?\\s*${NUMBER}\\s*(${UNIT_WORDS})?(?!\\p{L})`, "u"));
      let quantity = null;
      if (before) quantity = toQuantity(before[1], before[2], product);
      else if (after && !/^\s*(mln|млн|million|ming|тыс)/.test(text.slice(end + after[0].length))) {
        quantity = toQuantity(after[1], after[2], product);
      }
      items.push({ product_id: product.product_id, quantity, at: i });
      spans.push({ at: i, len: kw.length, kind: "product" });
    }
  }
  items.sort((a, b) => a.at - b.at);

  // cash: "4 mln", "4,5 млн", "800 ming", "2 000 000 so'm"
  let cash = null;
  for (const m of text.matchAll(/(\d+(?:[.,]\d+)?)\s*(mlrd|миллиард|mln|million|млн|миллион\w*|ming|тыс\w*)/g)) {
    const mult = /^(mlrd|миллиард)/.test(m[2]) ? 1e9 : /^(mln|million|млн|миллион)/.test(m[2]) ? 1e6 : 1e3;
    cash = Math.max(cash ?? 0, parseFloat(m[1].replace(",", ".")) * mult);
  }
  for (const m of text.matchAll(/(\d[\d\s]{4,})\s*(so'm|som|сум|sum|сўм)/g)) {
    cash = Math.max(cash ?? 0, parseFloat(m[1].replace(/\s/g, "")));
  }

  // deadline
  let deadline = null;
  const d = text.match(/(\d+)\s*(kun|kunda|день|дня|дней|days?)/);
  if (d) deadline = Number(d[1]);
  else if (/(bugun|сегодня|today)/.test(text)) deadline = 0;
  else if (/(ertaga|завтра|tomorrow)/.test(text)) deadline = 1;
  else if (/(bir hafta|hafta ichida|неделю|недели|a week|this week)/.test(text)) deadline = 7;
  else if (/(bir oy|oy ichida|месяц|a month)/.test(text)) deadline = 30;

  // numbers (amounts, cash) for the highlight
  for (const m of text.matchAll(/\d+(?:[.,]\d+)?(?:\s*(?:kg|кг|litr|литр\w*|l|л|mln|млн|million|ming|ta|dona))?/g)) {
    spans.push({ at: m.index, len: m[0].length, kind: "num" });
  }
  return { items: items.map(({ product_id, quantity }) => ({ product_id, quantity })), cash_som: cash, deadline_days: deadline, spans };
}

// Ask the AI (Gemini or Claude) through our server function; null if it fails or takes too long
async function parseWithAI(sentence, products) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PARSE_TIMEOUT_MS);
  try {
    const res = await fetch(AI_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
      body: JSON.stringify({
        mode: "parse",
        text: sentence,
        products: products.map((p) => ({ id: p.product_id, name: `${p.name_uz} / ${p.name_en}`, unit: p.unit })),
      }),
    });
    if (!res.ok) return null;
    const out = await res.json();
    // the AI decided the message is not about buying for a business (e.g. "When was Michael Jackson born?")
    if (out.in_scope === false) return { engine: out.engine ?? "ai", offTopic: true };
    // Trust nothing: keep only known products and positive numbers
    const known = new Set(products.map((p) => p.product_id));
    const items = (out.items ?? [])
      .filter((it) => known.has(it.product_id))
      .map((it) => ({ product_id: it.product_id, quantity: it.quantity > 0 ? it.quantity : null }));
    if (!items.length) return null;
    return {
      engine: out.engine ?? "ai",
      order: {
        items,
        cash_som: out.cash_som > 0 ? out.cash_som : null,
        deadline_days: out.deadline_days >= 0 ? out.deadline_days : null,
      },
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const DEFAULT_QTY = 10;

// Main entry: returns the order + which engine read it + highlight spans
export async function plan(sentence, products) {
  const keywordResult = parseWithKeywords(sentence, products);
  let ai = await parseWithAI(sentence, products);
  // off-topic: no products, Mirzo politely says what BuyAI can help with (the question itself is never answered).
  // Safety net: if the AI says "off-topic" but the sentence names catalog products, it is a price question
  // ("Qaysi bozorda shakar arzon?"), so we use the keyword parser instead of refusing.
  if (ai?.offTopic && keywordResult.items.length) ai = null;
  if (ai?.offTopic) return { items: [], cash_som: null, deadline_days: null, spans: [], source: ai.engine, offTopic: true };
  const order = ai ? { ...ai.order, spans: keywordResult.spans } : keywordResult;
  const source = ai ? ai.engine : "keywords";   // "gemini" | "claude" | "keywords"
  // missing quantity -> a default, and say so
  for (const it of order.items) {
    if (!it.quantity) { it.quantity = DEFAULT_QTY; it.defaulted = true; }
  }
  return { ...order, source };
}
