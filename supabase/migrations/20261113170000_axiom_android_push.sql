create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  installation_id uuid not null,
  token text not null unique,
  platform text not null check (platform = 'android'),
  updated_at timestamptz not null default now(),
  unique (user_id, installation_id)
);

alter table public.push_devices enable row level security;

create policy "Users can read their own Android push devices"
  on public.push_devices for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can register their own Android push devices"
  on public.push_devices for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own Android push devices"
  on public.push_devices for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their own Android push devices"
  on public.push_devices for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists push_devices_user_id_idx
  on public.push_devices (user_id);

grant select, insert, update, delete on public.push_devices to authenticated;
