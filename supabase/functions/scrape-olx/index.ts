// Supabase Edge Function "scrape-olx": REAL market prices from OLX.uz (food section), once a day.
//
// For each of our products it reads 1-4 OLX search pages (Uzbek and Russian words) inside "Продукты питания / Напитки"
// (allowed by OLX robots.txt; ~50 page reads per run, one at a time), then:
//   1. keeps an ad only if its TITLE really names the product (include words) and is not something else
//      (exclude words: "kartoshka fri", "batat", potato machines, seeds, seedlings ...);
//   2. checks the price against the official stat.uz price of that product:
//        - within 0.4x .. 2.5x            -> price as listed (per kg / litre / 10 eggs)
//        - eggs priced per piece          -> x10   ("1 200 so'm" = 12 000 per 10)
//        - "30 ta" egg tray               -> /3
//        - "50 kg" bag, too high per kg   -> divided by the bag size
//        - anything else                  -> thrown away (wrong unit, wholesale lot, typo, not food)
//   3. stores title, price, place and a LINK to the ad. No seller names or phones are stored
//      (many OLX sellers show their phone as their name); buyers contact the seller on OLX.
// Listings not seen again in 3 days disappear from the app (view active_offers).
//
// Call: POST (no body). Runs at most once every 6 hours; earlier calls just report the last run.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const UA = "Mozilla/5.0 (compatible; BuyAI-price-check/1.0; student hackathon project)";
const BASE = "https://www.olx.uz/dom-i-sad/produkty-pitaniya-napitki/q-";
const COOLDOWN_H = 6;

