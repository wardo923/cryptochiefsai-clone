import type { Candle } from "../indicators"
import { buildSnapshot, ema, rsi, macd, atr, adx, bollinger, supertrend } from "../indicators"

// ============================================================================
// THE PLAYBOOK — 8 distinct, named trading strategies.
//
// Each strategy is a pure function over a candle window that returns a trade
// plan (direction + structural stop + target) or null to stand aside. They are
// genuinely different edges: trend-following, momentum, pullback, mean-
// reversion, breakout, crossover, supertrend, and band-fade.
//
// The user only ever sees the NAME and the PROVEN OUTCOME. The logic below is
// intentionally hidden behind that name — the mapping (which strategy is
// surfaced for which ticker/timeframe) is built from real backtest results in
// `mapping.ts`, so what a user assigns is always something that actually
// tested positive on that instrument.
// ============================================================================

export type StratDirection = "LONG" | "SHORT" | "NEUTRAL"

export type StratPlan = {
  direction: StratDirection
  stopLoss: number
  target: number
} | null

export type PlaybookStrategy = {
  id: string
  name: string // user-facing name
  tagline: string // one plain-English line, no jargon
  // The hidden edge, in one analyst-level sentence (used internally / on detail).
  edge: string
  warmup: number // bars required before it can fire
  evaluate: (window: Candle[]) => StratPlan
}

// --- shared helpers ---------------------------------------------------------

// Build a long/short plan from an ATR-sized risk and a reward multiple.
function plan(
  direction: "LONG" | "SHORT",
  entry: number,
  riskDistance: number,
  rr: number,
): StratPlan {
  if (riskDistance <= 0) return null
  if (direction === "LONG") {
    return { direction, stopLoss: entry - riskDistance, target: entry + riskDistance * rr }
  }
  return { direction, stopLoss: entry + riskDistance, target: entry - riskDistance * rr }
}

const clampRisk = (raw: number, atrVal: number, lo = 1.0, hi = 3.0) =>
  Math.max(atrVal * lo, Math.min(atrVal * hi, raw))

// ============================================================================
// 1. TREND RIDER — trend-following (the one proven robust on NVDA daily)
// ============================================================================
const trendRider: PlaybookStrategy = {
  id: "trend-rider",
  name: "Trend Rider",
  tagline: "Rides established uptrends and steps aside when the trend breaks.",
  edge: "Long only when price > EMA20 > EMA50 with a rising EMA200; stop below the recent swing low, target 2.5R.",
  warmup: 205,
  evaluate(window) {
    const s = buildSnapshot(window)
    const price = s.price
    const a = s.atr14 ?? price * 0.02
    if (s.ema20 == null || s.ema50 == null || s.ema200 == null) return null
    const up = price > s.ema20 && s.ema20 > s.ema50 && (s.ema200Slope ?? 0) > 0 && price > s.ema200
    const down = price < s.ema20 && s.ema20 < s.ema50 && (s.ema200Slope ?? 0) < 0 && price < s.ema200
    if (up) return plan("LONG", price, clampRisk(price - s.recentLow + a * 0.25, a), 2.5)
    if (down) return plan("SHORT", price, clampRisk(s.recentHigh - price + a * 0.25, a), 2.5)
    return null
  },
}

// ============================================================================
// 2. MOMENTUM BURST — ride accelerating momentum
// ============================================================================
const momentumBurst: PlaybookStrategy = {
  id: "momentum-burst",
  name: "Momentum Burst",
  tagline: "Jumps in when momentum is accelerating, not after the move is spent.",
  edge: "MACD histogram positive and expanding, RSI in the 50-72 'strong but not exhausted' band, price > EMA50.",
  warmup: 60,
  evaluate(window) {
    const closes = window.map((c) => c.c)
    const price = closes[closes.length - 1]
    const a = atr(window, 14) ?? price * 0.02
    const m = macd(closes)
    const r = rsi(closes, 14)
    const e50 = ema(closes, 50)
    const mPrev = macd(closes.slice(0, -1))
    if (!m || !mPrev || r == null || e50 == null) return null
    const histRising = m.histogram > mPrev.histogram
    const bull = m.histogram > 0 && histRising && r >= 50 && r <= 72 && price > e50
    const bear = m.histogram < 0 && m.histogram < mPrev.histogram && r <= 50 && r >= 28 && price < e50
    if (bull) return plan("LONG", price, clampRisk(a * 1.5, a), 2)
    if (bear) return plan("SHORT", price, clampRisk(a * 1.5, a), 2)
    return null
  },
}

