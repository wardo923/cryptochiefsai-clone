import { PLAYBOOK, STRATEGY_BIAS, type TradeBias } from "./strategies"
import { PROVEN_PAIRINGS, type ProvenPairing, type PlaybookTimeframe } from "./mapping"
import { oosFor, type OosVerdict } from "./validation"
import { COINS, STOCKS } from "../coins"
import { type WizardAnswers, isCryptoSymbol, scorePairing, fitReasons } from "./wizard"

// ============================================================================
// PUBLIC PLAYBOOK DATA — the ONLY shape that crosses into the client.
//
// We deliberately strip `edge` and `evaluate` here so the hidden logic never
// ships to the browser. A user sees a strategy NAME, a plain-English tagline,
// and the PROVEN OUTCOME on their ticker — nothing about how it works.
// ============================================================================

export type PublicStrategy = {
  id: string
  name: string
  tagline: string
  // How many markets this strategy proved out on (social-proof, not logic).
  provenCount: number
  // How many of those also survived out-of-sample (the gold standard).
  survivedCount: number
}

export type PublicPairing = ProvenPairing & {
  strategyName: string
  assetName: string
  // "crypto" | "stock" — lets the client filter by asset class without logic.
  assetClass: "crypto" | "stock"
  // Which way this system trades: "both" (long or short) or "long" (buys only).
  // A static fact from the strategy logic — never a performance claim.
  bias: TradeBias
  // Out-of-sample verdict (the gold standard). "robust" earns the survived badge.
  oosVerdict: OosVerdict | "untested"
  oosHoldoutExpectancy: number | null
  oosConsistency: number | null
}

const NAME_BY_SYMBOL: Record<string, string> = Object.fromEntries(
  [...COINS, ...STOCKS].map((c) => [c.id, c.name]),
)

export function publicStrategies(): PublicStrategy[] {
  return PLAYBOOK.map((s) => {
    const proven = PROVEN_PAIRINGS.filter((p) => p.strategyId === s.id)
    return {
      id: s.id,
      name: s.name,
      tagline: s.tagline,
      provenCount: proven.length,
      survivedCount: proven.filter(
        (p) => oosFor(p.strategyId, p.symbol, p.timeframe)?.verdict === "robust",
      ).length,
    }
  })
}

const STRATEGY_NAME: Record<string, string> = Object.fromEntries(
  PLAYBOOK.map((s) => [s.id, s.name]),
)

// Enrich a raw pairing with display names + out-of-sample verdict (never any logic).
function decorate(p: ProvenPairing): PublicPairing {
  const oos = oosFor(p.strategyId, p.symbol, p.timeframe)
  return {
    ...p,
    strategyName: STRATEGY_NAME[p.strategyId] ?? p.strategyId,
    assetName: NAME_BY_SYMBOL[p.symbol] ?? p.symbol,
    assetClass: isCryptoSymbol(p.symbol) ? "crypto" : "stock",
    bias: STRATEGY_BIAS[p.strategyId] ?? "both",
    oosVerdict: oos?.verdict ?? "untested",
    oosHoldoutExpectancy: oos?.holdoutExpectancy ?? null,
    oosConsistency: oos?.consistency ?? null,
  }
}

// Rank: gold-standard survivors first, then by edge. A pairing that held up
// out-of-sample is more trustworthy than a bigger in-sample number that didn't.
const OOS_RANK: Record<string, number> = { robust: 0, fragile: 1, inconclusive: 2, untested: 3 }
function byTrust(a: PublicPairing, b: PublicPairing): number {
  const r = OOS_RANK[a.oosVerdict] - OOS_RANK[b.oosVerdict]
  if (r !== 0) return r
  return b.expectancy - a.expectancy
}

// All proven pairings, decorated, most trustworthy first.
export function allPublicPairings(): PublicPairing[] {
  return PROVEN_PAIRINGS.map(decorate).sort(byTrust)
}

// Proven pairings for one ticker (what a user sees when they pick an asset).
export function pairingsForSymbol(symbol: string): PublicPairing[] {
  return PROVEN_PAIRINGS.filter((p) => p.symbol === symbol)
    .map(decorate)
    .sort(byTrust)
}

// Proven pairings for one strategy (which markets it works on).
export function pairingsForStrategy(strategyId: string): PublicPairing[] {
  return PROVEN_PAIRINGS.filter((p) => p.strategyId === strategyId)
    .map(decorate)
    .sort(byTrust)
}

