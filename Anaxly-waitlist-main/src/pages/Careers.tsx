const EMAIL = 'careers@anaxly.com'

// Add roles here when hiring opens; the empty state shows while this list is empty.
const ROLES: { title: string; team: string; location: string }[] = []

export default function Careers() {
  return (
    <article className="careers">
      <p className="eyebrow">Careers</p>
      <h1>Build the tutor every student deserves.</h1>
      <p>
        Anaxly is building 1-on-1 Socratic tutoring for school students across India. We are a small team, and we care
        about clear teaching, careful engineering and doing right by students and parents.
      </p>

      <h2>Open roles</h2>
      {ROLES.length === 0 ? (
        <p>
          There are no open roles right now. If you would like to work with us, send a short note about yourself and
          what you would like to build to <a href={`mailto:${EMAIL}?subject=Careers%20at%20Anaxly`}>{EMAIL}</a>. We
          read every message and will reach out when a role fits.
        </p>
      ) : (
        <ul>
          {ROLES.map((r) => (
            <li key={r.title}><b>{r.title}</b> · {r.team} · {r.location}</li>
          ))}
        </ul>
      )}
    </article>
  )
}
