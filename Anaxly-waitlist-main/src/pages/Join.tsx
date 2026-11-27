import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { joinWaitlist, rememberReferral, storedReferral, type Cycle, type PlanId } from '../lib/supabase'
import { PLANS } from '../lib/plans'

const isPlan = (v: string | null): v is PlanId => PLANS.some((p) => p.id === v)

export default function Join() {
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [referral, setReferral] = useState(() => (params.get('ref') ?? storedReferral()).toUpperCase())
  const [myCode, setMyCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  // Plan and cycle arrive from /pricing when set; "Reserve my seat" lands here with none, so default to the popular plan.
  const rawPlan = params.get('plan')
  const plan: PlanId = isPlan(rawPlan) ? rawPlan : 'topper'
  const [cycle, setCycle] = useState<Cycle>(params.get('cycle') === 'monthly' ? 'monthly' : 'annual')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error' | 'bad-ref'>('idle')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setState('sending')
    const res = await joinWaitlist(email.trim(), plan, cycle, referral)
    if (res.ok) {
      setMyCode(res.referralCode)
      setState('done')
    } else {
      setState(res.reason === 'invalid_referral' ? 'bad-ref' : 'error')
    }
  }

  const shareLink = myCode ? `${window.location.origin}/?ref=${myCode}` : ''
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked: the link is still visible to copy by hand */ }
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
            {myCode && (
              <div className="field referral-share">
                <span>Your referral code</span>
                <p className="ref-code">{myCode}</p>
                <p className="auth-sub" style={{ fontSize: 13 }}>Share this link with friends so they can join with your code:</p>
                <div className="ref-link">
                  <code>{shareLink}</code>
                  <button type="button" className="btn btn-ghost md" onClick={copyLink}><span>{copied ? 'Copied' : 'Copy'}</span></button>
                </div>
              </div>
            )}
            <Link to="/reserve" className="btn btn-ghost md"><span>Change plan</span></Link>
          </>
        ) : (
          <>
            <p className="eyebrow">Join the waitlist</p>
            <h1>Reserve your seat</h1>
            <p className="auth-sub">Leave your email to hold your seat on this plan. We will email you when access opens, at launch pricing.</p>
            <form onSubmit={submit}>
              <input type="email" required autoFocus placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <label className="field">
                <span>Referral code <small>(optional)</small></span>
                <input
                  type="text"
                  placeholder="e.g. 7F3A9C21"
                  value={referral}
                  maxLength={16}
                  autoCapitalize="characters"
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                    setReferral(v)
                    rememberReferral(v)
                    if (state === 'bad-ref') setState('idle')
                  }}
                />
              </label>
              <div className="field">
                <span>Selected plan</span>
                <p className="auth-sub" style={{ fontSize: 14, margin: 0 }}>
                  <b>{chosen.name}</b> — {plan === 'free' ? 'Free forever' : `₹${(cycle === 'annual' ? chosen.annual : chosen.monthly).toLocaleString('en-IN')}/mo, billed ${cycle}`}
                  {' · '}<Link className="plain-link" to="/reserve">Click to change</Link>
                </p>
              </div>
              {plan !== 'free' && (
                <div className="cycle" role="group" aria-label="Billing cycle">
                  {(['monthly', 'annual'] as const).map((c) => (
                    <button key={c} type="button" aria-pressed={cycle === c} className={cycle === c ? 'on' : ''} onClick={() => setCycle(c)}>
                      {c === 'monthly' ? 'Monthly' : 'Annual'}
                    </button>
                  ))}
                </div>
              )}
              <p className="auth-sub consent" style={{ fontSize: 13 }}>
                By reserving, you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
              </p>
              {state === 'bad-ref' && <p className="err">That referral code isn't valid. Check it, or leave the field empty.</p>}
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
