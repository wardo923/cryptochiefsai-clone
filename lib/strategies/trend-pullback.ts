import type { Strategy, StratSignal } from "./types"
import type { MarketContext } from "./context"

// Trend Pullback (EMA/Supertrend). In an established trend (15m Supertrend +
// 1H trend agree), buy the first pullback that tags EMA20 and then resumes in
// the trend direction (close back above/below EMA20). Stop beyond the swing /
// EMA by ATR, target 2R, breakeven at 1R, then trail to Supertrend. Wide entry
// window since pullbacks happen all session.
const ENTRY_START = 9 * 60 + 45
const ENTRY_END = 15 * 60
const STOP_ATR = 1.5

export const trendPullback: Strategy = {
  id: "trend-pullback",
  name: "Trend Pullback (EMA/Supertrend)",
  family: "trend-pullback",
  description:
    "In an aligned 15m + 1H trend, buys the first pullback to EMA20 that resumes in the trend direction. Stop 1.5 ATR beyond EMA20, target 2R with breakeven and a Supertrend trail.",
  warmup: 60,
  evaluate(ctx: MarketContext, i: number): StratSignal | null {
    if (i < 2) return null
    const m = ctx.minuteOfDay[i]
    if (m < ENTRY_START || m > ENTRY_END) return null

    const close = ctx.candles[i].c
    const ema20 = ctx.ema20[i]
    const atr = ctx.atr14[i]
    const st = ctx.st[i]
    const adx = ctx.adx[i]
    const hEma20 = ctx.htfEma20[i]
    const hEma50 = ctx.htfEma50[i]
    const prevLow = ctx.candles[i - 1].l
    const prevHigh = ctx.candles[i - 1].h
    if (ema20 == null || atr == null || atr <= 0 || st == null || adx == null) return null
    if (hEma20 == null || hEma50 == null) return null
    if (adx < 18) return null

    const htfBull = hEma20 > hEma50
    const htfBear = hEma20 < hEma50
    const stBull = st.dir === 1
    const stBear = st.dir === -1

    // Long: aligned uptrend, previous bar pulled back to/under EMA20, this bar
    // closes back above EMA20 (resumption).
    const pulledBackLong = prevLow <= ema20
    const resumeLong = close > ema20
    if (htfBull && stBull && pulledBackLong && resumeLong) {
      const entry = close
      const stop = ema20 - atr * STOP_ATR
      const risk = entry - stop
      if (risk <= 0) return null
      return {
        direction: "LONG",
        entry,
        stop,
        tp1: entry + risk,
        breakevenAfterTp1: true,
        target: entry + risk * 2,
        trailMode: "ema20_st",
        grade: "TREND-PB",
      }
    }
    const pulledBackShort = prevHigh >= ema20
    const resumeShort = close < ema20
    if (htfBear && stBear && pulledBackShort && resumeShort) {
      const entry = close
      const stop = ema20 + atr * STOP_ATR
      const risk = stop - entry
      if (risk <= 0) return null
      return {
        direction: "SHORT",
        entry,
        stop,
        tp1: entry - risk,
        breakevenAfterTp1: true,
        target: entry - risk * 2,
        trailMode: "ema20_st",
        grade: "TREND-PB",
      }
    }
    return null
  },
}
