-- 011: (applied in two steps: 011a tables, 011b views)
-- REAL market prices from OLX.uz instead of demo sellers (jury feedback, 18 Nov 2026).
-- A server job (supabase/functions/scrape-olx) reads OLX's food section once a day, matches ads to our
-- 38 products, checks each price against the official stat.uz price, and stores the good ones here.
-- We store NO seller names or phones (OLX shows many sellers by phone number): only the ad title,
-- price, place and a link to the ad, where the buyer contacts the seller on OLX.
-- Demo sellers stay in the database but are no longer shown (active_offers below skips them).

create table if not exists market_listings (
  listing_id        text primary key,                 -- "olx:<ad id>"
  source            text not null default 'olx',
  product_id        text not null references products(product_id),
  title             text not null check (char_length(title) <= 200),
  price_som         integer not null check (price_som > 0),   -- per catalog unit (kg / litre / 10 eggs)
  listed_price_som  integer not null check (listed_price_som > 0),   -- exactly as written in the ad
  price_note        text not null default 'as_listed',  -- as_listed | per_piece_x10 | per_tray_30 | per_bag
  region_id         text references regions(region_id),
  city              text,
  url               text not null,
  is_business       boolean,
  negotiable        boolean,
  ad_refreshed_at   timestamptz,                       -- when the seller last renewed the ad on OLX
  scraped_at        timestamptz not null default now()
);
create index if not exists market_listings_product_idx on market_listings(product_id, region_id);
alter table market_listings enable row level security;
create policy "public read" on market_listings for select to anon, authenticated using (true);
-- no write policy: only the server job (service role) writes

-- Log of each scrape run (shown on screen as "OLX prices updated at ...")
create table if not exists scrape_runs (
  run_id      bigint generated always as identity primary key,
  source      text not null default 'olx',
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  pages_read  integer, ads_seen integer, ads_kept integer,
  note        text
);
alter table scrape_runs enable row level security;
create policy "public read" on scrape_runs for select to anon, authenticated using (true);

-- What the agents and the Bozor tab read: sellers registered in BuyAI + OLX ads from the last 3 days.
-- offer_id is text now (OLX ids are not uuids). Demo sellers are left out.
drop view if exists offer_stats;
drop view if exists active_offers;
create view active_offers with (security_invoker = on) as
select o.offer_id::text as offer_id, o.product_id, p.name_uz, p.name_en, p.unit, o.price_som, o.min_qty,
       o.delivery_fee_som, o.is_demo, o.created_at, o.expires_at,
       s.seller_id, s.name as seller_name, s.market_name, s.phone, s.region_id,
       r.name_uz as region_uz, r.name_en as region_en,
       'app'::text as source, null::text as url, null::text as price_note, null::integer as listed_price_som,
       b.price_som as official_avg_som, b.month as official_month,
       case when b.price_som is null then null
            else round(100.0 * (o.price_som - b.price_som)::numeric / b.price_som::numeric, 1) end as vs_official_pct
  from offers o
  join sellers s on s.seller_id = o.seller_id
  join products p on p.product_id = o.product_id
  join regions r on r.region_id = s.region_id
  left join benchmark b on b.region_id = s.region_id and b.product_id = o.product_id
 where o.expires_at > now() and not s.is_demo
union all
select l.listing_id, l.product_id, p.name_uz, p.name_en, p.unit, l.price_som, 1::numeric as min_qty,
       null::integer as delivery_fee_som, false as is_demo, l.scraped_at as created_at, l.scraped_at + interval '3 days' as expires_at,
       null::uuid as seller_id, l.title as seller_name, l.city as market_name, null::text as phone, l.region_id,
       r.name_uz, r.name_en,
       l.source, l.url, l.price_note, l.listed_price_som,
       b.price_som, b.month,
       case when b.price_som is null then null
            else round(100.0 * (l.price_som - b.price_som)::numeric / b.price_som::numeric, 1) end
  from market_listings l
  join products p on p.product_id = l.product_id
  join regions r on r.region_id = l.region_id
  left join benchmark b on b.region_id = l.region_id and b.product_id = l.product_id
 where l.scraped_at > now() - interval '3 days';

create view offer_stats with (security_invoker = on) as
select count(*)::integer as offers,
       count(*) filter (where source = 'olx')::integer as olx_offers,
       count(*) filter (where source = 'app')::integer as live_offers,
       0::integer as demo_offers,
       count(distinct coalesce(seller_id::text, offer_id))::integer as sellers,
       (select max(finished_at) from scrape_runs where finished_at is not null) as olx_updated_at
  from active_offers;

grant select on active_offers, offer_stats to anon, authenticated;
