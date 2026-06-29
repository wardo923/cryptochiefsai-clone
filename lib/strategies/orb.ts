import type { Strategy, StratSignal } from "./types"
import type { MarketContext } from "./context"

// Opening-Range Breakout. Trade the first clean break of the 09:30–09:45 range
// in the direction of the 1H trend, with a volume/ADX participation filter.
// Stop at the opposite OR edge (clamped to ATR), target 2R, breakeven at 1R,
// then ATR trail. Entries only 09:45–11:30 ET (the breakout window).
const ENTRY_START = 9 * 60 + 45
const ENTRY_END = 11 * 60 + 30
const ADX_MIN = 18
const RVOL_MIN = 1.1

export const orb: Strategy = {
  id: "orb",
  name: "Opening-Range Breakout",
  family: "breakout",
  description:
    "Breaks of the 09:30–09:45 opening range in the 1H-trend direction, filtered by ADX and relative volume. Stop at the opposite range edge, target 2R with breakeven and an ATR trail.",
  warmup: 60,
  evaluate(ctx: MarketContext, i: number): StratSignal | null {
    if (i < 1) return null
    const m = ctx.minuteOfDay[i]
    if (m < ENTRY_START || m > ENTRY_END) return null

    const close = ctx.candles[i].c
    const prevClose = ctx.candles[i - 1].c
    const atr = ctx.atr14[i]
    const adx = ctx.adx[i]
    const rvol = ctx.rvol[i]
    const orHigh = ctx.orHigh[i]
    const orLow = ctx.orLow[i]
    const hEma20 = ctx.htfEma20[i]
    const hEma50 = ctx.htfEma50[i]
    if (atr == null || atr <= 0 || adx == null || rvol == null || orHigh == null || orLow == null) return null
    if (hEma20 == null || hEma50 == null) return null
    if (adx < ADX_MIN || rvol < RVOL_MIN) return null

    const htfBull = hEma20 > hEma50
    const htfBear = hEma20 < hEma50
    // Fresh break: this bar closes beyond the range, previous bar did not.
    const brokeUp = close > orHigh && prevClose <= orHigh
    const brokeDown = close < orLow && prevClose >= orLow

    if (htfBull && brokeUp) {
      const entry = close
      // Stop at OR low, but never looser than 1.5 ATR.
      const rawRisk = entry - orLow
      const risk = Math.min(Math.max(rawRisk, atr * 0.5), atr * 1.5)
      const stop = entry - risk
      return {
        direction: "LONG",
        entry,
        stop,
        tp1: entry + risk,
        breakevenAfterTp1: true,
        target: entry + risk * 2,
        trailMode: "atr",
        trailAtrMult: 2,
        grade: "ORB",
      }
    }
    if (htfBear && brokeDown) {
      const entry = close
      const rawRisk = orHigh - entry
      const risk = Math.min(Math.max(rawRisk, atr * 0.5), atr * 1.5)
      const stop = entry + risk
      return {
        direction: "SHORT",
        entry,
        stop,
        tp1: entry - risk,
        breakevenAfterTp1: true,
        target: entry - risk * 2,
        trailMode: "atr",
        trailAtrMult: 2,
        grade: "ORB",
      }
    }
    return null
  },
}
