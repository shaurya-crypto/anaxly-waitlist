# Waitlist setup (Supabase + Brevo)

Visitors leave an email and a plan. There are no accounts and no links to the main app.
When you tick `approved` on a row, they get an email with their payment + access details.

## 1. Create the table
Supabase → SQL Editor → run `supabase/migrations/20261123000000_waitlist.sql`.

## 2. Brevo
1. Create an account at brevo.com.
2. Senders, Domains & Dedicated IPs → add and verify your sender (e.g. `hello@anaxly.com`);
   authenticate the domain (DKIM/DMARC records) for good deliverability.
3. SMTP & API → API Keys → create a key (starts with `xkeysib-`).

## 3. Deploy the email function
```bash
supabase functions deploy send-access-email --no-verify-jwt --project-ref <project-ref>
supabase secrets set --project-ref <project-ref> \
  WAITLIST_FUNCTION_SECRET=<long-random-string> \
  BREVO_API_KEY=<brevo-api-key> \
  ACCESS_FROM_EMAIL="Anaxly <hello@anaxly.com>" \
  ACCESS_URL=<link for the "Complete payment & get access" button>
```

## 4. Connect the trigger to the function
SQL Editor (use the same random string as above):
```sql
select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/send-access-email', 'waitlist_function_url');
select vault.create_secret('<long-random-string>', 'waitlist_function_secret');
```

## Granting access
Table Editor → `waitlist` → tick `approved` on a row → the email goes out and
`access_email_sent_at` is filled in. Each row is emailed only once.
