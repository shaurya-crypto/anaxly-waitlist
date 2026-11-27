import { useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { joinWaitlist, type Cycle, type PlanId } from '../lib/supabase'
import { PLANS } from '../lib/plans'

const isPlan = (v: string | null): v is PlanId => PLANS.some((p) => p.id === v)

export default function Join() {
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const rawPlan = params.get('plan')
  const plan: PlanId | null = isPlan(rawPlan) ? rawPlan : null
  const cycle: Cycle = params.get('cycle') === 'monthly' ? 'monthly' : 'annual'
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  if (!plan) return <Navigate to="/pricing" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setState('sending')
    setState((await joinWaitlist(email.trim(), plan!, cycle)) ? 'done' : 'error')
  }

  const chosen = PLANS.find((p) => p.id === plan)!

  return (
    <div className="auth">
      <div className="auth-card beam">
        {state === 'done' ? (
          <>
            <p className="eyebrow">You're on the list</p>
            <h1>Seat reserved: {chosen.name}</h1>
            <p className="auth-sub">
              We saved <b>{email}</b>. When your access opens, we will email you the payment and access details.
            </p>
            <Link to="/pricing" className="btn btn-ghost md"><span>Change plan</span></Link>
          </>
        ) : (
          <>
            <p className="eyebrow">Join the waitlist</p>
            <h1>Reserve your seat</h1>
            <p className="auth-sub">Leave your email to hold your seat on this plan. We will email you when access opens, at launch pricing.</p>
            <form onSubmit={submit}>
              <input type="email" required autoFocus placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <div className="field">
                <span>Plan</span>
                <p>
                  <b>{chosen.name}</b> — {plan === 'free' ? 'Free forever' : `₹${(cycle === 'annual' ? chosen.annual : chosen.monthly).toLocaleString('en-IN')}/mo, billed ${cycle}`}
                  {' · '}<Link to="/pricing">Change</Link>
                </p>
              </div>
              <p className="auth-sub consent" style={{ fontSize: 13 }}>
                By reserving, you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
              </p>
              {state === 'error' && <p className="err">Something went wrong. Please try again.</p>}
              <button className="btn btn-primary md" disabled={state === 'sending'}>
                <span>{state === 'sending' ? 'Reserving…' : 'Reserve my seat'}</span>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
