import { Link } from 'react-router-dom'
import { CtaPair } from './Buttons'

export default function Nav({ onReserve }: { onReserve: () => void }) {
  return (
    <header className="nav">
      <Link to="/" className="wordmark" aria-label="Anaxly home">Anaxly</Link>
      <CtaPair onReserve={onReserve} />
    </header>
  )
}
