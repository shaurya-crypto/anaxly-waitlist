# Waitlist setup (Supabase + Resend)

Visitors leave an email and a plan. There are no accounts and no links to the main app.
When you tick `approved` on a row, they get an email with their payment + access details.

## 1. Create the table
Supabase → SQL Editor → run `supabase/migrations/20261123000000_waitlist.sql`, then `20261127000000_waitlist_referrals.sql` (referral codes).

## 2. Email provider (Sender.net or Resend)
1. **Sender.net (recommended for waitlist):** Create an API token in Sender.net (Settings → API access tokens) and verify your sending domain/email.
2. **Resend (fallback):** Create an account at resend.com, verify the sending domain, and create an API key.

## 3. Deploy the email function
```bash
supabase functions deploy send-access-email --no-verify-jwt --project-ref <project-ref>
supabase secrets set --project-ref <project-ref> \
  WAITLIST_FUNCTION_SECRET=<long-random-string> \
  SENDER_API_KEY=<sender-api-token> \
  ACCESS_FROM_EMAIL="Anaxly <hello@anaxly.com>" \
  ACCESS_URL=<link for the "Complete payment & get access" button>
```
*(If `SENDER_API_KEY` is set, it sends via Sender.net without affecting Supabase Auth SMTP/Brevo; otherwise it falls back to `RESEND_API_KEY`.)*

## 4. Connect the trigger to the function
SQL Editor (use the same random string as above):
```sql
select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/send-access-email', 'waitlist_function_url');
select vault.create_secret('<long-random-string>', 'waitlist_function_secret');
```

## Granting access
Table Editor → `waitlist` → tick `approved` on a row → the email goes out and
`access_email_sent_at` is filled in. Each row is emailed only once.

## Referral codes
Every row gets a `referral_code`; a signup's entered code is stored in `referred_by`.
See who referred how many people with `select * from waitlist_referral_counts order by referrals desc;`.
