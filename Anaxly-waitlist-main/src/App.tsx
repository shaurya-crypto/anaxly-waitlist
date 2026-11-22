import { useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Nav from './components/Nav'
import Footer from './components/Footer'
import LineField from './components/LineField'
import ReserveModal from './components/ReserveModal'
import Landing from './pages/Landing'
import Pricing from './pages/Pricing'

gsap.registerPlugin(ScrollTrigger)

export default function App() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

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

  const reserve = () => setOpen(true)

  return (
    <>
      <LineField />
      <Nav onReserve={reserve} />
      <main>
        <Routes>
          <Route path="/" element={<Landing onReserve={reserve} />} />
          <Route path="/pricing" element={<Pricing onReserve={reserve} />} />
        </Routes>
      </main>
      <Footer onReserve={reserve} />
      <ReserveModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
