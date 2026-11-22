import { useEffect, useState, type FormEvent } from 'react'

const FORM_ID = import.meta.env.VITE_FORMSPREE_ID as string | undefined

export default function ReserveModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function submit(e: FormEvent) {
    e.preventDefault()
    setState('sending')
    try {
      if (FORM_ID) {
        const res = await fetch(`https://formspree.io/f/${FORM_ID}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ email }),
        })
        if (!res.ok) throw new Error('bad response')
      } else {
        console.warn('VITE_FORMSPREE_ID not set: email not saved (dev mode).')
      }
      setState('done')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="modal-back" onClick={onClose} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-label="Reserve my seat" onClick={(e) => e.stopPropagation()}>
        {state === 'done' ? (
          <>
            <h3>You are on the list.</h3>
            <p>We will email {email} the moment your seat opens.</p>
            <button className="btn btn-primary md" onClick={onClose}>Close</button>
          </>
        ) : (
          <form onSubmit={submit}>
            <h3>Reserve my seat</h3>
            <p>Early members get first access to Anaxly.</p>
            <input
              type="email"
              required
              autoFocus
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {state === 'error' && <p className="err">Something went wrong. Please try again.</p>}
            <button className="btn btn-primary md" disabled={state === 'sending'}>
              {state === 'sending' ? 'Reserving…' : 'Reserve my seat'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
