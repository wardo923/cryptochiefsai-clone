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
// Stocks re-validated on clean Alpaca data; crypto on Binance. Verdicts are
// surfaced honestly rather than hiding the ones that failed.
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
  // --- US stocks & ETFs (Alpaca-validated) ---
  "momentum-burst|AAPL|swing": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: 0.102 },
  "momentum-burst|AAPL|position": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.138 },
  "supertrend-follow|AAPL|swing": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.17 },
  "supertrend-follow|AAPL|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.103 },
  "pullback-buyer|AMZN|swing": { verdict: "inconclusive", consistency: 100, positiveFolds: 1, totalFolds: 1, holdoutExpectancy: -0.487 },
  "supertrend-follow|AMZN|swing": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.31 },
  "supertrend-follow|AMZN|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.214 },
  "golden-trend|DIA|position": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: 0.624 },
  "pullback-buyer|DIA|swing": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.301 },
  "breakout-hunter|GOOGL|swing": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.369 },
  "breakout-hunter|GOOGL|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.669 },
  "golden-trend|GOOGL|swing": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.571 },
  "golden-trend|GOOGL|position": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.724 },
  "pullback-buyer|GOOGL|swing": { verdict: "inconclusive", consistency: 100, positiveFolds: 1, totalFolds: 1, holdoutExpectancy: 0.608 },
  "trend-rider|GOOGL|swing": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.499 },
  "trend-rider|GOOGL|position": { verdict: "inconclusive", consistency: 100, positiveFolds: 1, totalFolds: 1, holdoutExpectancy: 0.884 },
  "golden-trend|META|swing": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: -0.167 },
  "golden-trend|META|position": { verdict: "fragile", consistency: 67, positiveFolds: 2, totalFolds: 3, holdoutExpectancy: -0.133 },
  "trend-rider|META|swing": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: -0.15 },
  "trend-rider|META|position": { verdict: "fragile", consistency: 67, positiveFolds: 2, totalFolds: 3, holdoutExpectancy: -0.24 },
  "golden-trend|MSFT|swing": { verdict: "fragile", consistency: 25, positiveFolds: 1, totalFolds: 4, holdoutExpectancy: 0.13 },
  "golden-trend|MSFT|position": { verdict: "fragile", consistency: 25, positiveFolds: 1, totalFolds: 4, holdoutExpectancy: 0.218 },
  "trend-rider|MSFT|swing": { verdict: "inconclusive", consistency: 100, positiveFolds: 2, totalFolds: 2, holdoutExpectancy: 0.244 },
  "breakout-hunter|NVDA|swing": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: -0.257 },
  "breakout-hunter|NVDA|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.083 },
  "golden-trend|NVDA|swing": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: -0.054 },
  "golden-trend|NVDA|position": { verdict: "fragile", consistency: 67, positiveFolds: 2, totalFolds: 3, holdoutExpectancy: -0.058 },
  "trend-rider|NVDA|swing": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: -0.226 },
  "trend-rider|NVDA|position": { verdict: "fragile", consistency: 67, positiveFolds: 2, totalFolds: 3, holdoutExpectancy: -0.242 },
  "breakout-hunter|QQQ|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: -0.356 },
  "golden-trend|QQQ|swing": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.361 },
  "golden-trend|QQQ|position": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.336 },
  "pullback-buyer|QQQ|swing": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.149 },
  "trend-rider|QQQ|swing": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.167 },
  "trend-rider|QQQ|position": { verdict: "robust", consistency: 67, positiveFolds: 2, totalFolds: 3, holdoutExpectancy: 0.173 },
  "breakout-hunter|SPY|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.326 },
  "golden-trend|SPY|swing": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.217 },
  "golden-trend|SPY|position": { verdict: "robust", consistency: 67, positiveFolds: 2, totalFolds: 3, holdoutExpectancy: 0.419 },
  "trend-rider|SPY|swing": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: -0.054 },
  "breakout-hunter|TSLA|swing": { verdict: "inconclusive", consistency: 100, positiveFolds: 1, totalFolds: 1, holdoutExpectancy: 0.056 },
  "breakout-hunter|TSLA|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: -0.424 },
  "supertrend-follow|TSLA|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.57 },
  // --- Crypto (Binance-validated) ---
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
  // --- Expanded crypto universe (Binance walk-forward, honest verdicts) ---
  "pullback-buyer|ripple|swing": { verdict: "fragile", consistency: 67, positiveFolds: 2, totalFolds: 3, holdoutExpectancy: -0.066 },
  "breakout-hunter|polkadot|swing": { verdict: "fragile", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.069 },
  "supertrend-follow|polkadot|swing": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: -0.059 },
  "pullback-buyer|tron|swing": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: 0.447 },
  "trend-rider|matic-network|swing": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.01 },
  "momentum-burst|matic-network|swing": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: -0.24 },
  "supertrend-follow|matic-network|swing": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: -0.087 },
  "band-fade|litecoin|swing": { verdict: "robust", consistency: 100, positiveFolds: 3, totalFolds: 3, holdoutExpectancy: 0.207 },
  "supertrend-follow|uniswap|swing": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: -0.147 },
  "breakout-hunter|internet-computer|swing": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: -0.044 },
  "supertrend-follow|internet-computer|swing": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: 0.062 },
  "breakout-hunter|stellar|swing": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.242 },
  "supertrend-follow|stellar|swing": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.175 },
  "breakout-hunter|cosmos|swing": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: 0.283 },
  "supertrend-follow|cosmos|swing": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.194 },
  "breakout-hunter|arbitrum|swing": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.21 },
  "breakout-hunter|sei-network|swing": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.074 },
  "breakout-hunter|render-token|swing": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.031 },
  "golden-trend|polkadot|position": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: 0.398 },
  "trend-rider|tron|position": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.208 },
  "pullback-buyer|tron|position": { verdict: "fragile", consistency: 67, positiveFolds: 2, totalFolds: 3, holdoutExpectancy: 0.045 },
  "breakout-hunter|tron|position": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.387 },
  "trend-rider|near|position": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: 0.09 },
  "breakout-hunter|near|position": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.128 },
  "golden-trend|near|position": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: -0.144 },
  "momentum-burst|internet-computer|position": { verdict: "fragile", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.008 },
  "trend-rider|filecoin|position": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: -0.007 },
  "golden-trend|hedera-hashgraph|position": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.002 },
  "golden-trend|optimism|position": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: 0.329 },
  "trend-rider|injective-protocol|position": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: 0.157 },
  "breakout-hunter|injective-protocol|position": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: 0.147 },
  "trend-rider|the-graph|position": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: 0.33 },
  "momentum-burst|the-graph|position": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.246 },
  "breakout-hunter|the-graph|position": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.266 },
  "trend-rider|fantom|position": { verdict: "fragile", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.047 },
  "momentum-burst|fantom|position": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: 0.313 },
  "golden-trend|fantom|position": { verdict: "fragile", consistency: 67, positiveFolds: 2, totalFolds: 3, holdoutExpectancy: -0.228 },
  // --- Expanded US equities (walk-forward on Alpaca data) ---
  "trend-rider|AMD|swing": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.796 },
  "breakout-hunter|AMD|swing": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.109 },
  "golden-trend|AMD|swing": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: 0.692 },
  "supertrend-follow|AMD|swing": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.269 },
  "trend-rider|NFLX|swing": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.151 },
  "golden-trend|NFLX|swing": { verdict: "fragile", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.052 },
  "trend-rider|COIN|swing": { verdict: "inconclusive", consistency: 50, positiveFolds: 1, totalFolds: 2, holdoutExpectancy: -0.116 },
  "breakout-hunter|COIN|swing": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: -0.244 },
  "supertrend-follow|COIN|swing": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: -0.001 },
  "trend-rider|PLTR|swing": { verdict: "fragile", consistency: 67, positiveFolds: 2, totalFolds: 3, holdoutExpectancy: -0.207 },
  "golden-trend|PLTR|swing": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: -0.229 },
  "supertrend-follow|PLTR|swing": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: -0.042 },
  "momentum-burst|JPM|swing": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: -0.112 },
  "pullback-buyer|JPM|swing": { verdict: "inconclusive", consistency: 100, positiveFolds: 1, totalFolds: 1, holdoutExpectancy: 0.079 },
  "golden-trend|JPM|swing": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.082 },
  "supertrend-follow|SOFI|swing": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: -0.47 },
  "breakout-hunter|GME|swing": { verdict: "inconclusive", consistency: 100, positiveFolds: 1, totalFolds: 1, holdoutExpectancy: 0.355 },
  "supertrend-follow|GME|swing": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.269 },
  "trend-rider|AVGO|swing": { verdict: "robust", consistency: 100, positiveFolds: 3, totalFolds: 3, holdoutExpectancy: 0.155 },
  "pullback-buyer|AVGO|swing": { verdict: "inconclusive", consistency: 100, positiveFolds: 1, totalFolds: 1, holdoutExpectancy: 0.235 },
  "golden-trend|AVGO|swing": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.026 },
  "trend-rider|CRM|swing": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.16 },
  "golden-trend|CRM|swing": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.156 },
  "trend-rider|ORCL|swing": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.128 },
  "momentum-burst|ORCL|swing": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.319 },
  "pullback-buyer|ORCL|swing": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.419 },
  "breakout-hunter|ORCL|swing": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: -0.061 },
  "golden-trend|ORCL|swing": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: -0.161 },
  "trend-rider|PYPL|swing": { verdict: "fragile", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.048 },
  "trend-rider|MU|swing": { verdict: "fragile", consistency: 33, positiveFolds: 1, totalFolds: 3, holdoutExpectancy: 0.72 },
  "pullback-buyer|MU|swing": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.817 },
  "breakout-hunter|MU|swing": { verdict: "inconclusive", consistency: 100, positiveFolds: 1, totalFolds: 1, holdoutExpectancy: 0.52 },
  "trend-rider|SMCI|swing": { verdict: "fragile", consistency: 100, positiveFolds: 3, totalFolds: 3, holdoutExpectancy: -0.073 },
  "supertrend-follow|SMCI|swing": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.648 },
  "trend-rider|MSTR|swing": { verdict: "fragile", consistency: 100, positiveFolds: 3, totalFolds: 3, holdoutExpectancy: 0.002 },
  "momentum-burst|MSTR|swing": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.458 },
  "breakout-hunter|MSTR|swing": { verdict: "inconclusive", consistency: 100, positiveFolds: 1, totalFolds: 1, holdoutExpectancy: 0.239 },
  "golden-trend|MSTR|swing": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.168 },
  "supertrend-follow|MSTR|swing": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.341 },
  "trend-rider|AMD|position": { verdict: "inconclusive", consistency: 100, positiveFolds: 2, totalFolds: 2, holdoutExpectancy: 0.769 },
  "breakout-hunter|AMD|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.185 },
  "golden-trend|AMD|position": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: 0.661 },
  "trend-rider|NFLX|position": { verdict: "inconclusive", consistency: 100, positiveFolds: 2, totalFolds: 2, holdoutExpectancy: -0.01 },
  "golden-trend|NFLX|position": { verdict: "fragile", consistency: 100, positiveFolds: 3, totalFolds: 3, holdoutExpectancy: -0.026 },
  "supertrend-follow|NFLX|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.619 },
  "golden-trend|COIN|position": { verdict: "fragile", consistency: 33, positiveFolds: 1, totalFolds: 3, holdoutExpectancy: -0.048 },
  "supertrend-follow|COIN|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.122 },
  "trend-rider|PLTR|position": { verdict: "inconclusive", consistency: 100, positiveFolds: 2, totalFolds: 2, holdoutExpectancy: -0.243 },
  "golden-trend|PLTR|position": { verdict: "inconclusive", consistency: 50, positiveFolds: 1, totalFolds: 2, holdoutExpectancy: -0.347 },
  "supertrend-follow|PLTR|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: -0.31 },
  "trend-rider|JPM|position": { verdict: "fragile", consistency: 33, positiveFolds: 1, totalFolds: 3, holdoutExpectancy: -0.071 },
  "momentum-burst|JPM|position": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: -0.089 },
  "pullback-buyer|JPM|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.198 },
  "golden-trend|JPM|position": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: 0.092 },
  "supertrend-follow|BABA|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.513 },
  "trend-rider|AVGO|position": { verdict: "inconclusive", consistency: 100, positiveFolds: 2, totalFolds: 2, holdoutExpectancy: 0.246 },
  "pullback-buyer|AVGO|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: -0.066 },
  "golden-trend|AVGO|position": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: -0.008 },
  "trend-rider|CRM|position": { verdict: "fragile", consistency: 67, positiveFolds: 2, totalFolds: 3, holdoutExpectancy: 0.046 },
  "golden-trend|CRM|position": { verdict: "inconclusive", consistency: 100, positiveFolds: 1, totalFolds: 1, holdoutExpectancy: 0.04 },
  "trend-rider|ORCL|position": { verdict: "inconclusive", consistency: 100, positiveFolds: 2, totalFolds: 2, holdoutExpectancy: 0.262 },
  "momentum-burst|ORCL|position": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.238 },
  "breakout-hunter|ORCL|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.16 },
  "golden-trend|ORCL|position": { verdict: "fragile", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: -0.098 },
  "trend-rider|PYPL|position": { verdict: "inconclusive", consistency: 50, positiveFolds: 1, totalFolds: 2, holdoutExpectancy: -0.054 },
  "trend-rider|SHOP|position": { verdict: "inconclusive", consistency: 100, positiveFolds: 1, totalFolds: 1, holdoutExpectancy: 0.263 },
  "trend-rider|MU|position": { verdict: "inconclusive", consistency: 100, positiveFolds: 1, totalFolds: 1, holdoutExpectancy: 1.451 },
  "golden-trend|SMCI|position": { verdict: "fragile", consistency: 50, positiveFolds: 2, totalFolds: 4, holdoutExpectancy: -0.008 },
  "supertrend-follow|SMCI|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.466 },
  "trend-rider|MSTR|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.253 },
  "momentum-burst|MSTR|position": { verdict: "robust", consistency: 100, positiveFolds: 4, totalFolds: 4, holdoutExpectancy: 0.668 },
  "breakout-hunter|MSTR|position": { verdict: "inconclusive", consistency: 100, positiveFolds: 1, totalFolds: 1, holdoutExpectancy: 0.262 },
  "golden-trend|MSTR|position": { verdict: "robust", consistency: 75, positiveFolds: 3, totalFolds: 4, holdoutExpectancy: 0.179 },
  "supertrend-follow|MSTR|position": { verdict: "inconclusive", consistency: 0, positiveFolds: 0, totalFolds: 0, holdoutExpectancy: 0.629 },
}

export function oosFor(strategyId: string, symbol: string, timeframe: string): OosResult | null {
  return OOS_VALIDATION[`${strategyId}|${symbol}|${timeframe}`] ?? null
}

export function isRobust(strategyId: string, symbol: string, timeframe: string): boolean {
  return oosFor(strategyId, symbol, timeframe)?.verdict === "robust"
}
