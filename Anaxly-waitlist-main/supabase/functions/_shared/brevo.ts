import { PLANS, formatInrFromPaise, isBillingCycle, isPlanId, type BillingCycle, type PlanId } from './plans.ts'

const readEnv = (k: string): string | undefined =>
  typeof Deno !== 'undefined' ? Deno.env.get(k) : undefined

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

export function parseSender(raw: string, fallbackName = 'Anaxly'): { name: string; email: string } {
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/)
  if (match) {
    return { name: match[1].trim() || fallbackName, email: match[2].trim() }
  }
  return { name: fallbackName, email: raw.trim() }
}

export interface SendEmailInput {
  toEmail: string
  subject: string
  html: string
  fromEmail: string
  replyTo?: string
}

export async function sendBrevoEmail({ toEmail, subject, html, fromEmail, replyTo }: SendEmailInput): Promise<void> {
  const sender = parseSender(fromEmail)
  const brevoApiKey = readEnv('BREVO_API_KEY')
  const senderApiKey = readEnv('SENDER_API_KEY')
  const resendApiKey = readEnv('RESEND_API_KEY')

  let res: Response
  if (brevoApiKey) {
    const payload: Record<string, unknown> = {
      sender,
      to: [{ email: toEmail, name: toEmail.split('@')[0] }],
      subject,
      htmlContent: html,
    }
    if (replyTo) {
      payload.replyTo = parseSender(replyTo)
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
        from: fromEmail,
        to: [toEmail],
        subject,
        html,
      }),
    })
  } else {
    throw new Error('missing email secret: BREVO_API_KEY')
  }

  if (!res.ok) {
    const errBody = await res.text()
    console.error('email dispatch failed', res.status, errBody)
    throw new Error(`email failed (${res.status})`)
  }
}

export function getWaitlistSender(): string {
  return readEnv('WAITLIST_FROM_EMAIL') || 'Anaxly <support@anaxly.in>'
}

export function getOtpSender(): string {
  return readEnv('OTP_FROM_EMAIL') || 'Anaxly <no-reply@anaxly.in>'
}

export function getReplyTo(): string {
  return readEnv('WAITLIST_REPLY_TO') || 'Anaxly Support <support@anaxly.in>'
}

export interface SubscriptionEmailParams {
  email: string
  plan: PlanId
  billingCycle: BillingCycle
  amountPaidPaise: number
  discountPaise: number
  appliedCode: string | null
  paymentId: string
  orderId: string
  referralCode: string | null
  startsAt?: string | null
  endsAt?: string | null
}

export function buildSubscriptionConfirmationHtml(p: SubscriptionEmailParams): string {
  const planInfo = PLANS[p.plan] ?? PLANS.topper
  const siteUrl = (readEnv('WAITLIST_SITE_URL') || 'https://www.anaxly.in').replace(/\/+$/, '')
  const accessUrl = readEnv('ACCESS_URL') || `${siteUrl}/pricing`
  const refLink = p.referralCode ? `${siteUrl}/?ref=${encodeURIComponent(p.referralCode)}` : ''
  const fmtDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Active now'

  return `
  <div style="font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#0F172A;background:#FFFFFF">
    <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#15803D;margin:0 0 8px">Payment Confirmed &bull; Subscription Active</p>
    <h1 style="font-size:26px;letter-spacing:-0.02em;margin:0 0 12px">Welcome to Anaxly ${esc(planInfo.name)}</h1>
    <p style="font-size:15px;line-height:1.6;color:#334155">Thank you for subscribing! Your payment has been verified and your seat for Classes 9&ndash;12 (CBSE, ICSE &amp; IB) is now active.</p>
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:18px;margin:20px 0">
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#334155">
        <tr><td style="padding:5px 0;color:#64748B">Plan</td><td style="padding:5px 0;text-align:right;font-weight:700;color:#0F172A">${esc(planInfo.name)} (${esc(p.billingCycle === 'annual' ? 'Annual' : 'Monthly')})</td></tr>
        ${p.discountPaise > 0 && p.appliedCode ? `<tr><td style="padding:5px 0;color:#64748B">Code applied (${esc(p.appliedCode)})</td><td style="padding:5px 0;text-align:right;font-weight:600;color:#15803D">&minus;${esc(formatInrFromPaise(p.discountPaise))}</td></tr>` : ''}
        <tr><td style="padding:5px 0;color:#64748B">Amount paid</td><td style="padding:5px 0;text-align:right;font-weight:800;color:#0F172A">${esc(formatInrFromPaise(p.amountPaidPaise))}</td></tr>
        <tr><td style="padding:5px 0;color:#64748B">Validity</td><td style="padding:5px 0;text-align:right;font-weight:600;color:#0F172A">${esc(fmtDate(p.startsAt))} &ndash; ${esc(fmtDate(p.endsAt))}</td></tr>
        <tr><td style="padding:5px 0;color:#64748B">Payment ID</td><td style="padding:5px 0;text-align:right;font-family:monospace;font-size:12px;color:#0F172A">${esc(p.paymentId)}</td></tr>
        <tr><td style="padding:5px 0;color:#64748B">Order ID</td><td style="padding:5px 0;text-align:right;font-family:monospace;font-size:12px;color:#0F172A">${esc(p.orderId)}</td></tr>
      </table>
    </div>
    <p style="margin:24px 0">
      <a href="${esc(accessUrl)}" style="background:#1F3852;color:#fff;text-decoration:none;font-weight:600;padding:14px 26px;border-radius:999px;display:inline-block">
        Open Anaxly Classroom
      </a>
    </p>
    ${p.referralCode ? `
    <div style="background:#F1F5F9;border-radius:10px;padding:14px 16px;margin:20px 0">
      <p style="font-size:13px;font-weight:700;color:#0F172A;margin:0 0 6px">Share &amp; give 10% off: ${esc(p.referralCode)}</p>
      <p style="font-size:12px;color:#475569;margin:0 0 8px">Friends who subscribe with your referral code get 10% off their first plan:</p>
      <a href="${esc(refLink)}" style="color:#1F3852;font-size:12px;font-weight:600;word-break:break-all;text-decoration:none">${esc(refLink)}</a>
    </div>` : ''}
    <p style="font-size:13px;color:#64748B">Questions? Reply to this email or write to <a href="mailto:support@anaxly.in" style="color:#1F3852">support@anaxly.in</a>. Use <b>${esc(p.email)}</b> when signing in.</p>
    <p style="font-size:12px;color:#94A3B8;margin-top:24px">&mdash; Team Anaxly</p>
  </div>`
}

