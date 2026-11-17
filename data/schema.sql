-- Uzbekistan market prices database
-- Works in SQLite and PostgreSQL (Supabase): run this, then import the CSVs in the same order.

create table sources (
  source_id     text primary key,      -- e.g. tsh_city_market
  siat_id       integer not null,      -- table id on siat.stat.uz
  title         text not null,
  region        text not null,
  outlet_type   text not null,         -- bazaar / stores
  periodicity   text not null,
  unit_note     text not null,
  first_month   text not null,         -- YYYY-MM
  last_month    text not null,
  url           text not null
);

create table products (
  product_id    text primary key,      -- e.g. rice
  name_en       text not null,         -- name exactly as in stat.uz
  name_uz       text not null,
  unit          text not null,         -- kg / litre / 10 pcs
  category      text not null
);

create table prices (
  source_id     text not null references sources(source_id),
  product_id    text not null references products(product_id),
  month         date not null,         -- first day of the month
  price_som     integer,               -- average price in so'm per unit; NULL = not observed (seasonal / not surveyed)
  primary key (source_id, product_id, month)
);

create table forecasts (
  source_id     text not null references sources(source_id),
  product_id    text not null references products(product_id),
  month         date not null,
  price_som     integer not null,      -- central estimate
  low_som       integer not null,      -- lowest past seasonal change applied
  high_som      integer not null,      -- highest past seasonal change applied
  years_used    integer not null,
  method        text not null,
  primary key (source_id, product_id, month)
);

-- Region filter: the latest published price per region and product.
-- The app filters this with: where region in ('Tashkent city', 'Jizzakh region', ...)
create view latest_by_region as
select s.region, s.source_id, p.product_id, p.name_en, p.name_uz, p.unit,
       pr.month, pr.price_som
from prices pr
join sources s on s.source_id = pr.source_id
join products p on p.product_id = pr.product_id
where s.outlet_type like 'dehqon bozori%'
  and pr.month = (select max(month) from prices x where x.source_id = pr.source_id)
  and pr.price_som is not null;

-- Latest month side by side: Tashkent city bazaars vs Tashkent region vs stores (national)
create view latest_comparison as
select p.product_id, p.name_en, p.name_uz, p.unit,
       c.month,
       c.price_som as tashkent_city_bazaar,
       r.price_som as tashkent_region,
       s.price_som as stores_national
from products p
join prices c on c.product_id = p.product_id and c.source_id = 'tsh_city_market'
              and c.month = (select max(month) from prices where source_id = 'tsh_city_market')
left join prices r on r.product_id = p.product_id and r.source_id = 'tsh_region_market' and r.month = c.month
left join prices s on s.product_id = p.product_id and s.source_id = 'uz_store' and s.month = c.month;
-- Finance and directory tables (SQLite and PostgreSQL)

create table loan_rate_types (
  loan_type     text primary key,      -- working_capital / microloan / fixed_assets
  description   text not null,
  average_rate  real not null,         -- % per year, average across banks
  as_of         date not null,
  source_url    text not null
);

create table loan_rates (
  loan_type     text not null references loan_rate_types(loan_type),
  bank          text not null,
  rate_pct      real not null,         -- % per year, average of loans issued in the last 10 working days
  as_of         date not null,
  source_url    text not null,
  primary key (loan_type, bank)
);

create table business_rules (
  rule_id       text primary key,
  description   text not null,
  value_text    text not null,
  value_num     real,
  valid_note    text not null,
  source_url    text not null
);

create table markets (
  market_id     text primary key,
  name          text not null,
  district      text,                  -- empty = not confirmed in sources
  address       text,
  market_type   text not null,
  in_stat_monitoring integer not null, -- 1 = named in stat.uz min/max price reports (2021-2022)
  source_url    text not null
);
