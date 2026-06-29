// ============================================================================
// OUT-OF-SAMPLE VALIDATION — the gold standard on top of the proven mapping.
//
// Every pairing in `mapping.ts` cleared the in-sample robustness bar. But the
// REAL test of trust is whether the edge survives on data the strategy never
// "saw": we split each instrument's deep history into ordered time segments
// plus a held-out final 30%, re-ran the SAME strategy, and recorded whether the
// edge persisted. This is what catches curve-fit traps (e.g. a strategy that
// looks great in-sample but collapses out-of-sample).
//
// Verdicts (produced by /api/playbook-validate via the walk-forward engine):
//   robust       = edge held out-of-sample AND a majority of time segments were
//                  profitable. These earn the "Survived out-of-sample" gold badge.
//   fragile      = edge weakened or flipped negative on unseen data. Real but
//                  regime-dependent — size down, don't lean on it.
//   inconclusive = not enough history at this timeframe to judge OOS yet.
//
// Of 94 in-sample-proven pairings, 32 were robust, 39 fragile, 23 inconclusive.
// We surface the verdict honestly rather than hiding the ones that failed.
// ============================================================================

export type OosVerdict = "robust" | "fragile" | "inconclusive"

export type OosResult = {
  verdict: OosVerdict
  consistency: number // % of time segments that stayed profitable
  positiveFolds: number
  totalFolds: number
  holdoutExpectancy: number | null // R per trade on the unseen final 30%
}

