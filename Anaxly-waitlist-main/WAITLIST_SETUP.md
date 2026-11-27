# Waitlist setup (Supabase + Brevo)

Visitors leave an email and a plan. There are no accounts and no links to the main app.
- On join (`INSERT`), the visitor receives a **Waitlist Seat Reserved** confirmation email with their referral link.
- When you tick `approved` on a row (`UPDATE`), they receive an **Access Ready** email with their payment + access link.

## 1. Create the table & triggers
Supabase → SQL Editor (or GitHub Actions `deploy-supabase.yml`) runs:
- `supabase/migrations/20261123000000_waitlist.sql`
- `supabase/migrations/20261127000000_waitlist_referrals.sql`

## 2. Brevo (separate sender email & content from your main/test app)
1. In **Brevo → Senders, Domains & IPs → Senders**, verify the **new/dedicated sender email** you want for the waitlist (e.g., `waitlist@anaxly.com`), separate from your main app's Auth SMTP sender.
2. In **Brevo → Settings → SMTP & API → API Keys**, create/copy a Brevo API key (`xkeysib-...`).

## 3. Deploy the email function & set secrets
```bash
supabase functions deploy send-access-email --no-verify-jwt --project-ref <project-ref>
supabase secrets set --project-ref <project-ref> \
  WAITLIST_FUNCTION_SECRET=<long-random-string> \
  BREVO_API_KEY=<brevo-api-key> \
  WAITLIST_FROM_EMAIL="Anaxly Waitlist <waitlist@anaxly.com>" \
  WAITLIST_SITE_URL="https://<your-waitlist-domain>" \
  ACCESS_URL="https://<your-main-app-domain>/pricing"
```
*(Your main app's Supabase Auth SMTP stays completely untouched.)*

## 4. Connect the triggers to the function
SQL Editor (use the exact same `WAITLIST_FUNCTION_SECRET` as above):
```sql
select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/send-access-email', 'waitlist_function_url');
select vault.create_secret('<long-random-string>', 'waitlist_function_secret');
```

## Granting access
Table Editor → `waitlist` → tick `approved` on a row → the approval email goes out and
`access_email_sent_at` is filled in. Each row is emailed only once per stage (`welcome_email_sent_at` and `access_email_sent_at`).

## Referral codes
Every row gets a `referral_code`; a signup's entered code is stored in `referred_by`.
See who referred how many people with `select * from waitlist_referral_counts order by referrals desc;`.
