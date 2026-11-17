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