// q = OLX search word; inc = title must match; exc = title must NOT match (case-insensitive)
const SKIP = "ko.chat|ko'chat|саженц|рассад|urug|семен|семечк|apparat|аппарат|kesuv|резк|machine|машин|\\b\\d+\\s*(g|gr|г|гр)\\b|qoqi|сушен|quritil|qovuril|жарен|kompot|компот|turshak|\\bchoy\\b|\\bчай\\b|to.g.ralgan|тогралган|тўғралган|artilgan|очищ";
const P: Record<string, { q: string | string[]; inc: string; exc?: string }> = {
  rice: { q: "guruch", inc: "guruch|гуруч|\\bрис\\b|\\brice", exc: "\\bun\\b|\\buni\\b|мук|bo.tqa|каш|qog.oz|бумаг|рисов[ао]" },
  potatoes: { q: "kartoshka", inc: "kartoshka|картош|картоф", exc: "\\bfri\\b|фри|batat|батат|chips|чипс|пюре" },
  onion: { q: ["piyoz", "лук"], inc: "piyoz|пиёз|\\bлук", exc: "qurutil|сушен|порей|porey|zelen|зелен" },
  carrot: { q: ["sabzi", "морковь"], inc: "sabzi|сабзи|морков", exc: "корейск|koreys" },
  cabbage: { q: "karam", inc: "karam|карам|капуст", exc: "квашен|tuzlangan|брокол|цветн" },
  tomatoes: { q: ["pomidor", "помидоры"], inc: "pomidor|помидор|томат", exc: "паст|pasta|sous|соус|tomat pasta|кетчуп" },
  cucumbers: { q: "bodring", inc: "bodring|бодринг|огур", exc: "tuzlangan|солен|маринов|konserv|консерв" },
  eggplant: { q: "baqlajon", inc: "baqlajon|бақлажон|баклажан" },
  bell_pepper: { q: "bulgor-qalampir", inc: "bulg.or|булғор|болгарск" },
  pumpkin: { q: "qovoq", inc: "qovoq|қовоқ|тыкв", exc: "pista" },
  garlic: { q: "sarimsoq", inc: "sarimsoq|саримсоқ|чеснок", exc: "чесночн" },
  beans: { q: "loviya", inc: "loviya|ловия|фасол", exc: "konserv|консерв|стручк" },
  peas: { q: "noxat", inc: "no.?xat|нўхат|нухат|\\bнут\\b", exc: "\\bun\\b|мук" },
  mash: { q: "mosh", inc: "\\bmosh\\b|\\bмош\\b|\\bмаш\\b" },
  apples: { q: "olma", inc: "\\bolma|олма|яблок", exc: "\\bsok\\b|\\bсок|chips|сушен|quritil|jem|джем|uksus|уксус" },
  pears: { q: "nok", inc: "\\bnok\\b|\\bнок\\b|груш", exc: "quritil|сушен" },
  grapes: { q: "uzum", inc: "\\buzum|узум|виноград", exc: "mayiz|изюм|\\bsok\\b|\\bсок|uksus|уксус" },
  lemons: { q: "limon", inc: "limon|лимон", exc: "limonad|лимонад|кислот|kislota|\\bsok\\b|\\bсок" },
  watermelon: { q: "tarvuz", inc: "tarvuz|тарвуз|арбуз" },
  melon: { q: "qovun", inc: "qovun|қовун|дын", exc: "quritil|сушен" },
  kishmish: { q: "mayiz", inc: "mayiz|kishmish|майиз|изюм|кишмиш" },
  eggs: { q: "tuxum", inc: "tuxum|тухум|яйц|яиц|tuhum", exc: "oqsil|albumin|альбумин|порош|inkubat|инкубац|bedana|перепел|urug.langan|оплодотвор|jo.ja|цыпл|kukun" },
  milk: { q: ["sut", "молоко"], inc: "\\bsut\\b|сут\\b|молок", exc: "kukun|порош|bodom|миндал|kokos|кокос|сгущ|quyultir|соев|smes|смес|sut tish" },
  butter: { q: ["sariyog", "сливочное-масло", "масло"], inc: "sariyog|сариёғ|сливочн", exc: "eritilgan|топлен|ghee|спред|spred|маргарин|margarin" },
  oil_sunflower: { q: ["kungaboqar-yogi", "подсолнечное-масло", "масло", "yog"], inc: "kungaboqar|кунгабоқар|подсолнеч|sunflower", exc: "семечк|pista" },
  oil_cottonseed: { q: ["paxta-yogi", "yog", "масло"], inc: "paxta.{0,3}yog|пахта ёғ|хлопков" },
  sugar: { q: "shakar", inc: "shakar|шакар|сахар", exc: "kukun|пудр|заменит|stevia|стеви|vata|вата" },
  flour_first: { q: ["un", "мука"], inc: "\\bun\\b|\\buni\\b|мука|муки", exc: "oliy|высш|premium|guruch|рисов|makkajo|кукуруз|no.xat|нут|миндал|bodom|ржан|javdar|жавдар|цельнозерн|kepak|кепак|отруб|солод" },
  flour_high: { q: ["un", "мука"], inc: "(\\bun\\b|\\buni\\b|мука|муки).*(oliy|высш)|(oliy|высш).*(\\bun\\b|\\buni\\b|мука|муки)" },
  bread: { q: "non", inc: "\\bnon\\b|\\bнон\\b|хлеб|лепёш|лепеш", exc: "tandir|тандыр|печ|pech|xamir|тесто|qotgan|черств|сухар|quruq" },
  beef: { q: "mol-goshti", inc: "mol go|мол гўшт|говяд", exc: "kolbas|колбас|sosiska|сосиск|konserv|консерв|tushonk|тушёнк" },
  mutton: { q: "qoy-goshti", inc: "qo.?y go|қўй гўшт|баран", exc: "kolbas|колбас|tirik|живой|qo.zi" },
  poultry: { q: "tovuq-goshti", inc: "tovuq|товуқ|куриц|курин|бройлер|broyler", exc: "jo.ja|цыпл|tirik|живой|tuxum|яйц|\\byem|корм|inkubat|kolbas|колбас|kordon|nagget|nugget|kotlet|котлет|shnitsel|шницел|tender|kroket|крокет|burger|бургер|file\\b|филе" },
  fish: { q: "baliq", inc: "baliq|балиқ|рыб", exc: "akvarium|аквариум|ovlash|рыболов|удочк|снаст|\\byem|корм|konserv|консерв|tilla|золот|moy|рыбий жир" },
  barley: { q: "arpa", inc: "\\barpa|арпа|ячмен" },
  wheat: { q: "bugdoy", inc: "bug.?doy|буғдой|пшениц", exc: "\\bun\\b|\\buni\\b|мука|муки|kepak|отруб" },
  corn: { q: "makkajoxori", inc: "makkajo|маккажўхори|кукуруз", exc: "palochk|палочк|\\bun\\b|мук|popcorn|попкорн|konserv|консерв|xlop|хлоп" },
  compound_feed: { q: "omuxta-yem", inc: "omuxta|омухта|комбикорм" },
};

