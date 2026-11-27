// Supabase Edge Function: sends waitlist emails (welcome confirmation on join, and access + payment on approval) via Brevo.
// Supports BREVO_API_KEY (recommended), SENDER_API_KEY, or RESEND_API_KEY.
// Secrets: WAITLIST_FUNCTION_SECRET, BREVO_API_KEY, WAITLIST_FROM_EMAIL (or ACCESS_FROM_EMAIL), ACCESS_URL, WAITLIST_SITE_URL (optional)
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.)
import { createClient } from 'npm:@supabase/supabase-js@2'

const PLANS: Record<string, { name: string; monthly: number; annual: number }> = {
  free: { name: 'Chalkboard Free', monthly: 0, annual: 0 },
  scholar: { name: 'Scholar', monthly: 499, annual: 399 },
  topper: { name: 'Topper Pro', monthly: 1099, annual: 899 },
  mastery: { name: 'Mastery Infinity', monthly: 1999, annual: 1499 },
}

const env = (k: string) => {
  const v = Deno.env.get(k)
  if (!v) throw new Error(`missing secret ${k}`)
  return v
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

function parseSender(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/)
  if (match) {
    return { name: match[1].trim() || 'Anaxly Waitlist', email: match[2].trim() }
  }
  return { name: 'Anaxly Waitlist', email: raw.trim() }
}

async function sendEmail(toEmail: string, subject: string, html: string) {
  const rawFrom = Deno.env.get('WAITLIST_FROM_EMAIL') || env('ACCESS_FROM_EMAIL')
  const sender = parseSender(rawFrom)
  const replyToEmail = Deno.env.get('WAITLIST_REPLY_TO')

  const brevoApiKey = Deno.env.get('BREVO_API_KEY')
  const senderApiKey = Deno.env.get('SENDER_API_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')

  let res: Response
  if (brevoApiKey) {
    const payload: Record<string, unknown> = {
      sender,
      to: [{ email: toEmail, name: toEmail.split('@')[0] }],
      subject,
      htmlContent: html,
    }
    if (replyToEmail) {
      payload.replyTo = parseSender(replyToEmail)
    }
    res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } else if (senderApiKey) {
    res = await fetch('https://api.sender.net/v2/message/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${senderApiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        from: sender,
        to: { email: toEmail, name: toEmail.split('@')[0] },
        subject,
        html,
      }),
    })
  } else if (resendApiKey) {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: rawFrom,
        to: [toEmail],
        subject,
        html,
      }),
    })
  } else {
    throw new Error('missing secret: BREVO_API_KEY, SENDER_API_KEY, or RESEND_API_KEY')
  }

  if (!res.ok) {
    const errBody = await res.text()
    console.error('email dispatch failed', res.status, errBody)
    throw new Error(`email failed (${res.status})`)
  }
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

  const plan = PLANS[row.plan] ?? PLANS.topper
  const price = row.billing_cycle === 'annual' ? plan.annual : plan.monthly
  const priceLine = row.plan === 'free'
    ? 'Chalkboard Free — ₹0 forever (no payment needed).'
    : `${plan.name} — ₹${price.toLocaleString('en-IN')} / month, billed ${row.billing_cycle === 'annual' ? 'annually' : 'monthly'} (locked-in launch price).`

  if (kind === 'welcome') {
    if (row.welcome_email_sent_at) return new Response('skipped', { status: 200 })

    const siteUrl = (Deno.env.get('WAITLIST_SITE_URL') || 'https://anaxly.com').replace(/\/+$/, '')
    const refLink = row.referral_code ? `${siteUrl}/?ref=${encodeURIComponent(row.referral_code)}` : siteUrl

    const html = `
    <div style="font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0F172A;background:#FFFFFF">
      <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#B45309;margin:0 0 8px">Anaxly Early Access Waitlist</p>
      <h1 style="font-size:26px;letter-spacing:-0.02em;margin:0 0 12px">Your waitlist seat is reserved</h1>
      <p style="font-size:15px;line-height:1.6;color:#334155">Thanks for joining the Anaxly waitlist for Classes 9–12 (CBSE, ICSE &amp; IB). We have saved your spot and locked in your launch plan:</p>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px 18px;margin:18px 0">
        <p style="font-size:14px;font-weight:600;color:#0F172A;margin:0">${esc(priceLine)}</p>
      </div>
      ${row.referral_code ? `
      <p style="font-size:15px;line-height:1.6;color:#334155">Share your personal referral code <b>${esc(row.referral_code)}</b> with friends and classmates to move up faster:</p>
      <div style="background:#F1F5F9;border-radius:10px;padding:12px 14px;margin:12px 0 22px;word-break:break-all">
        <a href="${esc(refLink)}" style="color:#1F3852;font-size:13px;font-weight:600;text-decoration:none">${esc(refLink)}</a>
      </div>` : ''}
      <p style="font-size:14px;line-height:1.6;color:#475569">Seats open in batches. We will email you here (<b>${esc(row.email)}</b>) as soon as your batch opens.</p>
      <p style="font-size:12px;color:#94A3B8;margin-top:28px">— Team Anaxly</p>
    </div>`

    try {
      await sendEmail(row.email, 'You are on the Anaxly waitlist', html)
    } catch {
      return new Response('email failed', { status: 502 })
    }

    await db.from('waitlist').update({ welcome_email_sent_at: new Date().toISOString() }).eq('id', id)
    return new Response('sent', { status: 200 })
  }

  // Default: approval / access email
  if (!row.approved || row.access_email_sent_at) return new Response('skipped', { status: 200 })

  const accessUrl = env('ACCESS_URL')
  const html = `
  <div style="font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0F172A;background:#FFFFFF">
    <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#B45309;margin:0 0 8px">Anaxly Early Access Invite</p>
    <h1 style="font-size:26px;letter-spacing:-0.02em;margin:0 0 12px">Your Anaxly seat is ready</h1>
    <p style="font-size:15px;line-height:1.6;color:#334155">Great news—your spot from the waitlist is now open on the <b>${esc(plan.name)}</b> plan.</p>
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px 18px;margin:18px 0">
      <p style="font-size:14px;font-weight:600;color:#0F172A;margin:0">${esc(priceLine)}</p>
    </div>
    <p style="margin:26px 0">
      <a href="${esc(accessUrl)}" style="background:#1F3852;color:#fff;text-decoration:none;font-weight:600;padding:14px 26px;border-radius:999px;display:inline-block">
        ${row.plan === 'free' ? 'Activate free access' : 'Complete payment &amp; get access'}
      </a>
    </p>
    <p style="font-size:13px;color:#64748B">Sign up with <b>${esc(row.email)}</b> so we can match your reserved waitlist seat.</p>
    <p style="font-size:12px;color:#94A3B8;margin-top:28px">— Team Anaxly</p>
  </div>`

  try {
    await sendEmail(row.email, 'Your Anaxly access is ready', html)
  } catch {
    return new Response('email failed', { status: 502 })
  }

  await db.from('waitlist').update({ access_email_sent_at: new Date().toISOString() }).eq('id', id)
  return new Response('sent', { status: 200 })
})
