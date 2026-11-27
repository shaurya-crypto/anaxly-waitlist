-- Referral codes: every waitlist row gets its own shareable code, and a signup can enter
-- someone else's code (stored in referred_by). Unknown codes are rejected so the visitor can fix typos.

alter table public.waitlist
  add column if not exists referral_code text not null unique
    default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

alter table public.waitlist
  add column if not exists referred_by text references public.waitlist (referral_code) on update cascade;

create index if not exists waitlist_referred_by_idx on public.waitlist (referred_by);

-- Replace the 3-argument signup function with one that accepts an optional referral code
-- and returns the visitor's own code.
drop function if exists public.join_waitlist(text, text, text);

create or replace function public.join_waitlist(
  p_email text,
  p_plan text,
  p_billing_cycle text,
  p_referral_code text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(p_email));
  v_ref text := nullif(upper(trim(coalesce(p_referral_code, ''))), '');
  v_code text;
begin
  if v_ref is not null then
    if not exists (select 1 from public.waitlist where referral_code = v_ref) then
      raise exception 'invalid_referral_code' using errcode = 'P0001';
    end if;
    -- Your own code doesn't count as a referral.
    if exists (select 1 from public.waitlist where referral_code = v_ref and email = v_email) then
      v_ref := null;
    end if;
  end if;

  insert into public.waitlist (email, plan, billing_cycle, referred_by)
  values (v_email, p_plan, p_billing_cycle, v_ref)
  on conflict (email) do update
    set plan = excluded.plan,
        billing_cycle = excluded.billing_cycle,
        referred_by = coalesce(public.waitlist.referred_by, excluded.referred_by), -- first referrer wins
        updated_at = now()
  returning referral_code into v_code;

  return v_code;
end;
$$;

revoke all on function public.join_waitlist(text, text, text, text) from public;
grant execute on function public.join_waitlist(text, text, text, text) to anon, authenticated;

-- Handy view for the team: how many signups each code brought in.
create or replace view public.waitlist_referral_counts
with (security_invoker = true) as
select w.email, w.referral_code, count(r.id) as referrals
from public.waitlist w
left join public.waitlist r on r.referred_by = w.referral_code
group by w.id;

revoke all on public.waitlist_referral_counts from anon, authenticated;
