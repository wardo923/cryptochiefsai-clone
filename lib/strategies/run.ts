import type { Candle } from "@/lib/indicators"
import type { Strategy, StratSignal } from "./types"
import { prepareContext, type MarketContext } from "./context"

// Realistic intraday cost model (% of price), matching lib/backtest.ts:
// commission + half-spread crossed on entry AND every exit fill + extra
// slippage on stop-type exits.
const FEE_PCT = 0.01
const SPREAD_PCT = 0.02
const SLIP_PCT = 0.05

const DEFAULT_FLATTEN_MIN = 15 * 60 + 55 // 15:55 ET — flatten before the close

export type StratTrade = {
  entryTime: number
  exitTime: number
  direction: "LONG" | "SHORT"
  entry: number
  stop: number
  rMultiple: number
  exitReason: string
  grade?: string
  score?: number
}

export type StrategyResult = {
  strategyId: string
  symbol: string
  candles: number
  trades: number
  wins: number
  losses: number
  breakevens: number
  winRate: number
  expectancy: number // avg R per trade, after costs
  profitFactor: number
  avgCostR: number
  maxDrawdownR: number
  totalR: number
  equityCurveR: number[]
  lowSample: boolean
  tradeLog: StratTrade[]
}

// Resolve one open trade from entry bar `i` forward, honoring TP1 partial +
// breakeven, trailing, final target, hard stop and same-day session flat.
// Returns realized R (after costs) and metadata. No look-ahead: trailing only
// uses the resolving bar's own indicator values.
function resolveTrade(
  ctx: MarketContext,
  i: number,
  sig: StratSignal,
): { rMultiple: number; costR: number; exitIndex: number; exitReason: string } {
  const c = ctx.candles
  const long = sig.direction === "LONG"
  const entry = sig.entry
  const risk = Math.abs(entry - sig.stop)
  const flattenMin = sig.flattenAtMinute ?? DEFAULT_FLATTEN_MIN
  const tp1Frac = sig.tp1 != null ? (sig.tp1Fraction ?? 0.5) : 0

  // Cost terms in price units.
  const halfSpread = entry * (SPREAD_PCT / 100)
  const slip = entry * (SLIP_PCT / 100)
  const fillEntry = long ? entry + halfSpread : entry - halfSpread
  const commissionR = entry * (FEE_PCT / 100) / risk

  let remaining = 1
  let realizedR = 0 // net price R accumulated from partials (pre-commission)
  let grossR = 0 // frictionless R (for cost diagnostics)
  let effStop = sig.stop
  let tp1Done = false

  // Helper to book an exit fill of `frac` at `price` with optional stop slip.
  const book = (frac: number, price: number, stopType: boolean) => {
    const exitFill = long ? price - halfSpread - (stopType ? slip : 0) : price + halfSpread + (stopType ? slip : 0)
    const r = (long ? exitFill - fillEntry : fillEntry - exitFill) / risk
    realizedR += frac * r
    grossR += frac * ((long ? price - entry : entry - price) / risk)
    remaining -= frac
  }

  let exitReason = "timeout"
  let exitIndex = Math.min(i + 60, c.length - 1)
  const lastIdx = Math.min(i + 60, c.length - 1) // hard cap (~1.5 RTH days)

  for (let j = i + 1; j <= lastIdx; j++) {
    const bar = c[j]
    // Same-day session flat: if we've moved to a new day, we should already
    // have flattened — close at the prior bar's close.
    if (ctx.dayKey[j] !== ctx.dayKey[i]) {
      book(remaining, c[j - 1].c, false)
      exitReason = tp1Done ? "tp1+flat" : "flat"
      exitIndex = j - 1
      break
    }

    if (long) {
      // 1) hard/trailing stop (conservative: checked before upside)
      if (bar.l <= effStop) {
        book(remaining, effStop, true)
        exitReason = tp1Done ? "trail/be" : "stop"
        exitIndex = j
        break
      }
      // 2) TP1 partial -> breakeven
      if (!tp1Done && sig.tp1 != null && bar.h >= sig.tp1) {
        book(tp1Frac, sig.tp1, false)
        tp1Done = true
        if (sig.breakevenAfterTp1) effStop = Math.max(effStop, entry)
      }
      // 3) final target (remainder)
      if (sig.target != null && bar.h >= sig.target) {
        book(remaining, sig.target, false)
        exitReason = "target"
        exitIndex = j
        break
      }
      // 4) trail after tp1
      if (tp1Done) effStop = Math.max(effStop, trailLevel(ctx, j, sig, true))
    } else {
      if (bar.h >= effStop) {
        book(remaining, effStop, true)
        exitReason = tp1Done ? "trail/be" : "stop"
        exitIndex = j
        break
      }
      if (!tp1Done && sig.tp1 != null && bar.l <= sig.tp1) {
        book(tp1Frac, sig.tp1, false)
        tp1Done = true
        if (sig.breakevenAfterTp1) effStop = Math.min(effStop, entry)
      }
      if (sig.target != null && bar.l <= sig.target) {
        book(remaining, sig.target, false)
        exitReason = "target"
        exitIndex = j
        break
      }
      if (tp1Done) effStop = Math.min(effStop, trailLevel(ctx, j, sig, false))
    }

    // Same-day session flat by time.
    if (ctx.minuteOfDay[j] >= flattenMin && remaining > 0) {
      book(remaining, bar.c, false)
      exitReason = tp1Done ? "tp1+flat" : "flat"
      exitIndex = j
      break
    }
  }

  // If we ran off the end with position still open, close at last bar.
  if (remaining > 0.0001) {
    book(remaining, c[exitIndex].c, false)
  }

  const netR = realizedR - commissionR
  const costR = grossR - netR
  return { rMultiple: netR, costR, exitIndex, exitReason }
}

