-- Buy Smarter: database schema (PostgreSQL / Supabase)

-- ---------- reference data ----------
create table regions (
  region_id   text primary key,          -- tashkent_city, jizzakh, ...
  name_en     text not null,
  name_uz     text not null,
  sort_order  int  not null
);

create table products (
  product_id  text primary key,
  name_en     text not null,
  name_uz     text not null,
  unit        text not null,             -- kg / litre / 10 pcs
  category    text not null,
  keywords    text not null default ''   -- words the Planner matches (uz/ru/en)
);

-- ---------- official benchmark (stat.uz) ----------
create table sources (
  source_id   text primary key,
  siat_id     int  not null,
  title       text not null,
  region_id   text references regions(region_id),   -- null = national
  outlet_type text not null,
  first_month date not null,
  last_month  date not null,
  url         text not null
);

create table official_prices (
  source_id   text not null references sources(source_id),
  product_id  text not null references products(product_id),
  month       date not null,
  price_som   integer,                   -- null = not observed that month
  primary key (source_id, product_id, month)
);

create table forecasts (
  source_id   text not null references sources(source_id),
  product_id  text not null references products(product_id),
  month       date not null,
  price_som   integer not null,
  low_som     integer not null,
  high_som    integer not null,
  years_used  integer not null,
  method      text not null,
  primary key (source_id, product_id, month)
);

-- ---------- finance ----------
create table loan_rate_types (
  loan_type    text primary key,
  description  text not null,
  average_rate numeric not null,
  as_of        date not null,
  source_url   text not null
);

create table loan_rates (
  loan_type  text not null references loan_rate_types(loan_type),
  bank       text not null,
  rate_pct   numeric not null,
  as_of      date not null,
  source_url text not null,
  primary key (loan_type, bank)
);

create table business_rules (
  rule_id     text primary key,
  description text not null,
  value_text  text not null,
  value_num   numeric,
  valid_note  text not null,
  source_url  text not null
);

create table markets (
  market_id   text primary key,
  name        text not null,
  region_id   text references regions(region_id),
  district    text,
  address     text,
  market_type text not null,
  source_url  text
);

-- ---------- marketplace: sellers and their offers ----------
create table sellers (
  seller_id   uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 80),
  region_id   text not null references regions(region_id),
  market_name text check (char_length(market_name) <= 80),
  phone       text check (char_length(phone) <= 30),
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now()
);

create table offers (
  offer_id        uuid primary key default gen_random_uuid(),
  seller_id       uuid not null references sellers(seller_id) on delete cascade,
  product_id      text not null references products(product_id),
  price_som       integer not null check (price_som > 0 and price_som < 10000000),
  min_qty         numeric not null default 1 check (min_qty > 0),
  delivery_fee_som integer not null default 0 check (delivery_fee_som >= 0),
  is_demo         boolean not null default false,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '7 days'
);
create index offers_product_idx on offers(product_id);
create index offers_seller_idx on offers(seller_id);

-- ---------- views the app reads ----------

-- Latest official price per region and product (benchmark)
create view benchmark as
select s.region_id, op.product_id, op.month, op.price_som
from official_prices op
join sources s on s.source_id = op.source_id
where s.region_id is not null
  and s.outlet_type like 'dehqon bozori%'
  and op.price_som is not null
  and op.month = (select max(x.month) from official_prices x
                  where x.source_id = op.source_id and x.product_id = op.product_id and x.price_som is not null);

-- Live offers with seller info and the gap to the official regional average
create view active_offers as
select o.offer_id, o.product_id, p.name_uz, p.name_en, p.unit,
       o.price_som, o.min_qty, o.delivery_fee_som, o.is_demo, o.created_at, o.expires_at,
       se.seller_id, se.name as seller_name, se.market_name, se.phone, se.region_id,
       r.name_uz as region_uz, r.name_en as region_en,
       b.price_som as official_avg_som, b.month as official_month,
       case when b.price_som is null then null
            else round(100.0 * (o.price_som - b.price_som) / b.price_som, 1) end as vs_official_pct
from offers o
join sellers se on se.seller_id = o.seller_id
join products p on p.product_id = o.product_id
join regions r on r.region_id = se.region_id
left join benchmark b on b.region_id = se.region_id and b.product_id = o.product_id
where o.expires_at > now();

-- ---------- posting a price (the only way to write) ----------
create or replace function post_offer(
  p_seller_name text, p_phone text, p_region_id text, p_market_name text,
  p_product_id text, p_price_som integer, p_min_qty numeric default 1, p_delivery_fee_som integer default 0)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seller uuid;
  v_offer  uuid;
begin
  if p_seller_name is null or char_length(trim(p_seller_name)) < 2 then raise exception 'Seller name is required'; end if;
  if not exists (select 1 from regions where region_id = p_region_id) then raise exception 'Unknown region'; end if;
  if not exists (select 1 from products where product_id = p_product_id) then raise exception 'Unknown product'; end if;
  if p_price_som is null or p_price_som <= 0 then raise exception 'Price must be positive'; end if;

  select seller_id into v_seller from sellers
   where is_demo = false and lower(name) = lower(trim(p_seller_name))
     and coalesce(phone,'') = coalesce(trim(p_phone),'') and region_id = p_region_id
   limit 1;
  if v_seller is null then
    insert into sellers(name, region_id, market_name, phone, is_demo)
    values (trim(p_seller_name), p_region_id, nullif(trim(p_market_name),''), nullif(trim(p_phone),''), false)
    returning seller_id into v_seller;
  end if;

  -- one live offer per seller and product: replace the old one
  delete from offers where seller_id = v_seller and product_id = p_product_id;
  insert into offers(seller_id, product_id, price_som, min_qty, delivery_fee_som, is_demo)
  values (v_seller, p_product_id, p_price_som, coalesce(p_min_qty,1), coalesce(p_delivery_fee_som,0), false)
  returning offer_id into v_offer;
  return v_offer;
end $$;

-- ---------- security: everyone can read, nobody writes directly ----------
do $$
declare t text;
begin
  foreach t in array array['regions','products','sources','official_prices','forecasts','loan_rate_types',
                           'loan_rates','business_rules','markets','sellers','offers']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "public read" on %I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

alter view benchmark set (security_invoker = on);
alter view active_offers set (security_invoker = on);

revoke all on function post_offer(text,text,text,text,text,integer,numeric,integer) from public;
grant execute on function post_offer(text,text,text,text,text,integer,numeric,integer) to anon, authenticated;
