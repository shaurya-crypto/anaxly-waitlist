import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import type { Cycle } from '../lib/supabase'
import { PLANS } from '../lib/plans'


export default function Pricing() {
  const root = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [cycle, setCycle] = useState<Cycle>('annual')

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

  return (
    <div ref={root} className="pricing">
      <div className="price-head">
        <p className="eyebrow">Pricing</p>
        <h1>Private-tutor quality at a quarter of the cost.</h1>
        <p className="lede">Join the waitlist with the plan you want. Waitlist members lock in launch pricing.</p>
        <div className="cycle" role="group" aria-label="Billing cycle">
          {(['monthly', 'annual'] as const).map((c) => (
            <button key={c} type="button" aria-pressed={cycle === c} className={cycle === c ? 'on' : ''} onClick={() => setCycle(c)}>
              {c === 'monthly' ? 'Monthly' : 'Annual'}{c === 'annual' && <small>Save up to 25%</small>}
            </button>
          ))}
        </div>
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
              <button type="button" className={`btn ${p.popular ? 'btn-primary' : 'btn-ghost'} md`} onClick={() => navigate(`/join?plan=${p.id}&cycle=${cycle}`)}>
                <span>{p.cta}</span>
              </button>
            </article>
          )
        })}
      </div>
    </div>
  )
}