function trailLevel(ctx: MarketContext, j: number, sig: StratSignal, long: boolean): number {
  if (sig.trailMode === "atr") {
    const atr = ctx.atr14[j] ?? 0
    const mult = sig.trailAtrMult ?? 2
    return long ? ctx.candles[j].c - atr * mult : ctx.candles[j].c + atr * mult
  }
  if (sig.trailMode === "ema20_st") {
    const ema20 = ctx.ema20[j]
    const st = ctx.st[j]?.value
    const vals = [ema20, st].filter((v): v is number => v != null)
    if (!vals.length) return long ? -Infinity : Infinity
    // Long trails to the LOWER of EMA20/Supertrend (more room); short the upper.
    return long ? Math.min(...vals) : Math.max(...vals)
  }
  return long ? -Infinity : Infinity
}

export function runStrategy(
  strategy: Strategy,
  symbol: string,
  candles: Candle[],
  precomputed?: MarketContext,
): StrategyResult {
  const ctx = precomputed ?? prepareContext(candles)
  const cooldown = strategy.cooldownBars ?? 6
  const trades: StratTrade[] = []
  const costRs: number[] = []

  let i = Math.max(strategy.warmup, 1)
  while (i < candles.length - 1) {
    const sig = strategy.evaluate(ctx, i)
    if (!sig || Math.abs(sig.entry - sig.stop) <= 0) {
      i++
      continue
    }
    const res = resolveTrade(ctx, i, sig)
    trades.push({
      entryTime: candles[i].t,
      exitTime: candles[res.exitIndex].t,
      direction: sig.direction,
      entry: sig.entry,
      stop: sig.stop,
      rMultiple: Number(res.rMultiple.toFixed(3)),
      exitReason: res.exitReason,
      grade: sig.grade,
      score: sig.score,
    })
    costRs.push(res.costR)
    i = res.exitIndex + cooldown
  }

  const wins = trades.filter((t) => t.rMultiple > 0.02).length
  const losses = trades.filter((t) => t.rMultiple < -0.02).length
  const breakevens = trades.length - wins - losses
  const winRate = trades.length ? (wins / trades.length) * 100 : 0
  const totalR = trades.reduce((a, t) => a + t.rMultiple, 0)
  const expectancy = trades.length ? totalR / trades.length : 0
  const avgCostR = costRs.length ? costRs.reduce((a, b) => a + b, 0) / costRs.length : 0
  const grossWin = trades.filter((t) => t.rMultiple > 0).reduce((a, t) => a + t.rMultiple, 0)
  const grossLoss = Math.abs(trades.filter((t) => t.rMultiple < 0).reduce((a, t) => a + t.rMultiple, 0))
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 999 : 0

  const equity: number[] = []
  let cum = 0
  let peak = 0
  let maxDD = 0
  for (const t of trades) {
    cum += t.rMultiple
    equity.push(Number(cum.toFixed(3)))
    if (cum > peak) peak = cum
    if (peak - cum > maxDD) maxDD = peak - cum
  }

  return {
    strategyId: strategy.id,
    symbol,
    candles: candles.length,
    trades: trades.length,
    wins,
    losses,
    breakevens,
    winRate: Number(winRate.toFixed(1)),
    expectancy: Number(expectancy.toFixed(3)),
    profitFactor: profitFactor === 999 ? 999 : Number(profitFactor.toFixed(2)),
    avgCostR: Number(avgCostR.toFixed(3)),
    maxDrawdownR: Number(maxDD.toFixed(2)),
    totalR: Number(totalR.toFixed(2)),
    equityCurveR: equity,
    lowSample: trades.length < 20,
    tradeLog: trades.slice(-50),
  }
}
