import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !key) console.warn('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing: waitlist signups disabled.')

// Anon client only: no auth sessions, no redirects.
export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

export type PlanId = 'free' | 'scholar' | 'topper' | 'mastery'
export type Cycle = 'monthly' | 'annual'

export type JoinResult =
  | { ok: true; referralCode: string | null }
  | { ok: false; reason: 'invalid_referral' | 'error' }

/** Saves (or updates) an email on the waitlist via the join_waitlist RPC and returns the visitor's own referral code. */
export async function joinWaitlist(email: string, plan: PlanId, cycle: Cycle, referralCode?: string): Promise<JoinResult> {
  const { data, error } = await supabase.rpc('join_waitlist', {
    p_email: email,
    p_plan: plan,
    p_billing_cycle: cycle,
    p_referral_code: referralCode?.trim() || null,
  })
  if (error) {
    console.warn('join_waitlist failed:', error.message)
    return { ok: false, reason: error.message.includes('invalid_referral_code') ? 'invalid_referral' : 'error' }
  }
  return { ok: true, referralCode: typeof data === 'string' ? data : null }
}

const REF_KEY = 'anaxly_ref'

/** Remembers a ?ref= code from any landing URL so it survives the pricing step. */
export function rememberReferral(code: string | null) {
  if (!code) return
  try { sessionStorage.setItem(REF_KEY, code.trim().toUpperCase()) } catch { /* storage unavailable */ }
}

export function storedReferral(): string {
  try { return sessionStorage.getItem(REF_KEY) ?? '' } catch { return '' }
}
