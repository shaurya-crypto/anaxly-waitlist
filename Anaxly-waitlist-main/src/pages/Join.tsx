import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  createCheckoutOrder,
  getPublicSiteOrigin,
  rememberReferral,
  reserveVerifiedWaitlist,
  sendEmailOtp,
  storedReferral,
  validateCheckoutCode,
  verifyCheckoutPayment,
  verifyEmailOtp,
  type CodeValidationResult,
  type Cycle,
  type PaidSubscription,
  type PlanId,
} from '../lib/supabase'
import { loadRazorpayScript } from '../lib/razorpay'
import { PLANS } from '../lib/plans'

const isPlan = (v: string | null): v is PlanId => PLANS.some((p) => p.id === v)

function formatInr(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`
}

export default function Join() {
  const [params] = useSearchParams()
  const rawPlan = params.get('plan')
  const plan: PlanId = isPlan(rawPlan) ? rawPlan : 'topper'
  const [cycle, setCycle] = useState<Cycle>(params.get('cycle') === 'monthly' ? 'monthly' : 'annual')

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpStep, setOtpStep] = useState<'idle' | 'sending' | 'sent' | 'verifying' | 'verified'>('idle')
  const [cooldown, setCooldown] = useState(0)
  const [verificationToken, setVerificationToken] = useState<string | null>(null)

  const [initialPrefillRef] = useState(() => (params.get('ref') ?? storedReferral()).trim().toUpperCase())
  const [codeInput, setCodeInput] = useState(initialPrefillRef)
  const [appliedCode, setAppliedCode] = useState<CodeValidationResult | null>(null)
  const [codeBusy, setCodeBusy] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)

  const [busyMode, setBusyMode] = useState<'idle' | 'paying' | 'verifying_payment' | 'reserving'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [done, setDone] = useState<
    | { kind: 'paid'; subscription: PaidSubscription; emailSent: boolean }
    | { kind: 'reserved'; referralCode: string | null }
    | null
  >(null)
  const [copied, setCopied] = useState(false)

  const chosen = PLANS.find((p) => p.id === plan)!
  const isPaidPlan = plan !== 'free'
  const basePaise = isPaidPlan ? (cycle === 'annual' ? chosen.annual * 12 : chosen.monthly) * 100 : 0
  const discountPaise = isPaidPlan && appliedCode?.ok ? appliedCode.discountPaise : 0
  const finalPaise = isPaidPlan ? Math.max(0, basePaise - discountPaise) : 0
  const displayFinalPaise = finalPaise > 0 && finalPaise < 100 ? 100 : finalPaise

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  // Re-validate an active applied code (or initial ?ref= prefill) whenever plan, cycle, or verified email changes.
  useEffect(() => {
    const codeToCheck = appliedCode?.code || (!appliedCode && codeInput === initialPrefillRef ? initialPrefillRef : '')
    if (!codeToCheck) return
    let cancelled = false
    validateCheckoutCode(email.trim().toLowerCase(), plan, cycle, codeToCheck)
      .then((res) => {
        if (cancelled) return
        if (res.ok && res.code) {
          setAppliedCode(res)
          setCodeError(null)
        } else {
          setAppliedCode(null)
          setCodeError(res.message ?? 'Code is not valid for this selection.')
        }
      })
      .catch(() => { /* ignore silent auto-preview error */ })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, cycle, verificationToken])

  function handleEmailChange(next: string) {
    setEmail(next)
    if (otpStep !== 'idle') {
      setOtpStep('idle')
      setOtp('')
      setVerificationToken(null)
    }
    setErrorMsg(null)
  }

  async function handleSendOtp() {
    const cleanEmail = email.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address first.')
      return
    }
    setErrorMsg(null)
    setOtpStep('sending')
    try {
      const res = await sendEmailOtp(cleanEmail)
      if (res.ok) {
        setOtpStep('sent')
        setCooldown(45)
      } else {
        setOtpStep('idle')
        if (res.retryAfter) setCooldown(res.retryAfter)
        setErrorMsg(res.message ?? 'Could not send verification code.')
      }
    } catch {
      setOtpStep('idle')
      setErrorMsg('Network error sending verification code.')
    }
  }

  async function handleVerifyOtp() {
    const cleanEmail = email.trim().toLowerCase()
    const cleanOtp = otp.replace(/\D/g, '')
    if (cleanOtp.length !== 6) {
      setErrorMsg('Enter the 6-digit verification code sent to your email.')
      return
    }
    setErrorMsg(null)
    setOtpStep('verifying')
    try {
      const res = await verifyEmailOtp(cleanEmail, cleanOtp)
      if (res.ok && res.verificationToken) {
        setVerificationToken(res.verificationToken)
        setOtpStep('verified')
      } else {
        setOtpStep('sent')
        setErrorMsg(res.message ?? 'Incorrect or expired code.')
      }
    } catch {
      setOtpStep('sent')
      setErrorMsg('Could not verify OTP. Please try again.')
    }
  }

  async function handleApplyCode() {
    const trimmed = codeInput.trim().toUpperCase()
    if (!trimmed) {
      setAppliedCode(null)
      setCodeError(null)
      rememberReferral(null)
      return
    }
    setCodeBusy(true)
    setCodeError(null)
    try {
      const res = await validateCheckoutCode(email.trim().toLowerCase(), plan, cycle, trimmed)
      if (res.ok && res.code) {
        setAppliedCode(res)
        setCodeInput(res.code)
        if (res.codeType === 'referral') rememberReferral(res.code)
        setCodeError(null)
      } else {
        setAppliedCode(null)
        setCodeError(res.message ?? 'That referral or discount code is invalid.')
      }
    } catch {
      setCodeError('Unable to validate code right now.')
    } finally {
      setCodeBusy(false)
    }
  }

  function handleRemoveCode() {
    setCodeInput('')
    setAppliedCode(null)
    setCodeError(null)
    rememberReferral(null)
  }

  async function handleReserveOnly() {
    if (!verificationToken) {
      setErrorMsg('Verify your email with the 6-digit OTP first.')
      return
    }
    if (codeInput.trim() && !appliedCode?.ok) {
      setErrorMsg('Click Apply to validate your code, or remove it before continuing.')
      return
    }
    setErrorMsg(null)
    setBusyMode('reserving')
    try {
      const activeCode = appliedCode?.ok && appliedCode.code ? appliedCode.code : undefined
      const res = await reserveVerifiedWaitlist(email.trim().toLowerCase(), verificationToken, plan, cycle, activeCode)
      if (res.ok) {
        rememberReferral(null)
        setDone({ kind: 'reserved', referralCode: res.referralCode ?? null })
      } else {
        setErrorMsg(res.message ?? 'Could not save your waitlist seat.')
      }
    } catch {
      setErrorMsg('Network error reserving your seat.')
    } finally {
      setBusyMode('idle')
    }
  }

  async function handlePaySubmit(e: FormEvent) {
    e.preventDefault()
    if (!isPaidPlan) {
      await handleReserveOnly()
      return
    }
    if (!verificationToken) {
      setErrorMsg('Please verify your email with the 6-digit OTP before paying.')
      return
    }
    if (codeInput.trim() && !appliedCode?.ok) {
      setErrorMsg('Click Apply to validate your code, or remove it before paying.')
      return
    }

    setErrorMsg(null)
    setBusyMode('paying')

    try {
      const cleanEmail = email.trim().toLowerCase()
      const activeCode = appliedCode?.ok && appliedCode.code ? appliedCode.code : undefined
      const order = await createCheckoutOrder(cleanEmail, verificationToken, plan, cycle, activeCode)

      if (!order.ok) {
        setBusyMode('idle')
        setErrorMsg(order.message ?? 'Could not create payment order.')
        return
      }

      if (order.zeroPaymentCompleted && order.subscription) {
        rememberReferral(null)
        setBusyMode('idle')
        setDone({ kind: 'paid', subscription: order.subscription, emailSent: Boolean(order.emailSent) })
        return
      }

      const loaded = await loadRazorpayScript()
      if (!loaded || !window.Razorpay || !order.orderId || !order.keyId || order.amountPaise === undefined) {
        setBusyMode('idle')
        setErrorMsg('Unable to load Razorpay checkout. Please disable ad-blockers or try again.')
        return
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency ?? 'INR',
        name: 'Anaxly',
        description: `${chosen.name} (${cycle === 'annual' ? 'Annual' : 'Monthly'})`,
        order_id: order.orderId,
        prefill: { email: cleanEmail },
        theme: { color: '#1F3852' },
        handler: async (response) => {
          setBusyMode('verifying_payment')
          try {
            const verified = await verifyCheckoutPayment(cleanEmail, verificationToken, response)
            if (verified.ok && verified.subscription) {
              rememberReferral(null)
              setDone({
                kind: 'paid',
                subscription: verified.subscription,
                emailSent: Boolean(verified.emailSent),
              })
            } else {
              setErrorMsg(verified.message ?? 'Payment verification failed. Contact support@anaxly.in.')
            }
          } catch {
            setErrorMsg('Payment succeeded, but verification timed out. Contact support@anaxly.in with your Payment ID.')
          } finally {
            setBusyMode('idle')
          }
        },
        modal: {
          ondismiss: () => setBusyMode('idle'),
        },
      })

      rzp.on('payment.failed', (evt) => {
        setBusyMode('idle')
        setErrorMsg(evt?.error?.description ?? 'Payment failed or was cancelled. Please try again.')
      })

      rzp.open()
    } catch {
      setBusyMode('idle')
      setErrorMsg('Unable to start checkout. Please try again.')
    }
  }

  const myReferralCode = done?.kind === 'paid' ? done.subscription.referralCode : done?.referralCode
  const shareLink = myReferralCode ? `${getPublicSiteOrigin()}/?ref=${myReferralCode}` : ''

  async function copyLink() {
    if (!shareLink) return
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked: link remains visible */ }
  }

  return (
    <div className="auth">
      <div className="auth-card beam">
        {done?.kind === 'paid' ? (
          <>
            <p className="eyebrow" style={{ color: '#15803D' }}>Payment Successful • Subscription Active</p>
            <h1>Welcome to {chosen.name}</h1>
            <p className="auth-sub">
              {done.emailSent
                ? <>We sent your subscription confirmation &amp; receipt to <b>{done.subscription.email}</b> from <b>support@anaxly.in</b>.</>
                : <>Your subscription for <b>{done.subscription.email}</b> is active. Check your inbox or contact <b>support@anaxly.in</b> for a copy of your receipt.</>}
            </p>
            <div className="receipt-box">
              <div><span>Plan</span><b>{chosen.name} ({done.subscription.billingCycle})</b></div>
              {done.subscription.discountPaise > 0 && done.subscription.appliedCode && (
                <div><span>Code ({done.subscription.appliedCode})</span><b className="ok-text">−{formatInr(done.subscription.discountPaise)}</b></div>
              )}
              <div><span>Amount paid</span><b>{formatInr(done.subscription.amountPaidPaise)}</b></div>
              <div><span>Payment ID</span><code>{done.subscription.paymentId}</code></div>
              <div><span>Order ID</span><code>{done.subscription.orderId}</code></div>
            </div>
            {myReferralCode && (
              <div className="field referral-share">
                <span>Your referral code (friends get 10% off)</span>
                <p className="ref-code">{myReferralCode}</p>
                <div className="ref-link">
                  <code>{shareLink}</code>
                  <button type="button" className="btn btn-ghost md" onClick={copyLink}><span>{copied ? 'Copied' : 'Copy'}</span></button>
                </div>
              </div>
            )}
            <Link to="/" className="btn btn-primary md"><span>Back to home</span></Link>
          </>
        ) : done?.kind === 'reserved' ? (
          <>
            <p className="eyebrow">You're on the list</p>
            <h1>Seat reserved: {chosen.name}</h1>
            <p className="auth-sub">
              Your email <b>{email}</b> is verified and saved. We emailed your waitlist confirmation from <b>support@anaxly.in</b>.
            </p>
            {myReferralCode && (
              <div className="field referral-share">
                <span>Your referral code (friends get 10% off)</span>
                <p className="ref-code">{myReferralCode}</p>
                <p className="auth-sub" style={{ fontSize: 13 }}>Share this link with classmates:</p>
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
            <p className="eyebrow">{isPaidPlan ? 'Early Access Checkout' : 'Join the waitlist'}</p>
            <h1>{isPaidPlan ? `Subscribe to ${chosen.name}` : 'Reserve your free seat'}</h1>
            <p className="auth-sub">
              Verify your email with a 6-digit code, apply a referral or discount code if you have one, and {isPaidPlan ? 'complete payment securely via Razorpay.' : 'lock in your free spot.'}
            </p>

            <form onSubmit={handlePaySubmit}>
              {/* Plan & Cycle */}
              <div className="field">
                <span>Selected plan</span>
                <p className="auth-sub" style={{ fontSize: 14, margin: 0 }}>
                  <b>{chosen.name}</b> — {plan === 'free'
                    ? 'Free forever'
                    : `₹${(cycle === 'annual' ? chosen.annual : chosen.monthly).toLocaleString('en-IN')}/mo (${cycle === 'annual' ? `${formatInr(basePaise)}/yr` : 'billed monthly'})`}
                  {' · '}<Link className="plain-link" to="/reserve">Change</Link>
                </p>
              </div>

              {isPaidPlan && (
                <div className="cycle" role="group" aria-label="Billing cycle">
                  {(['monthly', 'annual'] as const).map((c) => (
                    <button key={c} type="button" aria-pressed={cycle === c} className={cycle === c ? 'on' : ''} onClick={() => setCycle(c)}>
                      {c === 'monthly' ? 'Monthly' : 'Annual (Save 18–25%)'}
                    </button>
                  ))}
                </div>
              )}

              {/* Step 1: Email + OTP Verification */}
              <div className="field">
                <span>1. Verify your email</span>
                <div className="inline-row">
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="you@email.com"
                    value={email}
                    disabled={otpStep === 'verified'}
                    onChange={(e) => handleEmailChange(e.target.value)}
                  />
                  {otpStep === 'verified' ? (
                    <button type="button" className="btn btn-ghost md" onClick={() => handleEmailChange(email)}>
                      <span>Change</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost md"
                      disabled={otpStep === 'sending' || cooldown > 0}
                      onClick={handleSendOtp}
                    >
                      <span>
                        {otpStep === 'sending'
                          ? 'Sending…'
                          : cooldown > 0
                          ? `Wait ${cooldown}s`
                          : otpStep === 'sent'
                          ? 'Resend'
                          : 'Send OTP'}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {(otpStep === 'sent' || otpStep === 'verifying') && (
                <div className="field">
                  <span>Enter 6-digit OTP sent from no-reply@anaxly.in</span>
                  <div className="inline-row">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="6-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                    <button
                      type="button"
                      className="btn btn-primary md"
                      disabled={otpStep === 'verifying' || otp.length !== 6}
                      onClick={handleVerifyOtp}
                    >
                      <span>{otpStep === 'verifying' ? 'Checking…' : 'Verify'}</span>
                    </button>
                  </div>
                </div>
              )}

              {otpStep === 'verified' && (
                <p className="verified-pill">✓ Email verified</p>
              )}

              {/* Step 2: Single Referral / Discount Code ("One code, one use") */}
              <div className="field">
                <span>
                  {isPaidPlan ? '2. Referral or Discount Code' : '2. Referral Code'}{' '}
                  <small>(optional · one code, one use)</small>
                </span>
                <div className="inline-row">
                  <input
                    type="text"
                    placeholder={isPaidPlan ? 'e.g. EARLY10 or 7F3A9C21' : 'e.g. 7F3A9C21'}
                    value={codeInput}
                    maxLength={32}
                    autoCapitalize="characters"
                    disabled={Boolean(appliedCode?.ok)}
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '')
                      setCodeInput(v)
                      if (codeError) setCodeError(null)
                    }}
                  />
                  {appliedCode?.ok ? (
                    <button type="button" className="btn btn-ghost md" onClick={handleRemoveCode}>
                      <span>Remove</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost md"
                      disabled={codeBusy || !codeInput.trim()}
                      onClick={handleApplyCode}
                    >
                      <span>{codeBusy ? 'Checking…' : 'Apply'}</span>
                    </button>
                  )}
                </div>
                {appliedCode?.ok && appliedCode.label && (
                  <p className="ok-text" style={{ fontSize: 13 }}>
                    ✓ {appliedCode.label} applied{isPaidPlan && discountPaise > 0 ? ` (−${formatInr(discountPaise)})` : ''}. No code stacking.
                  </p>
                )}
                {codeError && <p className="err">{codeError}</p>}
              </div>

              {/* Order Summary for Paid Plans */}
              {isPaidPlan && (
                <div className="summary-box">
                  <div>
                    <span>{chosen.name} ({cycle})</span>
                    <span>{formatInr(basePaise)}</span>
                  </div>
                  {discountPaise > 0 && appliedCode?.code && (
                    <div className="ok-text">
                      <span>Code {appliedCode.code}</span>
                      <span>−{formatInr(discountPaise)}</span>
                    </div>
                  )}
                  <div className="summary-total">
                    <span>Total due today</span>
                    <span>{formatInr(displayFinalPaise)}</span>
                  </div>
                </div>
              )}

              <p className="auth-sub consent" style={{ fontSize: 13 }}>
                By continuing, you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
              </p>

              {errorMsg && <p className="err">{errorMsg}</p>}

              <button
                type="submit"
                className="btn btn-primary md"
                disabled={otpStep !== 'verified' || busyMode !== 'idle'}
              >
                <span>
                  {busyMode === 'paying'
                    ? 'Opening Razorpay…'
                    : busyMode === 'verifying_payment'
                    ? 'Confirming subscription…'
                    : busyMode === 'reserving'
                    ? 'Reserving seat…'
                    : isPaidPlan
                    ? `Pay ${formatInr(displayFinalPaise)} & Activate Seat`
                    : 'Join Free Waitlist'}
                </span>
              </button>

              {isPaidPlan && (
                <button
                  type="button"
                  className="btn btn-ghost md"
                  disabled={otpStep !== 'verified' || busyMode !== 'idle'}
                  onClick={handleReserveOnly}
                >
                  <span>Or join waitlist without paying now</span>
                </button>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  )
}
