import type { Candle } from "./indicators"
import { ruleSignal } from "./strategy"
import { sessionAnchorMs } from "./session"

export type Trade = {
  entryIndex: number
  entryTime: number
  direction: "LONG" | "SHORT"
  entry: number
  stopLoss: number
  target: number
  exitIndex: number
  exitTime: number
  exitPrice: number
  outcome: "win" | "loss" | "timeout"
  rMultiple: number // realized reward in units of initial risk
}

export type BacktestResult = {
  coinId: string
  candles: number
  trades: number
  wins: number
  losses: number
  timeouts: number
  winRate: number // %
  avgRMultiple: number
  expectancy: number // avg R per trade
  profitFactor: number
  maxDrawdownR: number
  equityCurveR: number[] // cumulative R over closed trades
  fees: number // round-trip fee assumption used, %
  warmup: number
  holdBars: number
}

type BacktestOptions = {
  warmup?: number // bars needed before first signal
  holdBars?: number // max bars to hold before timeout exit
  feePct?: number // round-trip cost as % of entry (fees + slippage)
  cooldown?: number // bars to wait after a trade closes
  intraday?: boolean // use the intraday (VWAP/OR/RVOL) rule set
  isCrypto?: boolean // anchor sessions to UTC day (crypto) vs 09:30 ET (stocks)
}

// Walk forward bar-by-bar. At each bar we only use data up to and including
// that bar to generate a signal (no look-ahead). When flat and the rule fires
// a directional signal, we open a trade and then resolve it against future
// highs/lows using stop-loss and target, intrabar.
export function backtest(coinId: string, candles: Candle[], opts: BacktestOptions = {}): BacktestResult {
  // Intraday needs far less warmup (no EMA200 dependency in that rule set).
  const warmup = opts.warmup ?? (opts.intraday ? 60 : 205)
  const holdBars = opts.holdBars ?? 14
  const feePct = opts.feePct ?? 0.1 // 0.1% round trip
  const cooldown = opts.cooldown ?? 1

  const trades: Trade[] = []
  let i = warmup
  while (i < candles.length - 1) {
    const window = candles.slice(0, i + 1)
    const sig = opts.intraday
      ? ruleSignal(window, { intraday: true, anchorMs: sessionAnchorMs(candles[i].t, opts.isCrypto ?? false) })
      : ruleSignal(window)

    if (sig.direction === "NEUTRAL") {
      i++
      continue
    }

    const entry = candles[i].c
    const dir = sig.direction
    const stop = sig.stopLoss
    const target = sig.target
    const risk = Math.abs(entry - stop)
    if (risk <= 0) {
      i++
      continue
    }

    // Resolve the trade over the next holdBars candles
    let exitIndex = Math.min(i + holdBars, candles.length - 1)
    let exitPrice = candles[exitIndex].c
    let outcome: Trade["outcome"] = "timeout"

    for (let j = i + 1; j <= Math.min(i + holdBars, candles.length - 1); j++) {
      const bar = candles[j]
      if (dir === "LONG") {
        // assume stop checked before target if both hit in same bar (conservative)
        if (bar.l <= stop) {
          exitIndex = j
          exitPrice = stop
          outcome = "loss"
          break
        }
        if (bar.h >= target) {
          exitIndex = j
          exitPrice = target
          outcome = "win"
          break
        }
      } else {
        if (bar.h >= stop) {
          exitIndex = j
          exitPrice = stop
          outcome = "loss"
          break
        }
        if (bar.l <= target) {
          exitIndex = j
          exitPrice = target
          outcome = "win"
          break
        }
      }
    }

    const gross = dir === "LONG" ? exitPrice - entry : entry - exitPrice
    const feeCost = entry * (feePct / 100)
    const net = gross - feeCost
    const rMultiple = net / risk

    trades.push({
      entryIndex: i,
      entryTime: candles[i].t,
      direction: dir,
      entry,
      stopLoss: stop,
      target,
      exitIndex,
      exitTime: candles[exitIndex].t,
      exitPrice,
      outcome,
      rMultiple,
    })

    i = exitIndex + cooldown
  }

  // Aggregate stats
  const wins = trades.filter((t) => t.rMultiple > 0).length
  const losses = trades.filter((t) => t.rMultiple < 0).length
  const timeouts = trades.filter((t) => t.outcome === "timeout").length
  const winRate = trades.length ? (wins / trades.length) * 100 : 0
  const sumR = trades.reduce((a, t) => a + t.rMultiple, 0)
  const avgR = trades.length ? sumR / trades.length : 0
  const grossWin = trades.filter((t) => t.rMultiple > 0).reduce((a, t) => a + t.rMultiple, 0)
  const grossLoss = Math.abs(trades.filter((t) => t.rMultiple < 0).reduce((a, t) => a + t.rMultiple, 0))
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0

  // Equity curve + max drawdown in R
  const equity: number[] = []
  let cum = 0
  let peak = 0
  let maxDD = 0
  for (const t of trades) {
    cum += t.rMultiple
    equity.push(Number(cum.toFixed(3)))
    if (cum > peak) peak = cum
    const dd = peak - cum
    if (dd > maxDD) maxDD = dd
  }

  return {
    coinId,
    candles: candles.length,
    trades: trades.length,
    wins,
    losses,
    timeouts,
    winRate: Number(winRate.toFixed(1)),
    avgRMultiple: Number(avgR.toFixed(3)),
    expectancy: Number(avgR.toFixed(3)),
    profitFactor: profitFactor === Infinity ? 999 : Number(profitFactor.toFixed(2)),
    maxDrawdownR: Number(maxDD.toFixed(2)),
    equityCurveR: equity,
    fees: feePct,
    warmup,
    holdBars,
  }
}
