import { PLAYBOOK } from "./strategies"
import { PROVEN_PAIRINGS, type ProvenPairing } from "./mapping"
import { oosFor, type OosVerdict } from "./validation"
import { COINS, STOCKS } from "../coins"

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
