-- Member area: Manage money (budget, emergency fund, debts, net worth) and Grow money (rule-based auto-trading on paper).

-- Members can correct this month's check-in.
drop policy if exists "update own checks" on public.monthly_checks;
create policy "update own checks" on public.monthly_checks for update using (member_id = auth.uid()) with check (member_id = auth.uid());

-- ---------- Manage money ----------
create table if not exists public.member_money (
  member_id uuid primary key references public.profiles (id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.member_money enable row level security;
drop policy if exists "own money" on public.member_money;
create policy "own money" on public.member_money for all using (member_id = auth.uid()) with check (member_id = auth.uid());

-- ---------- Grow money: strategies, paper account, trades ----------
-- A strategy is a set of rules the engine follows after each nightly scan. Adults only (enforced by the API and the trigger below).
create table if not exists public.strategies (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles (id) on delete cascade,
  name text not null default 'My swing strategy',
  market text not null default 'US' check (market in ('US', 'IN', 'GLOBAL')),
  mode text not null default 'invest' check (mode in ('invest', 'day')),
  min_score numeric not null default 7 check (min_score between 1 and 10),
  risk_pct numeric not null default 1 check (risk_pct > 0 and risk_pct <= 2),        -- % of equity risked per trade (entry to stop)
  max_position_pct numeric not null default 20 check (max_position_pct > 0 and max_position_pct <= 25),
  max_positions integer not null default 5 check (max_positions between 1 and 10),
  daily_loss_pct numeric not null default 3 check (daily_loss_pct > 0 and daily_loss_pct <= 10), -- pause for the day after this drawdown
  allow_short boolean not null default false,
  with_trend_only boolean not null default true,
  active boolean not null default true,
  broker text not null default 'paper' check (broker in ('paper', 'alpaca')),           -- 'alpaca' is owner-only, set by the server
  created_at timestamptz not null default now()
);
create unique index if not exists strategies_one_per_member on public.strategies (member_id);

create table if not exists public.paper_accounts (
  strategy_id uuid primary key references public.strategies (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  currency text not null default 'USD',
  starting_cash numeric not null,
  cash numeric not null,
  equity numeric not null,
  equity_history jsonb not null default '[]',   -- [{ "d": "2026-11-16", "equity": 10000 }]
  paused_until date,
  updated_at timestamptz not null default now()
);

create table if not exists public.paper_trades (
  id bigserial primary key,
  strategy_id uuid not null references public.strategies (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  market text not null,
  symbol text not null,
  side text not null check (side in ('long', 'short')),
  status text not null check (status in ('pending', 'open', 'closed', 'expired', 'cancelled')),
  qty numeric not null,
  entry numeric not null,
  stop numeric not null,
  target numeric not null,
  fill_price numeric,
  exit_price numeric,
  exit_reason text,            -- target | stop | manual | expired
  pnl numeric,
  setup_score numeric,
  reasons text[] not null default '{}',
  broker_order_id text,
  opened_on date,
  closed_on date,
  created_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists paper_trades_strategy on public.paper_trades (strategy_id, status);

alter table public.strategies enable row level security;
alter table public.paper_accounts enable row level security;
alter table public.paper_trades enable row level security;
drop policy if exists "own strategies read" on public.strategies;
drop policy if exists "own strategies write" on public.strategies;
drop policy if exists "own paper account" on public.paper_accounts;
drop policy if exists "own paper trades" on public.paper_trades;
create policy "own strategies read" on public.strategies for select using (member_id = auth.uid());
-- Members change rules through the API (service role), so the broker field can't be self-assigned.
create policy "own paper account" on public.paper_accounts for select using (member_id = auth.uid());
create policy "own paper trades" on public.paper_trades for select using (member_id = auth.uid());

-- Hard rule: no trading features for members under 18, whatever the client sends.
create or replace function public.strategies_adults_only() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select dob from profiles where id = new.member_id) > (current_date - interval '18 years') then
    raise exception 'Grow money is for members aged 18 and over';
  end if;
  return new;
end;
$$;
drop trigger if exists strategies_adults on public.strategies;
create trigger strategies_adults before insert or update on public.strategies for each row execute function public.strategies_adults_only();