// OLX region -> our region_id. "Ташкентская область" + city "Ташкент" = Tashkent city.
function regionOf(loc: { regionNormalizedName?: string; cityNormalizedName?: string }): string | null {
  const r = loc?.regionNormalizedName ?? "";
  if (/toshkent|tashkent/.test(r)) return loc.cityNormalizedName === "tashkent" ? "tashkent_city" : "tashkent_region";
  const map: [RegExp, string][] = [[/andiz|andij/, "andijan"], [/buhar|bukhar|buxor/, "bukhara"], [/fergan|fargon/, "fergana"],
    [/dzhiz|jizz|djiz/, "jizzakh"], [/kashka|qashqa/, "kashkadarya"], [/horezm|xorazm|khorez/, "khorezm"], [/namangan/, "namangan"],
    [/navoi|navoiy/, "navoi"], [/samarkand|samarqand/, "samarkand"], [/syrdar|sirdar/, "sirdarya"], [/surhan|surxon|surkhan/, "surkhandarya"],
    [/karakalp|qoraqalp|nukus/, "karakalpakstan"]];
  return map.find(([re]) => re.test(r))?.[1] ?? null;
}

// Turn the listed price into a price per catalog unit, or null if it does not fit the official price
function normalise(raw: number, title: string, productId: string, official: number): { price: number; note: string } | null {
  const ok = (p: number) => p >= 0.4 * official && p <= 2.5 * official;
  if (ok(raw)) return { price: raw, note: "as_listed" };
  if (productId === "eggs") {
    if (ok(raw * 10) && raw < 0.3 * official) return { price: raw * 10, note: "per_piece_x10" };
    if (/\b30\s*(ta|dona|шт)|lotok|лоток|кассет|karobka/i.test(title) && ok(raw / 3)) return { price: Math.round(raw / 3), note: "per_tray_30" };
    return null;
  }
  const bag = title.match(/(\d{1,3})\s*(kg|кг|kilo|litr|литр|l\b|л\b)/i);
  if (bag && raw > 2.5 * official) {
    const n = Number(bag[1]);
    if (n >= 2 && n <= 100 && ok(raw / n)) return { price: Math.round(raw / n), note: "per_bag" };
  }
  return null;
}

// Read one OLX search page; the ads are in the page as JSON (window.__PRERENDERED_STATE__)
async function readPage(q: string) {
  const res = await fetch(`${BASE}${encodeURIComponent(q)}/`, { headers: { "User-Agent": UA, "Accept-Language": "ru,uz;q=0.8" } });
  if (!res.ok) throw new Error(`OLX ${res.status} for ${q}`);
  const html = await res.text();
  const m = html.match(/window\.__PRERENDERED_STATE__\s*=\s*"((?:[^"\\]|\\.)*)"/);
  if (!m) throw new Error(`no data on page for ${q}`);
  const state = JSON.parse(JSON.parse(`"${m[1]}"`));
  return (state?.listing?.listing?.ads ?? []) as any[];
}

