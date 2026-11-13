create table if not exists public.axiom_core_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.axiom_core_state enable row level security;

create policy "Users can read their own AXIOM state"
  on public.axiom_core_state for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own AXIOM state"
  on public.axiom_core_state for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own AXIOM state"
  on public.axiom_core_state for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  subscription jsonb not null check (jsonb_typeof(subscription) = 'object'),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "Users can read their own push subscriptions"
  on public.push_subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own push subscriptions"
  on public.push_subscriptions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own push subscriptions"
  on public.push_subscriptions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their own push subscriptions"
  on public.push_subscriptions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

grant select, insert, update on public.axiom_core_state to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
