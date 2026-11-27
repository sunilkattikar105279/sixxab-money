-- Owner live trading: real broker orders on the owner's own accounts (Alpaca for US, Zerodha Kite for India).
-- Service role only: no member can read or write these tables. Members keep trading on paper.

create table if not exists public.live_trades (
  id bigserial primary key,
  broker text not null check (broker in ('alpaca', 'alpaca-paper', 'kite', 'kite-paper')),
  market text not null check (market in ('US', 'IN')),
  symbol text not null,
  side text not null default 'long' check (side in ('long', 'short')),
  status text not null check (status in ('pending', 'open', 'closed', 'cancelled', 'expired', 'rejected')),
  qty numeric not null,
  entry numeric not null, stop numeric not null, target numeric not null,
  fill_price numeric, exit_price numeric, exit_reason text, pnl numeric,
  setup_score numeric, reasons jsonb not null default '[]',
  broker_order_id text, broker_exit_id text,          -- Alpaca bracket id, or Kite entry order id + GTT id
  created_on date not null default current_date, opened_on date, closed_on date,
  updated_at timestamptz not null default now()
);
create index if not exists live_trades_open on public.live_trades (broker, status);

create table if not exists public.live_runs (
  id bigserial primary key,
  broker text not null,
  market text not null,
  run_at timestamptz not null default now(),
  run_on date not null default current_date,
  paper boolean not null,
  equity numeric, cash numeric, peak_equity numeric, day_start_equity numeric,
  orders_placed integer not null default 0,
  broker_errors integer not null default 0,
  reconcile_mismatches integer not null default 0,
  blocked jsonb not null default '[]',               -- orders the guardrails stopped, with reasons
  log jsonb not null default '[]'
);
create index if not exists live_runs_recent on public.live_runs (broker, run_at desc);

-- Daily Kite Connect access token (expires each morning). Written by the owner-only login callback.
create table if not exists public.broker_tokens (
  broker text primary key,
  access_token text not null,
  user_id text,
  created_at timestamptz not null default now()
);

alter table public.live_trades enable row level security;
alter table public.live_runs enable row level security;
alter table public.broker_tokens enable row level security;
-- No policies: only the service role (server and scheduled jobs) can touch these tables.
