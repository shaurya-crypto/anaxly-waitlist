// Content copied from the main Anaxly app (AI_TUTOR src/app/privacy and src/app/terms).

const UPDATED = 'October 29, 2026'
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
    <Shell title="Privacy Policy" tag="Student Data Protection & Privacy">
      <h2>1. Our Privacy Commitment</h2>
      <p>
        At <strong>Anaxly</strong>, we believe educational technology must protect students first. This Privacy Policy
        explains how we collect, process, and safeguard information when you use our Socratic learning platform.
      </p>
      <p>
        We adhere strictly to the <strong>Digital Personal Data Protection (DPDP) Act</strong>, the{' '}
        <strong>Children's Online Privacy Protection Act (COPPA)</strong>, and global best practices. We strictly{' '}
        <strong>never sell student data, never display third-party advertisements, and never use student personal information for commercial marketing.</strong>
      </p>

      <h2>2. Information We Collect</h2>
      <p>We collect only the minimum information necessary to personalize Socratic tutoring sessions:</p>
      <div className="legal-grid">
        <div className="legal-box">
          <h3>A. Account &amp; Google OAuth Data</h3>
          <p>
            When you sign in via Google OAuth, we receive your name, verified email address, and profile picture avatar.
            This data is used solely to authenticate your session and personalize your student identity dossier.
          </p>
        </div>
        <div className="legal-box">
          <h3>B. Academic Dossier</h3>
          <p>
            During onboarding, you specify your academic class (Classes 6–12), curriculum board (CBSE, ICSE, IB), learning
            pace, and subject strengths/weaknesses. This context guides the AI tutor's Socratic cadence.
          </p>
        </div>
        <div className="legal-box">
          <h3>C. Real-Time Classroom Audio &amp; Text</h3>
          <p>
            When you speak or type in the classroom, your input is streamed in real-time to Google Gemini Live API. Audio
            streams are processed ephemerally to drive the conversation and are not retained as permanent biometric voiceprints.
          </p>
        </div>
        <div className="legal-box">
          <h3>D. Chalkboard Master Notes</h3>
          <p>
            The structured topper notes, vector formulas, and worked examples written to the digital chalkboard are securely
            saved to your private database profile in Supabase for revision and review.
          </p>
        </div>
      </div>

      <h2>3. Google API Services User Data Policy Compliance</h2>
      <p>
        Anaxly's use and transfer to any other app of information received from Google APIs will adhere to the{' '}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
          Google API Services User Data Policy
        </a>, including the Limited Use requirements.
      </p>
      <ul>
        <li>We request only basic user profile and email scopes for identity verification.</li>
        <li>We do not transfer your Google data to third parties other than necessary infrastructure providers.</li>
        <li>We do not use Google user data for serving advertisements or training generalized AI models.</li>
      </ul>

      <h2>4. Third-Party Sub-Processors &amp; Infrastructure</h2>
      <p>We partner with enterprise-grade infrastructure providers under strict confidentiality and data protection agreements:</p>
      <ul>
        <li><strong>Supabase (PostgreSQL):</strong> Encrypted database hosting and user authentication with Row Level Security (RLS).</li>
        <li><strong>Google Gemini API:</strong> Socratic voice synthesis and curriculum decomposition via secure backend server endpoints.</li>
        <li><strong>Simli (WebRTC):</strong> Real-time facial avatar animation rendering for accounts with video avatars enabled.</li>
        <li><strong>Vercel &amp; Vercel Analytics:</strong> Web hosting, edge delivery, and privacy-friendly, anonymized performance analytics without cookies.</li>
      </ul>

      <h2>5. Protection of Minor Students</h2>
      <p>
        Because our platform is designed for school students aged approximately 11 to 18 (Classes 6–12), we maintain
        heightened safeguards:
      </p>
      <ul>
        <li>Zero behavioral profiling or cross-site tracking.</li>
        <li>No public forums or unfiltered student-to-student messaging.</li>
        <li>Parents and guardians may review, request modifications to, or delete their child's learning history at any time.</li>
      </ul>

      <h2>6. Your Data Rights &amp; Deletion</h2>
      <p>You have full ownership and control over your personal information:</p>
      <div className="legal-box">
        <h3>Right to Erasure &amp; Export:</h3>
        <p>
          To request permanent deletion of your account, learning history, and chalkboard notes, or to request a full export
          of your personal data, email our Data Protection Officer at: <Mail />
        </p>
        <p>All data deletion requests are verified and executed within 7 business days.</p>
      </div>

      <h2>7. Security Safeguards</h2>
      <p>
        We implement comprehensive security measures including end-to-end HTTPS/TLS encryption, PostgreSQL Row Level
        Security (RLS) policies, HMAC-signed session tokens, and automated rate-limiting guards against brute-force attacks.
      </p>

      <h2>8. Contact &amp; Grievance Officer</h2>
      <p>For any privacy concerns, data inquiries, or regulatory compliance questions, please contact:</p>
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
    <Shell title="Terms of Service" tag="Official Legal Agreement">
      <h2>1. Acceptance of Terms &amp; Scope of Service</h2>
      <p>
        Welcome to <strong>Anaxly</strong> ("the Platform", "we", "us", or "our"). By registering an account, logging in
        via Google OAuth or email, or accessing any part of the service, you ("User" or "Student") agree to be bound by
        these Terms of Service ("Terms") and our Privacy Policy.
      </p>
      <p>
        The Platform is exclusively designed for school education across <strong>Classes 6 to 12</strong> under recognized
        curricula including <strong>CBSE, ICSE, and IB</strong>. If you are under 18 years of age, you confirm that you
        have obtained parental or legal guardian consent to use this platform.
      </p>

      <h2>2. Socratic Educational Cadence &amp; Digital Chalkboard</h2>
      <p>
        Anaxly delivers real-time Socratic oral instruction paired with an interactive digital chalkboard. The tutor
        operates on a 6-stage pedagogical cadence: intuitive hook, scientific formulation, worked examples, step-by-step
        numerical derivations, understanding checks, and authentic board-exam practice questions.
      </p>
      <p>
        The live chalkboard acts as the primary source of truth for your learning sessions. All diagrams, mathematical
        graphs (rendered via vector math), and written proofs generated during your class are saved directly into your
        personal <strong>Master Notes</strong> archive for study and review.
      </p>

      <h2>3. User Accounts &amp; Authentication</h2>
      <p>When creating an account through Google OAuth or passwordless email verification, you agree to:</p>
      <ul>
        <li>Provide accurate, genuine information regarding your current academic grade (Classes 6–12) and target board.</li>
        <li>Maintain the confidentiality of your account authentication credentials.</li>
        <li>Notify us immediately of any unauthorized access or security breach regarding your account.</li>
      </ul>

      <h2>4. Platform Prototype Status &amp; Usage Quotas</h2>
      <div className="legal-box">
        <h3>Notice of Prototype Stage:</h3>
        <p>
          The platform is currently operating in an active prototype and preview release. Usage allowances—including
          limits on the total number of AI voice requests or total topic capsules you can unlock—are managed by administrators.
        </p>
        <p>We are still building this is just a prototype, for more limits contact <Mail />.</p>
      </div>

      <h2>5. AI Voice &amp; Video Avatar Technology</h2>
      <p>
        Anaxly leverages Google Gemini bidirectional streaming audio and Simli WebRTC facial rendering. When entering the
        digital classroom, you may interact using your microphone or text chat.
      </p>
      <p>
        Students whose accounts have avatar permissions enabled will see real-time lip-synced teacher animations. Accounts
        designated for audio-only mode will hear crystal-clear audio instruction and view live chalkboard notes without
        video avatar rendering.
      </p>

      <h2>6. Academic Integrity &amp; Prohibited Conduct</h2>
      <p>You agree NOT to:</p>
      <ul>
        <li>Use the platform for academic dishonesty, automated exam cheating, or plagiaristic misconduct.</li>
        <li>Attempt prompt injection, reverse engineering, unauthorized API scraping, or bypassing access control barriers.</li>
        <li>Submit harmful, profane, abusive, or sexually explicit prompts or media to the AI tutor.</li>
        <li>Interfere with, disrupt, or overburden our servers, WebRTC relays, or network infrastructure.</li>
      </ul>

      <h2>7. Intellectual Property Rights</h2>
      <p>
        <strong>Your Master Notes:</strong> You retain full rights and ownership of your personal notes, annotations, and
        study session exports created on the digital chalkboard during your learning sessions.
      </p>
      <p>
        <strong>Platform IP:</strong> All software architecture, proprietary Socratic prompt systems, vector graphics
        engines, UI/UX designs, and mascot artwork remain the exclusive intellectual property of Anaxly.
      </p>

      <h2>8. Disclaimer of Warranties &amp; Educational Guarantee</h2>
      <p>
        The platform is provided on an "AS IS" and "AS AVAILABLE" basis. While our curriculum ingestion pipelines adhere
        strictly to official NCERT, CBSE, ICSE, and IB syllabi, Anaxly is a supplemental pedagogical tool and does not
        guarantee specific school examination marks or academic rankings.
      </p>

      <h2>9. Contact &amp; Inquiries</h2>
      <p>If you have any questions, feedback, or quota upgrade inquiries regarding these Terms, please contact our team directly:</p>
      <div className="legal-box">
        <h3>Platform Administrator</h3>
        <p><Mail /></p>
      </div>
    </Shell>
  )
}