export interface EmailClaimStore {
  claim: (email: string, claimIso: string) => Promise<boolean>
  release: (email: string, claimIso: string) => Promise<void>
}

interface WaitlistUpdateQuery {
  eq: (col: string, val: string) => WaitlistUpdateQuery
  is: (col: string, val: null) => WaitlistUpdateQuery
  select: (cols: string) => { maybeSingle: () => Promise<{ data: { email: string } | null; error: { message: string } | null }> }
  then?: PromiseLike<{ error: { message: string } | null }>['then']
}

export interface WaitlistDbLike {
  from: (table: 'waitlist') => {
    update: (values: Record<string, string | null>) => WaitlistUpdateQuery
  }
}

export function createWaitlistEmailStore(db: WaitlistDbLike): EmailClaimStore {
  return {
    async claim(email, claimIso) {
      const { data, error } = await db
        .from('waitlist')
        .update({ subscription_email_sent_at: claimIso })
        .eq('email', email)
        .eq('payment_status', 'paid')
        .is('subscription_email_sent_at', null)
        .select('email')
        .maybeSingle()
      if (error) {
        console.error('email claim failed:', error.message)
        return false
      }
      return Boolean(data)
    },
    async release(email, claimIso) {
      await db
        .from('waitlist')
        .update({ subscription_email_sent_at: null })
        .eq('email', email)
        .eq('subscription_email_sent_at', claimIso)
    },
  }
}

export async function dispatchSubscriptionEmailIfNeeded(
  store: EmailClaimStore,
  rpcResult: Record<string, unknown>,
  orderId: string,
  fallbackPaymentId = '',
): Promise<boolean> {
  if (rpcResult.subscription_email_sent_at) return true

  const email = String(rpcResult.email || '').trim().toLowerCase()
  if (!email) return false

  const claimIso = new Date().toISOString()
  const claimed = await store.claim(email, claimIso)
  if (!claimed) {
    // Another concurrent caller (verify_payment or webhook) already claimed or sent the email.
    return true
  }

  const plan = (isPlanId(rpcResult.plan) ? rpcResult.plan : 'topper') as PlanId
  const planInfo = PLANS[plan] ?? PLANS.topper
  const html = buildSubscriptionConfirmationHtml({
    email,
    plan,
    billingCycle: (isBillingCycle(rpcResult.billing_cycle) ? rpcResult.billing_cycle : 'annual') as BillingCycle,
    amountPaidPaise: Number(rpcResult.amount_paid_paise ?? 0),
    discountPaise: Number(rpcResult.discount_paise ?? 0),
    appliedCode: typeof rpcResult.applied_code === 'string' ? rpcResult.applied_code : null,
    paymentId: String(rpcResult.payment_id ?? fallbackPaymentId),
    orderId,
    referralCode: typeof rpcResult.referral_code === 'string' ? rpcResult.referral_code : null,
    startsAt: typeof rpcResult.subscription_starts_at === 'string' ? rpcResult.subscription_starts_at : null,
    endsAt: typeof rpcResult.subscription_ends_at === 'string' ? rpcResult.subscription_ends_at : null,
  })

  try {
    await sendBrevoEmail({
      toEmail: email,
      subject: `Welcome to Anaxly — Your ${planInfo.name} subscription is active`,
      html,
      fromEmail: getWaitlistSender(),
      replyTo: getReplyTo(),
    })
    return true
  } catch (err) {
    console.error('subscription confirmation email failed:', err)
    await store.release(email, claimIso).catch(() => { /* ignore release error */ })
    return false
  }
}
