import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { joinWaitlist, type Cycle, type PlanId } from '../lib/supabase'
import { PLANS } from '../lib/plans'

const isPlan = (v: string | null): v is PlanId => PLANS.some((p) => p.id === v)

export default function Join() {
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [plan, setPlan] = useState<PlanId>(isPlan(params.get('plan')) ? (params.get('plan') as PlanId) : 'topper')
  const [cycle, setCycle] = useState<Cycle>(params.get('cycle') === 'monthly' ? 'monthly' : 'annual')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setState('sending')
    setState((await joinWaitlist(email.trim(), plan, cycle)) ? 'done' : 'error')
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
            <button type="button" className="btn btn-ghost md" onClick={() => setState('idle')}><span>Change plan</span></button>
          </>
        ) : (
          <>
            <p className="eyebrow">Join the waitlist</p>
            <h1>Reserve your seat</h1>
            <p className="auth-sub">Leave your email and the plan you want. We will email you when access opens, at launch pricing.</p>
            <form onSubmit={submit}>
              <input type="email" required autoFocus placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <label className="field">
                <span>Plan</span>
                <select value={plan} onChange={(e) => setPlan(e.target.value as PlanId)}>
                  {PLANS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.id === 'free' ? 'Free' : `₹${(cycle === 'annual' ? p.annual : p.monthly).toLocaleString('en-IN')}/mo`}
                    </option>
                  ))}
                </select>
              </label>
              {plan !== 'free' && (
                <div className="cycle" role="group" aria-label="Billing cycle">
                  {(['monthly', 'annual'] as const).map((c) => (
                    <button key={c} type="button" aria-pressed={cycle === c} className={cycle === c ? 'on' : ''} onClick={() => setCycle(c)}>
                      {c === 'monthly' ? 'Monthly' : 'Annual'}
                    </button>
                  ))}
                </div>
              )}
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
