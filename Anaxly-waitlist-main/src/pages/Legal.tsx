// Waitlist & early-access checkout legal pages.
// Tone, contact and minors/DPDP wording align with Anaxly Classes 9-12 policies.

const UPDATED = 'November 28, 2026'
const CONTACT = 'support@anaxly.in'
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
    <Shell title="Privacy Policy" tag="Waitlist &amp; Checkout Privacy">
      <h2>1. Our Privacy Commitment</h2>
      <p>
        This Privacy Policy covers the <strong>Anaxly waitlist and early-access checkout website</strong>. There are no
        passwords or profiles here—only email verification via a one-time passcode (OTP) and optional plan checkout. We
        follow the <strong>Digital Personal Data Protection (DPDP) Act</strong>, and we{' '}
        <strong>never sell your data, never show third-party advertisements, and never use your information for unrelated marketing.</strong>
      </p>

      <h2>2. Information We Collect</h2>
      <p>When you verify your email, join the waitlist, or complete early-access payment, we store:</p>
      <ul>
        <li><strong>Your email address</strong> and whether and when it was verified by OTP.</li>
        <li><strong>The plan and billing cycle you chose</strong> (for example, Topper Pro, billed annually).</li>
        <li><strong>Referral and discount code usage:</strong> your personal shareable referral code, and the single referral or promo code applied at checkout (if any).</li>
        <li><strong>Payment references (paid plans only):</strong> Razorpay order ID, payment ID, amount paid, and subscription validity dates. We never collect or store raw card numbers, CVVs, or UPI PINs—those are handled directly by Razorpay.</li>
      </ul>
      <p>We do not use third-party advertising cookies or cross-site trackers.</p>

      <h2>3. How We Use It</h2>
      <ul>
        <li>To verify ownership of your email address via a 6-digit OTP before reserving or activating a seat.</li>
        <li>To process your selected subscription payment and immediately send your payment receipt and subscription confirmation email.</li>
        <li>To enforce our &ldquo;One code, one use&rdquo; referral and discount policy fairly.</li>
        <li>To email unpaid waitlist members when their batch opens, or reply when you contact us.</li>
      </ul>

      <h2>4. Third-Party Sub-Processors</h2>
      <ul>
        <li><strong>Supabase (PostgreSQL &amp; Edge Functions):</strong> Stores waitlist, OTP verification records, and order metadata, protected by Row Level Security (RLS).</li>
        <li><strong>Brevo:</strong> Delivers email verification OTPs (from <code>no-reply@anaxly.in</code>) and waitlist, access, and subscription confirmation emails (from <code>support@anaxly.in</code>).</li>
        <li><strong>Razorpay:</strong> Processes UPI, card, and net-banking payments securely for paid plan subscriptions.</li>
      </ul>

      <h2>5. Protection of Minor Students</h2>
      <p>
        Anaxly is built strictly for school students in <strong>Classes 9–12</strong> (CBSE, ICSE, and IB). If you are under
        18, please have a parent or guardian complete the waitlist reservation or payment with their consent. Parents and
        guardians may ask us to delete a child&rsquo;s entry at any time.
      </p>

      <h2>6. Retention, Your Rights &amp; Deletion</h2>
      <div className="legal-box">
        <p>
          We keep your reservation or subscription record while your early access is active, or until you ask us to
          remove unpaid waitlist entries (subject to statutory billing record retention where payment occurred). To see,
          correct or delete your entry, email: <Mail />
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
    <Shell title="Terms of Service" tag="Waitlist &amp; Subscription Terms">
      <h2>1. Acceptance of Terms</h2>
      <p>
        These Terms cover your use of the <strong>Anaxly waitlist and early-access checkout website</strong>. By
        verifying your email, reserving a seat, or completing payment, you agree to them and to our Privacy Policy.
        Anaxly is designed exclusively for school students in <strong>Classes 9 to 12</strong> (CBSE, ICSE and IB). If
        you are under 18, you confirm you have a parent or guardian&rsquo;s consent.
      </p>

      <h2>2. Waitlist &amp; Early-Access Subscriptions</h2>
      <ul>
        <li>Joining the free waitlist does not charge anything and opens in batches.</li>
        <li>Paid early-access plans (Scholar, Topper Pro, Mastery Infinity) are billed immediately via Razorpay for the selected monthly or annual cycle, and your subscription confirmation is emailed right after payment verification.</li>
        <li>All prices are shown in Indian Rupees (INR) before you confirm payment.</li>
      </ul>

      <h2>3. Referral &amp; Discount Codes (&ldquo;One Code, One Use&rdquo;)</h2>
      <ul>
        <li>Only <strong>one code</strong>—either a friend&rsquo;s referral code or a promo/discount code—may be applied per checkout. Codes cannot be stacked.</li>
        <li>Each email address may redeem a discount or referral code only once, and single-use promotional vouchers become invalid immediately after redemption.</li>
        <li>Self-referrals are not permitted.</li>
      </ul>

      <h2>4. Prohibited Conduct</h2>
      <p>You agree NOT to:</p>
      <ul>
        <li>Verify or sign up with an email address you do not own, or sign up other people without their permission.</li>
        <li>Create fake accounts to abuse referral or single-use discount codes, submit automated bulk signups, or bypass access controls.</li>
        <li>Interfere with, disrupt, or overburden the site or its infrastructure.</li>
      </ul>

      <h2>5. Intellectual Property</h2>
      <p>The Anaxly name, designs, illustrations and site content are the exclusive intellectual property of Anaxly.</p>

      <h2>6. Disclaimer</h2>
      <p>
        The site is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis. Anaxly is a supplemental learning tool and
        does not guarantee specific school examination marks or academic rankings.
      </p>

      <h2>7. Cancellations &amp; Leaving the Waitlist</h2>
      <p>For subscription support, refund inquiries, or leaving the waitlist, email <Mail />. We may remove entries or revoke codes that break these Terms.</p>

      <h2>8. Contact</h2>
      <div className="legal-box">
        <h3>Platform Administrator</h3>
        <p><Mail /></p>
      </div>
    </Shell>
  )
}
