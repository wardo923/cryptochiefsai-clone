import type { Strategy, StratSignal } from "./types"
import type { MarketContext } from "./context"
import { rsi } from "@/lib/indicators"

// VWAP Mean-Reversion. When price stretches well beyond session VWAP (measured
// in ATR) and momentum is exhausted (RSI extreme), fade back toward VWAP. This
// is a counter-trend scalp, so it AVOIDS strong 1H trends (only trades when the
// higher timeframe is not strongly aligned against the fade). Target = VWAP,
// stop = a further ATR beyond the extreme, no trail (tight reversion target).
const ENTRY_START = 10 * 60 // 10:00 ET (let the open settle)
const ENTRY_END = 15 * 60 // 15:00 ET
const STRETCH_ATR = 1.5 // how far beyond VWAP counts as "stretched"
const RSI_HIGH = 70
const RSI_LOW = 30

export const vwapReversion: Strategy = {
  id: "vwap-reversion",
  name: "VWAP Mean-Reversion",
  family: "mean-reversion",
  description:
    "Fades moves stretched 1.5+ ATR beyond session VWAP with an exhausted RSI, targeting a snap back to VWAP. Counter-trend, so it stands aside when the 1H trend strongly opposes the fade. Stop one ATR beyond the extreme.",
  warmup: 60,
  evaluate(ctx: MarketContext, i: number): StratSignal | null {
    if (i < 15) return null
    const m = ctx.minuteOfDay[i]
    if (m < ENTRY_START || m > ENTRY_END) return null

    const close = ctx.candles[i].c
    const vwap = ctx.vwap[i]
    const atr = ctx.atr14[i]
    const hEma20 = ctx.htfEma20[i]
    const hEma50 = ctx.htfEma50[i]
    if (vwap == null || atr == null || atr <= 0) return null

    const stretch = (close - vwap) / atr
    // RSI on the trailing 15m closes.
    const closes = ctx.candles.slice(Math.max(0, i - 30), i + 1).map((c) => c.c)
    const r = rsi(closes, 14)
    if (r == null) return null

    const htfBull = hEma20 != null && hEma50 != null && hEma20 > hEma50
    const htfBear = hEma20 != null && hEma50 != null && hEma20 < hEma50

    // Fade a stretch ABOVE vwap (short) only if 1H isn't strongly bullish.
    if (stretch >= STRETCH_ATR && r >= RSI_HIGH && !htfBull) {
      const entry = close
      const stop = entry + atr
      const target = vwap
      if (target >= entry) return null // need room to revert
      return {
        direction: "SHORT",
        entry,
        stop,
        target,
        trailMode: "none",
        grade: "VWAP-REV",
        score: Math.round(stretch * 10),
      }
    }
    // Fade a stretch BELOW vwap (long) only if 1H isn't strongly bearish.
    if (stretch <= -STRETCH_ATR && r <= RSI_LOW && !htfBear) {
      const entry = close
      const stop = entry - atr
      const target = vwap
      if (target <= entry) return null
      return {
        direction: "LONG",
        entry,
        stop,
        target,
        trailMode: "none",
        grade: "VWAP-REV",
        score: Math.round(Math.abs(stretch) * 10),
      }
    }
    return null
  },
}
