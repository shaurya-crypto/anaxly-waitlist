// Supabase Edge Function: sends and verifies 6-digit email OTPs via Brevo (no-reply@anaxly.in).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { esc, getOtpSender, sendBrevoEmail } from '../_shared/brevo.ts'
import { handleCors, json } from '../_shared/cors.ts'
import { generateOtp6, hmacSha256Hex, signVerificationToken, timingSafeEqual } from '../_shared/crypto.ts'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

const env = (k: string) => {
  const v = Deno.env.get(k)
  if (!v) throw new Error(`missing secret ${k}`)
  return v
}

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405)

  const body = await req.json().catch(() => ({}))
  const action = body?.action
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, error: 'invalid_email', message: 'Please enter a valid email address.' }, 400)
  }

  const secret = env('WAITLIST_FUNCTION_SECRET')
  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))

  if (action === 'send') {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const { data: recentOtps, error: recentErr } = await db
      .from('waitlist_otps')
      .select('id, created_at')
      .eq('email', email)
      .gte('created_at', fifteenMinsAgo)
      .order('created_at', { ascending: false })

    if (recentErr) {
      console.error('otp rate-limit query failed:', recentErr.message)
      return json({ ok: false, error: 'server_error', message: 'Unable to send OTP right now.' }, 500)
    }

    if (recentOtps && recentOtps.length > 0) {
      const latestMs = new Date(recentOtps[0].created_at).getTime()
      const elapsedSec = Math.floor((Date.now() - latestMs) / 1000)
      if (elapsedSec < 45) {
        return json({
          ok: false,
          error: 'rate_limited',
          retryAfter: 45 - elapsedSec,
          message: `Please wait ${45 - elapsedSec}s before requesting a new code.`,
        }, 429)
      }
      if (recentOtps.length >= 5) {
        return json({
          ok: false,
          error: 'rate_limited',
          message: 'Too many verification requests. Please try again in 15 minutes.',
        }, 429)
      }
    }

    const otp = generateOtp6()
    const otpHash = await hmacSha256Hex(secret, `otp:${email}:${otp}`)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { data: insertedOtp, error: insertErr } = await db
      .from('waitlist_otps')
      .insert({
        email,
        otp_hash: otpHash,
        expires_at: expiresAt,
      })
      .select('id')
      .single()

    if (insertErr || !insertedOtp) {
      console.error('otp insert failed:', insertErr?.message)
      return json({ ok: false, error: 'server_error', message: 'Unable to generate verification code.' }, 500)
    }

    const html = `
    <div style="font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#0F172A;background:#FFFFFF">
      <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1F3852;margin:0 0 8px">Anaxly Verification</p>
      <h1 style="font-size:24px;letter-spacing:-0.02em;margin:0 0 12px">Confirm your email</h1>
      <p style="font-size:15px;line-height:1.6;color:#334155">Enter this 6-digit code to verify <b>${esc(email)}</b> and continue:</p>
      <div style="background:#F8FAFC;border:1px solid #CBD5E1;border-radius:12px;padding:18px;margin:20px 0;text-align:center">
        <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:32px;font-weight:800;letter-spacing:0.24em;color:#0F172A">${esc(otp)}</span>
      </div>
      <p style="font-size:13px;line-height:1.5;color:#64748B">This code expires in 10 minutes. If you didn&rsquo;t request this, you can safely ignore this email.</p>
      <p style="font-size:12px;color:#94A3B8;margin-top:24px">&mdash; Anaxly Security</p>
    </div>`

    try {
      await sendBrevoEmail({
        toEmail: email,
        subject: `Your Anaxly verification code: ${otp}`,
        html,
        fromEmail: getOtpSender(),
      })
    } catch (err) {
      // Provider HTTP errors are logged in sendBrevoEmail; this also captures
      // fetch/network failures that otherwise look like an unexplained 502.
      console.error(
        'otp email send failed:',
        err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      )
      await db.from('waitlist_otps').delete().eq('id', insertedOtp.id)
      return json({ ok: false, error: 'email_failed', message: 'Failed to send verification email. Please check the address and try again.' }, 502)
    }

    return json({ ok: true, expiresInSeconds: 600 })
  }

  if (action === 'verify') {
    const rawOtp = typeof body?.otp === 'string' ? body.otp.replace(/\D/g, '') : ''
    if (rawOtp.length !== 6) {
      return json({ ok: false, error: 'invalid_otp', message: 'Enter the 6-digit verification code.' }, 400)
    }

    const { data: otpRow, error: fetchErr } = await db
      .from('waitlist_otps')
      .select('*')
      .eq('email', email)
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (fetchErr || !otpRow) {
      return json({ ok: false, error: 'otp_expired', message: 'Verification code expired or not found. Please request a new code.' }, 400)
    }

    if (otpRow.attempts >= 5) {
      return json({ ok: false, error: 'too_many_attempts', message: 'Too many wrong attempts. Please request a new code.' }, 400)
    }

    const expectedHash = await hmacSha256Hex(secret, `otp:${email}:${rawOtp}`)
    if (!timingSafeEqual(expectedHash, otpRow.otp_hash)) {
      await db.from('waitlist_otps').update({ attempts: otpRow.attempts + 1 }).eq('id', otpRow.id)
      return json({ ok: false, error: 'invalid_otp', message: 'Incorrect verification code. Please check and try again.' }, 400)
    }

    const nowIso = new Date().toISOString()
    await db.from('waitlist_otps').update({ verified_at: nowIso }).eq('id', otpRow.id)
    await db
      .from('waitlist')
      .update({ email_verified: true, email_verified_at: nowIso })
      .eq('email', email)

    const verificationToken = await signVerificationToken(secret, email)
    return json({ ok: true, verificationToken })
  }

  return json({ ok: false, error: 'invalid_action' }, 400)
})
