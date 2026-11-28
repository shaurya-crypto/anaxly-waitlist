// Supabase Edge Function: Razorpay asynchronous webhook handler for waitlist orders.
// Guarantees subscription activation & Brevo confirmation email even if the browser closes mid-redirect.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createWaitlistEmailStore, dispatchSubscriptionEmailIfNeeded, type WaitlistDbLike } from '../_shared/brevo.ts'
import { hmacSha256Hex, timingSafeEqual } from '../_shared/crypto.ts'

const env = (k: string) => {
  const v = Deno.env.get(k)
  if (!v) throw new Error(`missing secret ${k}`)
  return v
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

  const rawBody = await req.text()
  const signature = req.headers.get('x-razorpay-signature')
  const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')

  if (!webhookSecret) return new Response('webhook secret not configured', { status: 500 })
  if (!signature) return new Response('missing signature', { status: 400 })

  const expectedSig = await hmacSha256Hex(webhookSecret, rawBody)
  if (!timingSafeEqual(expectedSig, signature)) {
    return new Response('invalid signature', { status: 400 })
  }

  let event: Record<string, unknown>
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return new Response('invalid json', { status: 400 })
  }

  if (event?.event !== 'order.paid' && event?.event !== 'payment.captured') {
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  const payload = (event?.payload ?? {}) as Record<string, Record<string, Record<string, unknown>>>
  const paymentEntity = payload?.payment?.entity ?? {}
  const orderEntity = payload?.order?.entity ?? {}
  const orderId = paymentEntity.order_id || orderEntity.id
  const paymentId = paymentEntity.id

  if (typeof orderId !== 'string' || typeof paymentId !== 'string') {
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
  const { data: orderRow } = await db
    .from('waitlist_orders')
    .select('order_id, final_amount_paise')
    .eq('order_id', orderId)
    .maybeSingle()

  if (!orderRow) {
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }

  if (typeof paymentEntity.amount === 'number' && paymentEntity.amount !== orderRow.final_amount_paise) {
    console.error('webhook amount mismatch', orderId, paymentEntity.amount, orderRow.final_amount_paise)
    return new Response('amount mismatch', { status: 400 })
  }

  const { data: rpcData, error: rpcErr } = await db.rpc('complete_waitlist_payment', {
    p_order_id: orderId,
    p_payment_id: paymentId,
    p_signature: null,
  })

  if (rpcErr || !rpcData?.ok) {
    console.error('webhook complete_waitlist_payment failed:', rpcErr?.message, rpcData)
    return new Response('internal error', { status: 500 })
  }

  await dispatchSubscriptionEmailIfNeeded(
    createWaitlistEmailStore(db as unknown as WaitlistDbLike),
    rpcData as Record<string, unknown>,
    orderId,
    paymentId,
  )

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
})
