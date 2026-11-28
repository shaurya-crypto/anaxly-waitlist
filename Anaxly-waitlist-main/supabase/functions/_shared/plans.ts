export type PlanId = 'free' | 'scholar' | 'topper' | 'mastery'
export type BillingCycle = 'monthly' | 'annual'

export const PLANS: Record<PlanId, { name: string; monthly: number; annual: number }> = {
  free: { name: 'Chalkboard Free', monthly: 0, annual: 0 },
  scholar: { name: 'Scholar', monthly: 499, annual: 399 },
  topper: { name: 'Topper Pro', monthly: 1099, annual: 899 },
  mastery: { name: 'Mastery Infinity', monthly: 1999, annual: 1499 },
}

export const REFERRAL_DISCOUNT_PERCENT = 10

export function isPlanId(v: unknown): v is PlanId {
  return typeof v === 'string' && v in PLANS
}

export function isPaidPlanId(v: unknown): v is Exclude<PlanId, 'free'> {
  return isPlanId(v) && v !== 'free'
}

export function isBillingCycle(v: unknown): v is BillingCycle {
  return v === 'monthly' || v === 'annual'
}

export function computeBaseAmountPaise(plan: Exclude<PlanId, 'free'>, cycle: BillingCycle): number {
  const info = PLANS[plan]
  const totalInr = cycle === 'annual' ? info.annual * 12 : info.monthly
  return totalInr * 100
}

export function formatInrFromPaise(paise: number): string {
  const rupees = Math.round(paise / 100)
  return `₹${rupees.toLocaleString('en-IN')}`
}