// ============================================================================
// WIZARD MATCHING — turn the plain answers into one best-fit PROVEN pairing.
//
// We score every validated pairing against the user's answers (asset class,
// hold length, swing comfort, mover type, check-in frequency, win style, proof
// appetite), preferring gold-standard out-of-sample survivors, and return the
// winner + a few alternatives — all decorated (no hidden logic).
//
// The user is ALWAYS mapped to a strategy. The asset preference is treated as a
// strong nudge inside the scorer, not a hard filter, so the wizard can never
// dead-end with "nothing fits". Every pairing in the set is a proven survivor,
// so the worst case is still an honest, validated match.
//
// Note on timeframes: the validated set spans intraday (same-session), swing
// (days) and position (weeks). Intraday pairings cleared the same real-cost bar
// but carry a thinner per-trade edge and fewer OOS survivors, so a user only
// lands on one when they explicitly ask for "same session" — the scorer never
// nudges anyone into intraday otherwise.
// ============================================================================

export type WizardMatch = {
  best: PublicPairing
  alternatives: PublicPairing[]
  // Plain-English reasons this fit the user — about market/horizon/risk, never logic.
  reasons: string[]
}

export function matchWizard(answers: WizardAnswers): WizardMatch {
  // Score the FULL validated set so we always have a result. Asset preference is
  // applied as a strong scoring bonus below rather than removing candidates.
  const ranked = PROVEN_PAIRINGS.map((p) => decorate(p))
    .map((p) => {
      let s = scorePairing(p, answers)
      // Strong nudge toward the asset class they asked for, without ever
      // eliminating the other class (keeps a match guaranteed).
      if (answers.asset === "crypto") s += p.assetClass === "crypto" ? 6 : -6
      else if (answers.asset === "stocks") s += p.assetClass === "stock" ? 6 : -6
      return { p, s }
    })
    .sort((x, y) => y.s - x.s)
    .map((x) => x.p)

  const best = ranked[0]
  return {
    best,
    alternatives: ranked.slice(1, 4),
    reasons: fitReasons(best, answers),
  }
}

// ============================================================================
// SYSTEM ASSIGNMENT — assign ONE trading system, then expose the markets that
// system supports. Used by the wizard's "Your Path is Ready" → market-select
// flow. The user never sees strategy internals; they see the assigned system's
// name and the list of markets it has been proven on.
// ============================================================================

export type AssignedSystem = {
  strategyId: string
  strategyName: string
  timeframe: PlaybookTimeframe
  // Plain-English reasons this system fits the user (about pace/risk, no logic).
  reasons: string[]
  // Aggregate track record of the winning pairing (for the reveal card).
  winRate: number
  expectancy: number
  profitFactor: number
  survived: boolean
  trades: number
  // The markets this system supports — one PublicPairing per market.
  markets: PublicPairing[]
}

export function assignSystem(answers: WizardAnswers): AssignedSystem {
  const { best, reasons } = matchWizard(answers)

  // Every market this system was proven on, at the assigned timeframe. If that
  // roster is thin, broaden to all timeframes so there's always a real choice.
  let markets = PROVEN_PAIRINGS.filter(
    (p) => p.strategyId === best.strategyId && p.timeframe === best.timeframe,
  ).map(decorate)
  if (markets.length < 2) {
    markets = PROVEN_PAIRINGS.filter((p) => p.strategyId === best.strategyId).map(decorate)
  }

  // Respect the user's asset-class preference as a sort nudge (crypto/stocks
  // first) without hiding the other class — the system is what's fixed here.
  const pref = answers.asset
  markets.sort((a, b) => {
    if (pref === "crypto" || pref === "stocks") {
      const want = pref === "crypto" ? "crypto" : "stock"
      const aw = a.assetClass === want ? 0 : 1
      const bw = b.assetClass === want ? 0 : 1
      if (aw !== bw) return aw - bw
    }
    return byTrust(a, b)
  })

  return {
    strategyId: best.strategyId,
    strategyName: best.strategyName,
    timeframe: best.timeframe,
    reasons,
    winRate: best.winRate,
    expectancy: best.expectancy,
    profitFactor: best.profitFactor,
    survived: best.oosVerdict === "robust",
    trades: best.trades,
    markets,
  }
}

// Distinct symbols that have at least one proven strategy, with display info.
export function provenAssets(): { symbol: string; name: string; count: number }[] {
  const symbols = Array.from(new Set(PROVEN_PAIRINGS.map((p) => p.symbol)))
  return symbols
    .map((symbol) => ({
      symbol,
      name: NAME_BY_SYMBOL[symbol] ?? symbol,
      count: PROVEN_PAIRINGS.filter((p) => p.symbol === symbol).length,
    }))
    .sort((a, b) => b.count - a.count)
}
