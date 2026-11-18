# BuyAI: hackathon project handoff

Project name **BuyAI** (renamed from "Buy Smarter" on 17 Nov 2026; logo = price-tag "y", made by `scripts/make_logo.py` into `app/img/buyai-*.svg`). Live URL still buy-smarter.vercel.app. Front end is React + Vite in `web/` (see `web/README.md`); deploy with `python3 scripts/deploy.py` (Node at ~/.local/node/bin). Old static version kept in `app/` as a backup. National AI hackathon, Tashkent, entrepreneurship track.
**Deadline: product checks on 18 Nov 2026, around 18:00 Tashkent time.** No pitch: mentors check a working product.

## What we are building

A web app for small food businesses (choyxonas, shops, canteens) that answers: where to buy cheapest, buy now or wait, and can I afford it / should I borrow.
It combines two problems from the organizers' list: #19 (real-time market price analysis for entrepreneurs) and #20 (financial advice for small business).

It is a **two-sided marketplace**:
- **Sellers** post their own prices (seller panel). This answers the judges' question "what if a new seller comes in?"
- **Buyers** type an order in one sentence, tick the regions they want, and four agents build a purchase plan.

### The four agents (our main differentiator; keep each one's job separate and visible on screen)

1. **Planner**: reads the buyer's sentence (Uzbek / Russian / English), extracts products, quantities, cash on hand, deadline; calls the others; writes the final plan.
2. **Price Scout**: finds live seller offers for each product **only in the regions the buyer ticked**; ranks by total delivered cost (price x qty + delivery fee, respecting min qty).
3. **Market Analyst**: checks each offer against the official regional average (flags offers far above/below), shows the trend and the 1-3 month outlook, gives a buy now / wait signal.
4. **Finance Advisor**: compares the plan total with cash on hand; if short, compares real bank loan rates; decides "borrow now vs wait" (expected price rise vs loan interest); notes tax regime basics.

Rule: agents compute numbers in code; an LLM (optional) only parses the sentence and writes explanations. The demo must work even if the LLM call fails (deterministic fallback parser using `products.keywords`).

### Data layers (be honest about each; label on screen)

1. **Seller offers**: posted through the seller panel via the `post_offer` database function.
2. **Demo sellers**: about 40 sellers across the regions with data, labelled "Demo" (`is_demo = true`). Prices = latest official regional average x (1 + random spread of about +/-5-10%), deterministic seed. Make 3-4 offers deliberately ~25-35% overpriced so the Market Analyst visibly flags them. Each demo seller: 8-15 products, min qty, delivery fee. Market names: Tashkent city bazaars from `markets`; other regions e.g. "Jizzax markaziy dehqon bozori", "Navoiy Saxovat bozori", "Nukus dehqon bozori", else "<Region> dehqon bozori (demo)".
3. **Official benchmark**: stat.uz monthly average market prices per region (real, verified). Used for the flag, trend and forecast, not as a buyable offer.

## Current state

### Supabase (live)
- Organization: `tmhdobczebbfkupwrehk`. Project **`buy-smarter-hackathon`**, ref **`gvffeagwuoaqbzmarqqf`**, region eu-central-1, status healthy. (Another project `sky-padel` exists in the org: unrelated, do not touch.)
- Migration `001_schema` **applied** (see `db/001_schema.sql`): tables `regions, products, sources, official_prices, forecasts, loan_rate_types, loan_rates, business_rules, markets, sellers, offers`; views `benchmark`, `active_offers`; function `post_offer(...)` (security definer, the only write path for anon); RLS on, public read only.
- **All tables are empty.** Next step is loading data.

