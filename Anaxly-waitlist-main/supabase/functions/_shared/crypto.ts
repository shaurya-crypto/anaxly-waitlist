const enc = new TextEncoder()

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function toBase64Url(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4)
  return atob(padded)
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return toHex(new Uint8Array(sig))
}

export async function signVerificationToken(secret: string, email: string, ttlSeconds = 7200): Promise<string> {
  const payload = JSON.stringify({
    email: email.toLowerCase().trim(),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  })
  const encoded = toBase64Url(payload)
  const sig = await hmacSha256Hex(secret, `otp_verified:${encoded}`)
  return `${encoded}.${sig}`
}

export async function verifyVerificationToken(
  secret: string,
  token: unknown,
  expectedEmail: string,
): Promise<boolean> {
  if (typeof token !== 'string' || !token.includes('.')) return false
  const [encoded, sig] = token.split('.', 2)
  if (!encoded || !sig) return false
  const expectedSig = await hmacSha256Hex(secret, `otp_verified:${encoded}`)
  if (!timingSafeEqual(sig, expectedSig)) return false
  try {
    const parsed = JSON.parse(fromBase64Url(encoded)) as { email?: string; exp?: number }
    if (parsed.email !== expectedEmail.toLowerCase().trim()) return false
    if (typeof parsed.exp !== 'number' || parsed.exp < Math.floor(Date.now() / 1000)) return false
    return true
  } catch {
    return false
  }
}

export function generateOtp6(): string {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return String(arr[0] % 1_000_000).padStart(6, '0')
}
