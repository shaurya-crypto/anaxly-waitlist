-- Waitlist signups from the waitlist site (shares auth.users with the main Anaxly app).
create table if not exists public.waitlist (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text check (plan in ('free', 'scholar', 'topper', 'mastery')),
  billing_cycle text check (billing_cycle in ('monthly', 'annual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

drop policy if exists "waitlist_select_own" on public.waitlist;
create policy "waitlist_select_own" on public.waitlist
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "waitlist_insert_own" on public.waitlist;
create policy "waitlist_insert_own" on public.waitlist
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "waitlist_update_own" on public.waitlist;
create policy "waitlist_update_own" on public.waitlist
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.waitlist_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists waitlist_touch_updated_at on public.waitlist;
create trigger waitlist_touch_updated_at
  before update on public.waitlist
  for each row execute function public.waitlist_touch_updated_at();