async function scrape() {
  const { data: run } = await db.from("scrape_runs").insert({ source: "olx" }).select("run_id, started_at").single();
  // official reference per product: median of the latest regional averages
  const { data: bench } = await db.from("benchmark").select("product_id, price_som");
  const official: Record<string, number> = {};
  for (const id of Object.keys(P)) {
    const ps = (bench ?? []).filter((b) => b.product_id === id && b.price_som).map((b) => Number(b.price_som)).sort((a, b) => a - b);
    if (ps.length) official[id] = ps[Math.floor(ps.length / 2)];
  }
  const incOf = Object.fromEntries(Object.entries(P).map(([id, p]) => [id, new RegExp(p.inc, "i")]));
  let pages = 0, seen = 0, kept = 0;
  const notes: string[] = [];

  const cache = new Map<string, any[]>();       // a search page shared by products ("yog", "масло") is read once
  const done: string[] = [];                    // products whose pages were all read: their old listings are replaced
  for (const [pid, p] of Object.entries(P)) {
    if (!official[pid]) continue;
    const ads: any[] = [];
    let failed = false;
    for (const q of Array.isArray(p.q) ? p.q : [p.q]) {
      if (!cache.has(q)) {
        try { cache.set(q, await readPage(q)); pages++; seen += cache.get(q)!.length; }
        catch (e) { notes.push(String(e)); failed = true; cache.set(q, []); }
        await sleep(500);   // be polite: one page at a time, with a pause
      }
      ads.push(...cache.get(q)!);
    }
    if (!failed) done.push(pid);
    const exc = new RegExp(`${SKIP}${p.exc ? "|" + p.exc : ""}`, "i");
    const rows = [];
    const ids = new Set<string>();
    for (const a of ads) {
      if (ids.has(String(a.id))) continue;
      ids.add(String(a.id));
      const title = String(a.title ?? "");
      const raw = Number(a.price?.regularPrice?.value);
      if (!raw || a.price?.regularPrice?.currencyCode !== "UZS") continue;
      if (!incOf[pid].test(title) || exc.test(title)) continue;
      // a title naming several of our products ("Piyoz, kartoshka, sabzi") has an unclear price: skip
      const others = Object.keys(P).filter((k) => k !== pid && !(pid.startsWith("flour") && k.startsWith("flour")) && incOf[k].test(title));
      if (others.length) continue;
      const region = regionOf(a.location);
      if (!region) continue;
      const n = normalise(raw, title, pid, official[pid]);
      if (!n) continue;
      rows.push({
        listing_id: `olx:${a.id}`, source: "olx", product_id: pid, title: title.slice(0, 200),
        price_som: n.price, listed_price_som: raw, price_note: n.note, region_id: region,
        city: a.location?.cityName ?? null, url: String(a.url).split("?")[0], is_business: !!a.isBusiness,
        negotiable: !!a.price?.regularPrice?.negotiable, ad_refreshed_at: a.lastRefreshTime ?? a.createdTime ?? null,
        scraped_at: new Date().toISOString(),
      });
    }
    if (rows.length) {
      const { error } = await db.from("market_listings").upsert(rows, { onConflict: "listing_id" });
      if (error) notes.push(`${pid}: ${error.message}`); else kept += rows.length;
    }
  }
  // ads that were not found again (sold, removed, or now filtered out) leave the app
  if (done.length) await db.from("market_listings").delete().in("product_id", done).lt("scraped_at", run!.started_at);
  await db.from("scrape_runs").update({ finished_at: new Date().toISOString(), pages_read: pages, ads_seen: seen, ads_kept: kept, note: notes.join("; ").slice(0, 1000) || null })
    .eq("run_id", run!.run_id);
  return { pages, seen, kept, notes };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const { data: last } = await db.from("scrape_runs").select("*").order("run_id", { ascending: false }).limit(1).maybeSingle();
  const recent = last && Date.now() - new Date(last.started_at).getTime() < COOLDOWN_H * 3600e3;
  if (recent) return json({ status: "recent", last });
  try { return json({ status: "done", ...(await scrape()) }); }
  catch (e) { return json({ status: "error", error: String(e) }, 500); }
});
