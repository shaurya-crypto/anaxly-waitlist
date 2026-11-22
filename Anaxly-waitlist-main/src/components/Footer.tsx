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
            <Link to="/pricing">Pricing</Link>
            <a href="mailto:careers@anaxly.com?subject=Careers%20at%20Anaxly">Careers</a>
            <a href="mailto:support@anaxly.com?subject=Contact%20Anaxly">Contact</a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">Twitter <span aria-hidden="true">↗</span></a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn <span aria-hidden="true">↗</span></a>
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
