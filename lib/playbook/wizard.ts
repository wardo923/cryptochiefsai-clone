// ============================================================================
// THE WIZARD — beginner-facing front door to the validated roster.
//
// The user answers 5 plain-English questions. We secretly score their answers
// against the PROVEN_PAIRINGS (the 79 strategy/ticker pairings that survived
// real-cost backtesting, gold-standard survivors preferred) and hand back the
// single best-fit pairing — WITHOUT ever revealing the strategy's logic.
//
// Honesty rule baked in: the matcher can ONLY return a pairing that already
// exists in the validated set. If a user's answers map to nothing proven, it
// returns null and the UI says so plainly — never a made-up strategy.
//
// This file holds the questions (plain data, safe for the client) + the answer
// types + a data-derived volatility classifier. The actual matching lives in
// public.ts alongside decorate(), so hidden logic never crosses to the browser.
// ============================================================================

import { PROVEN_PAIRINGS } from "./mapping"
import { COINS } from "../coins"

export type AssetClassPref = "crypto" | "stocks" | "either"
export type HoldPref = "days" | "weeks" | "either"
export type SwingComfort = "calm" | "some" | "high"
export type MoverPref = "steady" | "explosive" | "any"
export type ActivityPref = "weekly" | "often" | "either"

export type WizardAnswers = {
  asset: AssetClassPref
  hold: HoldPref
  comfort: SwingComfort
  mover: MoverPref
  activity: ActivityPref
}

export type WizardOption = {
  value: string
  label: string
  desc: string
}

export type WizardQuestion = {
  id: keyof WizardAnswers
  prompt: string
  help: string
  options: WizardOption[]
}

// The 5 questions. Deliberately jargon-free — no "timeframe", "volatility",
// or "drawdown" language a beginner would not recognize.
export const WIZARD_QUESTIONS: WizardQuestion[] = [
  {
    id: "asset",
    prompt: "What do you want to trade?",
    help: "We only match you to markets we've actually tested.",
    options: [
      { value: "stocks", label: "Stocks & ETFs", desc: "Apple, Nvidia, S&P 500, and the like" },
      { value: "crypto", label: "Crypto", desc: "Bitcoin, Ethereum, Solana, and others" },
      { value: "either", label: "Show me either", desc: "I'm open — match me to whatever fits best" },
    ],
  },
  {
    id: "hold",
    prompt: "How long do you want to hold a trade?",
    help: "There's no right answer — it's about what fits your life.",
    options: [
      { value: "days", label: "A few days", desc: "In and out within the week" },
      { value: "weeks", label: "A few weeks", desc: "Patient — let the bigger move play out" },
      { value: "either", label: "No preference", desc: "Whatever has the strongest track record" },
    ],
  },
  {
    id: "comfort",
    prompt: "How do you feel about price swings?",
    help: "This sets how bumpy a ride we'll match you to.",
    options: [
      { value: "calm", label: "Keep it calm", desc: "I'd rather avoid big ups and downs" },
      { value: "some", label: "Some is fine", desc: "I can handle a normal amount of movement" },
      { value: "high", label: "Bring it on", desc: "Big swings don't rattle me" },
    ],
  },
  {
    id: "mover",
    prompt: "What kind of market appeals to you?",
    help: "Steadier names move less; explosive ones move hard in both directions.",
    options: [
      { value: "steady", label: "Steady & established", desc: "Large, well-known, slower movers" },
      { value: "explosive", label: "Fast & volatile", desc: "High-energy names that move quickly" },
      { value: "any", label: "Doesn't matter", desc: "Match me on results, not vibe" },
    ],
  },
  {
    id: "activity",
    prompt: "How often do you want to check in?",
    help: "Be honest — a plan you'll actually follow beats a perfect one you won't.",
    options: [
      { value: "weekly", label: "About once a week", desc: "I don't want to babysit it" },
      { value: "often", label: "A few times a week", desc: "I'll stay closer to it" },
      { value: "either", label: "Flexible", desc: "Whatever the strategy needs" },
    ],
  },
]

