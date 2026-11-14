-- SIXXAB Money release 1 schema.
-- Design principle (from SIXXAB Command): gates are enforced in the database, not by the LLM.

create extension if not exists pgcrypto;

-- ---------- Members and families ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  dob date not null,
  country text not null check (country in ('US', 'IN')),
  stage smallint not null default 1 check (stage between 1 and 6),
  role text not null default 'member' check (role in ('member', 'parent', 'admin', 'editor')),
  status text not null default 'active' check (status in ('active', 'pending_parent_consent', 'closed')),
  created_at timestamptz not null default now()
);

-- Under-18 members start as pending until a parent links and consents (COPPA / DPDP).
create function public.set_minor_status() returns trigger language plpgsql as $$
begin
  if new.dob > (current_date - interval '11 years') then
    raise exception 'members must be at least 11 years old';
  end if;
  if new.dob > (current_date - interval '18 years') and tg_op = 'INSERT' then
    new.status := 'pending_parent_consent';
  end if;
  return new;
end $$;
create trigger profiles_minor_status before insert or update of dob on public.profiles for each row execute function public.set_minor_status();

create table public.family_links (
  parent_id uuid not null references public.profiles (id) on delete cascade,
  child_id uuid not null references public.profiles (id) on delete cascade,
  consent_at timestamptz not null default now(),
  primary key (parent_id, child_id),
  check (parent_id <> child_id)
);

create function public.activate_child() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select dob from profiles where id = new.parent_id) > (current_date - interval '18 years') then
    raise exception 'parent must be an adult';
  end if;
  update profiles set status = 'active' where id = new.child_id and status = 'pending_parent_consent';
  return new;
end $$;
create trigger family_links_activate after insert on public.family_links for each row execute function public.activate_child();

create function public.is_parent_of(child uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from family_links where parent_id = auth.uid() and child_id = child);
$$;

-- ---------- 6S journey ----------
create table public.stage_gates (
  stage smallint primary key check (stage between 1 and 5),
  net_worth_us numeric not null,
  net_worth_in numeric not null,
  habit_gate text not null
);
insert into public.stage_gates values
  (1, 100, 2000, 'Tracks money for 30 days and sets one savings goal'),
  (2, 1000, 25000, '3 months on budget and 1 month of costs saved'),
  (3, 10000, 250000, '6-month emergency fund and invests every month'),
  (4, 100000, 2500000, 'Savings rate of 20% or more for 12 months'),
  (5, 1000000, 25000000, 'Written giving plan and mentors at least one person');

