import { Link } from 'react-router-dom'

const UPDATED = '27 November 2026'
const CONTACT = 'support@anaxly.com'

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="legal">
      <p className="eyebrow">Legal</p>
      <h1>{title}</h1>
      <p className="legal-updated">Last updated: {UPDATED}</p>
      {children}
    </article>
  )
}

export function Privacy() {
  return (
    <Shell title="Privacy Policy">
      <p>
        This policy explains what Anaxly ("we", "us") collects through this waitlist website and how we use it.
        The waitlist has no accounts and no logins.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Your email address</b>, which you enter to reserve a seat.</li>
        <li><b>The plan and billing cycle you picked</b> (for example, Scholar, billed annually).</li>
        <li><b>When you joined</b>, plus whether and when we sent you an access email.</li>
      </ul>
      <p>We do not collect payment details on this site, and we do not use advertising or tracking cookies.</p>

      <h2>How we use it</h2>
      <ul>
        <li>To hold your place on the waitlist for the plan you chose.</li>
        <li>To email you when your access opens, with payment and access details.</li>
        <li>To reply if you contact us.</li>
      </ul>
      <p>We do not sell your data or share it with advertisers.</p>

      <h2>Who processes it</h2>
      <ul>
        <li><b>Supabase</b> stores the waitlist database.</li>
        <li><b>Resend</b> sends our access emails.</li>
      </ul>
      <p>These providers process data only to run these services for us.</p>

      <h2>How long we keep it</h2>
      <p>
        We keep your waitlist entry until Anaxly launches and your access email has been handled, or until you ask us
        to delete it, whichever comes first.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask us to see, correct or delete your data, or to remove you from the waitlist, by emailing{' '}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <h2>Children</h2>
      <p>
        Anaxly is built for school students. If you are under 18, please have a parent or guardian join the waitlist
        for you, or get their permission first.
      </p>

      <h2>Changes</h2>
      <p>If we update this policy, we will change the date above. Significant changes will be emailed to people on the waitlist.</p>

      <p>See also our <Link to="/terms">Terms of Service</Link>.</p>
    </Shell>
  )
}

export function Terms() {
  return (
    <Shell title="Terms of Service">
      <p>These terms cover your use of the Anaxly waitlist website. By joining the waitlist, you agree to them.</p>

      <h2>The waitlist</h2>
      <ul>
        <li>Joining the waitlist reserves a seat. It is not a purchase, and you are not charged anything.</li>
        <li>Joining does not guarantee access by a specific date. We open access in batches.</li>
        <li>When your access opens, we will email you. Payment and full product terms are presented at that point.</li>
      </ul>

      <h2>Plans and pricing</h2>
      <p>
        The plans and launch prices on this site describe what we intend to offer. We may change plans, features or
        prices before launch. The price shown when you complete payment is the one that applies.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>Use an email address you own, and do not sign up other people without their permission.</li>
        <li>Do not misuse the site. For example, do not submit automated or bulk signups or try to disrupt the service.</li>
        <li>If you are under 18, you need a parent or guardian's permission to join.</li>
      </ul>

      <h2>Our content</h2>
      <p>The Anaxly name, logo and site content belong to Anaxly. Please do not copy them without permission.</p>

      <h2>Disclaimer and liability</h2>
      <p>
        This site is provided "as is". To the extent the law allows, we are not liable for indirect losses arising
        from your use of the waitlist.
      </p>

      <h2>Removal</h2>
      <p>
        You can leave the waitlist at any time by emailing <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. We may remove
        entries that break these terms.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms and will change the date above when we do.</p>

      <p>See also our <Link to="/privacy">Privacy Policy</Link>.</p>
    </Shell>
  )
}
