// ============================================================================
// PLAN LIFECYCLE — trial → paid plan → frozen.
//
// Mirrors the guest Desk pattern (lib/desk.ts): during the trial there is no
// account, so plan state lives in the browser. The shape here is intentionally
// small and serializable so it can later be swapped for a Supabase-backed
// subscription record WITHOUT changing any UI — the components only ever read
// getPlan() / the derived helpers below.
// ============================================================================

export type PlanTier = "foundation" | "pro" | "elite"
export type AccountStatus = "trial" | "active" | "frozen"

export type PlanState = {
  tier: PlanTier
  status: AccountStatus
  // Epoch ms when the trial ends (used to show the countdown / auto-freeze in a
  // real backend). In this demo we let the dev switch drive status directly.
  trialEndsAt: number
}

// How many markets each PAID tier may monitor simultaneously.
export const TICKER_LIMIT: Record<PlanTier, number> = {
  foundation: 1,
  pro: 3,
  elite: 8,
}

// The trial gives full Elite features but a capped number of monitored markets,
// so Elite's extra capacity stays a reason to upgrade after the trial.
export const TRIAL_LIMIT = 3
export const TRIAL_DAYS = 5

export type PlanMeta = {
  tier: PlanTier
  name: string
  price: string
  limit: number
  blurb: string
  perks: string[]
}

// Display metadata for the /plan page. Prices are placeholders until billing.
export const PLAN_META: PlanMeta[] = [
  {
    tier: "foundation",
    name: "Foundation",
    price: "$29/mo",
    limit: TICKER_LIMIT.foundation,
    blurb: "Watch one market, dialed in.",
    perks: ["1 monitored market", "Live Path + alerts", "Full strategy match"],
  },
  {
    tier: "pro",
    name: "Pro",
    price: "$75/mo",
    limit: TICKER_LIMIT.pro,
    blurb: "Run a few markets at once.",
    perks: ["3 monitored markets", "Live Path + alerts", "Priority signal refresh"],
  },
  {
    tier: "elite",
    name: "Elite",
    price: "$199/mo",
    limit: TICKER_LIMIT.elite,
    blurb: "Full coverage plus market requests.",
    perks: ["8 monitored markets", "Request new markets", "Everything in Pro"],
  },
]

const KEY = "sightline.plan.v1"

const DEFAULT_STATE: PlanState = {
  tier: "elite",
  status: "trial",
  trialEndsAt: 0,
}

function read(): PlanState {
  if (typeof window === "undefined") return DEFAULT_STATE
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) {
      // First visit starts a 5-day trial.
      const seeded: PlanState = {
        ...DEFAULT_STATE,
        trialEndsAt: Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
      }
      window.localStorage.setItem(KEY, JSON.stringify(seeded))
      return seeded
    }
    return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<PlanState>) }
  } catch {
    return DEFAULT_STATE
  }
}

export function getPlan(): PlanState {
  return read()
}

export function setPlan(next: Partial<PlanState>): PlanState {
  const merged = { ...read(), ...next }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(merged))
    window.dispatchEvent(new CustomEvent("plan:changed"))
  }
  return merged
}

// How many markets the account may monitor right now.
// - trial  → TRIAL_LIMIT (full features, capped markets)
// - active → the paid tier's limit
// - frozen → 0 (existing markets stay visible, but no new ones and no updates)
export function effectiveTickerLimit(state: PlanState = read()): number {
  if (state.status === "frozen") return 0
  if (state.status === "trial") return TRIAL_LIMIT
  return TICKER_LIMIT[state.tier]
}

export function isFrozen(state: PlanState = read()): boolean {
  return state.status === "frozen"
}

// Human label for the current status (used in banners / the plan page).
export function statusLabel(state: PlanState = read()): string {
  if (state.status === "frozen") return "Frozen"
  if (state.status === "trial") return "Free trial"
  return PLAN_META.find((p) => p.tier === state.tier)?.name ?? "Active"
}

export function trialDaysLeft(state: PlanState = read()): number {
  if (state.status !== "trial" || !state.trialEndsAt) return 0
  return Math.max(0, Math.ceil((state.trialEndsAt - Date.now()) / (24 * 60 * 60 * 1000)))
}
