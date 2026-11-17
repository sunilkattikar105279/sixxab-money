-- Market risk meter (VIX, India VIX, index volume): one row per market per day, written by the nightly ingest.
create table if not exists public.market_regime (
  market text not null check (market in ('US', 'IN')),
  as_of date not null,
  zone text not null check (zone in ('calm', 'normal', 'elevated', 'panic')),
  level numeric not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (market, as_of)
);
alter table public.market_regime enable row level security;
drop policy if exists "public market regime" on public.market_regime;
create policy "public market regime" on public.market_regime for select using (true);
