import { Component, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

function ErrorCard({ code, title, text }: { code: string; title: string; text: string }) {
  return (
    <div className="auth">
      <div className="auth-card notfound">
        <p className="notfound-code">{code}</p>
        <h1>{title}</h1>
        <p className="auth-sub">{text}</p>
        <div className="cta-pair" style={{ justifyContent: 'flex-start' }}>
          <Link to="/" className="btn btn-primary md" reloadDocument><span>Back to home</span></Link>
          <Link to="/join" className="btn btn-ghost md" reloadDocument><span>Reserve my seat</span></Link>
        </div>
      </div>
    </div>
  )
}

/** Shown for any URL that doesn't match a route. */
export default function NotFound() {
  return <ErrorCard code="404" title="Page not found" text="The page you're looking for doesn't exist or has moved." />
}

/** Catches render errors anywhere in the app and shows the same branded page instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: unknown) { console.error('Unhandled error:', error) }
  render() {
    if (!this.state.failed) return this.props.children
    return <ErrorCard code="Oops" title="Something went wrong" text="This page hit an error. Please go back home and try again." />
  }
}
