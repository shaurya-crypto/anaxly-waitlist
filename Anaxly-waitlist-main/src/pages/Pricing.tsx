import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ReserveButton } from '../components/Buttons'

// Plan data mirrors the main Anaxly pricing page (annual per-month prices, INR).
const PLANS = [
  {
    name: 'Scholar', badge: 'Syllabus Completion', price: 399, popular: false,
    desc: '1-on-1 Socratic audio tutor with full school syllabus coverage.',
    features: [
      'Interactive chalkboard and math graphs',
      '8 live Socratic classes a month',
      'Guaranteed Maths and Science syllabus coverage',
      'Unlimited summaries and flashcards',
      'Clean PDF master notes',
    ],
  },
  {
    name: 'Topper Pro', badge: 'Most Popular', price: 899, popular: true,
    desc: 'Face-to-face live video tutoring for every class, plus exam tools.',
    features: [
      '15 live classes a month, all with a video teacher',
      '10-year board PYQ solver with marking keys',
      '10-minute morning exam blitz mode',
      'Interactive chalkboard and visual diagrams',
    ],
  },
  {
    name: 'Mastery Infinity', badge: 'Ultimate Academic Shield', price: 1499, popular: false,
    desc: 'Near-daily 1-on-1 video tutoring with homework diagnostics and parent reports.',
    features: [
      '24 live classes a month, all with a video teacher',
      'Notebook camera step-by-step homework check',
      'Parent WhatsApp progress reports',
      'Everything in Topper Pro',
    ],
  },
]

export default function Pricing({ onReserve }: { onReserve: () => void }) {
  const root = useRef<HTMLDivElement>(null)

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
        <p className="lede">Prices shown per month, billed annually. Waitlist members lock in launch pricing.</p>
      </div>
      <div className="plans">
        {PLANS.map((p) => (
          <article key={p.name} className={`plan${p.popular ? ' popular beam' : ''}`}>
            <span className="badge">{p.badge}</span>
            <h2>{p.name}</h2>
            <p className="plan-desc">{p.desc}</p>
            <p className="plan-price">₹{p.price}<span> / month</span></p>
            <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
            <ReserveButton onReserve={onReserve} />
          </article>
        ))}
      </div>
    </div>
  )
}