// Keyed by `${strategyId}|${symbol}|${timeframe}`.
export const OOS_VALIDATION: Record<string, OosResult> = {
  "golden-trend|AAPL|position": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: -0.033 },
  "momentum-burst|AAPL|position": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.119 },
  "momentum-burst|AAPL|swing": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: 0.159 },
  "pullback-buyer|AAPL|position": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: 0.082 },
  "pullback-buyer|AAPL|swing": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 1, holdoutExpectancy: -0.035 },
  "supertrend-follow|AAPL|position": { verdict: "fragile", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.02 },
  "supertrend-follow|AAPL|swing": { verdict: "inconclusive", consistency: 50, positiveFolds: 1, totalFolds: 2, holdoutExpectancy: 0.485 },
  "trend-rider|AAPL|swing": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.002 },
  "golden-trend|AMZN|position": { verdict: "fragile", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.085 },
  "pullback-buyer|AMZN|position": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.196 },
  "pullback-buyer|AMZN|swing": { verdict: "inconclusive", consistency: 50, positiveFolds: 1, totalFolds: 2, holdoutExpectancy: -0.223 },
  "supertrend-follow|AMZN|swing": { verdict: "inconclusive", consistency: 100, positiveFolds: 2, totalFolds: 2, holdoutExpectancy: 0.263 },
  "trend-rider|AMZN|position": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: 0.08 },
  "band-fade|DIA|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 1, holdoutExpectancy: 0.365 },
  "pullback-buyer|DIA|swing": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: 0.174 },
  "golden-trend|GOOGL|position": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.247 },
  "golden-trend|GOOGL|swing": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.477 },
  "pullback-buyer|GOOGL|position": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.674 },
  "pullback-buyer|GOOGL|swing": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.763 },
  "trend-rider|GOOGL|position": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.291 },
  "trend-rider|GOOGL|swing": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.409 },
  "band-fade|IWM|position": { verdict: "inconclusive", consistency: 100, positiveFolds: 1, totalFolds: 1, holdoutExpectancy: 0.034 },
  "golden-trend|META|position": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.304 },
  "golden-trend|META|swing": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.08 },
  "pullback-buyer|META|position": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.595 },
  "pullback-buyer|META|swing": { verdict: "inconclusive", consistency: 100, positiveFolds: 1, totalFolds: 1, holdoutExpectancy: 0.274 },
  "trend-rider|META|position": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.253 },
  "trend-rider|META|swing": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: -0.055 },
  "golden-trend|MSFT|position": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.153 },
  "golden-trend|MSFT|swing": { verdict: "fragile", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.017 },
  "pullback-buyer|MSFT|position": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.288 },
  "pullback-buyer|MSFT|swing": { verdict: "inconclusive", consistency: 100, positiveFolds: 2, totalFolds: 2, holdoutExpectancy: -0.304 },
  "trend-rider|MSFT|position": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.259 },
  "trend-rider|MSFT|swing": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.222 },
  "breakout-hunter|NVDA|swing": { verdict: "inconclusive", consistency: 100, positiveFolds: 2, totalFolds: 2, holdoutExpectancy: -0.387 },
  "golden-trend|NVDA|position": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.302 },
  "golden-trend|NVDA|swing": { verdict: "fragile", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: -0.085 },
  "momentum-burst|NVDA|swing": { verdict: "fragile", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.06 },
  "pullback-buyer|NVDA|position": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.047 },
  "pullback-buyer|NVDA|swing": { verdict: "inconclusive", consistency: 50, positiveFolds: 1, totalFolds: 2, holdoutExpectancy: -0.282 },
  "trend-rider|NVDA|position": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.242 },
  "trend-rider|NVDA|swing": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: -0.057 },
  "golden-trend|QQQ|position": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.24 },
  "golden-trend|QQQ|swing": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.15 },
  "pullback-buyer|QQQ|position": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.491 },
  "pullback-buyer|QQQ|swing": { verdict: "inconclusive", consistency: 100, positiveFolds: 2, totalFolds: 2, holdoutExpectancy: -0.028 },
  "trend-rider|QQQ|position": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.29 },
  "trend-rider|QQQ|swing": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.139 },
  "golden-trend|SPY|swing": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.065 },
  "pullback-buyer|SPY|position": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.139 },
  "supertrend-follow|SPY|swing": { verdict: "fragile", consistency: 67, positiveFolds: 2, totalFolds: 3, holdoutExpectancy: -0.112 },
  "breakout-hunter|TSLA|position": { verdict: "fragile", consistency: 25, positiveFolds: 1, totalFolds: 4, holdoutExpectancy: 0.122 },
  "breakout-hunter|TSLA|swing": { verdict: "inconclusive", consistency: 100, positiveFolds: 2, totalFolds: 2, holdoutExpectancy: -0.282 },
  "golden-trend|TSLA|swing": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: -0.204 },
  "pullback-buyer|TSLA|swing": { verdict: "inconclusive", consistency: 50, positiveFolds: 1, totalFolds: 2, holdoutExpectancy: 0 },
  "supertrend-follow|TSLA|position": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: 0.397 },
  "trend-rider|TSLA|swing": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: -0.173 },
  "breakout-hunter|avalanche-2|position": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.207 },
  "momentum-burst|avalanche-2|position": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: -0.078 },
  "supertrend-follow|avalanche-2|position": { verdict: "inconclusive", consistency: 100, positiveFolds: 1, totalFolds: 1, holdoutExpectancy: 0.221 },
  "trend-rider|avalanche-2|position": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.071 },
  "breakout-hunter|binancecoin|position": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.347 },
  "golden-trend|binancecoin|position": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.126 },
  "momentum-burst|binancecoin|position": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.375 },
  "pullback-buyer|binancecoin|position": { verdict: "inconclusive", consistency: 100, positiveFolds: 2, totalFolds: 2, holdoutExpectancy: 0.539 },
  "trend-rider|binancecoin|position": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.13 },
  "breakout-hunter|bitcoin|position": { verdict: "fragile", consistency: 33, positiveFolds: 1, totalFolds: 3, holdoutExpectancy: -0.001 },
  "golden-trend|bitcoin|position": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.294 },
  "momentum-burst|bitcoin|position": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.143 },
  "trend-rider|bitcoin|position": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.272 },
  "breakout-hunter|cardano|swing": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: -0.184 },
  "golden-trend|cardano|position": { verdict: "fragile", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: -0.007 },
  "momentum-burst|cardano|swing": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.054 },
  "supertrend-follow|cardano|swing": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: -0.33 },
  "trend-rider|cardano|position": { verdict: "fragile", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.076 },
  "breakout-hunter|dogecoin|position": { verdict: "robust", consistency: 100, positiveFolds: 3, totalFolds: 3, holdoutExpectancy: 0.541 },
  "momentum-burst|dogecoin|position": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: -0.035 },
  "pullback-buyer|dogecoin|swing": { verdict: "inconclusive", consistency: 100, positiveFolds: 2, totalFolds: 2, holdoutExpectancy: 0.186 },
  "supertrend-follow|dogecoin|position": { verdict: "inconclusive", consistency: 100, positiveFolds: 1, totalFolds: 1, holdoutExpectancy: 0.427 },
  "supertrend-follow|dogecoin|swing": { verdict: "fragile", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.076 },
  "trend-rider|dogecoin|position": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: -0.139 },
  "trend-rider|dogecoin|swing": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.098 },
  "golden-trend|ethereum|position": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: 0.09 },
  "pullback-buyer|ethereum|position": { verdict: "inconclusive", consistency: 100, positiveFolds: 1, totalFolds: 1, holdoutExpectancy: -0.159 },
  "breakout-hunter|solana|position": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: -0.273 },
  "breakout-hunter|solana|swing": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: -0.236 },
  "golden-trend|solana|position": { verdict: "fragile", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: -0.001 },
  "supertrend-follow|solana|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: -0.312 },
  "trend-rider|solana|position": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.082 },
  "breakout-hunter|sui|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.149 },
  "breakout-hunter|sui|swing": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.096 },
  "golden-trend|sui|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: -0.018 },
  "momentum-burst|sui|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.084 },
  "trend-rider|sui|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: -0.089 },
}

export function oosFor(strategyId: string, symbol: string, timeframe: string): OosResult | null {
  return OOS_VALIDATION[`${strategyId}|${symbol}|${timeframe}`] ?? null
}

export function isRobust(strategyId: string, symbol: string, timeframe: string): boolean {
  return oosFor(strategyId, symbol, timeframe)?.verdict === "robust"
}
