-- Run in Supabase SQL Editor (Dashboard → SQL → New query)
-- Already have an `events` table? Use migrate-events-columns.sql instead.

create table if not exists public.events (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  date date not null,
  start_time text not null default '09:00',
  end_time text not null default '10:00',
  location text default '',
  address text default '',
  city text default '',
  state text default '',
  description text default '',
  type text not null default 'event',
  url text default '',
  image_url text default '',
  host_image text default '',
  club text default '',
  source text default '',
  person text default '',
  is_holiday boolean not null default false,
  favorite boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists events_user_id_date_idx on public.events (user_id, date);

alter table public.events enable row level security;

create policy "events_select_own"
  on public.events for select
  using (auth.uid() = user_id);

create policy "events_insert_own"
  on public.events for insert
  with check (auth.uid() = user_id);

create policy "events_update_own"
  on public.events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "events_delete_own"
  on public.events for delete
  using (auth.uid() = user_id);
