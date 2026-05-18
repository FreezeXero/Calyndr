-- Run once in Supabase → SQL Editor if saves fail with "Could not find the 'club' column…"
-- Safe to re-run: only adds columns that are missing.

alter table public.events add column if not exists address text default '';
alter table public.events add column if not exists city text default '';
alter table public.events add column if not exists state text default '';
alter table public.events add column if not exists description text default '';
alter table public.events add column if not exists type text not null default 'event';
alter table public.events add column if not exists url text default '';
alter table public.events add column if not exists image_url text default '';
alter table public.events add column if not exists host_image text default '';
alter table public.events add column if not exists club text default '';
alter table public.events add column if not exists source text default '';
alter table public.events add column if not exists person text default '';
alter table public.events add column if not exists is_holiday boolean not null default false;
alter table public.events add column if not exists favorite boolean not null default false;
alter table public.events add column if not exists created_at timestamptz default now();
alter table public.events add column if not exists updated_at timestamptz default now();

-- If created_at was bigint (Unix ms), convert to timestamptz so defaults work
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'events'
      and column_name = 'created_at' and data_type = 'bigint'
  ) then
    alter table public.events
      alter column created_at type timestamptz
      using to_timestamp(created_at / 1000.0);
    alter table public.events alter column created_at set default now();
  end if;
end $$;

-- RLS (skip if policies already exist)
alter table public.events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'events' and policyname = 'events_select_own'
  ) then
    create policy "events_select_own" on public.events for select using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'events' and policyname = 'events_insert_own'
  ) then
    create policy "events_insert_own" on public.events for insert with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'events' and policyname = 'events_update_own'
  ) then
    create policy "events_update_own" on public.events for update
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'events' and policyname = 'events_delete_own'
  ) then
    create policy "events_delete_own" on public.events for delete using (auth.uid() = user_id);
  end if;
end $$;
