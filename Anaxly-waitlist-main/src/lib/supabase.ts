import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://fdhxtsleoejoincdacyq.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkaHh0c2xlb2Vqb2luY2RhY3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyOTQ4NzUsImV4cCI6MjEwNjg3MDg3NX0.s8SARLbWj065H9_5ww3cr2kfUNlP9uySYzovRPTlguc'

const url = ((import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()) || DEFAULT_SUPABASE_URL
const key = ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()) || DEFAULT_SUPABASE_ANON_KEY

// Anon client only: no auth sessions, no redirects.
export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

export type PlanId = 'free' | 'scholar' | 'topper' | 'mastery'
export type Cycle = 'monthly' | 'annual'

export interface CodeValidationResult {
  ok: boolean
  code?: string | null
  codeType?: 'referral' | 'promo' | null
  label?: string | null
  baseAmountPaise: number
  discountPaise: number
  finalAmountPaise: number
  reason?: string
  message?: string
}

export interface PaidSubscription {
  email: string
  plan: PlanId
  billingCycle: Cycle
  amountPaidPaise: number
  discountPaise: number
  appliedCode: string | null
  paymentId: string
  orderId: string
  referralCode: string | null
  startsAt?: string | null
  endsAt?: string | null
}

async function callEdgeFn<T>(fnName: string, payload: Record<string, unknown>): Promise<T> {
  if (!url || !key) {
    throw new Error('Waitlist backend is not configured.')
  }
  const res = await fetch(`${url.replace(/\/+$/, '')}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => null)
  if (!data || typeof data !== 'object') {
    throw new Error(`Request failed (${res.status})`)
  }
  return data as T
}

export function sendEmailOtp(email: string) {
  return callEdgeFn<{ ok: boolean; expiresInSeconds?: number; retryAfter?: number; message?: string }>('waitlist-otp', {
    action: 'send',
    email,
  })
}

export function verifyEmailOtp(email: string, otp: string) {
  return callEdgeFn<{ ok: boolean; verificationToken?: string; message?: string }>('waitlist-otp', {
    action: 'verify',
    email,
    otp,
  })
}

export function validateCheckoutCode(email: string, plan: PlanId, billingCycle: Cycle, code: string) {
  return callEdgeFn<CodeValidationResult>('waitlist-checkout', {
    action: 'validate_code',
    email,
    plan,
    billingCycle,
    code,
  })
}

export function reserveVerifiedWaitlist(
  email: string,
  verificationToken: string,
  plan: PlanId,
  billingCycle: Cycle,
  code?: string,
) {
  return callEdgeFn<{ ok: boolean; referralCode?: string | null; message?: string }>('waitlist-checkout', {
    action: 'reserve_waitlist',
    email,
    verificationToken,
    plan,
    billingCycle,
    code: code?.trim() || undefined,
  })
}

export function createCheckoutOrder(
  email: string,
  verificationToken: string,
  plan: Exclude<PlanId, 'free'>,
  billingCycle: Cycle,
  code?: string,
) {
  return callEdgeFn<{
    ok: boolean
    zeroPaymentCompleted?: boolean
    emailSent?: boolean
    subscription?: PaidSubscription
    orderId?: string
    amountPaise?: number
    baseAmountPaise?: number
    discountPaise?: number
    currency?: string
    keyId?: string
    appliedCode?: string | null
    appliedCodeType?: 'referral' | 'promo' | null
    message?: string
  }>('waitlist-checkout', {
    action: 'create_order',
    email,
    verificationToken,
    plan,
    billingCycle,
    code: code?.trim() || undefined,
  })
}

export function verifyCheckoutPayment(
  email: string,
  verificationToken: string,
  payment: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
) {
  return callEdgeFn<{ ok: boolean; emailSent?: boolean; subscription?: PaidSubscription; message?: string }>(
    'waitlist-checkout',
    {
      action: 'verify_payment',
      email,
      verificationToken,
      ...payment,
    },
  )
}

export function getPublicSiteOrigin(
  loc: { hostname: string; origin: string } | undefined = typeof window !== 'undefined' ? window.location : undefined,
): string {
  const configured = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim().replace(/\/+$/, '')
  if (configured) return configured
  if (loc && loc.hostname !== 'localhost' && loc.hostname !== '127.0.0.1') {
    return loc.origin.replace(/\/+$/, '')
  }
  return 'https://www.anaxly.in'
}

const REF_KEY = 'anaxly_ref'

/** Remembers a ?ref= code from any landing URL so it survives the pricing step. */
export function rememberReferral(code: string | null) {
  if (!code) {
    try { sessionStorage.removeItem(REF_KEY) } catch { /* storage unavailable */ }
    return
  }
  try { sessionStorage.setItem(REF_KEY, code.trim().toUpperCase()) } catch { /* storage unavailable */ }
}

export function storedReferral(): string {
  if (typeof window !== 'undefined') {
    const urlRef = new URLSearchParams(window.location.search).get('ref')?.trim().toUpperCase()
    if (urlRef) {
      rememberReferral(urlRef)
      return urlRef
    }
  }
  try { return sessionStorage.getItem(REF_KEY) ?? '' } catch { return '' }
}
