-- Video library shown across the portal (reels, long-form). The daily posting job can insert today's brief here.
create table public.videos (
  id text primary key,
  url text not null,
  title text not null,
  date date not null,
  topics text[] not null default '{}',
  stages smallint[] not null default '{}',
  account text not null,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.videos enable row level security;
create policy "public videos" on public.videos for select using (published);
