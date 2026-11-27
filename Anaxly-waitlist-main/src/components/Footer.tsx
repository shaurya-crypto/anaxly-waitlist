import { Link } from 'react-router-dom'
import { CtaPair } from './Buttons'

// Adapted from the main Anaxly LandingFooter (AI_TUTOR/src/components/landing/LandingFooter.tsx).
export default function Footer({ onReserve }: { onReserve: () => void }) {
  return (
    <footer className="footer-wrap">
      <div className="footer-card">
        <div className="footer-inner">
          <CtaPair onReserve={onReserve} size="lg" />
          <nav aria-label="Footer Navigation" className="footer-nav">
            <Link className="lhl" to="/pricing">Pricing</Link>
            <Link className="lhl" to="/careers">Careers</Link>
            <a className="lhl" href="mailto:support@anaxly.com?subject=Contact%20Anaxly">Contact</a>
            <a className="lhl" href="https://twitter.com" target="_blank" rel="noopener noreferrer">Twitter <span aria-hidden="true">↗</span></a>
            <a className="lhl" href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn <span aria-hidden="true">↗</span></a>
          </nav>
          <div className="footer-legal">
            <span>Privacy Policy</span>
            <span aria-hidden="true">•</span>
            <span>Terms of Service</span>
            <span aria-hidden="true">•</span>
            <span>© {new Date().getFullYear()} Anaxly Inc.</span>
          </div>
        </div>
        <div className="footer-big" aria-hidden="true">ANAXLY</div>
      </div>
    </footer>
  )
}
