// Supabase Edge Function: handles "One code, one use" validation, verified waitlist reservation,
// Razorpay order creation, payment signature verification, and immediate Brevo subscription confirmation email.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { createWaitlistEmailStore, dispatchSubscriptionEmailIfNeeded, type WaitlistDbLike } from '../_shared/brevo.ts'
import { handleCors, json } from '../_shared/cors.ts'
import { hmacSha256Hex, timingSafeEqual, verifyVerificationToken } from '../_shared/crypto.ts'
import {
  REFERRAL_DISCOUNT_PERCENT,
  computeBaseAmountPaise,
  formatInrFromPaise,
  isBillingCycle,
  isPaidPlanId,
  isPlanId,
  type BillingCycle,
  type PlanId,
} from '../_shared/plans.ts'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const env = (k: string) => {
  const v = Deno.env.get(k)
  if (!v) throw new Error(`missing secret ${k}`)
  return v
}

type CodeResolution =
  | {
    ok: true
    code: string | null
    codeType: 'referral' | 'promo' | null
    discountPaise: number
    label: string | null
  }
  | {
    ok: false
    reason: string
    message: string
  }

async function resolveSingleCode(params: {
  db: SupabaseClient
  email: string
  plan: PlanId
  cycle: BillingCycle
  rawCode?: unknown
}): Promise<CodeResolution> {
  const code = typeof params.rawCode === 'string' ? params.rawCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') : ''
  if (!code) {
    return { ok: true, code: null, codeType: null, discountPaise: 0, label: null }
  }

  // Enforce "One code, one use": an email can only ever redeem one code across paid checkouts.
  if (params.email) {
    const { data: existingRedemption } = await params.db
      .from('waitlist_code_redemptions')
      .select('code')
      .eq('email', params.email)
      .maybeSingle()

    if (existingRedemption) {
      return {
        ok: false,
        reason: 'already_redeemed',
        message: `You already redeemed code ${existingRedemption.code}. Only one code can be used per account.`,
      }
    }
  }

  const basePaise = params.plan === 'free' ? 0 : computeBaseAmountPaise(params.plan, params.cycle)

  // 1. Check promo / discount codes first
  const { data: promo } = await params.db
    .from('waitlist_promo_codes')
    .select('*')
    .eq('code', code)
    .maybeSingle()

  if (promo) {
    if (params.plan === 'free') {
      return {
        ok: false,
        reason: 'paid_plan_only',
        message: 'Discount codes apply to paid plans only. You can still apply a friend\'s referral code.',
      }
    }
    if (!promo.active) {
      return { ok: false, reason: 'inactive_code', message: 'This discount code is no longer active.' }
    }
    if (promo.expires_at && new Date(promo.expires_at).getTime() <= Date.now()) {
      return { ok: false, reason: 'expired_code', message: 'This discount code has expired.' }
    }
    if ((promo.is_single_use && promo.uses_count >= 1) || (promo.max_uses !== null && promo.uses_count >= promo.max_uses)) {
      return { ok: false, reason: 'single_use_exhausted', message: 'This single-use code has already been redeemed.' }
    }
    // Prevent concurrent checkouts by different emails from grabbing the last slot of a capped/single-use code.
    const effectiveMax = promo.is_single_use ? 1 : promo.max_uses
    if (effectiveMax !== null) {
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
      let pendingQuery = params.db
        .from('waitlist_orders')
        .select('id', { count: 'exact', head: true })
        .eq('applied_code', code)
        .eq('applied_code_type', 'promo')
        .eq('status', 'created')
        .gte('created_at', fifteenMinsAgo)
      if (params.email) {
        pendingQuery = pendingQuery.neq('email', params.email)
      }
      const { count: pendingCount } = await pendingQuery
      if (promo.uses_count + (pendingCount ?? 0) >= effectiveMax) {
        return {
          ok: false,
          reason: 'single_use_reserved',
          message: 'This single-use code is currently reserved in another active checkout. Please try again in a few minutes.',
        }
      }
    }
    if (Array.isArray(promo.applicable_plans) && promo.applicable_plans.length > 0 && !promo.applicable_plans.includes(params.plan)) {
      return { ok: false, reason: 'plan_ineligible', message: 'This code does not apply to the selected plan.' }
    }
    if (basePaise < (promo.min_amount_paise ?? 0)) {
      return {
        ok: false,
        reason: 'min_amount',
        message: `This code requires a minimum order of ${formatInrFromPaise(promo.min_amount_paise)}.`,
      }
    }

    let discountPaise = 0
    let label = ''
    if (promo.discount_type === 'percent') {
      discountPaise = Math.round((basePaise * promo.discount_value) / 100)
      label = `${promo.discount_value}% off (${code})`
    } else {
      discountPaise = Math.min(basePaise, promo.discount_value * 100)
      label = `${formatInrFromPaise(promo.discount_value * 100)} off (${code})`
    }
    discountPaise = Math.min(discountPaise, basePaise)

    return { ok: true, code, codeType: 'promo', discountPaise, label }
  }

  // 2. Otherwise check referral codes on waitlist
  const { data: refRow } = await params.db
    .from('waitlist')
    .select('email, referral_code')
    .eq('referral_code', code)
    .maybeSingle()

  if (!refRow) {
    return { ok: false, reason: 'invalid_code', message: 'That referral or discount code is not valid.' }
  }
  if (params.email && refRow.email === params.email) {
    return { ok: false, reason: 'self_referral', message: 'You cannot use your own referral code.' }
  }

  const discountPaise = Math.round((basePaise * REFERRAL_DISCOUNT_PERCENT) / 100)
  return {
    ok: true,
    code,
    codeType: 'referral',
    discountPaise,
    label: `${REFERRAL_DISCOUNT_PERCENT}% referral discount (${code})`,
  }
}

