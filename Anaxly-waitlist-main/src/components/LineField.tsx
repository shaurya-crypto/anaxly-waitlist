import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

// Fixed background of parallel diagonal lines. Two layers drift at different
// speeds and shift with scroll for a parallax feel.
export default function LineField() {
  const a = useRef<HTMLDivElement>(null)
  const b = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const onScroll = () => {
      const y = window.scrollY
      gsap.to(a.current, { y: -y * 0.08, duration: 0.6, overwrite: 'auto' })
      gsap.to(b.current, { y: y * 0.05, duration: 0.6, overwrite: 'auto' })
    }
    const ctx = gsap.context(() => {
      gsap.to(a.current, { backgroundPosition: '0px 240px', duration: 14, ease: 'none', repeat: -1 })
      gsap.to(b.current, { backgroundPosition: '0px -360px', duration: 22, ease: 'none', repeat: -1 })
    })
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      ctx.revert()
    }
  }, [])

  return (
    <div className="linefield" aria-hidden="true">
      <div ref={a} className="lines lines-a" />
      <div ref={b} className="lines lines-b" />
    </div>
  )
}
