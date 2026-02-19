-- Run this in Supabase SQL Editor
-- Creates a simple memory table for chat assistant context.

create extension if not exists "pgcrypto";

create table if not exists public.chat_memory (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  memory_key text not null,
  memory_value jsonb not null,
  importance int not null default 1 check (importance between 1 and 10),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists chat_memory_user_key_uidx
  on public.chat_memory (user_id, memory_key);

create index if not exists chat_memory_user_id_idx
  on public.chat_memory (user_id);

create index if not exists chat_memory_updated_at_idx
  on public.chat_memory (updated_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_chat_memory_updated_at on public.chat_memory;
create trigger trg_chat_memory_updated_at
before update on public.chat_memory
for each row execute function public.touch_updated_at();

-- Optional: enable RLS for client-side usage. If you're using only service-role on server,
-- RLS does not apply there, but it's still safe to keep policies strict.
alter table public.chat_memory enable row level security;

-- Example policy: authenticated users can read/write only their rows.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'chat_memory'
      and policyname = 'chat_memory_owner_select'
  ) then
    create policy chat_memory_owner_select
      on public.chat_memory
      for select
      to authenticated
      using (auth.uid()::text = user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'chat_memory'
      and policyname = 'chat_memory_owner_modify'
  ) then
    create policy chat_memory_owner_modify
      on public.chat_memory
      for all
      to authenticated
      using (auth.uid()::text = user_id)
      with check (auth.uid()::text = user_id);
  end if;
end;
$$;

-- Upsert example:
-- insert into public.chat_memory (user_id, memory_key, memory_value, importance)
-- values ('user-123', 'preferred_language', '{"value":"ru"}'::jsonb, 7)
-- on conflict (user_id, memory_key)
-- do update set memory_value = excluded.memory_value, importance = excluded.importance;