async function sendSubscriptionEmail(
  db: SupabaseClient,
  rpcResult: Record<string, unknown>,
  orderId: string,
): Promise<boolean> {
  return dispatchSubscriptionEmailIfNeeded(
    createWaitlistEmailStore(db as unknown as WaitlistDbLike),
    rpcResult,
    orderId,
  )
}

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405)

  const body = await req.json().catch(() => ({}))
  const action = body?.action
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

  const secret = env('WAITLIST_FUNCTION_SECRET')
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))

  if (action === 'validate_code') {
    if (!isPlanId(body?.plan) || !isBillingCycle(body?.billingCycle)) {
      return json({ ok: false, reason: 'invalid_plan', message: 'Invalid plan or billing cycle.' }, 400)
    }
    if (email && !EMAIL_RE.test(email)) {
      return json({ ok: false, reason: 'invalid_email', message: 'Invalid email format.' }, 400)
    }
    const basePaise = body.plan === 'free' ? 0 : computeBaseAmountPaise(body.plan, body.billingCycle)
    const resolved = await resolveSingleCode({
      db,
      email,
      plan: body.plan,
      cycle: body.billingCycle,
      rawCode: body?.code,
    })
    if (!resolved.ok) {
      return json({
        ok: false,
        reason: resolved.reason,
        message: resolved.message,
        baseAmountPaise: basePaise,
        discountPaise: 0,
        finalAmountPaise: basePaise,
      }, 200)
    }
    let finalPaise = Math.max(0, basePaise - resolved.discountPaise)
    if (finalPaise > 0 && finalPaise < 100) finalPaise = 100

    return json({
      ok: true,
      code: resolved.code,
      codeType: resolved.codeType,
      label: resolved.label,
      baseAmountPaise: basePaise,
      discountPaise: basePaise - finalPaise,
      finalAmountPaise: finalPaise,
    })
  }

  // All mutating actions require a valid OTP-verified email + token
  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, error: 'invalid_email', message: 'Please enter a valid email address.' }, 400)
  }
  const verified = await verifyVerificationToken(secret, body?.verificationToken, email)
  if (!verified) {
    return json({ ok: false, error: 'email_not_verified', message: 'Please verify your email with the 6-digit OTP first.' }, 401)
  }

  if (action === 'reserve_waitlist') {
    if (!isPlanId(body?.plan) || !isBillingCycle(body?.billingCycle)) {
      return json({ ok: false, error: 'invalid_plan', message: 'Invalid plan selection.' }, 400)
    }

    const { data: existing } = await db
      .from('waitlist')
      .select('id, payment_status, referral_code, referred_by')
      .eq('email', email)
      .maybeSingle()

    if (existing?.payment_status === 'paid') {
      return json({
        ok: false,
        error: 'already_paid',
        message: 'This email already has an active paid subscription.',
      }, 409)
    }

    let referredBy: string | null = existing?.referred_by ?? null
    const rawCode = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : ''
    if (rawCode && referredBy && rawCode !== referredBy) {
      return json({
        ok: false,
        error: 'already_referred',
        message: `Referral code ${referredBy} is already linked to your email. Only one code can be used.`,
      }, 400)
    }
    if (rawCode && !referredBy) {
      const resolved = await resolveSingleCode({
        db,
        email,
        plan: body.plan,
        cycle: body.billingCycle,
        rawCode,
      })
      if (!resolved.ok) {
        return json({ ok: false, error: resolved.reason, message: resolved.message }, 400)
      }
      if (resolved.codeType === 'promo') {
        return json({
          ok: false,
          error: 'promo_checkout_only',
          message: 'Discount codes are applied at checkout. Clear the code to reserve without paying, or complete payment now.',
        }, 400)
      }
      if (resolved.codeType === 'referral') {
        referredBy = resolved.code
      }
    }

    const nowIso = new Date().toISOString()
    const { data: saved, error: upsertErr } = await db
      .from('waitlist')
      .upsert({
        email,
        plan: body.plan,
        billing_cycle: body.billingCycle,
        email_verified: true,
        email_verified_at: nowIso,
        referred_by: referredBy,
        updated_at: nowIso,
      }, { onConflict: 'email' })
      .select('referral_code')
      .single()

    if (upsertErr || !saved) {
      console.error('reserve_waitlist upsert failed:', upsertErr?.message)
      return json({ ok: false, error: 'server_error', message: 'Could not save your waitlist seat.' }, 500)
    }

    return json({ ok: true, referralCode: saved.referral_code })
  }

  if (action === 'create_order') {
    if (!isPaidPlanId(body?.plan) || !isBillingCycle(body?.billingCycle)) {
      return json({ ok: false, error: 'invalid_plan', message: 'Choose a paid plan (Scholar, Topper Pro, or Mastery).' }, 400)
    }

    const { data: existingWaitlist } = await db
      .from('waitlist')
      .select('payment_status')
      .eq('email', email)
      .maybeSingle()

    if (existingWaitlist?.payment_status === 'paid') {
      return json({
        ok: false,
        error: 'already_subscribed',
        message: 'This email already has an active paid subscription.',
      }, 409)
    }

    const basePaise = computeBaseAmountPaise(body.plan, body.billingCycle)
    const resolved = await resolveSingleCode({
      db,
      email,
      plan: body.plan,
      cycle: body.billingCycle,
      rawCode: body?.code,
    })
    if (!resolved.ok) {
      return json({ ok: false, error: resolved.reason, message: resolved.message }, 400)
    }

    let finalPaise = Math.max(0, basePaise - resolved.discountPaise)
    if (finalPaise > 0 && finalPaise < 100) finalPaise = 100
    const discountPaise = basePaise - finalPaise

    // Handle 100% discount promo codes without invoking Razorpay
    if (finalPaise === 0) {
      const freeOrderId = `order_promo_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`
      const freePaymentId = `pay_promo_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`
      const { error: freeInsertErr } = await db.from('waitlist_orders').insert({
        order_id: freeOrderId,
        email,
        plan: body.plan,
        billing_cycle: body.billingCycle,
        base_amount_paise: basePaise,
        discount_paise: discountPaise,
        final_amount_paise: 0,
        currency: 'INR',
        applied_code: resolved.code,
        applied_code_type: resolved.codeType,
        status: 'created',
      })
      if (freeInsertErr) {
        console.error('free waitlist_orders insert failed:', freeInsertErr.message)
        return json({ ok: false, error: 'server_error', message: 'Unable to record order.' }, 500)
      }
      const { data: rpcData, error: rpcErr } = await db.rpc('complete_waitlist_payment', {
        p_order_id: freeOrderId,
        p_payment_id: freePaymentId,
        p_signature: null,
      })
      if (rpcErr || !rpcData?.ok) {
        return json({ ok: false, error: 'activation_failed', message: 'Failed to activate subscription.' }, 500)
      }
      const emailSent = await sendSubscriptionEmail(db, rpcData, freeOrderId)
      return json({
        ok: true,
        zeroPaymentCompleted: true,
        emailSent,
        subscription: {
          email,
          plan: body.plan,
          billingCycle: body.billingCycle,
          amountPaidPaise: 0,
          discountPaise,
          appliedCode: resolved.code,
          paymentId: freePaymentId,
          orderId: freeOrderId,
          referralCode: rpcData.referral_code,
          startsAt: rpcData.subscription_starts_at,
          endsAt: rpcData.subscription_ends_at,
        },
      })
    }

    const rzpKeyId = env('RAZORPAY_KEY_ID')
    const rzpKeySecret = env('RAZORPAY_KEY_SECRET')
    const receipt = `anx_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`

    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${rzpKeyId}:${rzpKeySecret}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: finalPaise,
        currency: 'INR',
        receipt,
        notes: {
          email,
          plan: body.plan,
          billingCycle: body.billingCycle,
          appliedCode: resolved.code ?? '',
          appliedCodeType: resolved.codeType ?? '',
          source: 'anaxly-waitlist',
        },
      }),
    })

    if (!rzpRes.ok) {
      const errText = await rzpRes.text()
      console.error('Razorpay order creation failed:', rzpRes.status, errText)
      return json({ ok: false, error: 'razorpay_order_failed', message: 'Could not initialize payment gateway. Please try again.' }, 502)
    }

    const rzpOrder = await rzpRes.json()
    const orderId = String(rzpOrder.id)

    const { error: orderInsertErr } = await db.from('waitlist_orders').insert({
      order_id: orderId,
      email,
      plan: body.plan,
      billing_cycle: body.billingCycle,
      base_amount_paise: basePaise,
      discount_paise: discountPaise,
      final_amount_paise: finalPaise,
      currency: 'INR',
      applied_code: resolved.code,
      applied_code_type: resolved.codeType,
      status: 'created',
      metadata: { receipt },
    })

    if (orderInsertErr) {
      console.error('waitlist_orders insert failed:', orderInsertErr.message)
      return json({ ok: false, error: 'server_error', message: 'Unable to record payment order.' }, 500)
    }

    return json({
      ok: true,
      orderId,
      amountPaise: finalPaise,
      baseAmountPaise: basePaise,
      discountPaise,
      currency: 'INR',
      keyId: rzpKeyId,
      appliedCode: resolved.code,
      appliedCodeType: resolved.codeType,
    })
  }

  if (action === 'verify_payment') {
    const orderId = typeof body?.razorpay_order_id === 'string' ? body.razorpay_order_id.trim() : ''
    const paymentId = typeof body?.razorpay_payment_id === 'string' ? body.razorpay_payment_id.trim() : ''
    const signature = typeof body?.razorpay_signature === 'string' ? body.razorpay_signature.trim() : ''

    if (!orderId || !paymentId || !signature) {
      return json({ ok: false, error: 'missing_payment_fields', message: 'Incomplete Razorpay payment response.' }, 400)
    }

    const rzpKeySecret = env('RAZORPAY_KEY_SECRET')
    const expectedSig = await hmacSha256Hex(rzpKeySecret, `${orderId}|${paymentId}`)
    if (!timingSafeEqual(expectedSig, signature)) {
      return json({ ok: false, error: 'invalid_signature', message: 'Payment signature verification failed.' }, 400)
    }

    const { data: orderRow, error: orderErr } = await db
      .from('waitlist_orders')
      .select('email')
      .eq('order_id', orderId)
      .maybeSingle()

    if (orderErr || !orderRow || orderRow.email !== email) {
      return json({ ok: false, error: 'order_not_found', message: 'Payment order not found for this email.' }, 404)
    }

    const { data: rpcData, error: rpcErr } = await db.rpc('complete_waitlist_payment', {
      p_order_id: orderId,
      p_payment_id: paymentId,
      p_signature: signature,
    })

    if (rpcErr || !rpcData?.ok) {
      console.error('complete_waitlist_payment failed:', rpcErr?.message, rpcData)
      return json({ ok: false, error: 'activation_failed', message: 'Payment succeeded but subscription activation failed. Contact support@anaxly.in.' }, 500)
    }

    const emailSent = await sendSubscriptionEmail(db, rpcData, orderId)

    return json({
      ok: true,
      emailSent,
      subscription: {
        email: rpcData.email,
        plan: rpcData.plan,
        billingCycle: rpcData.billing_cycle,
        amountPaidPaise: rpcData.amount_paid_paise,
        discountPaise: rpcData.discount_paise,
        appliedCode: rpcData.applied_code,
        paymentId: rpcData.payment_id,
        orderId,
        referralCode: rpcData.referral_code,
        startsAt: rpcData.subscription_starts_at,
        endsAt: rpcData.subscription_ends_at,
      },
    })
  }

  return json({ ok: false, error: 'invalid_action' }, 400)
})
