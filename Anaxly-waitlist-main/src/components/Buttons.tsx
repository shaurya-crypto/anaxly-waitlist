import { Link } from 'react-router-dom'

// The only two CTAs allowed anywhere on the site.
export function ReserveButton({ onReserve, size = 'md' }: { onReserve: () => void; size?: 'md' | 'lg' }) {
  return (
    <button type="button" className={`btn btn-primary ${size}`} onClick={onReserve}>
      <span>Reserve my seat</span>
    </button>
  )
}

export function PricingButton({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <Link to="/pricing" className={`btn btn-ghost ${size}`}>
      <span>Pricing</span>
    </Link>
  )
}

export function CtaPair({ onReserve, size = 'md' }: { onReserve: () => void; size?: 'md' | 'lg' }) {
  return (
    <div className="cta-pair">
      <ReserveButton onReserve={onReserve} size={size} />
      <PricingButton size={size} />
    </div>
  )
}
