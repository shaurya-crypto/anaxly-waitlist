// Waitlist-only legal pages. Tone, contact and minors/DPDP wording follow the main Anaxly app
// (AI_TUTOR src/app/privacy and src/app/terms), trimmed to what this waitlist site actually does.

const UPDATED = 'November 27, 2026'
const CONTACT = 'shauryaprabhakar097@gmail.com'
const Mail = () => <a href={`mailto:${CONTACT}`}>{CONTACT}</a>

function Shell({ title, tag, children }: { title: string; tag: string; children: React.ReactNode }) {
  return (
    <article className="legal">
      <p className="eyebrow">{tag}</p>
      <h1>{title}</h1>
      <p className="legal-updated">Last Updated &amp; Effective Date: {UPDATED}</p>
      {children}
    </article>
  )
}

export function Privacy() {
  return (
    <Shell title="Privacy Policy" tag="Waitlist Privacy">
      <h2>1. Our Privacy Commitment</h2>
      <p>
        This Privacy Policy covers the <strong>Anaxly waitlist website</strong> only. The waitlist has no accounts, no
        logins and no payments. We follow the <strong>Digital Personal Data Protection (DPDP) Act</strong>, and we{' '}
        <strong>never sell your data, never show third-party advertisements, and never use your information for unrelated marketing.</strong>
      </p>

      <h2>2. Information We Collect</h2>
      <p>When you reserve a seat, we store only:</p>
      <ul>
        <li><strong>Your email address.</strong></li>
        <li><strong>The plan and billing cycle you chose</strong> (for example, Scholar, billed annually).</li>
        <li><strong>When you joined</strong>, and whether and when we sent you an access email.</li>
        <li><strong>Referral codes:</strong> the code we give you to share, and the code you entered (if any) when you joined.</li>
      </ul>
      <p>We do not collect names, phone numbers or payment details on this site, and we do not use tracking or advertising cookies.</p>

      <h2>3. How We Use It</h2>
      <ul>
        <li>To hold your place on the waitlist for the plan you chose.</li>
        <li>To email you once when your access opens, with payment and access details.</li>
        <li>To reply if you contact us.</li>
        <li>To see how many people joined using your referral code.</li>
      </ul>

      <h2>4. Third-Party Sub-Processors</h2>
      <ul>
        <li><strong>Supabase (PostgreSQL):</strong> Stores the waitlist, protected by Row Level Security (RLS).</li>
        <li><strong>Resend:</strong> Sends the access email when your seat is approved.</li>
      </ul>

      <h2>5. Protection of Minor Students</h2>
      <p>
        Anaxly is built for school students in Classes 6–12. If you are under 18, please have a parent or guardian join
        the waitlist for you, or get their consent first. Parents and guardians may ask us to delete a child's entry at any time.
      </p>

      <h2>6. Retention, Your Rights &amp; Deletion</h2>
      <div className="legal-box">
        <p>
          We keep your entry until Anaxly launches and your access email has been handled, or until you ask us to remove
          it. To see, correct or delete your entry, email: <Mail />
        </p>
        <p>All deletion requests are verified and executed within 7 business days.</p>
      </div>

      <h2>7. Contact &amp; Grievance Officer</h2>
      <div className="legal-box">
        <h3>Shaurya Prabhakar</h3>
        <p>Data Protection &amp; Grievance Lead</p>
        <p><Mail /></p>
      </div>
    </Shell>
  )
}

export function Terms() {
  return (
    <Shell title="Terms of Service" tag="Waitlist Terms">
      <h2>1. Acceptance of Terms</h2>
      <p>
        These Terms cover your use of the <strong>Anaxly waitlist website</strong>. By reserving a seat, you agree to them
        and to our Privacy Policy. Anaxly is designed for school students in <strong>Classes 6 to 12</strong> (CBSE, ICSE
        and IB). If you are under 18, you confirm you have a parent or guardian's consent.
      </p>

      <h2>2. The Waitlist</h2>
      <ul>
        <li>Reserving a seat is free. It is not a purchase, and nothing is charged.</li>
        <li>A reservation does not guarantee access by a specific date. We open access in batches.</li>
        <li>When your access opens, we email you. Payment and the full product Terms are presented at that point.</li>
      </ul>

      <h2>3. Plans &amp; Launch Pricing</h2>
      <p>
        Plans, features and launch prices shown on this site describe what we intend to offer and may change before
        launch. The price shown when you complete payment is the one that applies.
      </p>

      <h2>4. Prohibited Conduct</h2>
      <p>You agree NOT to:</p>
      <ul>
        <li>Sign up with an email address you do not own, or sign up other people without their permission.</li>
        <li>Submit automated or bulk signups, scrape the site, or try to bypass its access controls.</li>
        <li>Interfere with, disrupt, or overburden the site or its infrastructure.</li>
      </ul>

      <h2>5. Intellectual Property</h2>
      <p>The Anaxly name, designs, illustrations and site content are the exclusive intellectual property of Anaxly.</p>

      <h2>6. Disclaimer</h2>
      <p>
        The waitlist site is provided on an "AS IS" and "AS AVAILABLE" basis. Anaxly is a supplemental learning tool and
        does not guarantee specific school examination marks or academic rankings.
      </p>

      <h2>7. Leaving the Waitlist</h2>
      <p>You can leave at any time by emailing <Mail />. We may remove entries that break these Terms.</p>

      <h2>8. Contact</h2>
      <div className="legal-box">
        <h3>Platform Administrator</h3>
        <p><Mail /></p>
      </div>
    </Shell>
  )
}