### Data (in `data/`)
- `data/uz_market_prices.sqlite` + CSVs: the verified official data (see `data/README.md` for sources, caveats, method).
  - Tashkent city markets 2018-01..2026-10 (siat 3780), Tashkent region 2023-01..2026-10 (3781), national stores 2023-01..2026-10 (1329), Jizzakh 2025-10..2026-10 (3773), Navoi / Fergana / Karakalpakstan 2025-09..2026-09 (3775, 3782, 3784). 38 products.
  - Values were checked against stat.uz (checksums for Tashkent tables; method cross-checked for the regional PDFs).
  - `forecasts`: simple seasonal model for Tashkent city (label "estimate").
  - `loan_rates`: Central Bank per-bank rates as of 19 Oct 2026 (working capital avg 22.8%, microloans 28.3%, fixed assets 22.6%). CBU policy rate 14% (held 5 Nov 2026).
  - `business_rules`: 2026 tax rules (turnover tax 4%; 1% for sole traders/self-employed up to 1 bn; VAT+profit tax threshold 4.944 bn from 1 Jun 2026; optional 6% VAT regime for catering/trade/services).
  - `markets`: 14 Tashkent bazaars (district/address only where sourced).
- `data/raw/`: the source tables as copied; `data/scripts/build.py`, `extra.py`: rebuild the sqlite from raw.
- **Missing regions** (same format, add if time): Andijan 3771, Bukhara 3772, Kashkadarya 3774, Namangan 3776, Samarkand 3777, Surkhandarya 3778, Sirdarya 3779, Khorezm 3783. Source: `https://api.siat.stat.uz/media/uploads/sdmx/sdmx_data_<ID>.pdf` (also `.csv`, `.json`, `.xlsx`), or the page `https://siat.stat.uz/data/<ID>/?lang=en`. Regional files have 41 rows; skip bran, schroth, husk, semolina.

### Mapping sqlite -> Supabase
- `sources.source_id` -> `region_id`: tsh_city_market=tashkent_city, tsh_region_market=tashkent_region, jizzakh_market=jizzakh, navoi_market=navoi, fergana_market=fergana, karakalpakstan_market=karakalpakstan, uz_store=NULL (national stores).
- sqlite `prices` -> Supabase `official_prices` (month is a date, first of month; empty = NULL).
- `regions`: insert all 14 (tashkent_city, tashkent_region, andijan, bukhara, fergana, jizzakh, kashkadarya, khorezm, namangan, navoi, samarkand, sirdarya, surkhandarya, karakalpakstan) with Uzbek names; the UI shows which have data.
- `products.keywords`: add Uzbek Latin + Cyrillic + Russian + English words for the Planner, e.g. rice: "guruch, гуруч, рис, rice"; oil_sunflower: "kungaboqar yog'i, yog', масло подсолнечное, масло, sunflower oil".
- `markets.region_id` = tashkent_city for all current rows.

### Data update (18 Nov 2026)
- **Real (official, stat.uz SIAT):** all 14 regions now loaded. 8 regions added 18 Nov (Andijan 3771, Bukhara 3772, Kashkadarya 3774, Namangan 3776, Samarkand 3777, Surkhandarya 3778, Sirdarya 3779, Khorezm 3783), 2023-01..2026-10, via `data/scripts/add_regions.py` (raw files in `data/raw/`). Method checked: re-downloading Jizzakh gave identical numbers. Total official rows 23,116 (22,555 with a price).
- **Demo (labelled):** 590 demo sellers / ~8,700 offers in all 14 regions: 40 from `db/004`, 350 from `db/006` (6 original regions), 200 from `db/008` (8 new regions). Prices = official regional average x spread (-12..+12%), ~2% overpriced 25-35%, ~1% suspiciously cheap 22-28%.
- Price Scout skips offers 20%+ below the official price when choosing "best" (still listed and flagged). Dashboard counts come from view `offer_stats` (db/007); the app pages through results past the API's 1,000-row limit.
- **Seller accounts (18 Nov, `db/009`):** sellers sign up with phone + password (Supabase Auth; the phone becomes the internal login `998XXXXXXXXX@sotuvchi.buyai.local`, email confirmation turned OFF). Anonymous posting is gone: `save_my_shop`, `my_shop`, `post_offer(product, price, min_qty, fee)`, `delete_my_offer` only work for the logged-in seller's own shop. `sellers.phone` is the public contact, stored only if the seller ticks consent; `sellers.owner_id` is hidden from the public. Phone ownership is not verified yet (needs an SMS provider, e.g. Eskiz).
- **Product groups + budget (18 Nov):** "8 mln bor, sabzavotlar kerak" -> group expands to main products (`CATEGORIES` in `web/src/lib/agents/planner.js`); with money but no quantities the Price Scout splits the budget evenly (`fitBudget`). Generic meat words moved from beef to the meat group (`db/010`).
- Pitch line: "Markets start empty, so we loaded every official stat.uz regional price table (real) and generated clearly labelled demo sellers to stress-test the agents."

