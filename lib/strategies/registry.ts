import type { Strategy } from "./types"
import { aplus15m } from "./aplus-15m"
import { orb } from "./orb"
import { vwapReversion } from "./vwap-reversion"
import { trendPullback } from "./trend-pullback"

// Every strategy the Strategy Lab runs head-to-head. Adding a new one is just
// an import + a line here.
export const STRATEGIES: Strategy[] = [aplus15m, orb, trendPullback, vwapReversion]

export function getStrategy(id: string): Strategy | undefined {
  return STRATEGIES.find((s) => s.id === id)
}
