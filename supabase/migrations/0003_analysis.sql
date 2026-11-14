-- Nightly analysis per stock (technicals across timeframes + 1-10 score) and screener setups per mode.
create table public.stock_analysis (
  market text not null check (market in ('US', 'IN', 'GLOBAL')),
  as_of date not null,
  symbol text not null,
  name text not null,
  sector text not null,
  composite numeric not null check (composite between 1 and 10),
  bias text not null,
  factors jsonb not null,
  tech jsonb not null,
  source text not null,
  created_at timestamptz not null default now(),
  primary key (market, as_of, symbol)
);

create table public.screener_setups (
  market text not null,
  as_of date not null,
  symbol text not null,
  mode text not null check (mode in ('invest', 'day', 'quick')),
  side text not null check (side in ('long', 'short', 'avoid')),
  entry numeric not null,
  stop numeric not null,
  target numeric not null,
  rr numeric not null,
  with_trend boolean not null,
  timeframe text not null,
  reasons text[] not null,
  score numeric not null,
  created_at timestamptz not null default now(),
  primary key (market, as_of, symbol, mode)
);

alter table public.stock_analysis enable row level security;
alter table public.screener_setups enable row level security;
-- Readable by signed-in members only (educational scenarios, not public recommendations).
create policy "members read analysis" on public.stock_analysis for select using (auth.role() = 'authenticated');
create policy "members read setups" on public.screener_setups for select using (auth.role() = 'authenticated');
