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
  outcome: "win" | "loss" | "timeout" | "breakeven"
  rMultiple: number // realized reward in units of initial risk
}

export type BacktestResult = {
  coinId: string
  candles: number
  trades: number
  wins: number
  losses: number
  timeouts: number
  breakevens: number // trades stopped out at breakeven (only when breakeven on)
  winRate: number // %
  avgRMultiple: number
  expectancy: number // avg R per trade
  profitFactor: number
  maxDrawdownR: number
  equityCurveR: number[] // cumulative R over closed trades
  fees: number // commission assumption used, % per round trip
  spreadPct: number // per-side spread crossed, % of price
  slipPct: number // extra adverse slippage on stop-outs, % of price
  avgCostR: number // average all-in cost per trade, in units of R
  warmup: number
  holdBars: number
}

type BacktestOptions = {
  warmup?: number // bars needed before first signal
  holdBars?: number // max bars to hold before timeout exit
  feePct?: number // commission as % of entry, per round trip
  spreadPct?: number // per-side spread crossed on each fill, % of price
  slipPct?: number // extra adverse slippage on stop-loss fills, % of price
  cooldown?: number // bars to wait after a trade closes
  intraday?: boolean // use the intraday (VWAP/OR/RVOL) rule set
  isCrypto?: boolean // anchor sessions to UTC day (crypto) vs 09:30 ET (stocks)
  breakeven?: boolean // move stop to entry once price reaches breakevenAtR favorable
  breakevenAtR?: number // favorable R that arms the breakeven stop (default 1)
  // Pluggable strategy. When provided, this replaces the default `ruleSignal`
  // so the SAME walk-forward + realistic-cost engine can backtest any of the
  // named Playbook strategies. Returns null/NEUTRAL to stand aside at a bar.
  signalFn?: (window: Candle[]) => { direction: "LONG" | "SHORT" | "NEUTRAL"; stopLoss: number; target: number } | null
}

