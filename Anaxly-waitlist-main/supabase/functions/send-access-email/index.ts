// Supabase Edge Function: emails an approved waitlist member their access + payment details via Resend.
// Called by the waitlist_on_update trigger. Deploy with: supabase functions deploy send-access-email --no-verify-jwt
// Secrets: WAITLIST_FUNCTION_SECRET, RESEND_API_KEY, ACCESS_FROM_EMAIL, ACCESS_URL
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

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })
  if (req.headers.get('x-waitlist-secret') !== env('WAITLIST_FUNCTION_SECRET')) {
    return new Response('unauthorized', { status: 401 })
  }

  const { id } = await req.json().catch(() => ({}))
  if (typeof id !== 'string') return new Response('bad request', { status: 400 })

  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
  const { data: row, error } = await db.from('waitlist').select('*').eq('id', id).single()
  if (error || !row) return new Response('not found', { status: 404 })
  if (!row.approved || row.access_email_sent_at) return new Response('skipped', { status: 200 })

  const plan = PLANS[row.plan] ?? PLANS.topper
  const price = row.billing_cycle === 'annual' ? plan.annual : plan.monthly
  const priceLine = row.plan === 'free'
    ? 'Your plan is free. No payment needed.'
    : `₹${price.toLocaleString('en-IN')} / month, billed ${row.billing_cycle === 'annual' ? 'annually' : 'monthly'} (your locked-in launch price).`
  const accessUrl = env('ACCESS_URL')

  const html = `
  <div style="font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#0F172A">
    <h1 style="font-size:26px;letter-spacing:-0.02em;margin:0 0 12px">Your Anaxly seat is ready</h1>
    <p style="font-size:15px;line-height:1.6;color:#334155">Thanks for waiting. Your access is now open on the <b>${esc(plan.name)}</b> plan.</p>
    <p style="font-size:15px;line-height:1.6;color:#334155">${esc(priceLine)}</p>
    <p style="margin:28px 0">
      <a href="${esc(accessUrl)}" style="background:#1F3852;color:#fff;text-decoration:none;font-weight:600;padding:14px 26px;border-radius:999px;display:inline-block">
        ${row.plan === 'free' ? 'Get access' : 'Complete payment &amp; get access'}
      </a>
    </p>
    <p style="font-size:13px;color:#64748B">Sign up with this email (${esc(row.email)}) so we can match your seat.</p>
  </div>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env('ACCESS_FROM_EMAIL'),
      to: [row.email],
      subject: 'Your Anaxly access is ready',
      html,
    }),
  })
  if (!res.ok) {
    console.error('resend failed', res.status, await res.text())
    return new Response('email failed', { status: 502 })
  }

  await db.from('waitlist').update({ access_email_sent_at: new Date().toISOString() }).eq('id', id)
  return new Response('sent', { status: 200 })
})
