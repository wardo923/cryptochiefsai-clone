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
  return PLAYBOOK.map((s) => ({
    id: s.id,
    name: s.name,
    tagline: s.tagline,
    provenCount: PROVEN_PAIRINGS.filter((p) => p.strategyId === s.id).length,
  }))
}

const STRATEGY_NAME: Record<string, string> = Object.fromEntries(
  PLAYBOOK.map((s) => [s.id, s.name]),
)

// Enrich a raw pairing with display names (never any logic).
function decorate(p: ProvenPairing): PublicPairing {
  return {
    ...p,
    strategyName: STRATEGY_NAME[p.strategyId] ?? p.strategyId,
    assetName: NAME_BY_SYMBOL[p.symbol] ?? p.symbol,
  }
}

// All proven pairings, decorated, best edge first.
export function allPublicPairings(): PublicPairing[] {
  return PROVEN_PAIRINGS.map(decorate).sort((a, b) => b.expectancy - a.expectancy)
}

// Proven pairings for one ticker (what a user sees when they pick an asset).
export function pairingsForSymbol(symbol: string): PublicPairing[] {
  return PROVEN_PAIRINGS.filter((p) => p.symbol === symbol)
    .map(decorate)
    .sort((a, b) => b.expectancy - a.expectancy)
}

// Proven pairings for one strategy (which markets it works on).
export function pairingsForStrategy(strategyId: string): PublicPairing[] {
  return PROVEN_PAIRINGS.filter((p) => p.strategyId === strategyId)
    .map(decorate)
    .sort((a, b) => b.expectancy - a.expectancy)
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
