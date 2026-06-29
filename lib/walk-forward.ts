import type { Candle } from "./indicators"
import { backtest, type BacktestResult, type BacktestOptions } from "./backtest"

export type Fold = {
  index: number
  fromTime: number
  toTime: number
  result: BacktestResult
}

export type WalkForwardResult = {
  coinId: string
  folds: Fold[]
  // Out-of-sample consistency: how many folds had positive expectancy.
  positiveFolds: number
  totalFolds: number
  consistency: number // % of folds that were profitable
  // Train (earlier 70%) vs holdout (later 30%) — the headline OOS check.
  train: BacktestResult | null
  holdout: BacktestResult | null
  // Plain-language verdict derived from the numbers, not opinion.
  verdict: "robust" | "fragile" | "inconclusive"
  verdictReason: string
}

type WalkForwardOptions = {
  folds?: number
  holdBars?: number
  isCrypto?: boolean
  intraday?: boolean
  breakeven?: boolean
  // Optional pluggable strategy (the named Playbook strategies). When omitted,
  // walk-forward validates the default rule engine.
  signalFn?: BacktestOptions["signalFn"]
}

// Split candles into N equal, ordered, non-overlapping segments and backtest
// each in isolation. Because the rules are fixed (not optimized on the data),
// this measures whether the edge is STABLE ACROSS TIME / regimes — the failure
// mode that matters here — rather than parameter curve-fitting.
export function walkForward(coinId: string, candles: Candle[], opts: WalkForwardOptions = {}): WalkForwardResult {
  const foldCount = opts.folds ?? 4
  const baseOpts = {
    holdBars: opts.holdBars,
    isCrypto: opts.isCrypto,
    intraday: opts.intraday,
    breakeven: opts.breakeven,
    signalFn: opts.signalFn,
  }

  // --- Sequential folds ---
  const folds: Fold[] = []
  const size = Math.floor(candles.length / foldCount)
  for (let f = 0; f < foldCount; f++) {
    const start = f * size
    const end = f === foldCount - 1 ? candles.length : (f + 1) * size
    const segment = candles.slice(start, end)
    if (segment.length < 120) continue // too short to be meaningful
    const result = backtest(coinId, segment, baseOpts)
    folds.push({
      index: f,
      fromTime: segment[0].t,
      toTime: segment[segment.length - 1].t,
      result,
    })
  }

  const scored = folds.filter((f) => f.result.trades >= 8)
  const positiveFolds = scored.filter((f) => f.result.expectancy > 0).length
  const totalFolds = scored.length
  const consistency = totalFolds ? (positiveFolds / totalFolds) * 100 : 0

  // --- Train / holdout split (70/30) ---
  const splitIdx = Math.floor(candles.length * 0.7)
  const trainCandles = candles.slice(0, splitIdx)
  const holdoutCandles = candles.slice(splitIdx)
  const train = trainCandles.length >= 210 ? backtest(coinId, trainCandles, baseOpts) : null
  const holdout = holdoutCandles.length >= 210 ? backtest(coinId, holdoutCandles, baseOpts) : null

  // --- Verdict (data-driven) ---
  // Robust: the edge holds out-of-sample (holdout still positive) AND a clear
  // majority of folds are profitable. Fragile: holdout flips negative or folds
  // are split. Inconclusive: not enough data to judge.
  let verdict: WalkForwardResult["verdict"] = "inconclusive"
  let verdictReason = "Not enough out-of-sample data to judge robustness."

  if (holdout && train && totalFolds >= 3) {
    const holdoutPositive = holdout.expectancy > 0
    const trainPositive = train.expectancy > 0
    const majorityFolds = consistency >= 60
    // How much of the in-sample edge survived into the holdout.
    const retention = trainPositive && train.expectancy > 0 ? holdout.expectancy / train.expectancy : 0

    if (holdoutPositive && majorityFolds && retention >= 0.5) {
      verdict = "robust"
      verdictReason = `Edge persisted out-of-sample: holdout expectancy ${holdout.expectancy}R kept ${Math.round(
        retention * 100,
      )}% of the in-sample ${train.expectancy}R, and ${positiveFolds}/${totalFolds} time segments were profitable.`
    } else if (!holdoutPositive || consistency < 40) {
      verdict = "fragile"
      verdictReason = `Edge did NOT hold out-of-sample: holdout expectancy ${holdout.expectancy}R vs in-sample ${train.expectancy}R, with only ${positiveFolds}/${totalFolds} segments profitable. Treat the headline backtest with caution.`
    } else {
      verdict = "fragile"
      verdictReason = `Mixed: holdout expectancy ${holdout.expectancy}R and ${positiveFolds}/${totalFolds} profitable segments suggest the edge is regime-dependent, not consistent.`
    }
  }

  return {
    coinId,
    folds,
    positiveFolds,
    totalFolds,
    consistency: Number(consistency.toFixed(0)),
    train,
    holdout,
    verdict,
    verdictReason,
  }
}
