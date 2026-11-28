import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import {
  PLANS as SHARED_PLANS,
  REFERRAL_DISCOUNT_PERCENT,
  computeBaseAmountPaise,
  formatInrFromPaise,
} from '../supabase/functions/_shared/plans.ts'
import {
  generateOtp6,
  hmacSha256Hex,
  signVerificationToken,
  timingSafeEqual,
  verifyVerificationToken,
} from '../supabase/functions/_shared/crypto.ts'
import {
  buildSubscriptionConfirmationHtml,
  dispatchSubscriptionEmailIfNeeded,
  esc,
  parseSender,
  type EmailClaimStore,
} from '../supabase/functions/_shared/brevo.ts'
import { PLANS as FRONTEND_PLANS } from '../src/lib/plans.ts'

test('frontend and edge function plan prices stay in exact parity', () => {
  for (const fp of FRONTEND_PLANS) {
    const sp = SHARED_PLANS[fp.id]
    assert.ok(sp, `missing plan ${fp.id} in shared plans`)
    assert.equal(fp.monthly, sp.monthly)
    assert.equal(fp.annual, sp.annual)
    assert.equal(fp.name, sp.name)
  }
  assert.equal(computeBaseAmountPaise('scholar', 'monthly'), 49900)
  assert.equal(computeBaseAmountPaise('scholar', 'annual'), 478800)
  assert.equal(computeBaseAmountPaise('topper', 'annual'), 1078800)
  assert.equal(computeBaseAmountPaise('mastery', 'annual'), 1798800)
  assert.equal(formatInrFromPaise(1078800), '₹10,788')
  assert.equal(REFERRAL_DISCOUNT_PERCENT, 10)
})

test('OTP generation and HMAC verification token enforce email & expiry', async () => {
  const otp = generateOtp6()
  assert.match(otp, /^\d{6}$/)

  const secret = 'test-waitlist-secret'
  const token = await signVerificationToken(secret, 'Student@Example.com')
  assert.equal(await verifyVerificationToken(secret, token, 'student@example.com'), true)
  assert.equal(await verifyVerificationToken(secret, token, 'other@example.com'), false)
  assert.equal(await verifyVerificationToken('wrong-secret', token, 'student@example.com'), false)
  assert.equal(await verifyVerificationToken(secret, `${token}x`, 'student@example.com'), false)

  const expired = await signVerificationToken(secret, 'student@example.com', -5)
  assert.equal(await verifyVerificationToken(secret, expired, 'student@example.com'), false)
})

test('hmacSha256Hex matches Node crypto Razorpay signature format', async () => {
  const secret = 'rzp_test_secret_123'
  const payload = 'order_12345|pay_67890'
  const got = await hmacSha256Hex(secret, payload)
  const expected = createHmac('sha256', secret).update(payload).digest('hex')
  assert.equal(got, expected)
  assert.equal(timingSafeEqual(got, expected), true)
  assert.equal(timingSafeEqual(got, `${expected.slice(0, -1)}0`), false)
})

test('email helpers escape HTML and build subscription confirmation', () => {
  assert.deepEqual(parseSender('Anaxly <support@anaxly.in>'), { name: 'Anaxly', email: 'support@anaxly.in' })
  assert.equal(esc('<script>alert("x")</script>'), '&#60;script&#62;alert(&#34;x&#34;)&#60;/script&#62;')

  const html = buildSubscriptionConfirmationHtml({
    email: 'student@example.com',
    plan: 'topper',
    billingCycle: 'annual',
    amountPaidPaise: 970900,
    discountPaise: 107900,
    appliedCode: 'EARLY10',
    paymentId: 'pay_test123',
    orderId: 'order_test123',
    referralCode: 'AB12CD34',
    startsAt: '2026-11-28T00:00:00.000Z',
    endsAt: '2027-11-28T00:00:00.000Z',
  })
  assert.match(html, /Topper Pro/)
  assert.match(html, /EARLY10/)
  assert.match(html, /pay_test123/)
  assert.match(html, /order_test123/)
  assert.match(html, /AB12CD34/)
  assert.match(html, /support@anaxly\.in/)
})

test('dispatchSubscriptionEmailIfNeeded prevents duplicate concurrent sends and releases on failure', async () => {
  let sentAt: string | null = null
  const store: EmailClaimStore = {
    async claim(_email, claimIso) {
      if (sentAt !== null) return false
      sentAt = claimIso
      return true
    },
    async release(_email, claimIso) {
      if (sentAt === claimIso) sentAt = null
    },
  }

  let fetchCalls = 0
  let failNextFetch = false
  const origFetch = globalThis.fetch
  const g = globalThis as Record<string, unknown>
  const origDeno = g.Deno

  const rpcPayload = {
    email: 'student@example.com',
    plan: 'topper',
    billing_cycle: 'annual',
    amount_paid_paise: 970900,
    discount_paise: 107900,
    applied_code: 'EARLY10',
    payment_id: 'pay_test123',
    referral_code: 'AB12CD34',
    subscription_starts_at: '2026-11-28T00:00:00.000Z',
    subscription_ends_at: '2027-11-28T00:00:00.000Z',
    subscription_email_sent_at: null,
  }

  try {
    g.Deno = { env: { get: (k: string) => (k === 'BREVO_API_KEY' ? 'xkeysib-test' : undefined) } }
    globalThis.fetch = async () => {
      fetchCalls++
      if (failNextFetch) return new Response('err', { status: 500 })
      return new Response('{}', { status: 200 })
    }

    // 1. Failure releases claim lock
    failNextFetch = true
    assert.equal(await dispatchSubscriptionEmailIfNeeded(store, rpcPayload, 'order_123'), false)
    assert.equal(sentAt, null)
    assert.equal(fetchCalls, 1)

    // 2. Concurrent calls only send ONCE
    failNextFetch = false
    const [r1, r2, r3] = await Promise.all([
      dispatchSubscriptionEmailIfNeeded(store, rpcPayload, 'order_123'),
      dispatchSubscriptionEmailIfNeeded(store, rpcPayload, 'order_123'),
      dispatchSubscriptionEmailIfNeeded(store, rpcPayload, 'order_123'),
    ])
    assert.deepEqual([r1, r2, r3], [true, true, true])
    assert.equal(fetchCalls, 2)
    assert.ok(sentAt)

    // 3. Already sent in RPC payload returns true immediately without claiming
    assert.equal(
      await dispatchSubscriptionEmailIfNeeded(
        store,
        { ...rpcPayload, subscription_email_sent_at: '2026-11-28T00:00:00.000Z' },
        'order_123',
      ),
      true,
    )
    assert.equal(fetchCalls, 2)
  } finally {
    globalThis.fetch = origFetch
    if (origDeno === undefined) delete g.Deno
    else g.Deno = origDeno
  }
})