// ----------------------------------------------------------------------------
// Data-derived volatility tier per symbol.
//
// We classify each ticker by the AVERAGE worst-losing-streak (maxDrawdownR) of
// its proven pairings. This is honest — it comes straight from the backtests,
// not a hand-wave — and lets us match "calm vs explosive" preferences without
// inventing numbers.
// ----------------------------------------------------------------------------
export type VolTier = "steady" | "moderate" | "explosive"

const CRYPTO_IDS = new Set(COINS.map((c) => c.id))

export function isCryptoSymbol(symbol: string): boolean {
  return CRYPTO_IDS.has(symbol)
}

const VOL_TIER_BY_SYMBOL: Record<string, VolTier> = (() => {
  const bySym: Record<string, number[]> = {}
  for (const p of PROVEN_PAIRINGS) {
    ;(bySym[p.symbol] ??= []).push(p.maxDrawdownR)
  }
  const out: Record<string, VolTier> = {}
  for (const [sym, dds] of Object.entries(bySym)) {
    const avg = dds.reduce((a, b) => a + b, 0) / dds.length
    out[sym] = avg <= 5 ? "steady" : avg <= 9 ? "moderate" : "explosive"
  }
  return out
})()

export function volTier(symbol: string): VolTier {
  return VOL_TIER_BY_SYMBOL[symbol] ?? "moderate"
}

// ----------------------------------------------------------------------------
// SCORING — operates only on fields that are safe to expose (no hidden logic),
// so it can run on the client over already-stripped pairings. Both the server
// matcher (public.ts) and the client wizard use this single source of truth.
// ----------------------------------------------------------------------------
export type ScorablePairing = {
  strategyId: string
  symbol: string
  timeframe: "swing" | "position"
  expectancy: number
  maxDrawdownR: number
  oosVerdict?: string
}

export function scorePairing(p: ScorablePairing, a: WizardAnswers): number {
  let score = 0

  // Hold length (swing = days, position = weeks). Activity reinforces it.
  const wantsSwing = a.hold === "days" || (a.hold === "either" && a.activity === "often")
  const wantsPosition = a.hold === "weeks" || (a.hold === "either" && a.activity === "weekly")
  if (a.hold === "either" && a.activity === "either") score += 1
  else if (wantsSwing && p.timeframe === "swing") score += 3
  else if (wantsPosition && p.timeframe === "position") score += 3
  else if (a.hold === "either") score += 1
  else score -= 2

  // Swing comfort vs the pairing's worst losing streak (honest, from backtests).
  const dd = p.maxDrawdownR
  if (a.comfort === "calm") score += dd <= 5 ? 3 : dd <= 9 ? 0 : -3
  else if (a.comfort === "some") score += dd <= 9 ? 2 : dd <= 14 ? 1 : -1
  else score += dd > 9 ? 2 : 1

  // Mover type vs the symbol's data-derived volatility tier.
  const tier = volTier(p.symbol)
  if (a.mover === "steady") score += tier === "steady" ? 3 : tier === "moderate" ? 1 : -2
  else if (a.mover === "explosive") score += tier === "explosive" ? 3 : tier === "moderate" ? 1 : -2

  // Gold-standard survivors are the most trustworthy — strong preference.
  if (p.oosVerdict === "robust") score += 4
  else if (p.oosVerdict === "fragile") score -= 1

  // Edge as the final tiebreaker.
  score += p.expectancy * 2
  return score
}

export function fitReasons(p: ScorablePairing & { maxDrawdownR: number }, a: WizardAnswers): string[] {
  const r: string[] = []
  r.push(
    p.timeframe === "swing"
      ? "Holds for a few days, matching your pace"
      : "Holds for weeks, matching your patience",
  )
  const tier = volTier(p.symbol)
  if (a.mover === "steady" && tier === "steady") r.push("A steadier, established market like you wanted")
  else if (a.mover === "explosive" && tier === "explosive") r.push("A high-energy mover like you wanted")
  if (a.comfort === "calm" && p.maxDrawdownR <= 5) r.push("Kept its worst losing streak small")
  if (p.oosVerdict === "robust") r.push("Survived testing on data it had never seen — the gold standard")
  return r
}