## Next steps (in order)

1. Load data into Supabase: regions, products (+keywords), sources, official_prices, forecasts, loan_rate_types, loan_rates, business_rules, markets.
2. Generate and insert demo sellers + offers (spec above). Run `get_advisors` (security) after.
3. Build the web app (single-page; Supabase JS client with the publishable key):
   - **Buyer**: region checkboxes, one-sentence order box, 4 agent cards that light up in order with short reasoning, final plan (where to buy each product, total, savings vs official average), finance verdict.
   - **Seller**: form (name, phone, region, market, product, price, unit shown, min qty, delivery fee) -> `rpc('post_offer')`. Show "your offer vs official average".
   - **Market**: price chart per product and region (official history + forecast), live offers table with Demo/Live badges.
   - Uzbek UI first; responsive for phones. Label demo data and estimates on screen.
4. Deploy to a public URL (Netlify or Vercel) and make a QR code.
5. Test end to end, including: a new seller posts a cheaper price from a phone and the buyer's plan switches to it.
6. README + one-page explainer per teammate (data, agents, finance, UI) so each can answer mentors' questions.

## How mentors score (1-10 each; average per mentor)

- Technical: T1 implementation, T2 code readiness, T3 innovation, T4 team knowledge, T5 tech stack.
- Business: B1 idea and problem relevance, B2 business model / monetization, B3 competitive advantage, B4 financial sustainability, B5 growth potential.
- Industry: S1 problem relevance, S2 depth of domain understanding, S3 practical applicability, S4 legal compliance, S5 scale of impact.

Answers we prepared: monetization = supplier commission, bank referral fee per approved loan, data subscription, premium tier for multi-branch businesses. Competitors: Bozor narxi (Tashkent city, price monitoring for government), narxtahlil.uz (regional/district price analytics), Agro M / AgroBaza / AgroZamin (farmer marketplaces), Bigmart (office supplies B2B), NEXUS (UZEX commodity exchange agents, won UZEX hackathon). None combines live seller offers + official price check + loan check. Legal: stat.uz data is CC BY 4.0 (credit it); loan info is a comparison, not advice; seller contacts need consent; Uzbek personal data law requires local storage of citizens' data, so the pilot plans local hosting. Growth roadmap: MVP -> pilot (1 bazaar, 30-50 businesses, Telegram bot for sellers) -> all regions + group buying + bank partners -> supplier marketplace + data API.

## Demo script (about 2 minutes)

1. Buyer ticks Tashkent city + Jizzakh, types: "Choyxonam uchun 200 kg guruch va 100 litr yog' kerak, qo'limda 4 mln so'm bor".
2. Agents run; Market Analyst flags an overpriced demo offer; plan + finance verdict appear.
3. A mentor posts a cheaper rice offer from their phone (seller panel).
4. Run again: the plan switches to the mentor's offer.

## Rules for this project

- Never present demo or estimated numbers as real; label them.
- Keep official data exactly as published (empty stays empty, no zero-filling).
- The team (Uzbek speakers, economics/data-science students) must understand the code: keep it simple and commented.

## Related links

- Team plan + growth roadmap doc: https://claude.ai/artifact/4MiKrLwtxAJxHmq8QTG6Tj
- Problems list PDF and the FUSION/NEXUS reference deck were shared in the original chat (not included here).
