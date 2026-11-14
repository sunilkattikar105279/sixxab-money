-- Economic calendar (Fed, RBI, CPI, jobs, GDP...). Filled by an n8n job or an editor.
create table public.econ_events (
  id bigserial primary key,
  country text not null check (country in ('US', 'IN', 'GLOBAL')),
  event_date date not null,
  event text not null,
  why text not null,
  source text,
  unique (country, event_date, event)
);
alter table public.econ_events enable row level security;
create policy "public calendar" on public.econ_events for select using (true);
