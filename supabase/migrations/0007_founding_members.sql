-- B2C launch: first 100 founding members (free), referrals, goals, consent records.
alter table public.profiles add column if not exists founding_number integer unique;
alter table public.profiles add column if not exists referral_code text unique;
alter table public.profiles add column if not exists referred_by uuid references public.profiles (id) on delete set null;
alter table public.profiles add column if not exists goal text;
alter table public.profiles add column if not exists accepted_terms_at timestamptz;
alter table public.profiles add column if not exists email_updates boolean not null default false;

-- Founding number for the first 100 members, plus a short shareable referral code for everyone.
create or replace function public.assign_founding() returns trigger
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  perform pg_advisory_xact_lock(4242);
  select coalesce(max(founding_number), 0) into n from public.profiles;
  if n < 100 then new.founding_number := n + 1; end if;
  if new.referral_code is null then new.referral_code := substr(replace(new.id::text, '-', ''), 1, 8); end if;
  if new.referred_by = new.id then new.referred_by := null; end if;
  return new;
end;
$$;
-- Named zz_ so it fires after the guard triggers (Postgres runs BEFORE triggers in name order).
drop trigger if exists profiles_founding on public.profiles;
drop trigger if exists profiles_zz_founding on public.profiles;
create trigger profiles_zz_founding before insert on public.profiles for each row execute function public.assign_founding();

-- Backfill codes (and founding numbers, in sign-up order) for anyone who joined before this migration.
update public.profiles set referral_code = substr(replace(id::text, '-', ''), 1, 8) where referral_code is null;
with ordered as (select id, row_number() over (order by created_at) as rn from public.profiles where founding_number is null)
update public.profiles p set founding_number = o.rn from ordered o where p.id = o.id and o.rn <= 100
  and not exists (select 1 from public.profiles x where x.founding_number is not null);

-- Public counter for the home page: only totals, no personal data.
create or replace function public.founding_stats() returns table (members integer, founding_left integer)
language sql security definer set search_path = public stable as $$
  select count(*)::integer, greatest(0, 100 - count(founding_number))::integer from public.profiles;
$$;
grant execute on function public.founding_stats() to anon, authenticated;

-- Look up who referred a new member, by code, without exposing the profiles table.
create or replace function public.referrer_id(p_code text) returns uuid
language sql security definer set search_path = public stable as $$
  select id from public.profiles where referral_code = lower(p_code) limit 1;
$$;
grant execute on function public.referrer_id(text) to authenticated;

-- Security: members may edit their name, goal and email preference, but never their role, consent status,
-- date of birth or founding/referral fields. Server-side and trigger code (security definer) is unaffected.
create or replace function public.guard_profile_fields() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') and (
       new.role is distinct from old.role
    or new.status is distinct from old.status
    or new.dob is distinct from old.dob
    or new.country is distinct from old.country and old.status = 'pending_parent_consent'
    or new.founding_number is distinct from old.founding_number
    or new.referral_code is distinct from old.referral_code
    or new.referred_by is distinct from old.referred_by
    or new.accepted_terms_at is distinct from old.accepted_terms_at
  ) then
    raise exception 'this profile field can only be changed by SIXXAB Money support';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles for each row execute function public.guard_profile_fields();

-- New members cannot give themselves a staff role at sign-up either.
create or replace function public.guard_profile_insert() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.role := case when new.role = 'parent' then 'parent' else 'member' end;
    new.founding_number := null; -- assigned next by profiles_zz_founding
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_guard_insert on public.profiles;
create trigger profiles_guard_insert before insert on public.profiles for each row execute function public.guard_profile_insert();
