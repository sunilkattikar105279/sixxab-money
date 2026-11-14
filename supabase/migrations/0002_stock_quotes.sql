-- Individual stock quotes per market, written by the daily n8n job from the licensed data vendor.
create table public.stock_quotes (
  market text not null check (market in ('US', 'IN', 'GLOBAL')),
  as_of date not null,
  symbol text not null,
  name text not null,
  sector text not null,
  price numeric,
  change_pct numeric,
  market_cap numeric,
  source text not null,
  created_at timestamptz not null default now(),
  primary key (market, as_of, symbol)
);
alter table public.stock_quotes enable row level security;
create policy "public stock quotes" on public.stock_quotes for select using (true);