// Walk forward bar-by-bar. At each bar we only use data up to and including
// that bar to generate a signal (no look-ahead). When flat and the rule fires
// a directional signal, we open a trade and then resolve it against future
// highs/lows using stop-loss and target, intrabar.
export function backtest(coinId: string, candles: Candle[], opts: BacktestOptions = {}): BacktestResult {
  // Intraday needs far less warmup (no EMA200 dependency in that rule set).
  const warmup = opts.warmup ?? (opts.intraday ? 60 : 205)
  const holdBars = opts.holdBars ?? 14
  const cooldown = opts.cooldown ?? 1

  // ---- REALISTIC COST MODEL ----
  // Three components, all in % of price:
  //  - commission (feePct): broker/exchange fee per round trip.
  //  - spread (spreadPct): half the bid/ask spread, crossed on BOTH entry and
  //    exit fills. Tight for liquid stocks (SPY), wider for crypto.
  //  - stop slippage (slipPct): extra adverse fill on stop-OUTS only, because
  //    price is moving against you (and may gap) when a stop triggers. This is
  //    the cost backtests most often ignore and where intraday edges die.
  const isCrypto = opts.isCrypto ?? false
  const feePct = opts.feePct ?? (isCrypto ? 0.05 : 0.01)
  const spreadPct = opts.spreadPct ?? (isCrypto ? 0.04 : opts.intraday ? 0.02 : 0.03)
  const slipPct = opts.slipPct ?? (isCrypto ? 0.06 : opts.intraday ? 0.05 : 0.03)

  const trades: Trade[] = []
  const costRs: number[] = []
  let i = warmup
  while (i < candles.length - 1) {
    const window = candles.slice(0, i + 1)
    // Pluggable strategy takes precedence; otherwise fall back to the default
    // regime-gated rule engine (trend/mean-reversion or the intraday set).
    const sig = opts.signalFn
      ? opts.signalFn(window)
      : opts.intraday
        ? ruleSignal(window, { intraday: true, anchorMs: sessionAnchorMs(candles[i].t, isCrypto) })
        : ruleSignal(window)

    if (!sig || sig.direction === "NEUTRAL") {
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

    // Breakeven management: once price runs `breakevenAtR` in our favor, the
    // stop ratchets up to the entry so the trade can no longer lose. Arming is
    // evaluated at the END of each bar so a single bar can't both arm AND
    // scratch (that would be look-ahead). `effStop` is the live stop level.
    const useBE = opts.breakeven === true
    const beAtR = opts.breakevenAtR ?? 1
    let effStop = stop
    let armed = false

    for (let j = i + 1; j <= Math.min(i + holdBars, candles.length - 1); j++) {
      const bar = candles[j]
      if (dir === "LONG") {
        if (bar.l <= effStop) {
          exitIndex = j
          exitPrice = effStop
          outcome = armed ? "breakeven" : "loss"
          break
        }
        if (bar.h >= target) {
          exitIndex = j
          exitPrice = target
          outcome = "win"
          break
        }
        if (useBE && !armed && bar.h >= entry + risk * beAtR) {
          armed = true
          effStop = entry
        }
      } else {
        if (bar.h >= effStop) {
          exitIndex = j
          exitPrice = effStop
          outcome = armed ? "breakeven" : "loss"
          break
        }
        if (bar.l <= target) {
          exitIndex = j
          exitPrice = target
          outcome = "win"
          break
        }
        if (useBE && !armed && bar.l <= entry - risk * beAtR) {
          armed = true
          effStop = entry
        }
      }
    }

    // Apply realistic fills. You cross the spread adversely on entry AND exit;
    // a stop-out fills even worse by `slipPct`. All costs are in price terms.
    const halfSpread = entry * (spreadPct / 100)
    const slip = entry * (slipPct / 100)
    // Entry: LONG buys up at the ask, SHORT sells down at the bid.
    const fillEntry = dir === "LONG" ? entry + halfSpread : entry - halfSpread
    // Exit: LONG sells down at the bid, SHORT buys up at the ask...
    let fillExit = dir === "LONG" ? exitPrice - halfSpread : exitPrice + halfSpread
    // ...and stop-outs (including breakeven stops) slip further against you.
    if (outcome === "loss" || outcome === "breakeven") {
      fillExit = dir === "LONG" ? fillExit - slip : fillExit + slip
    }
    const gross = dir === "LONG" ? fillExit - fillEntry : fillEntry - fillExit
    const commission = entry * (feePct / 100)
    const net = gross - commission
    const rMultiple = net / risk
    // Total cost vs the frictionless gross, expressed in R (diagnostic).
    const grossNoCost = dir === "LONG" ? exitPrice - entry : entry - exitPrice
    const costR = (grossNoCost - net) / risk

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
    costRs.push(costR)

    i = exitIndex + cooldown
  }

  // Aggregate stats
  const wins = trades.filter((t) => t.rMultiple > 0).length
  const losses = trades.filter((t) => t.rMultiple < 0).length
  const timeouts = trades.filter((t) => t.outcome === "timeout").length
  const breakevens = trades.filter((t) => t.outcome === "breakeven").length
  const winRate = trades.length ? (wins / trades.length) * 100 : 0
  const sumR = trades.reduce((a, t) => a + t.rMultiple, 0)
  const avgR = trades.length ? sumR / trades.length : 0
  const avgCostR = costRs.length ? costRs.reduce((a, c) => a + c, 0) / costRs.length : 0
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
    breakevens,
    winRate: Number(winRate.toFixed(1)),
    avgRMultiple: Number(avgR.toFixed(3)),
    expectancy: Number(avgR.toFixed(3)),
    profitFactor: profitFactor === Infinity ? 999 : Number(profitFactor.toFixed(2)),
    maxDrawdownR: Number(maxDD.toFixed(2)),
    equityCurveR: equity,
    fees: feePct,
    spreadPct,
    slipPct,
    avgCostR: Number(avgCostR.toFixed(3)),
    warmup,
    holdBars,
  }
}