// ============================================================================
// 3. PULLBACK BUYER — buy the dip inside a confirmed uptrend
// ============================================================================
const pullbackBuyer: PlaybookStrategy = {
  id: "pullback-buyer",
  name: "Pullback Buyer",
  tagline: "Waits for a healthy dip inside an uptrend, then buys the bounce.",
  edge: "Uptrend (price > EMA200, EMA50 rising); price dipped to/under EMA20 then closed back above it.",
  warmup: 205,
  evaluate(window) {
    const s = buildSnapshot(window)
    const price = s.price
    const a = s.atr14 ?? price * 0.02
    if (s.ema20 == null || s.ema50 == null || s.ema200 == null) return null
    const uptrend = price > s.ema200 && s.ema20 > s.ema50 && (s.ema200Slope ?? 0) > 0
    if (!uptrend || window.length < 3) return null
    const prev = window[window.length - 2]
    // Prior bar dipped to/below EMA20, current bar reclaimed above it = bounce.
    const dipped = prev.l <= s.ema20
    const reclaimed = price > s.ema20
    if (dipped && reclaimed && (s.rsi14 ?? 50) < 65) {
      return plan("LONG", price, clampRisk(price - Math.min(prev.l, s.recentLow) + a * 0.25, a), 2.5)
    }
    return null
  },
}

// ============================================================================
// 4. RANGE REVERSAL — mean-reversion, gated to RANGING regime (for indices)
// ============================================================================
const rangeReversal: PlaybookStrategy = {
  id: "range-reversal",
  name: "Range Reversal",
  tagline: "Fades extremes back to the middle when a market is going sideways.",
  edge: "Only in a ranging regime (ADX < 20): buy oversold at the lower band, sell overbought at the upper band.",
  warmup: 60,
  evaluate(window) {
    const s = buildSnapshot(window)
    const price = s.price
    const a = s.atr14 ?? price * 0.02
    if (!s.bollinger || s.rsi14 == null || s.adx14 == null) return null
    if (s.adx14 >= 20) return null // only fade when NOT trending
    if (window.length < 2) return null
    const prev = window[window.length - 2]
    const bullishTurn = price > prev.c
    const bearishTurn = price < prev.c
    if (s.rsi14 < 32 && price <= s.bollinger.lower && bullishTurn) {
      return plan("LONG", price, clampRisk(a * 1.2, a, 0.8, 2.0), 1.5)
    }
    if (s.rsi14 > 68 && price >= s.bollinger.upper && bearishTurn) {
      return plan("SHORT", price, clampRisk(a * 1.2, a, 0.8, 2.0), 1.5)
    }
    return null
  },
}

// ============================================================================
// 5. BREAKOUT HUNTER — Donchian breakout with participation
// ============================================================================
const breakoutHunter: PlaybookStrategy = {
  id: "breakout-hunter",
  name: "Breakout Hunter",
  tagline: "Enters when price breaks out of its recent range on strong volume.",
  edge: "Close above the prior 20-bar high (or below the 20-bar low) with volume >= 1.3x average.",
  warmup: 60,
  evaluate(window) {
    const price = window[window.length - 1].c
    const a = atr(window, 14) ?? price * 0.02
    if (window.length < 25) return null
    const prior = window.slice(-21, -1) // prior 20 bars, excluding current
    const hi = Math.max(...prior.map((c) => c.h))
    const lo = Math.min(...prior.map((c) => c.l))
    // Volume participation (skip the filter if volume is unavailable).
    const vols = window.slice(-21, -1).map((c) => c.v ?? 0)
    const avgVol = vols.reduce((x, y) => x + y, 0) / (vols.length || 1)
    const curVol = window[window.length - 1].v ?? 0
    const volOk = avgVol === 0 || curVol >= avgVol * 1.3
    if (price > hi && volOk) return plan("LONG", price, clampRisk(a * 2, a), 2)
    if (price < lo && volOk) return plan("SHORT", price, clampRisk(a * 2, a), 2)
    return null
  },
}

