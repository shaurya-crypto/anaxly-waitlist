-- Waitlist: email-only signups (no accounts). Tick `approved` on a row to send the access email.
create extension if not exists pg_net;

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  plan text not null default 'topper' check (plan in ('free', 'scholar', 'topper', 'mastery')),
  billing_cycle text not null default 'annual' check (billing_cycle in ('monthly', 'annual')),
  approved boolean not null default false,   -- tick in the dashboard to grant access
  access_email_sent_at timestamptz,          -- set by the send-access-email function
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- No direct table access for the public: signups go through join_waitlist() only.
alter table public.waitlist enable row level security;
revoke all on public.waitlist from anon, authenticated;

create or replace function public.join_waitlist(p_email text, p_plan text, p_billing_cycle text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.waitlist (email, plan, billing_cycle)
  values (lower(trim(p_email)), p_plan, p_billing_cycle)
  on conflict (email) do update
    set plan = excluded.plan, billing_cycle = excluded.billing_cycle, updated_at = now();
end;
$$;

revoke all on function public.join_waitlist(text, text, text) from public;
grant execute on function public.join_waitlist(text, text, text) to anon, authenticated;

-- When a row flips to approved, call the Edge Function that emails access + payment details.
-- Needs two Vault secrets: waitlist_function_url and waitlist_function_secret (see WAITLIST_SETUP.md).
create or replace function public.waitlist_on_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fn_url text;
  fn_secret text;
begin
  new.updated_at := now();
  if new.approved and not old.approved and new.access_email_sent_at is null
     and (to_jsonb(new) ->> 'payment_status') is distinct from 'paid' then
    select decrypted_secret into fn_url from vault.decrypted_secrets where name = 'waitlist_function_url';
    select decrypted_secret into fn_secret from vault.decrypted_secrets where name = 'waitlist_function_secret';
    if fn_url is null or fn_secret is null then
      raise warning 'waitlist vault secrets missing; access email not sent for %', new.email;
    else
      perform net.http_post(
        url := fn_url,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-waitlist-secret', fn_secret),
        body := jsonb_build_object('id', new.id)
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists waitlist_on_update on public.waitlist;
create trigger waitlist_on_update
  before update on public.waitlist
  for each row execute function public.waitlist_on_update();
