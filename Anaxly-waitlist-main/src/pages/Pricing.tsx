import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { joinWaitlist, supabase, useSession } from '../lib/supabase'

type Cycle = 'monthly' | 'annual'

// Copied from the main Anaxly pricing page (src/app/pricing/page.tsx). Ids match the
// main app's /api/payment/create-order tiers.
const PLANS = [
  {
    id: 'free', name: 'Chalkboard Free', badge: 'Free forever', popular: false,
    desc: 'The ultimate visual discovery engine. Interactive digital chalkboard and dynamic science diagrams forever.',
    monthly: 0, annual: 0, savings: '', cta: 'Get Started Free',
    features: [
      'Interactive Digital Chalkboard & Derivations (100% Free)',
      'Dynamic Science Diagrams & Math Graphs (100% Free)',
      '3 Live Socratic Classes / month (~1 hour total)',
      '3 Quick Last-Minute Summaries / month',
      'CBSE, ICSE & IB Core Curriculum standards',
    ],
  },
  {
    id: 'scholar', name: 'Scholar', badge: 'Syllabus Completion', popular: false,
    desc: '1-on-1 Socratic Audio Tutor guaranteeing complete school syllabus coverage if taken properly.',
    monthly: 499, annual: 399, savings: '₹4,788 billed annually (Save 20%)', cta: 'Start Scholar Plan',
    features: [
      'Interactive Chalkboard & Math Graphs (100% Free)',
      '8 Live Socratic Classes / month (80 classes over term)',
      'Guaranteed School Syllabus Coverage (Maths & Science)',
      'Unlimited Quick Last-Minute Summaries & Flashcards',
      'Downloadable Unwatermarked Clean PDF Master Notes',
    ],
  },
  {
    id: 'topper', name: 'Topper Pro', badge: 'Most Popular', popular: true,
    desc: 'Face-to-face live video tutoring for 100% of your classes, past exam solver & exam blitz.',
    monthly: 1099, annual: 899, savings: '₹10,788 billed annually (Save 18%)', cta: 'Start Topper Pro',
    features: [
      '15 Live Classes / month — ALL with Face-to-Face Video Teacher',
      '150 Live Face-to-Face Video Classes across the school academic year',
      'Full 10-Year Board PYQ Solver with Step-by-Step Marking Keys',
      '10-Minute Morning High-Yield Exam Blitz Mode',
      'Interactive Chalkboard & Visual Diagrams (100% Free)',
    ],
  },
  {
    id: 'mastery', name: 'Mastery Infinity', badge: 'Ultimate Academic Shield', popular: false,
    desc: 'Nearly daily 1-on-1 live video tutoring, notebook camera homework diagnostics & parent WhatsApp reports.',
    monthly: 1999, annual: 1499, savings: '₹17,988 billed annually (Save 25%)', cta: 'Join Mastery Infinity',
    features: [
      '24 Live Classes / month — ALL with Face-to-Face Video Teacher',
      '240 Live Face-to-Face Video Classes across the school academic year',
      'Notebook Camera Step-by-Step Homework Error Check',
      'Timed Board Mock Exam Simulator with Automated Grading',
      'Parent WhatsApp Weekly Progress Card & All Boards Prep',
    ],
  },
]

export default function Pricing() {
  const root = useRef<HTMLDivElement>(null)
  const session = useSession()
  const navigate = useNavigate()
  const [cycle, setCycle] = useState<Cycle>('annual')
  const [busy, setBusy] = useState<string | null>(null)
  const [chosen, setChosen] = useState<string | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.from('.price-head > *', { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1 })
      gsap.utils.toArray<HTMLElement>('.plan').forEach((el, i) => {
        gsap.from(el, { scale: 0.88, opacity: 0, y: 40, duration: 0.9, delay: 0.2 + i * 0.1, ease: 'power3.out' })
      })
    }, root)
    return () => ctx.revert()
  }, [])

  async function choose(planId: string) {
    if (!session) return navigate('/login')
    setBusy(planId); setErr('')
    // Pre-launch: just record the chosen plan. Payment happens on the main app at launch.
    const ok = await joinWaitlist(session, { plan: planId, billing_cycle: cycle })
    setBusy(null)
    if (ok) setChosen(planId)
    else setErr('Could not save your plan. Please try again.')
  }

  if (session && chosen) {
    const plan = PLANS.find((p) => p.id === chosen)!
    return (
      <div className="auth">
        <div className="auth-card beam">
          <p className="eyebrow">You're on the list</p>
          <h1>Seat reserved: {plan.name}</h1>
          <p className="auth-sub">
            We saved your {cycle} {plan.name} choice for {session.user.email}. When Anaxly opens, we will email you
            and you can finish signup at launch pricing.
          </p>
          <button type="button" className="btn btn-ghost md" onClick={() => setChosen(null)}><span>Change plan</span></button>
        </div>
      </div>
    )
  }

  return (
    <div ref={root} className="pricing">
      <div className="price-head">
        <p className="eyebrow">{session ? "You're on the list" : 'Pricing'}</p>
        <h1>{session ? 'Pick your plan to lock in launch pricing.' : 'Private-tutor quality at a quarter of the cost.'}</h1>
        <p className="lede">Waitlist members lock in launch pricing. Cancel anytime.</p>
        <div className="cycle" role="group" aria-label="Billing cycle">
          {(['monthly', 'annual'] as const).map((c) => (
            <button key={c} type="button" aria-pressed={cycle === c} className={cycle === c ? 'on' : ''} onClick={() => setCycle(c)}>
              {c === 'monthly' ? 'Monthly' : 'Annual'}{c === 'annual' && <small>Save up to 25%</small>}
            </button>
          ))}
        </div>
        {session && (
          <p className="signed-in">
            Signed in as {session.user.email} · <button type="button" onClick={() => supabase.auth.signOut()}>Sign out</button>
          </p>
        )}
        {err && <p className="err">{err}</p>}
      </div>
      <div className="plans">
        {PLANS.map((p) => {
          const price = cycle === 'annual' ? p.annual : p.monthly
          return (
            <article key={p.id} className={`plan${p.popular ? ' popular beam' : ''}`}>
              <span className="badge">{p.badge}</span>
              <h2>{p.name}</h2>
              <p className="plan-desc">{p.desc}</p>
              <p className="plan-price">₹{price.toLocaleString('en-IN')}<span> {p.id === 'free' ? 'forever' : '/ month'}</span></p>
              <p className="plan-save">{cycle === 'annual' ? p.savings : ''}</p>
              <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
              <button type="button" className={`btn ${p.popular ? 'btn-primary' : 'btn-ghost'} md`} disabled={busy !== null} onClick={() => choose(p.id)}>
                <span>{busy === p.id ? 'Saving…' : session ? p.cta : 'Reserve my seat'}</span>
              </button>
            </article>
          )
        })}
      </div>
    </div>
  )
}