// ============================================================================
// 6. GOLDEN TREND — long-term MA crossover (50/200)
// ============================================================================
const goldenTrend: PlaybookStrategy = {
  id: "golden-trend",
  name: "Golden Trend",
  tagline: "Follows the big-picture trend using the classic 50/200 crossover.",
  edge: "EMA50 above EMA200 (golden cross) with price confirming = long; death cross = short. Wide 3R target.",
  warmup: 205,
  evaluate(window) {
    const closes = window.map((c) => c.c)
    const price = closes[closes.length - 1]
    const a = atr(window, 14) ?? price * 0.02
    const e50 = ema(closes, 50)
    const e200 = ema(closes, 200)
    const e50Prev = ema(closes.slice(0, -1), 50)
    const e200Prev = ema(closes.slice(0, -1), 200)
    if (e50 == null || e200 == null || e50Prev == null || e200Prev == null) return null
    const goldenNow = e50 > e200
    const bull = goldenNow && price > e50
    const bear = !goldenNow && price < e50
    if (bull) return plan("LONG", price, clampRisk(a * 2, a, 1.5, 3.0), 3)
    if (bear) return plan("SHORT", price, clampRisk(a * 2, a, 1.5, 3.0), 3)
    return null
  },
}

// ============================================================================
// 7. SUPERTREND FOLLOW — trade in the Supertrend direction on a fresh flip
// ============================================================================
const supertrendFollow: PlaybookStrategy = {
  id: "supertrend-follow",
  name: "Supertrend Follow",
  tagline: "Flips long or short the moment the trend regime changes.",
  edge: "Enter on a fresh Supertrend(10,3) flip; stop at the Supertrend line, target 2.5R.",
  warmup: 60,
  evaluate(window) {
    const price = window[window.length - 1].c
    const a = atr(window, 14) ?? price * 0.02
    const st = supertrend(window, 10, 3)
    const cur = st[st.length - 1]
    const prev = st[st.length - 2]
    if (!cur || !prev) return null
    // Fresh flip only (regime just changed this bar).
    if (cur.dir === 1 && prev.dir === -1) {
      const risk = clampRisk(Math.max(price - cur.value, a * 0.5), a)
      return plan("LONG", price, risk, 2.5)
    }
    if (cur.dir === -1 && prev.dir === 1) {
      const risk = clampRisk(Math.max(cur.value - price, a * 0.5), a)
      return plan("SHORT", price, risk, 2.5)
    }
    return null
  },
}

// ============================================================================
// 8. BAND FADE — aggressive fade of stretched extremes (no regime gate)
// ============================================================================
const bandFade: PlaybookStrategy = {
  id: "band-fade",
  name: "Band Fade",
  tagline: "Takes the other side of panic spikes and blow-off tops.",
  edge: "Price stretched beyond the Bollinger band with RSI > 74 (fade short) or < 26 (fade long); quick 1.5R.",
  warmup: 60,
  evaluate(window) {
    const closes = window.map((c) => c.c)
    const price = closes[closes.length - 1]
    const a = atr(window, 14) ?? price * 0.02
    const b = bollinger(closes, 20, 2)
    const r = rsi(closes, 14)
    if (!b || r == null) return null
    if (r < 26 && price < b.lower) return plan("LONG", price, clampRisk(a * 1.2, a, 0.8, 2.0), 1.5)
    if (r > 74 && price > b.upper) return plan("SHORT", price, clampRisk(a * 1.2, a, 0.8, 2.0), 1.5)
    return null
  },
}

export const PLAYBOOK: PlaybookStrategy[] = [
  trendRider,
  momentumBurst,
  pullbackBuyer,
  rangeReversal,
  breakoutHunter,
  goldenTrend,
  supertrendFollow,
  bandFade,
]

export const PLAYBOOK_BY_ID: Record<string, PlaybookStrategy> = Object.fromEntries(
  PLAYBOOK.map((s) => [s.id, s]),
)
