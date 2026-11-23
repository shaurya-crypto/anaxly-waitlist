import { createClient, type Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !key) console.warn('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing: auth disabled.')

// Same Supabase project as the main Anaxly app, so accounts are shared.
export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

/** Current session; `undefined` while loading, `null` when signed out. */
export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return session
}

/** Adds the signed-in user to the waitlist table (idempotent). */
export async function joinWaitlist(session: Session, extra: { plan?: string; billing_cycle?: string } = {}) {
  const { error } = await supabase.from('waitlist').upsert(
    { user_id: session.user.id, email: session.user.email, ...extra },
    { onConflict: 'user_id' },
  )
  if (error) console.warn('waitlist upsert failed:', error.message)
  return !error
}
