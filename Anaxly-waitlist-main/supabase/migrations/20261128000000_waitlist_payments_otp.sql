-- Waitlist Email OTP verification, "One code, one use" discounts/referrals, Razorpay orders, and paid subscriptions.
-- Idempotent: safe to re-run across CI deployments.

alter table public.waitlist
  add column if not exists email_verified boolean not null default false,
  add column if not exists email_verified_at timestamptz,
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists paid_at timestamptz,
  add column if not exists amount_paid_paise integer,
  add column if not exists currency text not null default 'INR',
  add column if not exists applied_code text,
  add column if not exists applied_code_type text,
  add column if not exists discount_paise integer not null default 0,
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text,
  add column if not exists subscription_email_sent_at timestamptz,
  add column if not exists subscription_starts_at timestamptz,
  add column if not exists subscription_ends_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'waitlist_payment_status_check'
      and conrelid = 'public.waitlist'::regclass
  ) then
    alter table public.waitlist
      add constraint waitlist_payment_status_check
      check (payment_status in ('unpaid', 'paid', 'refunded'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'waitlist_applied_code_type_check'
      and conrelid = 'public.waitlist'::regclass
  ) then
    alter table public.waitlist
      add constraint waitlist_applied_code_type_check
      check (applied_code_type is null or applied_code_type in ('referral', 'promo'));
  end if;
end $$;

-- Remove legacy Sender.net BEFORE triggers that pre-set *_email_sent_at and block Brevo triggers.
drop trigger if exists trg_waitlist_welcome on public.waitlist;
drop trigger if exists trg_waitlist_access on public.waitlist;

-- Re-assert trigger guards so paid subscribers never receive duplicate welcome/access emails.
create or replace function public.waitlist_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fn_url text;
  fn_secret text;
begin
  if new.welcome_email_sent_at is null and coalesce(new.payment_status, 'unpaid') <> 'paid' then
    select decrypted_secret into fn_url from vault.decrypted_secrets where name = 'waitlist_function_url';
    select decrypted_secret into fn_secret from vault.decrypted_secrets where name = 'waitlist_function_secret';
    if fn_url is null or fn_secret is null then
      raise warning 'waitlist vault secrets missing; welcome email not sent for %', new.email;
    else
      perform net.http_post(
        url := fn_url,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-waitlist-secret', fn_secret),
        body := jsonb_build_object('id', new.id, 'type', 'welcome')
      );
    end if;
  end if;
  return new;
end;
$$;

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
  if new.approved
     and not old.approved
     and new.access_email_sent_at is null
     and coalesce(new.payment_status, 'unpaid') <> 'paid' then
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

-- Require OTP-verified edge function for joins; disable unverified direct anon RPC inserts.
revoke all on function public.join_waitlist(text, text, text, text) from public, anon, authenticated;

-- 1. Email OTPs (service_role only)
create table if not exists public.waitlist_otps (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  otp_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists waitlist_otps_email_created_idx
  on public.waitlist_otps (email, created_at desc);

alter table public.waitlist_otps enable row level security;
revoke all on public.waitlist_otps from anon, authenticated;

-- 2. Promo / discount codes (service_role only)
create table if not exists public.waitlist_promo_codes (
  code text primary key check (code = upper(trim(code)) and char_length(code) between 3 and 32),
  discount_type text not null check (discount_type in ('percent', 'flat_inr')),
  discount_value integer not null check (discount_value > 0 and (discount_type <> 'percent' or discount_value <= 100)),
  is_single_use boolean not null default true,
  max_uses integer,
  uses_count integer not null default 0 check (uses_count >= 0),
  min_amount_paise integer not null default 0 check (min_amount_paise >= 0),
  applicable_plans text[],
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.waitlist_promo_codes enable row level security;
revoke all on public.waitlist_promo_codes from anon, authenticated;

-- Seed initial launch & single-use test codes only if table is currently empty.
insert into public.waitlist_promo_codes (code, discount_type, discount_value, is_single_use, max_uses, active)
select v.code, v.discount_type, v.discount_value, v.is_single_use, v.max_uses, v.active
from (
  values
    ('EARLY10', 'percent', 10, false, null::integer, true),
    ('ONEUSE20', 'percent', 20, true, 1, true)
) as v(code, discount_type, discount_value, is_single_use, max_uses, active)
where not exists (select 1 from public.waitlist_promo_codes);

-- 3. Payment orders (service_role only)
create table if not exists public.waitlist_orders (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique,
  email text not null check (email = lower(email)),
  plan text not null check (plan in ('scholar', 'topper', 'mastery')),
  billing_cycle text not null check (billing_cycle in ('monthly', 'annual')),
  base_amount_paise integer not null check (base_amount_paise >= 0),
  discount_paise integer not null default 0 check (discount_paise >= 0),
  final_amount_paise integer not null check (final_amount_paise >= 0),
  currency text not null default 'INR',
  applied_code text,
  applied_code_type text check (applied_code_type is null or applied_code_type in ('referral', 'promo')),
  status text not null default 'created' check (status in ('created', 'paid', 'failed')),
  razorpay_payment_id text,
  razorpay_signature text,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists waitlist_orders_email_idx on public.waitlist_orders (email, created_at desc);

alter table public.waitlist_orders enable row level security;
revoke all on public.waitlist_orders from anon, authenticated;

-- 4. Code redemptions: enforces strictly ONE code redemption per email ("One code, one use").
create table if not exists public.waitlist_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  code text not null,
  code_type text not null check (code_type in ('referral', 'promo')),
  order_id text not null references public.waitlist_orders (order_id) on delete cascade,
  discount_paise integer not null default 0,
  redeemed_at timestamptz not null default now()
);

alter table public.waitlist_code_redemptions enable row level security;
revoke all on public.waitlist_code_redemptions from anon, authenticated;

-- 5. Atomic idempotent payment completion + code redemption + waitlist activation.
create or replace function public.complete_waitlist_payment(
  p_order_id text,
  p_payment_id text,
  p_signature text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.waitlist_orders%rowtype;
  v_waitlist public.waitlist%rowtype;
  v_ref_exists boolean := false;
  v_promo_updated text;
  v_sub_end timestamptz;
begin
  select * into v_order
  from public.waitlist_orders
  where order_id = p_order_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'order_not_found');
  end if;

  if v_order.status = 'paid' then
    select * into v_waitlist from public.waitlist where email = v_order.email;
    return jsonb_build_object(
      'ok', true,
      'already_paid', true,
      'email', v_order.email,
      'plan', v_order.plan,
      'billing_cycle', v_order.billing_cycle,
      'amount_paid_paise', v_order.final_amount_paise,
      'discount_paise', v_order.discount_paise,
      'applied_code', v_order.applied_code,
      'applied_code_type', v_order.applied_code_type,
      'payment_id', coalesce(v_order.razorpay_payment_id, p_payment_id),
      'referral_code', v_waitlist.referral_code,
      'subscription_starts_at', v_waitlist.subscription_starts_at,
      'subscription_ends_at', v_waitlist.subscription_ends_at,
      'subscription_email_sent_at', v_waitlist.subscription_email_sent_at
    );
  end if;

  update public.waitlist_orders
  set status = 'paid',
      razorpay_payment_id = p_payment_id,
      razorpay_signature = coalesce(p_signature, razorpay_signature),
      paid_at = now(),
      updated_at = now()
  where id = v_order.id;

  if v_order.applied_code is not null then
    insert into public.waitlist_code_redemptions (email, code, code_type, order_id, discount_paise)
    values (v_order.email, v_order.applied_code, v_order.applied_code_type, v_order.order_id, v_order.discount_paise)
    on conflict (email) do nothing;

    if v_order.applied_code_type = 'promo' then
      update public.waitlist_promo_codes
      set uses_count = uses_count + 1
      where code = v_order.applied_code
        and active = true
        and (expires_at is null or expires_at > now())
        and (max_uses is null or uses_count < max_uses)
        and (not is_single_use or uses_count = 0)
      returning code into v_promo_updated;

      if v_promo_updated is null then
        update public.waitlist_orders
        set metadata = metadata || jsonb_build_object('promo_race_exhausted', true)
        where id = v_order.id;
      end if;
    elsif v_order.applied_code_type = 'referral' then
      select exists (
        select 1 from public.waitlist where referral_code = v_order.applied_code
      ) into v_ref_exists;
    end if;
  end if;

  v_sub_end := now() + (case when v_order.billing_cycle = 'annual' then interval '1 year' else interval '1 month' end);

  insert into public.waitlist (
    email,
    plan,
    billing_cycle,
    email_verified,
    email_verified_at,
    approved,
    payment_status,
    paid_at,
    amount_paid_paise,
    currency,
    applied_code,
    applied_code_type,
    discount_paise,
    referred_by,
    razorpay_order_id,
    razorpay_payment_id,
    subscription_starts_at,
    subscription_ends_at
  )
  values (
    v_order.email,
    v_order.plan,
    v_order.billing_cycle,
    true,
    now(),
    true,
    'paid',
    now(),
    v_order.final_amount_paise,
    v_order.currency,
    v_order.applied_code,
    v_order.applied_code_type,
    v_order.discount_paise,
    case when v_order.applied_code_type = 'referral' and v_ref_exists then v_order.applied_code else null end,
    v_order.order_id,
    p_payment_id,
    now(),
    v_sub_end
  )
  on conflict (email) do update
    set plan = excluded.plan,
        billing_cycle = excluded.billing_cycle,
        email_verified = true,
        email_verified_at = coalesce(public.waitlist.email_verified_at, now()),
        approved = true,
        payment_status = 'paid',
        paid_at = now(),
        amount_paid_paise = excluded.amount_paid_paise,
        currency = excluded.currency,
        applied_code = coalesce(public.waitlist.applied_code, excluded.applied_code),
        applied_code_type = coalesce(public.waitlist.applied_code_type, excluded.applied_code_type),
        discount_paise = excluded.discount_paise,
        referred_by = case
          when v_order.applied_code_type = 'referral' and v_ref_exists then v_order.applied_code
          when v_order.applied_code_type = 'promo' then null
          else public.waitlist.referred_by
        end,
        razorpay_order_id = excluded.razorpay_order_id,
        razorpay_payment_id = excluded.razorpay_payment_id,
        subscription_starts_at = now(),
        subscription_ends_at = excluded.subscription_ends_at,
        updated_at = now()
  returning * into v_waitlist;

  return jsonb_build_object(
    'ok', true,
    'already_paid', false,
    'email', v_waitlist.email,
    'plan', v_waitlist.plan,
    'billing_cycle', v_waitlist.billing_cycle,
    'amount_paid_paise', v_order.final_amount_paise,
    'discount_paise', v_order.discount_paise,
    'applied_code', v_order.applied_code,
    'applied_code_type', v_order.applied_code_type,
    'payment_id', p_payment_id,
    'referral_code', v_waitlist.referral_code,
    'subscription_starts_at', v_waitlist.subscription_starts_at,
    'subscription_ends_at', v_waitlist.subscription_ends_at,
    'subscription_email_sent_at', v_waitlist.subscription_email_sent_at
  );
end;
$$;

revoke all on function public.complete_waitlist_payment(text, text, text) from public, anon, authenticated;
grant execute on function public.complete_waitlist_payment(text, text, text) to service_role;
