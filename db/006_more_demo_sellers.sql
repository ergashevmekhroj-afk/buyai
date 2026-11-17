-- 006_more_demo_sellers.sql: a second, bigger wave of DEMO sellers and offers (all is_demo = true).
--
-- Why: with only 40 sellers the Price Scout compared ~20 offers. Real bazaars have hundreds of traders,
-- so this adds 350 more demo sellers in the 6 regions that have official prices (the only places where we
-- can set a believable price). Each sells 10-20 products, which gives ~5,000 extra offers.
--
-- Prices (same honest method as 004, a bit wider):
--   * normal offer = official regional average x (1 + spread), spread -12%..+12%
--                    (triangular: most offers close to the average), rounded to 50 so'm
--   * ~2% of offers are 25-35% ABOVE the official average (the Market Analyst must flag them)
--   * ~1% are 22-28% BELOW it ("very cheap, check quality" flag)
-- Phones stay empty: we never invent contact details. Every row shows the Demo badge on screen.
--
-- "Random" numbers come from md5(text). Seller names/markets are the same on every run; offer prices are seeded
-- by the seller's id, which is new on each run, so a re-run gives a fresh but equally realistic price set.
-- Safe to re-run: these sellers carry a fixed created_at stamp (2026-11-18 00:00 Tashkent), and only rows
-- with that stamp are deleted first. Real sellers (is_demo = false) and the 40 sellers from 004 are never touched.

create or replace function pg_temp.rnd(seed text) returns double precision
language sql immutable as
$$ select ('x' || lpad(substr(md5(seed), 1, 8), 16, '0'))::bit(64)::bigint / 4294967296.0 $$;

delete from offers  where is_demo and seller_id in (select seller_id from sellers where is_demo and created_at = '2026-11-18 00:00+05');
delete from sellers where is_demo and created_at = '2026-11-18 00:00+05';

-- ---------- 1. sellers: name = word + kind, e.g. "Barakali ulgurji", "Zarafshon oziq-ovqat" ----------
with plan(region_id, n_sellers, markets) as (values
  ('tashkent_city',   100, null::text[]),                       -- real bazaar names from `markets`
  ('tashkent_region',  60, array['Toshkent viloyati dehqon bozori (demo)','Chirchiq dehqon bozori (demo)','Angren bozori (demo)']),
  ('jizzakh',          50, array['Jizzax markaziy dehqon bozori','Jizzax ulgurji bozori (demo)']),
  ('navoi',            40, array['Navoiy Saxovat bozori','Navoiy markaziy bozori (demo)']),
  ('fergana',          60, array['Farg''ona dehqon bozori (demo)','Qo''qon bozori (demo)','Marg''ilon bozori (demo)']),
  ('karakalpakstan',   40, array['Nukus dehqon bozori','Nukus ulgurji bozori (demo)'])
),
words as (select array[
  'Baraka','Oltin','Barakali','Sahovat','Nur','Dehqon','Yangi','Mehnat','Saodat','Hamroh','Obod','Sifat','Rizq',
  'Do''stlik','Shirin','Navbahor','Bog''bon','Tong','Zarafshon','Karvon','Farovon','Mo''l','Qadriyat','Ishonch',
  'Toza','Yulduz','Bunyod','Orzu','Chorva','Guliston','Bahor','Kamalak','Omad','Sharq','Vatan','Hosildor','Ziyo',
  'Durdona','Mustahkam','Asl','Ozod','Diyor','Samo','Iqbol','Mehr','Umid','Zafar','Bo''ston','Charos','Lazzat'] as w),
kinds as (select array['savdo','ulgurji','oziq-ovqat','bozor','market','trade','mahsulotlari','do''koni'] as k),
city_bazaars as (select array_agg(name order by market_id) as list from markets where region_id = 'tashkent_city' and market_type like 'bazaar%'),
slots as (select p.region_id, p.markets, i from plan p cross join generate_series(1, p.n_sellers) as i)
insert into sellers (name, region_id, market_name, phone, is_demo, created_at)
select w.w[1 + floor(pg_temp.rnd(s.region_id || s.i || 'w') * array_length(w.w, 1))::int] || ' ' ||
       k.k[1 + floor(pg_temp.rnd(s.region_id || s.i || 'k') * array_length(k.k, 1))::int],
       s.region_id,
       coalesce(s.markets[1 + (s.i - 1) % array_length(s.markets, 1)], c.list[1 + (s.i - 1) % array_length(c.list, 1)]),
       null, true, '2026-11-18 00:00+05'
from slots s, words w, kinds k, city_bazaars c;

-- ---------- 2. offers ----------
-- Staples for a choyxona / canteen get a head start, so most sellers carry rice, oil, flour, onion, meat...
insert into offers (seller_id, product_id, price_som, min_qty, delivery_fee_som, is_demo, expires_at)
select seller_id, product_id,
       (round(official * factor / 50) * 50)::int,
       min_qty, delivery_fee, true, '2026-12-31'
from (
  select se.seller_id, b.product_id, b.price_som as official,
         case
           when pg_temp.rnd(se.seller_id || b.product_id || 'odd') < 0.02 then 1.25 + pg_temp.rnd(se.seller_id || b.product_id || 'hi') * 0.10   -- overpriced
           when pg_temp.rnd(se.seller_id || b.product_id || 'odd') < 0.03 then 0.72 + pg_temp.rnd(se.seller_id || b.product_id || 'lo') * 0.06   -- suspiciously cheap
           else 1 + (pg_temp.rnd(se.seller_id || b.product_id || 'a') + pg_temp.rnd(se.seller_id || b.product_id || 'b') - 1) * 0.12              -- -12%..+12%
         end as factor,
         row_number() over (
           partition by se.seller_id
           order by pg_temp.rnd(se.seller_id || b.product_id)
                    - case when b.product_id in ('rice','oil_sunflower') then 0.6
                           when b.product_id in ('oil_cottonseed','flour_first','onion','carrot','beef','mutton','sugar','potatoes','eggs') then 0.3
                           else 0 end) as rank_in_seller,
         10 + floor(pg_temp.rnd(se.seller_id || 'n') * 11)::int as n_products,          -- 10..20
         case p.category                                                                     -- minimum order
           when 'meat_fish'  then (array[5,10,20])[1 + floor(pg_temp.rnd(se.seller_id || b.product_id || 'q') * 3)::int]
           when 'dairy_eggs' then (array[5,10,20])[1 + floor(pg_temp.rnd(se.seller_id || b.product_id || 'q') * 3)::int]
           when 'fruit'      then (array[10,20,30])[1 + floor(pg_temp.rnd(se.seller_id || b.product_id || 'q') * 3)::int]
           else                   (array[10,20,25,50,100])[1 + floor(pg_temp.rnd(se.seller_id || b.product_id || 'q') * 5)::int]
         end as min_qty,
         (array[0,0,15000,20000,30000,40000,50000,60000,80000])[1 + floor(pg_temp.rnd(se.seller_id || 'fee') * 9)::int] as delivery_fee
  from sellers se
  join benchmark b on b.region_id = se.region_id      -- only products with an official price in that region
  join products p on p.product_id = b.product_id
  where se.is_demo and se.created_at = '2026-11-18 00:00+05'
) x
where rank_in_seller <= n_products;
