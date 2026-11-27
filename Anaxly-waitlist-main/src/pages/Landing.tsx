import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { CtaPair } from '../components/Buttons'

const POINTS = [
  { h: 'Reasons alongside you', p: 'A personal tutor that derives every law live on your chalkboard, step by step.' },
  { h: 'Socratic, not a lecture', p: 'It asks, listens and adapts, so you understand instead of memorising.' },
  { h: 'Your syllabus, covered', p: 'Maths and Science for your board, with notes, flashcards and past papers.' },
]

const ORBIT = [
  { h: 'Chalkboard', p: 'Every step, drawn live.', icon: '✎', tint: '#E3ECF6' },
  { h: 'Doubts', p: 'Ask anything, anytime.', icon: '?', tint: '#EDE7F8' },
  { h: 'Notes', p: 'Clean PDFs after class.', icon: '≡', tint: '#FBE9DC' },
  { h: 'Flashcards', p: 'Remember what you learnt.', icon: '◫', tint: '#E4F3EA' },
  { h: 'Past papers', p: 'Practise with marking keys.', icon: '✓', tint: '#F6F0D9' },
  { h: 'Graphs', p: 'See the maths move.', icon: '∿', tint: '#E3ECF6' },
]

// Cursor-tracked glow on the feature cards' borders.
function spot(e: React.PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

export default function Landing({ onReserve }: { onReserve: () => void }) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = gsap.context(() => {
      gsap.from('.hero-in', { y: 40, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.12 })
      if (reduce) return

      // Hero zooms out and fades as you scroll away from it.
      gsap.to('.hero-inner', {
        scale: 0.86, opacity: 0.2, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      })

      // Video frame zooms in as it enters, settles, then eases back out.
      gsap.fromTo('.video-frame', { scale: 0.82 }, {
        scale: 1, ease: 'none',
        scrollTrigger: { trigger: '.video-sec', start: 'top 85%', end: 'center center', scrub: true },
      })
      gsap.to('.video-frame', {
        scale: 0.94, ease: 'none',
        scrollTrigger: { trigger: '.video-sec', start: 'center 30%', end: 'bottom top', scrub: true },
      })

      // Each point zooms in from slightly small.
      gsap.utils.toArray<HTMLElement>('.point').forEach((el) => {
        gsap.from(el, {
          scale: 0.88, opacity: 0, y: 40, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 88%', end: 'top 58%', scrub: true },
        })
      })

      // Closing block zooms in.
      gsap.from('.closing-inner', {
        scale: 0.85, opacity: 0, ease: 'none',
        scrollTrigger: { trigger: '.closing', start: 'top 90%', end: 'top 45%', scrub: true },
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={root}>
      <section className="hero">
        <div className="hero-inner">
          <p className="hero-pill hero-in"><span className="live-dot" aria-hidden="true" />Waitlist now open</p>
          <h1 className="hero-title hero-in">
            <span>A personal tutor</span>
            <em>that thinks with you.</em>
          </h1>
          <p className="lede hero-in">
            Anaxly teaches Maths and Science one-on-one, live on a chalkboard, at a fraction of
            the cost of a private tutor.
          </p>
          <div className="hero-in"><CtaPair onReserve={onReserve} size="lg" /></div>
        </div>

        {/* Thin curves joining the side cards to the orbit */}
        <svg className="hero-curves" viewBox="0 0 1200 700" preserveAspectRatio="none" aria-hidden="true">
          <path d="M190 330 C 200 520, 380 560, 520 560" />
          <path d="M1010 420 C 1000 560, 840 600, 690 590" />
        </svg>

        <aside className="float-card fc-left hero-in" aria-hidden="true">
          <span className="fc-icon wave"><i /><i /><i /><i /><i /></span>
          <strong>It asks.<br />You think.</strong>
          <span>Socratic voice lessons, one-on-one.</span>
        </aside>

        <aside className="float-card fc-right hero-in" aria-hidden="true">
          <span className="fc-subjects"><b>∑</b><b>⚛</b><b>⚗</b><b>+</b></span>
          <strong>Your syllabus,<br />covered.</strong>
          <span>Maths and Science for your board.</span>
        </aside>

        <div className="badge-ring" aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <defs><path id="ring" d="M50 50 m-38 0 a38 38 0 1 1 76 0 a38 38 0 1 1 -76 0" /></defs>
            <text><textPath href="#ring">reserve early • launch pricing • </textPath></text>
          </svg>
          <span>✦</span>
        </div>

        <div className="stage" aria-hidden="true">
          <div className="orbit">
            {ORBIT.map((c, i) => (
              <div key={c.h} className="orbit-card" style={{ ['--i' as string]: i }}>
                <span className="oc-icon" style={{ background: c.tint }}>{c.icon}</span>
                <span><b>{c.h}</b><small>{c.p}</small></span>
              </div>
            ))}
          </div>
          <div className="stage-board">
            <span>v² = u² + 2as</span>
            <small>derived live, step by step</small>
          </div>
        </div>

        <p className="corner corner-left">Seats open in batches.<br />Early members go first.</p>
        <p className="corner corner-right"><span>✦</span>Less memorising.<br />More understanding.</p>
      </section>

      <section className="video-sec" aria-label="Anaxly demo">
        <div className="video-frame">
          <video
            src="/demo.mp4"
            poster="/demo-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
            preload="auto"
            aria-label="Anaxly explainer for parents"
          />
        </div>
      </section>

      <section className="points">
        {POINTS.map((x) => (
          <article className="point" key={x.h} data-spot onPointerMove={spot}>
            <h2>{x.h}</h2>
            <p>{x.p}</p>
          </article>
        ))}
      </section>

      <section className="closing">
        <div className="closing-inner">
          <h2>Seats are limited. Reserve yours today.</h2>
          <CtaPair onReserve={onReserve} size="lg" />
        </div>
      </section>
    </div>
  )
}
