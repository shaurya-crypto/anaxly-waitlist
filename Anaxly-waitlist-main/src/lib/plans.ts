import type { PlanId } from './supabase'

// Copied from the main Anaxly pricing page (AI_TUTOR src/app/pricing/page.tsx).
export const PLANS: { id: PlanId; name: string; badge: string; popular: boolean; desc: string; monthly: number; annual: number; savings: string; cta: string; features: string[] }[] = [
  {
    id: 'free', name: 'Chalkboard Free', badge: 'Free forever', popular: false,
    desc: 'The ultimate visual discovery engine. Interactive digital chalkboard and dynamic science diagrams forever.',
    monthly: 0, annual: 0, savings: '', cta: 'Get Started Free',
    features: [
      'Interactive Digital Chalkboard & Derivations (100% Free)',
      'Dynamic Science Diagrams & Math Graphs (100% Free)',
      '3 Live Socratic Classes / month (~1 hour total)',
      '3 Quick Last-Minute Summaries / month',
      'CBSE, ICSE & IB Core Curriculum standards',
    ],
  },
  {
    id: 'scholar', name: 'Scholar', badge: 'Syllabus Completion', popular: false,
    desc: '1-on-1 Socratic Audio Tutor guaranteeing complete school syllabus coverage if taken properly.',
    monthly: 499, annual: 399, savings: '₹4,788 billed annually (Save 20%)', cta: 'Start Scholar Plan',
    features: [
      'Interactive Chalkboard & Math Graphs (100% Free)',
      '8 Live Socratic Classes / month (80 classes over term)',
      'Guaranteed School Syllabus Coverage (Maths & Science)',
      'Unlimited Quick Last-Minute Summaries & Flashcards',
      'Downloadable Unwatermarked Clean PDF Master Notes',
    ],
  },
  {
    id: 'topper', name: 'Topper Pro', badge: 'Most Popular', popular: true,
    desc: 'Face-to-face live video tutoring for 100% of your classes, past exam solver & exam blitz.',
    monthly: 1099, annual: 899, savings: '₹10,788 billed annually (Save 18%)', cta: 'Start Topper Pro',
    features: [
      '15 Live Classes / month — ALL with Face-to-Face Video Teacher',
      '150 Live Face-to-Face Video Classes across the school academic year',
      'Full 10-Year Board PYQ Solver with Step-by-Step Marking Keys',
      '10-Minute Morning High-Yield Exam Blitz Mode',
      'Interactive Chalkboard & Visual Diagrams (100% Free)',
    ],
  },
  {
    id: 'mastery', name: 'Mastery Infinity', badge: 'Ultimate Academic Shield', popular: false,
    desc: 'Nearly daily 1-on-1 live video tutoring, notebook camera homework diagnostics & parent WhatsApp reports.',
    monthly: 1999, annual: 1499, savings: '₹17,988 billed annually (Save 25%)', cta: 'Join Mastery Infinity',
    features: [
      '24 Live Classes / month — ALL with Face-to-Face Video Teacher',
      '240 Live Face-to-Face Video Classes across the school academic year',
      'Notebook Camera Step-by-Step Homework Error Check',
      'Timed Board Mock Exam Simulator with Automated Grading',
      'Parent WhatsApp Weekly Progress Card & All Boards Prep',
    ],
  },
]
