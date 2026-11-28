// Supabase Edge Function: sends waitlist welcome & approval emails from support@anaxly.in via Brevo.
// Triggered by Postgres triggers (waitlist_on_insert / waitlist_on_update) with x-waitlist-secret.
// Skips rows whose payment_status is already 'paid' so paid users never receive duplicate/contradictory emails.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { esc, getReplyTo, getWaitlistSender, sendBrevoEmail } from '../_shared/brevo.ts'
import { PLANS, isPlanId } from '../_shared/plans.ts'

const env = (k: string) => {
  const v = Deno.env.get(k)
  if (!v) throw new Error(`missing secret ${k}`)
  return v
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })
  if (req.headers.get('x-waitlist-secret') !== env('WAITLIST_FUNCTION_SECRET')) {
    return new Response('unauthorized', { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const id = body?.id
  const kind: 'welcome' | 'access' = body?.type === 'welcome' ? 'welcome' : 'access'
  if (typeof id !== 'string') return new Response('bad request', { status: 400 })

  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
  const { data: row, error } = await db.from('waitlist').select('*').eq('id', id).single()
  if (error || !row) return new Response('not found', { status: 404 })

  if (row.payment_status === 'paid') {
    return new Response('skipped: already paid', { status: 200 })
  }

  const plan = isPlanId(row.plan) ? PLANS[row.plan] : PLANS.topper
  const price = row.billing_cycle === 'annual' ? plan.annual : plan.monthly
  const priceLine = row.plan === 'free'
    ? 'Chalkboard Free — ₹0 forever (no payment needed).'
    : `${plan.name} — ₹${price.toLocaleString('en-IN')} / month, billed ${row.billing_cycle === 'annual' ? 'annually' : 'monthly'} (locked-in launch price).`

  const fromEmail = getWaitlistSender()
  const replyTo = getReplyTo()

  if (kind === 'welcome') {
    if (row.welcome_email_sent_at) return new Response('skipped', { status: 200 })

    const siteUrl = (Deno.env.get('WAITLIST_SITE_URL') || 'https://www.anaxly.in').replace(/\/+$/, '')
    const refLink = row.referral_code ? `${siteUrl}/?ref=${encodeURIComponent(row.referral_code)}` : siteUrl

    const html = `
    <div style="font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0F172A;background:#FFFFFF">
      <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#B45309;margin:0 0 8px">Anaxly Early Access Waitlist</p>
      <h1 style="font-size:26px;letter-spacing:-0.02em;margin:0 0 12px">Your waitlist seat is reserved</h1>
      <p style="font-size:15px;line-height:1.6;color:#334155">Thanks for joining the Anaxly waitlist for Classes 9&ndash;12 (CBSE, ICSE &amp; IB). We have saved your spot and locked in your launch plan:</p>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px 18px;margin:18px 0">
        <p style="font-size:14px;font-weight:600;color:#0F172A;margin:0">${esc(priceLine)}</p>
      </div>
      ${row.referral_code ? `
      <p style="font-size:15px;line-height:1.6;color:#334155">Share your personal referral code <b>${esc(row.referral_code)}</b> with friends and classmates (they get 10% off at checkout):</p>
      <div style="background:#F1F5F9;border-radius:10px;padding:12px 14px;margin:12px 0 22px;word-break:break-all">
        <a href="${esc(refLink)}" style="color:#1F3852;font-size:13px;font-weight:600;text-decoration:none">${esc(refLink)}</a>
      </div>` : ''}
      <p style="font-size:14px;line-height:1.6;color:#475569">Seats open in batches. We will email you here (<b>${esc(row.email)}</b>) as soon as your batch opens.</p>
      <p style="font-size:12px;color:#94A3B8;margin-top:28px">&mdash; Team Anaxly</p>
    </div>`

    try {
      await sendBrevoEmail({ toEmail: row.email, subject: 'You are on the Anaxly waitlist', html, fromEmail, replyTo })
    } catch {
      return new Response('email failed', { status: 502 })
    }

    await db.from('waitlist').update({ welcome_email_sent_at: new Date().toISOString() }).eq('id', id)
    return new Response('sent', { status: 200 })
  }

  // Default: approval / access email for unpaid waitlist rows
  if (!row.approved || row.access_email_sent_at) return new Response('skipped', { status: 200 })

  const accessUrl = env('ACCESS_URL')
  const html = `
  <div style="font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0F172A;background:#FFFFFF">
    <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#B45309;margin:0 0 8px">Anaxly Early Access Invite</p>
    <h1 style="font-size:26px;letter-spacing:-0.02em;margin:0 0 12px">Your Anaxly seat is ready</h1>
    <p style="font-size:15px;line-height:1.6;color:#334155">Great news&mdash;your spot from the waitlist is now open on the <b>${esc(plan.name)}</b> plan.</p>
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px 18px;margin:18px 0">
      <p style="font-size:14px;font-weight:600;color:#0F172A;margin:0">${esc(priceLine)}</p>
    </div>
    <p style="margin:26px 0">
      <a href="${esc(accessUrl)}" style="background:#1F3852;color:#fff;text-decoration:none;font-weight:600;padding:14px 26px;border-radius:999px;display:inline-block">
        ${row.plan === 'free' ? 'Activate free access' : 'Complete payment &amp; get access'}
      </a>
    </p>
    <p style="font-size:13px;color:#64748B">Use <b>${esc(row.email)}</b> so we can match your reserved waitlist seat.</p>
    <p style="font-size:12px;color:#94A3B8;margin-top:28px">&mdash; Team Anaxly</p>
  </div>`

  try {
    await sendBrevoEmail({ toEmail: row.email, subject: 'Your Anaxly access is ready', html, fromEmail, replyTo })
  } catch {
    return new Response('email failed', { status: 502 })
  }

  await db.from('waitlist').update({ access_email_sent_at: new Date().toISOString() }).eq('id', id)
  return new Response('sent', { status: 200 })
})
