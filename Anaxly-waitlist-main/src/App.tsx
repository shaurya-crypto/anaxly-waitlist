import { useEffect } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Nav from './components/Nav'
import Footer from './components/Footer'
import LineField from './components/LineField'
import Landing from './pages/Landing'
import Pricing from './pages/Pricing'
import Join from './pages/Join'
import Careers from './pages/Careers'
import { Privacy, Terms } from './pages/Legal'
import NotFound from './pages/NotFound'
import { rememberReferral } from './lib/supabase'

gsap.registerPlugin(ScrollTrigger)

export default function App() {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()

  // Keep a ?ref= code from any page so it is prefilled on the join step.
  useEffect(() => { rememberReferral(new URLSearchParams(search).get('ref')) }, [search])

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.09 })
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
    const id = setTimeout(() => ScrollTrigger.refresh(), 100)
    return () => clearTimeout(id)
  }, [pathname])

  // "Reserve my seat" opens the join page directly; the plan can be picked there (or arrives from /pricing).
  const reserve = () => navigate('/join')

  return (
    <>
      <LineField />
      <Nav onReserve={reserve} />
      <main>
        <Routes>
          <Route path="/" element={<Landing onReserve={reserve} />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/join" element={<Join />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer onReserve={reserve} />
    </>
  )
}
