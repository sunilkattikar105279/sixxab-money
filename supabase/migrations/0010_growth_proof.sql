-- Welcome email log, sector rotation, scenario scorecard, and public metrics (investor proof page).

create table if not exists public.email_log (
  member_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  sent_at timestamptz not null default now(),
  primary key (member_id, kind)
);
alter table public.email_log enable row level security; -- service role only

create table if not exists public.sector_rotation (
  market text not null check (market in ('US', 'IN')),
  as_of date not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (market, as_of)
);
alter table public.sector_rotation enable row level security;
drop policy if exists "public sector rotation" on public.sector_rotation;
create policy "public sector rotation" on public.sector_rotation for select using (true);

create table if not exists public.setup_outcomes (
  market text not null,
  as_of date not null,
  symbol text not null,
  mode text not null,
  side text not null check (side in ('long', 'short')),
  entry numeric not null,
  stop numeric not null,
  target numeric not null,
  score numeric,
  outcome text not null default 'open' check (outcome in ('open', 'target', 'stop', 'expired')),
  exit_price numeric,
  r_multiple numeric,
  resolved_on date,
  primary key (market, as_of, symbol, mode)
);
alter table public.setup_outcomes enable row level security;
drop policy if exists "public setup outcomes" on public.setup_outcomes;
create policy "public setup outcomes" on public.setup_outcomes for select using (true);

-- Aggregate counts only: no member data leaves this function.
create or replace function public.public_metrics() returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'members', (select count(*) from profiles where status <> 'closed'),
    'members_7d', (select count(*) from profiles where created_at > now() - interval '7 days'),
    'founding_taken', (select count(*) from profiles where founding_number is not null),
    'weekly_active', (select count(distinct m) from (
        select member_id m from agent_ledger where member_id is not null and created_at > now() - interval '7 days'
        union select member_id from mood_checkins where created_at > now() - interval '7 days'
        union select member_id from monthly_checks where created_at > now() - interval '7 days') x),
    'checkins_30d', (select count(*) from monthly_checks where created_at > now() - interval '30 days') + (select count(*) from mood_checkins where created_at > now() - interval '30 days'),
    'questions_7d', (select count(*) from agent_ledger where created_at > now() - interval '7 days'),
    'briefs', (select count(*) from videos where published and 'daily-brief' = any(topics)),
    'paper_strategies', (select count(*) from strategies where active),
    'stage_counts', (select coalesce(jsonb_object_agg(stage, n), '{}'::jsonb) from (select stage, count(*) n from profiles group by stage) s)
  );
$$;
grant execute on function public.public_metrics() to anon, authenticated;
