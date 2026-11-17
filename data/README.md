# Uzbekistan market prices database

One database that combines official price tables from the National Statistics Committee (stat.uz / SIAT open data). The prices are exactly as published: monthly average prices in so'm. Data was retrieved on 17 Nov 2026; the latest month is **October 2026**.

## Files

| File | What it is |
| --- | --- |
| `uz_market_prices.sqlite` | Everything in one SQLite file (tables + view) |
| `schema.sql` | Table definitions; works in SQLite and PostgreSQL / Supabase |
| `sources.csv` | The 3 source tables, with links |
| `products.csv` | 38 products: English name (as in source), Uzbek name, unit, category |
| `prices.csv` | 9,132 rows: source x product x month, price in so'm (empty = not observed) |
| `forecasts.csv` | 1-3 month price outlook for Tashkent city bazaars (see method below) |
| `latest_comparison.csv` | October 2026 side by side: Tashkent city bazaars vs Tashkent region vs stores |
| `loan_rate_types.csv` | 3 loan types with the Central Bank's average rate |
| `loan_rates.csv` | 73 rows: interest rate per bank for working-capital loans (27 banks), microloans (27) and fixed-asset loans (19) |
| `business_rules.csv` | Tax rules for small businesses in 2026 and the central bank policy rate, each with its source |
| `markets.csv` | 14 Tashkent bazaars and wholesale markets, with district and address where a source confirms them |

## Finance data (for the Finance Advisor)

- **Bank rates** come from the Central Bank's comparison of rates on loans issued in the last 10 working days, as of 19 Oct 2026 ([CBU PDF](https://cbu.uz/upload/medialibrary/8e7/w4miicn9b3vy3n6mdd1dv412ynf6m078/Foiz_stavkalar_19_10_2026.pdf)). Averages: working capital 22.8%, microloans 28.3%, fixed assets 22.6% per year. The CBU notes the final rate for each client is set individually, so show these as "typical rate", not an offer. The CBU updates this every two weeks.
- **Policy rate:** 14%, held on 5 Nov 2026.
- **Tax rules** (2026): turnover tax 4%; 1% for individual entrepreneurs and self-employed up to 1 bn so'm turnover; from 1 Jun 2026 the threshold for moving to VAT + profit tax is 12,000 BHM (4.944 bn so'm); from 1 Jun 2026 to 2030, catering, trade and services businesses can pay 6% VAT with 0% profit tax. Sources are in `business_rules.csv`. Tax rules change; check before relying on them.

## Bazaar directory

`markets.csv` lists the main Tashkent bazaars. `in_stat_monitoring = 1` marks the five that stat.uz named in its per-bazaar price reports (Oloy, Mirobod, Eski Jo'va, Farhod, Qo'yliq). District and address are filled only where a source confirms them. There are no coordinates; add them by hand from a map if the app shows a map.

## Not included, and why

- **Uzum, Yandex, OLX, Korzinka prices:** none of them publishes an open price feed, and their sites could not be read from here. Connecting accounts would not change that. Adding them is a pilot step (partnership API or a licensed data feed).
- **Per-bazaar prices today:** stat.uz stopped those reports after 2022.

## Sources

