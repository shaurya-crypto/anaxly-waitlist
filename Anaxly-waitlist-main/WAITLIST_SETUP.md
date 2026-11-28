# Waitlist, Email OTP, Referral/Discount & Razorpay Setup

The waitlist app (`Anaxly-waitlist-main`) handles email OTP verification, "One code, one use" referrals/discounts, Razorpay checkout, and immediate post-payment subscription confirmation emails via Supabase + Brevo.

## 1. Database Migrations
Applied automatically by `.github/workflows/deploy-supabase.yml` (or run in Supabase SQL Editor in order):
- `supabase/migrations/20261123000000_waitlist.sql`
- `supabase/migrations/20261127000000_waitlist_referrals.sql`
- `supabase/migrations/20261128000000_waitlist_payments_otp.sql`

## 2. Brevo Senders & API Key
1. In **Brevo -> Senders, Domains & IPs -> Domains / Senders**, verify `anaxly.in` and both sender addresses:
   - `no-reply@anaxly.in` (used by `waitlist-otp` for 6-digit email verification OTPs)
   - `support@anaxly.in` (used by `send-access-email`, `waitlist-checkout`, and `razorpay-webhook` for waitlist, access, and subscription confirmation emails)
2. Create/copy your Brevo API key (`xkeysib-...`).

## 3. Deploy Edge Functions & Set Secrets
```bash
for fn in send-access-email waitlist-otp waitlist-checkout razorpay-webhook; do
  supabase functions deploy "$fn" --no-verify-jwt --project-ref fdhxtsleoejoincdacyq
done

supabase secrets set --project-ref fdhxtsleoejoincdacyq \
  WAITLIST_FUNCTION_SECRET=<long-random-string> \
  BREVO_API_KEY=<brevo-api-key> \
  OTP_FROM_EMAIL="Anaxly <no-reply@anaxly.in>" \
  WAITLIST_FROM_EMAIL="Anaxly <support@anaxly.in>" \
  WAITLIST_REPLY_TO="Anaxly Support <support@anaxly.in>" \
  WAITLIST_SITE_URL="https://anaxly-waitlist.vercel.app" \
  ACCESS_URL="https://anaxly.in" \
  RAZORPAY_KEY_ID=<rzp_test_or_rzp_live_key_id> \
  RAZORPAY_KEY_SECRET=<razorpay_key_secret> \
  RAZORPAY_WEBHOOK_SECRET=<razorpay_webhook_secret>
```

### OTP endpoint returns HTTP 502 (`email_failed`)

The `waitlist-otp` function returns this status when it cannot send the verification email. The endpoint has already removed the unsent OTP, so the student can request another code after the mail configuration is fixed.

1. Open **Supabase Dashboard -> Edge Functions -> waitlist-otp -> Logs** and find `otp email send failed` or `email dispatch failed` at the time of the request. The latter includes the email provider's HTTP status and response body; network failures appear under the former.
2. In **Project Settings -> Edge Function Secrets**, confirm `BREVO_API_KEY` exists and is a current Brevo API key (not an SMTP key), and `OTP_FROM_EMAIL` exactly matches a sender/domain verified in Brevo.
3. If the log reports an unauthorized key, replace `BREVO_API_KEY`. If it reports a sender/domain rejection, verify `anaxly.in` and `no-reply@anaxly.in` in Brevo or set `OTP_FROM_EMAIL` to a verified sender.
4. Redeploy `waitlist-otp` after code changes; changing a secret takes effect without changing the frontend anon key. Retry the OTP request and confirm the Edge Function log reports a successful provider response.

The Supabase anon key sent by the browser is expected to be public. Do not put `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`, or `WAITLIST_FUNCTION_SECRET` in the frontend.

## 4. Database Vault Secrets (for `waitlist_on_insert` & `waitlist_on_update` triggers)
Run in Supabase SQL Editor (using the exact same `WAITLIST_FUNCTION_SECRET` as above):
```sql
select vault.create_secret('https://fdhxtsleoejoincdacyq.supabase.co/functions/v1/send-access-email', 'waitlist_function_url');
select vault.create_secret('<long-random-string>', 'waitlist_function_secret');
```

## 5. Razorpay Webhook
In **Razorpay Dashboard -> Account & Settings -> Webhooks -> Add New Webhook**:
- **Webhook URL**: `https://fdhxtsleoejoincdacyq.supabase.co/functions/v1/razorpay-webhook`
- **Secret**: same value as `RAZORPAY_WEBHOOK_SECRET`
- **Events**: `order.paid`, `payment.captured`

## 6. Promo / Discount Codes ("One code, one use")
Initial seeded codes (only inserted when `waitlist_promo_codes` is empty):
- `EARLY10`: 10% off (1 redemption per email)
- `ONEUSE20`: 20% off (`is_single_use = true`, `max_uses = 1` globally)

Create additional single-use promo codes in SQL Editor:
```sql
insert into public.waitlist_promo_codes (code, discount_type, discount_value, is_single_use, max_uses, active)
values ('SCHOLAR500', 'flat_inr', 500, true, 1, true);
```
