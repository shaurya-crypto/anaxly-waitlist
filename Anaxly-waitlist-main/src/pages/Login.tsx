import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { joinWaitlist, supabase, useSession } from '../lib/supabase'

export default function Login() {
  const session = useSession()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Signed in (email code or Google redirect): add to waitlist, then show plans.
  useEffect(() => {
    if (!session) return
    joinWaitlist(session).finally(() => navigate('/pricing', { replace: true }))
  }, [session, navigate])

  async function sendCode(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
    setBusy(false)
    if (error) return setError(error.message)
    setStep('code')
  }

  async function verify(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setError(error.message)
  }

  async function google() {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login` },
    })
    if (error) setError(error.message)
  }

  return (
    <div className="auth">
      <div className="auth-card beam">
        <p className="eyebrow">Join the waitlist</p>
        <h1>{step === 'email' ? 'Sign in to reserve your seat' : 'Check your inbox'}</h1>
        <p className="auth-sub">
          {step === 'email'
            ? 'Use the same account as the Anaxly app. New here? We will create one for you.'
            : <>We sent a 6-digit code to <b>{email}</b>.</>}
        </p>

        {step === 'email' ? (
          <>
            <button type="button" className="btn btn-ghost md auth-google" onClick={google}>
              <span>Continue with Google</span>
            </button>
            <div className="auth-or"><span>or</span></div>
            <form onSubmit={sendCode}>
              <input type="email" required autoFocus placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button className="btn btn-primary md" disabled={busy}><span>{busy ? 'Sending…' : 'Email me a code'}</span></button>
            </form>
          </>
        ) : (
          <form onSubmit={verify}>
            <input
              inputMode="numeric" autoComplete="one-time-code" required autoFocus maxLength={6}
              placeholder="123456" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="auth-code"
            />
            <button className="btn btn-primary md" disabled={busy || code.length < 6}><span>{busy ? 'Verifying…' : 'Verify and continue'}</span></button>
            <button type="button" className="auth-link" onClick={() => { setStep('email'); setCode('') }}>Use a different email</button>
          </form>
        )}
        {error && <p className="err">{error}</p>}
      </div>
    </div>
  )
}