| source_id | SIAT table | Coverage | Months |
| --- | --- | --- | --- |
| `tsh_city_market` | [3780: average prices in the markets of Tashkent city](https://siat.stat.uz/data/3780/?lang=en) | Tashkent city dehqon bazaars | 2018-01 to 2026-10 |
| `tsh_region_market` | [3781: average prices in the markets of Tashkent region](https://siat.stat.uz/data/3781/?lang=en) | Tashkent region; source note says "in dekhkan markets and shops" | 2023-01 to 2026-10 |
| `uz_store` | [1329: average prices for individual goods in stores](https://siat.stat.uz/data/1329/?lang=en) | Stores, national average (not Tashkent only) | 2023-01 to 2026-10 |
| `jizzakh_market` | [3773: markets of Jizzakh region](https://siat.stat.uz/data/3773/?lang=en) | Jizzakh region dehqon bazaars | 2025-10 to 2026-10 |
| `navoi_market` | 3775: markets of Navoi region | Navoi region dehqon bazaars | 2025-09 to 2026-09 |
| `fergana_market` | 3782: markets of Fergana region | Fergana region dehqon bazaars | 2025-09 to 2026-09 |
| `karakalpakstan_market` | [3784: markets of Republic of Karakalpakstan](https://siat.stat.uz/data/3784/?lang=en) | Karakalpakstan dehqon bazaars | 2025-09 to 2026-09 |

**Regions still to add** (same stat.uz table format, IDs 3771, 3772, 3774, 3776, 3777, 3778, 3779, 3783): Andijan, Bukhara, Kashkadarya, Namangan, Samarkand, Surkhandarya, Sirdarya, Khorezm.

Regional values for the newer sources (last 13 months) were read from the stat.uz PDF exports. The same method was checked against the Tashkent city table, where all values matched the verified data. Some regional files end at September 2026, so the latest month differs by region; the `latest_by_region` view always shows each region's own latest month.

## Region filter

`latest_by_region` holds one row per region and product with that region's latest price. The app's region checkboxes become a `where region in (...)` filter, so the agents never look outside the regions the user ticked:

```sql
select region, month, price_som from latest_by_region
where product_id = 'rice' and region in ('Tashkent city', 'Jizzakh region')
order by price_som;
```

All three tables are listed on the stat.uz page [Prices and indexes](https://stat.uz/en/official-statistics/prices-and-indexes). Every value in `prices` was checked against the source page with per-product checksums (all rows match).

## Things to know

- **Units:** so'm per kg, except milk and oils (per litre) and eggs (per 10 pieces). See `products.unit`.
- **Empty prices:** the source publishes 0 when a product was not observed (mostly seasonal fruit and vegetables, and a 2023 survey gap for grains). These are stored as empty (NULL), not 0.
- **No bazaar-by-bazaar data:** stat.uz stopped publishing per-bazaar (Oloy, Chorsu, Qo'yliq...) reports after 2022, so the database compares Tashkent city vs Tashkent region vs stores. Per-bazaar prices are a pilot feature.
- **Animal feed:** bran, schroth and husk were left out; barley, wheat grain, corn and compound feed are kept.
- **Forecasts are a simple model, not official data.** For each product: October 2026 price x the median price change over the same months in 2019-2025. `low_som` / `high_som` use the smallest / largest past change. `years_used` says how many years were available. Label them "estimate" in the app.

## Load into Supabase

1. SQL editor: run `schema.sql`.
2. Table editor: import the CSVs in this order: `sources`, `products`, `prices`, `forecasts`, `loan_rate_types`, `loan_rates`, `business_rules`, `markets`.

## Queries the agents need

```sql
-- Price Scout: where is it cheaper right now?
select * from latest_comparison where product_id = 'rice';

-- Market Analyst: last 24 months in Tashkent city bazaars
select month, price_som from prices
where source_id = 'tsh_city_market' and product_id = 'oil_sunflower'
order by month desc limit 24;

-- Market Analyst: outlook for the next 3 months
select month, price_som, low_som, high_som from forecasts where product_id = 'oil_sunflower' order by month;

-- Finance Advisor: cheapest typical working-capital loan rates
select bank, rate_pct from loan_rates where loan_type = 'working_capital' order by rate_pct limit 5;

-- Finance Advisor: borrow now or wait? (expected price rise vs 1 month of interest at the average rate)
select f.product_id,
       round(100.0 * (f.price_som - p.price_som) / p.price_som, 1) as expected_rise_pct,
       round((select average_rate from loan_rate_types where loan_type = 'working_capital') / 12, 2) as one_month_interest_pct
from forecasts f
join prices p on p.product_id = f.product_id and p.source_id = 'tsh_city_market' and p.month = '2026-10-01'
where f.month = '2026-11-01';
```
