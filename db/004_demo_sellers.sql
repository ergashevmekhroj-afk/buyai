-- 004_demo_sellers.sql: demo sellers and their offers (all marked is_demo = true).
--
-- What it makes:
--   * 40 demo sellers in the 6 regions that have official prices.
--   * Each seller sells 8-15 products. Price = latest official regional average
--     x (1 + spread), spread between -10% and +10%, rounded to 50 so'm.
--   * 4 offers are deliberately 27-33% above the official average, so the
--     Market Analyst has something to flag in the demo.
--   * Phones are left empty on purpose: we never invent contact details.
--
-- "Random" numbers come from md5(seller name + product), so every run gives the
-- same result (deterministic seed). Safe to re-run: old demo rows are deleted first;
-- real sellers (is_demo = false) are never touched.

-- rnd(seed) -> number in [0, 1), always the same for the same seed
create or replace function pg_temp.rnd(seed text) returns double precision
language sql immutable as
$$ select ('x' || lpad(substr(md5(seed), 1, 8), 16, '0'))::bit(64)::bigint / 4294967296.0 $$;

delete from offers  where is_demo;
delete from sellers where is_demo;

-- ---------- 1. sellers ----------
with plan(region_id, n_sellers, market) as (values
  ('tashkent_city',   12, null),                                   -- real bazaar names from `markets`
  ('tashkent_region',  6, 'Toshkent viloyati dehqon bozori (demo)'),
  ('jizzakh',          6, 'Jizzax markaziy dehqon bozori'),
  ('navoi',            5, 'Navoiy Saxovat bozori'),
  ('fergana',          6, 'Farg''ona dehqon bozori (demo)'),
  ('karakalpakstan',   5, 'Nukus dehqon bozori')
),
names as (
  select array[
    'Baraka savdo','Oltin don','Barakali dasturxon','Sahovat ulgurji','Nur savdo',
    'Dehqon bobo','Yangi hosil','Mehnat savdo','Saodat oziq-ovqat','Hamroh ulgurji',
    'Obod bozor','Sifat savdo','Rizq-ro''z','Do''stlik savdo','Shirin taom',
    'Navbahor','Bog''bon','Tong savdo','Zarafshon savdo','Karvon savdo',
    'Farovon','Mo''l hosil','Qadriyat savdo','Ishonch','Toza mahsulot',
    'Yulduz savdo','Bunyod ulgurji','Orzu savdo','Chorvador','Guliston',
    'Bahor savdo','Kamalak','Omad savdo','Sharq ulgurji','Vatan savdo',
    'Hosildor','Ziyo savdo','Durdona','Mustahkam savdo','Asl mahsulot'] as list
),
city_bazaars as (   -- Tashkent city bazaars (not wholesale), used in turn
  select array_agg(name order by market_id) as list
  from markets where region_id = 'tashkent_city' and market_type like 'bazaar%'
),
slots as (          -- one row per seller: region + its number inside the region
  select p.region_id, p.market, i,
         row_number() over (order by r.sort_order, i) as k
  from plan p
  join regions r using (region_id)
  cross join generate_series(1, p.n_sellers) as i
)
insert into sellers (name, region_id, market_name, phone, is_demo)
select n.list[s.k],
       s.region_id,
       coalesce(s.market, c.list[1 + (s.i - 1) % array_length(c.list, 1)]),
       null,
       true
from slots s, names n, city_bazaars c;

-- ---------- 2. offers ----------
-- Staple products for a choyxona / canteen get a head start in the ranking,
-- so most sellers carry rice, oil, flour, onion, carrot, meat...
insert into offers (seller_id, product_id, price_som, min_qty, delivery_fee_som, is_demo, expires_at)
select seller_id, product_id,
       (round(official * (1 + (pg_temp.rnd(name || product_id || 'price') * 0.20 - 0.10)) / 50) * 50)::int,
       min_qty, delivery_fee, true, '2026-12-31'
from (
  select se.seller_id, se.name, b.product_id, b.price_som as official,
         row_number() over (
           partition by se.seller_id
           order by pg_temp.rnd(se.name || b.product_id)
                    - case when b.product_id in ('rice','oil_sunflower') then 0.5
                           when b.product_id in ('oil_cottonseed','flour_first','onion','carrot',
                                                 'beef','mutton','sugar','potatoes') then 0.25
                           else 0 end) as rank_in_seller,
         8 + floor(pg_temp.rnd(se.name || 'n') * 8)::int as n_products,                  -- 8..15
         case p.category                                                                 -- minimum order
           when 'meat_fish'  then (array[5,10,20])[1 + floor(pg_temp.rnd(se.name || b.product_id || 'q') * 3)::int]
           when 'dairy_eggs' then (array[5,10,20])[1 + floor(pg_temp.rnd(se.name || b.product_id || 'q') * 3)::int]
           when 'fruit'      then (array[10,20,30])[1 + floor(pg_temp.rnd(se.name || b.product_id || 'q') * 3)::int]
           else                   (array[10,20,25,50])[1 + floor(pg_temp.rnd(se.name || b.product_id || 'q') * 4)::int]
         end as min_qty,
         (array[0,0,20000,30000,40000,50000,60000])[1 + floor(pg_temp.rnd(se.name || 'fee') * 7)::int] as delivery_fee
  from sellers se
  join benchmark b on b.region_id = se.region_id     -- only products with an official price in that region
  join products p on p.product_id = b.product_id
  where se.is_demo
) x
where rank_in_seller <= n_products;

-- ---------- 3. four deliberately overpriced offers ----------
-- The first demo seller (by name) in each region gets one offer 27-33% above the official average.
with target(region_id, product_id, factor) as (values
  ('tashkent_city', 'rice',          1.30),
  ('jizzakh',       'oil_sunflower', 1.27),
  ('fergana',       'beef',          1.33),
  ('navoi',         'potatoes',      1.29)
),
pick as (
  select distinct on (t.region_id) t.*, se.seller_id
  from target t join sellers se on se.region_id = t.region_id and se.is_demo
  order by t.region_id, se.name
),
removed as (   -- drop that seller's normal offer for the product, if it had one
  delete from offers o using pick
  where o.seller_id = pick.seller_id and o.product_id = pick.product_id
)
insert into offers (seller_id, product_id, price_som, min_qty, delivery_fee_som, is_demo, expires_at)
select pick.seller_id, pick.product_id, (round(b.price_som * pick.factor / 50) * 50)::int, 10, 30000, true, '2026-12-31'
from pick join benchmark b using (region_id, product_id);