create table public.monthly_checks (
  member_id uuid not null references public.profiles (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  habit_gate_met boolean not null,
  net_worth numeric not null,
  created_at timestamptz not null default now(),
  primary key (member_id, month)
);

create table public.stage_history (
  id bigserial primary key,
  member_id uuid not null references public.profiles (id) on delete cascade,
  from_stage smallint not null,
  to_stage smallint not null,
  changed_at timestamptz not null default now()
);

-- Stage gate: a member moves up exactly one stage, and only when the last 3 consecutive monthly checks met both gates.
create function public.enforce_stage_gate() returns trigger language plpgsql as $$
declare
  g record;
  ok_count int;
  span_months int;
begin
  if new.stage = old.stage then return new; end if;
  if new.stage < old.stage then
    insert into stage_history (member_id, from_stage, to_stage) values (new.id, old.stage, new.stage);
    return new; -- stepping back is always allowed (e.g. after a setback)
  end if;
  if new.stage <> old.stage + 1 then raise exception 'stage can only move up one step at a time'; end if;

  select * into g from stage_gates where stage = old.stage;
  with last3 as (
    select month, habit_gate_met, net_worth from monthly_checks where member_id = new.id order by month desc limit 3
  )
  select count(*) filter (where habit_gate_met and net_worth >= case when new.country = 'IN' then g.net_worth_in else g.net_worth_us end),
         (extract(year from max(month)) * 12 + extract(month from max(month))) - (extract(year from min(month)) * 12 + extract(month from min(month)))
    into ok_count, span_months from last3;

  if ok_count < 3 or span_months <> 2 then
    raise exception 'stage gate not met: both gates must hold for 3 consecutive months';
  end if;
  insert into stage_history (member_id, from_stage, to_stage) values (new.id, old.stage, new.stage);
  return new;
end $$;
create trigger profiles_stage_gate before update of stage on public.profiles for each row execute function public.enforce_stage_gate();

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles (id) on delete cascade,
  starts_on date not null default current_date,
  goals jsonb not null default '[]',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index plans_one_active on public.plans (member_id) where active;

-- ---------- Money emotions (sensitive: member-only, deletable, never shared with parents) ----------
create table public.mood_checkins (
  id bigserial primary key,
  member_id uuid not null references public.profiles (id) on delete cascade,
  mood smallint not null check (mood between 1 and 5),
  created_at timestamptz not null default now()
);

-- ---------- Agents: transparency ledger, handshakes, feedback ----------
create table public.agent_ledger (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.profiles (id) on delete set null,
  question text not null,
  domain text not null,
  answer text not null,
  sources jsonb not null default '[]',
  guard_flags text[] not null default '{}',
  model text not null,
  confidence text,
  emotion_tone text,
  emotion_signals text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.handshake_log (
  id bigserial primary key,
  ledger_id uuid references public.agent_ledger (id) on delete cascade,
  trace_id text not null,
  from_agent text not null,
  to_agent text not null,
  intent text not null,
  contract text not null,
  accepted boolean not null,
  reason text,
  created_at timestamptz not null default now()
);

create table public.feedback (
  id bigserial primary key,
  ledger_id uuid not null references public.agent_ledger (id) on delete cascade,
  rating text not null check (rating in ('up', 'down')),
  correction text,
  created_at timestamptz not null default now()
);

-- ---------- Governed self-learning ----------
create table public.agent_versions (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  version int not null,
  prompt text not null,
  is_live boolean not null default false,
  created_at timestamptz not null default now(),
  unique (agent, version)
);
create unique index agent_versions_one_live on public.agent_versions (agent) where is_live;

create table public.learning_proposals (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  summary text not null,
  candidate_version uuid references public.agent_versions (id),
  touches text[] not null default '{}', -- e.g. minors, advice, politics, emotion
  stage text not null default 'proposed' check (stage in ('proposed', 'evaluated', 'shadow', 'canary', 'approved', 'live', 'rolled_back', 'rejected')),
  eval_report jsonb,
  canary_report jsonb,
  approvers text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Learning gate: proposals move only along the allowed path; live needs approvers (two for sensitive areas).
create function public.enforce_learning_gate() returns trigger language plpgsql as $$
declare
  allowed text[];
begin
  if new.stage = old.stage then new.updated_at := now(); return new; end if;
  allowed := case old.stage
    when 'proposed' then array['evaluated', 'rejected']
    when 'evaluated' then array['shadow', 'rejected']
    when 'shadow' then array['canary', 'rejected']
    when 'canary' then array['approved', 'rejected', 'rolled_back']
    when 'approved' then array['live', 'rejected']
    when 'live' then array['rolled_back']
    else array[]::text[] end;
  if not (new.stage = any (allowed)) then
    raise exception 'learning gate: cannot move from % to %', old.stage, new.stage;
  end if;
  if new.stage = 'evaluated' and (new.eval_report is null or coalesce((new.eval_report ->> 'pass')::boolean, false) = false) then
    raise exception 'learning gate: evaluation must pass before shadow';
  end if;
  if new.stage in ('approved', 'live') then
    if cardinality(new.approvers) < 1 then raise exception 'learning gate: a human approver is required'; end if;
    if new.touches && array['minors', 'advice', 'politics', 'emotion'] and cardinality(new.approvers) < 2 then
      raise exception 'learning gate: sensitive changes need two approvers';
    end if;
  end if;
  if new.stage = 'live' and new.candidate_version is not null then
    update agent_versions set is_live = false where agent = new.agent and is_live;
    update agent_versions set is_live = true where id = new.candidate_version;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger learning_gate before update of stage on public.learning_proposals for each row execute function public.enforce_learning_gate();

-- ---------- Content ----------
create table public.market_snapshots (
  market text not null check (market in ('US', 'IN', 'GLOBAL')),
  as_of date not null,
  source text not null,
  indices jsonb not null,
  created_at timestamptz not null default now(),
  primary key (market, as_of)
);

create table public.briefs (
  id bigserial primary key,
  market text not null,
  text text not null,
  sources jsonb not null default '[]',
  ledger_id uuid references public.agent_ledger (id),
  created_at timestamptz not null default now()
);

create table public.policy_briefs (
  id uuid primary key default gen_random_uuid(),
  tag text not null,
  title text not null,
  facts text[] not null,
  view_a text not null,
  view_b text not null,
  money text not null,
  sources text not null,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'published')),
  reviewed_by uuid references public.profiles (id),
  published_on date
);

-- Policy briefs need an editor's review before publishing (both-sides rule).
create function public.enforce_brief_review() returns trigger language plpgsql as $$
begin
  if new.status = 'published' and new.reviewed_by is null then raise exception 'a brief needs an editor review before publishing'; end if;
  return new;
end $$;
create trigger policy_briefs_review before insert or update on public.policy_briefs for each row execute function public.enforce_brief_review();

-- ---------- Row-level security ----------
alter table public.profiles enable row level security;
alter table public.family_links enable row level security;
alter table public.monthly_checks enable row level security;
alter table public.stage_history enable row level security;
alter table public.plans enable row level security;
alter table public.mood_checkins enable row level security;
alter table public.agent_ledger enable row level security;
alter table public.handshake_log enable row level security;
alter table public.feedback enable row level security;
alter table public.agent_versions enable row level security;
alter table public.learning_proposals enable row level security;
alter table public.market_snapshots enable row level security;
alter table public.briefs enable row level security;
alter table public.policy_briefs enable row level security;
alter table public.stage_gates enable row level security;

create policy "own profile" on public.profiles for select using (id = auth.uid() or public.is_parent_of(id));
create policy "insert own profile" on public.profiles for insert with check (id = auth.uid());
create policy "update own profile" on public.profiles for update using (id = auth.uid());

create policy "see own links" on public.family_links for select using (parent_id = auth.uid() or child_id = auth.uid());
create policy "parent creates link" on public.family_links for insert with check (parent_id = auth.uid());

create policy "own or child checks" on public.monthly_checks for select using (member_id = auth.uid() or public.is_parent_of(member_id));
create policy "write own checks" on public.monthly_checks for insert with check (member_id = auth.uid() or public.is_parent_of(member_id));

create policy "own or child history" on public.stage_history for select using (member_id = auth.uid() or public.is_parent_of(member_id));
create policy "own or child plans" on public.plans for select using (member_id = auth.uid() or public.is_parent_of(member_id));
create policy "write own plans" on public.plans for all using (member_id = auth.uid()) with check (member_id = auth.uid());

-- Mood is private to the member: parents cannot read it.
create policy "own mood only" on public.mood_checkins for all using (member_id = auth.uid()) with check (member_id = auth.uid());

create policy "own ledger" on public.agent_ledger for select using (member_id = auth.uid());
create policy "own handshakes" on public.handshake_log for select using (exists (select 1 from agent_ledger l where l.id = ledger_id and l.member_id = auth.uid()));
create policy "own feedback" on public.feedback for insert with check (exists (select 1 from agent_ledger l where l.id = ledger_id and l.member_id = auth.uid()));

create policy "public market data" on public.market_snapshots for select using (true);
create policy "public briefs" on public.briefs for select using (true);
create policy "published policy briefs" on public.policy_briefs for select using (status = 'published');
create policy "public gates" on public.stage_gates for select using (true);
-- agent_versions and learning_proposals: service role and admins only (no member policy).
