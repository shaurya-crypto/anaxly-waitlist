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

/** Saves (or updates) an email on the waitlist via the join_waitlist RPC. */
export async function joinWaitlist(email: string, plan: PlanId, cycle: Cycle) {
  const { error } = await supabase.rpc('join_waitlist', { p_email: email, p_plan: plan, p_billing_cycle: cycle })
  if (error) console.warn('join_waitlist failed:', error.message)
  return !error
}
