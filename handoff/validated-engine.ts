// ============================================================================
// SIGHTLINE — VALIDATED STRATEGY ENGINE (PORTABLE / SINGLE SOURCE OF TRUTH)
//
// This ONE file is the canonical, honest engine. Drop it into the Replit app and
// route ALL strategy assignment through `matchWizard()`. It replaces any older
// pickStrategy() switch logic.
//
// WHY THIS EXISTS:
//   The live app drifted from the validated research. The old switch could assign
//   INTRADAY strategies (e.g. opening-range breakout, intraday pullback, range
//   fade) that LOST money after real trading costs in testing. This engine can
//   ONLY ever assign one of the 138 pairings below — every one of which passed a
//   strict, realistic-cost backtest bar:
//        trades >= 30  AND  expectancy > 0  AND  profitFactor >= 1.3
//
// HARD GUARANTEES (do not weaken these):
//   1. Only SWING (days) and POSITION (weeks) timeframes exist here. There is NO
//      intraday/scalp data, by design — so the app physically cannot assign one.
//   2. The user is ALWAYS mapped to a strategy (matchWizard never returns null).
//      Asset preference is a strong scoring nudge, never a hard filter.
//   3. Every number shown to a user (winRate, profitFactor, maxDrawdownR, trades)
//      comes from THIS data — never invent or hardcode stats elsewhere.
//   4. Never expose a strategy's entry/exit rules. Show NAME + behavior only.
//
// REMOVE FROM THE OLD APP WHEN YOU ADOPT THIS:
//   - The fake "100-point" / A+ match grade (a grade everyone passes is a lie).
//   - Any wizard question that does not feed scorePairing() below. Either wire it
//     in here or remove it from the wizard — no questions that secretly do nothing.
// ============================================================================

export type Timeframe = "swing" | "position"
export type ProvenTier = "strong" | "proven"

export type ProvenPairing = {
  strategyId: string
  symbol: string
  timeframe: Timeframe
  winRate: number
  expectancy: number
  profitFactor: number
  maxDrawdownR: number
  trades: number
  tier: ProvenTier
}

// ---------------------------------------------------------------------------
// THE 138 VALIDATED PAIRINGS. Swing + position only. Stocks via Alpaca data,
// crypto via Binance data. Regenerate from the research lab if data refreshes.
// ---------------------------------------------------------------------------
export const PROVEN_PAIRINGS: ProvenPairing[] = [
  // --- US stocks & ETFs ---
  { strategyId: "momentum-burst", symbol: "AAPL", timeframe: "position", winRate: 45.7, expectancy: 0.209, profitFactor: 1.38, maxDrawdownR: 5.31, trades: 94, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "AAPL", timeframe: "position", winRate: 53.8, expectancy: 0.169, profitFactor: 1.45, maxDrawdownR: 4.92, trades: 39, tier: "proven" },
  { strategyId: "momentum-burst", symbol: "AAPL", timeframe: "swing", winRate: 43.7, expectancy: 0.156, profitFactor: 1.3, maxDrawdownR: 5.31, trades: 103, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "AAPL", timeframe: "swing", winRate: 60.5, expectancy: 0.151, profitFactor: 1.52, maxDrawdownR: 4.8, trades: 43, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "AMZN", timeframe: "position", winRate: 58.8, expectancy: 0.248, profitFactor: 1.84, maxDrawdownR: 2.32, trades: 34, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "AMZN", timeframe: "swing", winRate: 57.9, expectancy: 0.181, profitFactor: 1.7, maxDrawdownR: 2.47, trades: 38, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "AMZN", timeframe: "swing", winRate: 54.8, expectancy: 0.128, profitFactor: 1.39, maxDrawdownR: 3.71, trades: 31, tier: "proven" },
  { strategyId: "golden-trend", symbol: "DIA", timeframe: "position", winRate: 46.6, expectancy: 0.203, profitFactor: 1.39, maxDrawdownR: 6.8, trades: 73, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "DIA", timeframe: "swing", winRate: 57.5, expectancy: 0.121, profitFactor: 1.43, maxDrawdownR: 5.6, trades: 40, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "GOOGL", timeframe: "swing", winRate: 70.6, expectancy: 0.339, profitFactor: 2.28, maxDrawdownR: 2.05, trades: 34, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "GOOGL", timeframe: "position", winRate: 48.8, expectancy: 0.26, profitFactor: 1.54, maxDrawdownR: 5.29, trades: 41, tier: "proven" },
  { strategyId: "golden-trend", symbol: "GOOGL", timeframe: "position", winRate: 43.8, expectancy: 0.25, profitFactor: 1.52, maxDrawdownR: 6.54, trades: 64, tier: "proven" },
  { strategyId: "trend-rider", symbol: "GOOGL", timeframe: "position", winRate: 54.5, expectancy: 0.243, profitFactor: 1.65, maxDrawdownR: 3.79, trades: 55, tier: "proven" },
  { strategyId: "golden-trend", symbol: "GOOGL", timeframe: "swing", winRate: 50, expectancy: 0.19, profitFactor: 1.46, maxDrawdownR: 7.28, trades: 82, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "GOOGL", timeframe: "swing", winRate: 54.8, expectancy: 0.186, profitFactor: 1.45, maxDrawdownR: 3.57, trades: 42, tier: "proven" },
  { strategyId: "trend-rider", symbol: "GOOGL", timeframe: "swing", winRate: 57.5, expectancy: 0.18, profitFactor: 1.59, maxDrawdownR: 5.07, trades: 73, tier: "proven" },
  { strategyId: "golden-trend", symbol: "META", timeframe: "position", winRate: 53.5, expectancy: 0.353, profitFactor: 1.83, maxDrawdownR: 4.07, trades: 71, tier: "strong" },
  { strategyId: "golden-trend", symbol: "META", timeframe: "swing", winRate: 59.3, expectancy: 0.241, profitFactor: 1.66, maxDrawdownR: 4.13, trades: 86, tier: "strong" },
  { strategyId: "trend-rider", symbol: "META", timeframe: "swing", winRate: 56.9, expectancy: 0.215, profitFactor: 1.78, maxDrawdownR: 4.08, trades: 72, tier: "strong" },
  { strategyId: "trend-rider", symbol: "META", timeframe: "position", winRate: 56.9, expectancy: 0.21, profitFactor: 1.64, maxDrawdownR: 5.06, trades: 58, tier: "proven" },
  { strategyId: "golden-trend", symbol: "MSFT", timeframe: "swing", winRate: 54.5, expectancy: 0.177, profitFactor: 1.46, maxDrawdownR: 5.51, trades: 77, tier: "proven" },
  { strategyId: "golden-trend", symbol: "MSFT", timeframe: "position", winRate: 48.4, expectancy: 0.15, profitFactor: 1.32, maxDrawdownR: 7.02, trades: 62, tier: "proven" },
  { strategyId: "trend-rider", symbol: "MSFT", timeframe: "swing", winRate: 63.1, expectancy: 0.146, profitFactor: 1.53, maxDrawdownR: 4.86, trades: 65, tier: "proven" },
  { strategyId: "golden-trend", symbol: "NVDA", timeframe: "position", winRate: 47.5, expectancy: 0.331, profitFactor: 1.67, maxDrawdownR: 6.08, trades: 80, tier: "strong" },
  { strategyId: "breakout-hunter", symbol: "NVDA", timeframe: "swing", winRate: 51.1, expectancy: 0.323, profitFactor: 1.73, maxDrawdownR: 5.29, trades: 45, tier: "proven" },
  { strategyId: "golden-trend", symbol: "NVDA", timeframe: "swing", winRate: 47.3, expectancy: 0.304, profitFactor: 1.65, maxDrawdownR: 6.28, trades: 93, tier: "strong" },
  { strategyId: "breakout-hunter", symbol: "NVDA", timeframe: "position", winRate: 52.3, expectancy: 0.295, profitFactor: 1.62, maxDrawdownR: 6.09, trades: 44, tier: "proven" },
  { strategyId: "trend-rider", symbol: "NVDA", timeframe: "position", winRate: 56.1, expectancy: 0.29, profitFactor: 1.83, maxDrawdownR: 3.82, trades: 57, tier: "proven" },
  { strategyId: "trend-rider", symbol: "NVDA", timeframe: "swing", winRate: 54.9, expectancy: 0.266, profitFactor: 1.87, maxDrawdownR: 3.74, trades: 71, tier: "strong" },
  { strategyId: "golden-trend", symbol: "QQQ", timeframe: "position", winRate: 50.7, expectancy: 0.311, profitFactor: 1.64, maxDrawdownR: 5.93, trades: 69, tier: "strong" },
  { strategyId: "golden-trend", symbol: "QQQ", timeframe: "swing", winRate: 50, expectancy: 0.251, profitFactor: 1.59, maxDrawdownR: 6.73, trades: 88, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "QQQ", timeframe: "swing", winRate: 67.7, expectancy: 0.235, profitFactor: 1.86, maxDrawdownR: 3.09, trades: 31, tier: "proven" },
  { strategyId: "trend-rider", symbol: "QQQ", timeframe: "position", winRate: 55.9, expectancy: 0.195, profitFactor: 1.52, maxDrawdownR: 4.03, trades: 59, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "QQQ", timeframe: "position", winRate: 43.2, expectancy: 0.172, profitFactor: 1.32, maxDrawdownR: 4.13, trades: 37, tier: "proven" },
  { strategyId: "trend-rider", symbol: "QQQ", timeframe: "swing", winRate: 61, expectancy: 0.119, profitFactor: 1.38, maxDrawdownR: 3.57, trades: 77, tier: "proven" },
  { strategyId: "golden-trend", symbol: "SPY", timeframe: "position", winRate: 48.5, expectancy: 0.284, profitFactor: 1.61, maxDrawdownR: 5.83, trades: 66, tier: "strong" },
  { strategyId: "golden-trend", symbol: "SPY", timeframe: "swing", winRate: 57.6, expectancy: 0.236, profitFactor: 1.58, maxDrawdownR: 4.89, trades: 85, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "SPY", timeframe: "position", winRate: 47.1, expectancy: 0.208, profitFactor: 1.44, maxDrawdownR: 4.83, trades: 34, tier: "proven" },
  { strategyId: "trend-rider", symbol: "SPY", timeframe: "swing", winRate: 58.4, expectancy: 0.114, profitFactor: 1.34, maxDrawdownR: 5.48, trades: 77, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "TSLA", timeframe: "position", winRate: 47.1, expectancy: 0.287, profitFactor: 1.78, maxDrawdownR: 2.99, trades: 34, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "TSLA", timeframe: "position", winRate: 48.9, expectancy: 0.234, profitFactor: 1.48, maxDrawdownR: 5.38, trades: 47, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "TSLA", timeframe: "swing", winRate: 44, expectancy: 0.205, profitFactor: 1.5, maxDrawdownR: 3.3, trades: 50, tier: "proven" },
  // --- Crypto ---
  { strategyId: "breakout-hunter", symbol: "avalanche-2", timeframe: "position", winRate: 55.1, expectancy: 0.406, profitFactor: 2.05, maxDrawdownR: 4.37, trades: 69, tier: "strong" },
  { strategyId: "supertrend-follow", symbol: "avalanche-2", timeframe: "position", winRate: 56.1, expectancy: 0.306, profitFactor: 1.93, maxDrawdownR: 3.04, trades: 41, tier: "proven" },
  { strategyId: "trend-rider", symbol: "avalanche-2", timeframe: "position", winRate: 53.1, expectancy: 0.22, profitFactor: 1.67, maxDrawdownR: 4.02, trades: 81, tier: "strong" },
  { strategyId: "momentum-burst", symbol: "avalanche-2", timeframe: "position", winRate: 44.1, expectancy: 0.161, profitFactor: 1.31, maxDrawdownR: 7.22, trades: 111, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "binancecoin", timeframe: "position", winRate: 50.8, expectancy: 0.392, profitFactor: 1.84, maxDrawdownR: 3.63, trades: 65, tier: "strong" },
  { strategyId: "pullback-buyer", symbol: "binancecoin", timeframe: "position", winRate: 60.6, expectancy: 0.339, profitFactor: 2.43, maxDrawdownR: 3.5, trades: 33, tier: "proven" },
  { strategyId: "momentum-burst", symbol: "binancecoin", timeframe: "position", winRate: 47.2, expectancy: 0.257, profitFactor: 1.52, maxDrawdownR: 6.04, trades: 127, tier: "proven" },
  { strategyId: "golden-trend", symbol: "binancecoin", timeframe: "position", winRate: 47.5, expectancy: 0.255, profitFactor: 1.62, maxDrawdownR: 6.9, trades: 101, tier: "strong" },
  { strategyId: "trend-rider", symbol: "binancecoin", timeframe: "position", winRate: 45.1, expectancy: 0.148, profitFactor: 1.43, maxDrawdownR: 6.57, trades: 91, tier: "proven" },
  { strategyId: "golden-trend", symbol: "bitcoin", timeframe: "position", winRate: 49.4, expectancy: 0.271, profitFactor: 1.68, maxDrawdownR: 5.06, trades: 89, tier: "strong" },
  { strategyId: "breakout-hunter", symbol: "bitcoin", timeframe: "position", winRate: 47.9, expectancy: 0.22, profitFactor: 1.45, maxDrawdownR: 5.52, trades: 73, tier: "proven" },
  { strategyId: "trend-rider", symbol: "bitcoin", timeframe: "position", winRate: 49.4, expectancy: 0.161, profitFactor: 1.53, maxDrawdownR: 5.71, trades: 83, tier: "proven" },
  { strategyId: "momentum-burst", symbol: "bitcoin", timeframe: "position", winRate: 43.2, expectancy: 0.159, profitFactor: 1.3, maxDrawdownR: 7.6, trades: 111, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "cardano", timeframe: "swing", winRate: 52.2, expectancy: 0.209, profitFactor: 1.5, maxDrawdownR: 13.49, trades: 159, tier: "proven" },
  { strategyId: "golden-trend", symbol: "cardano", timeframe: "position", winRate: 48.1, expectancy: 0.17, profitFactor: 1.37, maxDrawdownR: 9.05, trades: 106, tier: "proven" },
  { strategyId: "trend-rider", symbol: "cardano", timeframe: "position", winRate: 55.7, expectancy: 0.16, profitFactor: 1.49, maxDrawdownR: 5.96, trades: 88, tier: "proven" },
  { strategyId: "momentum-burst", symbol: "cardano", timeframe: "swing", winRate: 47.8, expectancy: 0.149, profitFactor: 1.31, maxDrawdownR: 13.53, trades: 278, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "cardano", timeframe: "swing", winRate: 51.1, expectancy: 0.091, profitFactor: 1.32, maxDrawdownR: 8.83, trades: 88, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "dogecoin", timeframe: "position", winRate: 58.5, expectancy: 0.334, profitFactor: 2.47, maxDrawdownR: 2.02, trades: 41, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "dogecoin", timeframe: "position", winRate: 50, expectancy: 0.28, profitFactor: 1.61, maxDrawdownR: 5.74, trades: 66, tier: "strong" },
  { strategyId: "momentum-burst", symbol: "dogecoin", timeframe: "position", winRate: 45.2, expectancy: 0.201, profitFactor: 1.39, maxDrawdownR: 7.47, trades: 126, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "dogecoin", timeframe: "swing", winRate: 49.4, expectancy: 0.168, profitFactor: 1.63, maxDrawdownR: 3.78, trades: 85, tier: "strong" },
  { strategyId: "pullback-buyer", symbol: "dogecoin", timeframe: "swing", winRate: 45.1, expectancy: 0.116, profitFactor: 1.35, maxDrawdownR: 6.12, trades: 51, tier: "proven" },
  { strategyId: "trend-rider", symbol: "dogecoin", timeframe: "position", winRate: 47.7, expectancy: 0.11, profitFactor: 1.33, maxDrawdownR: 10.27, trades: 86, tier: "proven" },
  { strategyId: "trend-rider", symbol: "dogecoin", timeframe: "swing", winRate: 51.3, expectancy: 0.108, profitFactor: 1.38, maxDrawdownR: 5.98, trades: 238, tier: "proven" },
  { strategyId: "golden-trend", symbol: "ethereum", timeframe: "position", winRate: 44.6, expectancy: 0.15, profitFactor: 1.33, maxDrawdownR: 9.77, trades: 92, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "ethereum", timeframe: "position", winRate: 45.5, expectancy: 0.147, profitFactor: 1.38, maxDrawdownR: 4.03, trades: 33, tier: "proven" },
  { strategyId: "golden-trend", symbol: "solana", timeframe: "position", winRate: 52.5, expectancy: 0.33, profitFactor: 1.78, maxDrawdownR: 6.42, trades: 101, tier: "strong" },
  { strategyId: "trend-rider", symbol: "solana", timeframe: "position", winRate: 48.2, expectancy: 0.232, profitFactor: 1.65, maxDrawdownR: 5.87, trades: 83, tier: "strong" },
  { strategyId: "supertrend-follow", symbol: "solana", timeframe: "position", winRate: 61.8, expectancy: 0.216, profitFactor: 1.79, maxDrawdownR: 4.48, trades: 34, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "solana", timeframe: "position", winRate: 49.3, expectancy: 0.215, profitFactor: 1.45, maxDrawdownR: 8.43, trades: 73, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "solana", timeframe: "swing", winRate: 46.5, expectancy: 0.141, profitFactor: 1.31, maxDrawdownR: 20.61, trades: 155, tier: "proven" },
  { strategyId: "trend-rider", symbol: "sui", timeframe: "position", winRate: 56.1, expectancy: 0.202, profitFactor: 1.7, maxDrawdownR: 5.4, trades: 41, tier: "proven" },
  { strategyId: "momentum-burst", symbol: "sui", timeframe: "position", winRate: 45.9, expectancy: 0.199, profitFactor: 1.37, maxDrawdownR: 5.91, trades: 61, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "sui", timeframe: "position", winRate: 47.2, expectancy: 0.18, profitFactor: 1.35, maxDrawdownR: 3.17, trades: 36, tier: "proven" },
  { strategyId: "golden-trend", symbol: "sui", timeframe: "position", winRate: 47.9, expectancy: 0.173, profitFactor: 1.35, maxDrawdownR: 4.71, trades: 48, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "sui", timeframe: "swing", winRate: 48.7, expectancy: 0.167, profitFactor: 1.43, maxDrawdownR: 6.55, trades: 152, tier: "proven" },
  // --- Expanded crypto universe (Binance data, same >=30 trades / expectancy>0 / PF>=1.3 bar) ---
  { strategyId: "pullback-buyer", symbol: "ripple", timeframe: "swing", winRate: 40.4, expectancy: 0.108, profitFactor: 1.41, maxDrawdownR: 3.97, trades: 57, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "polkadot", timeframe: "swing", winRate: 52.3, expectancy: 0.228, profitFactor: 1.56, maxDrawdownR: 4.64, trades: 149, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "polkadot", timeframe: "swing", winRate: 53.8, expectancy: 0.149, profitFactor: 1.57, maxDrawdownR: 3.4, trades: 80, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "tron", timeframe: "swing", winRate: 52, expectancy: 0.142, profitFactor: 1.44, maxDrawdownR: 8.45, trades: 102, tier: "proven" },
  { strategyId: "trend-rider", symbol: "matic-network", timeframe: "swing", winRate: 52.2, expectancy: 0.109, profitFactor: 1.44, maxDrawdownR: 5.09, trades: 201, tier: "proven" },
  { strategyId: "momentum-burst", symbol: "matic-network", timeframe: "swing", winRate: 47.1, expectancy: 0.172, profitFactor: 1.37, maxDrawdownR: 20.33, trades: 240, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "matic-network", timeframe: "swing", winRate: 47.9, expectancy: 0.109, profitFactor: 1.32, maxDrawdownR: 6.21, trades: 73, tier: "proven" },
  { strategyId: "band-fade", symbol: "litecoin", timeframe: "swing", winRate: 56.6, expectancy: 0.248, profitFactor: 1.54, maxDrawdownR: 6.56, trades: 53, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "uniswap", timeframe: "swing", winRate: 49.4, expectancy: 0.105, profitFactor: 1.33, maxDrawdownR: 7.53, trades: 89, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "internet-computer", timeframe: "swing", winRate: 47.6, expectancy: 0.165, profitFactor: 1.37, maxDrawdownR: 8.65, trades: 143, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "internet-computer", timeframe: "swing", winRate: 48.8, expectancy: 0.102, profitFactor: 1.33, maxDrawdownR: 4.05, trades: 86, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "stellar", timeframe: "swing", winRate: 49, expectancy: 0.192, profitFactor: 1.45, maxDrawdownR: 5.73, trades: 157, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "stellar", timeframe: "swing", winRate: 50.6, expectancy: 0.115, profitFactor: 1.42, maxDrawdownR: 3.11, trades: 89, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "cosmos", timeframe: "swing", winRate: 49.7, expectancy: 0.138, profitFactor: 1.31, maxDrawdownR: 12.28, trades: 143, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "cosmos", timeframe: "swing", winRate: 54.1, expectancy: 0.145, profitFactor: 1.58, maxDrawdownR: 4.51, trades: 85, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "arbitrum", timeframe: "swing", winRate: 47.2, expectancy: 0.197, profitFactor: 1.46, maxDrawdownR: 6.51, trades: 144, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "sei-network", timeframe: "swing", winRate: 49.7, expectancy: 0.181, profitFactor: 1.44, maxDrawdownR: 8.32, trades: 153, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "render-token", timeframe: "swing", winRate: 48.9, expectancy: 0.163, profitFactor: 1.4, maxDrawdownR: 7.68, trades: 133, tier: "proven" },
  { strategyId: "trend-rider", symbol: "fantom", timeframe: "swing", winRate: 50, expectancy: 0.079, profitFactor: 1.31, maxDrawdownR: 2.57, trades: 50, tier: "proven" },
  { strategyId: "momentum-burst", symbol: "fantom", timeframe: "swing", winRate: 51.4, expectancy: 0.243, profitFactor: 1.53, maxDrawdownR: 6.99, trades: 74, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "fantom", timeframe: "swing", winRate: 52.6, expectancy: 0.137, profitFactor: 1.34, maxDrawdownR: 6.65, trades: 38, tier: "proven" },
  { strategyId: "golden-trend", symbol: "polkadot", timeframe: "position", winRate: 50.5, expectancy: 0.177, profitFactor: 1.42, maxDrawdownR: 5.68, trades: 97, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "polkadot", timeframe: "position", winRate: 53.1, expectancy: 0.361, profitFactor: 2.43, maxDrawdownR: 2.27, trades: 32, tier: "proven" },
  { strategyId: "band-fade", symbol: "polkadot", timeframe: "position", winRate: 48.4, expectancy: 0.202, profitFactor: 1.41, maxDrawdownR: 4.17, trades: 31, tier: "proven" },
  { strategyId: "trend-rider", symbol: "tron", timeframe: "position", winRate: 59.3, expectancy: 0.331, profitFactor: 2.31, maxDrawdownR: 5.02, trades: 86, tier: "strong" },
  { strategyId: "pullback-buyer", symbol: "tron", timeframe: "position", winRate: 63, expectancy: 0.4, profitFactor: 2.36, maxDrawdownR: 3.51, trades: 46, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "tron", timeframe: "position", winRate: 44.4, expectancy: 0.174, profitFactor: 1.33, maxDrawdownR: 4.13, trades: 63, tier: "proven" },
  { strategyId: "band-fade", symbol: "tron", timeframe: "position", winRate: 48.6, expectancy: 0.174, profitFactor: 1.32, maxDrawdownR: 5.13, trades: 37, tier: "proven" },
  { strategyId: "momentum-burst", symbol: "matic-network", timeframe: "position", winRate: 63.6, expectancy: 0.427, profitFactor: 2.34, maxDrawdownR: 3.04, trades: 33, tier: "proven" },
  { strategyId: "trend-rider", symbol: "near", timeframe: "position", winRate: 49.4, expectancy: 0.146, profitFactor: 1.4, maxDrawdownR: 6.98, trades: 79, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "near", timeframe: "position", winRate: 55.1, expectancy: 0.257, profitFactor: 1.6, maxDrawdownR: 8.59, trades: 69, tier: "strong" },
  { strategyId: "golden-trend", symbol: "near", timeframe: "position", winRate: 47.8, expectancy: 0.167, profitFactor: 1.37, maxDrawdownR: 7.77, trades: 92, tier: "proven" },
  { strategyId: "momentum-burst", symbol: "internet-computer", timeframe: "position", winRate: 47.5, expectancy: 0.154, profitFactor: 1.33, maxDrawdownR: 6.06, trades: 101, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "internet-computer", timeframe: "position", winRate: 50.9, expectancy: 0.271, profitFactor: 1.67, maxDrawdownR: 5.44, trades: 53, tier: "proven" },
  { strategyId: "trend-rider", symbol: "aptos", timeframe: "position", winRate: 60, expectancy: 0.186, profitFactor: 1.84, maxDrawdownR: 1.88, trades: 50, tier: "proven" },
  { strategyId: "band-fade", symbol: "stellar", timeframe: "position", winRate: 62.5, expectancy: 0.564, profitFactor: 2.55, maxDrawdownR: 3.19, trades: 32, tier: "proven" },
  { strategyId: "trend-rider", symbol: "filecoin", timeframe: "position", winRate: 59, expectancy: 0.125, profitFactor: 1.44, maxDrawdownR: 4.86, trades: 83, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "filecoin", timeframe: "position", winRate: 64.5, expectancy: 0.501, profitFactor: 3.05, maxDrawdownR: 2.89, trades: 31, tier: "proven" },
  { strategyId: "band-fade", symbol: "filecoin", timeframe: "position", winRate: 48.8, expectancy: 0.262, profitFactor: 1.59, maxDrawdownR: 3.6, trades: 41, tier: "proven" },
  { strategyId: "golden-trend", symbol: "hedera-hashgraph", timeframe: "position", winRate: 44.9, expectancy: 0.137, profitFactor: 1.32, maxDrawdownR: 7.78, trades: 98, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "hedera-hashgraph", timeframe: "position", winRate: 61.1, expectancy: 0.238, profitFactor: 1.82, maxDrawdownR: 2.83, trades: 36, tier: "proven" },
  { strategyId: "trend-rider", symbol: "arbitrum", timeframe: "position", winRate: 55.8, expectancy: 0.123, profitFactor: 1.38, maxDrawdownR: 6.4, trades: 43, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "arbitrum", timeframe: "position", winRate: 47.2, expectancy: 0.254, profitFactor: 1.56, maxDrawdownR: 4.18, trades: 36, tier: "proven" },
  { strategyId: "golden-trend", symbol: "arbitrum", timeframe: "position", winRate: 52.3, expectancy: 0.236, profitFactor: 1.65, maxDrawdownR: 5.32, trades: 44, tier: "proven" },
  { strategyId: "trend-rider", symbol: "optimism", timeframe: "position", winRate: 52.7, expectancy: 0.141, profitFactor: 1.45, maxDrawdownR: 4.38, trades: 55, tier: "proven" },
  { strategyId: "golden-trend", symbol: "optimism", timeframe: "position", winRate: 44.6, expectancy: 0.14, profitFactor: 1.3, maxDrawdownR: 6.89, trades: 65, tier: "proven" },
  { strategyId: "trend-rider", symbol: "injective-protocol", timeframe: "position", winRate: 54.9, expectancy: 0.097, profitFactor: 1.31, maxDrawdownR: 6.85, trades: 82, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "injective-protocol", timeframe: "position", winRate: 44.4, expectancy: 0.218, profitFactor: 1.49, maxDrawdownR: 9.59, trades: 63, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "injective-protocol", timeframe: "position", winRate: 54.8, expectancy: 0.187, profitFactor: 1.69, maxDrawdownR: 3.44, trades: 31, tier: "proven" },
  { strategyId: "momentum-burst", symbol: "sei-network", timeframe: "position", winRate: 50, expectancy: 0.257, profitFactor: 1.52, maxDrawdownR: 6.1, trades: 52, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "sei-network", timeframe: "position", winRate: 53.1, expectancy: 0.315, profitFactor: 1.76, maxDrawdownR: 2.77, trades: 32, tier: "proven" },
  { strategyId: "trend-rider", symbol: "the-graph", timeframe: "position", winRate: 57.1, expectancy: 0.106, profitFactor: 1.37, maxDrawdownR: 5.12, trades: 77, tier: "proven" },
  { strategyId: "momentum-burst", symbol: "the-graph", timeframe: "position", winRate: 53.5, expectancy: 0.27, profitFactor: 1.63, maxDrawdownR: 5.14, trades: 101, tier: "strong" },
  { strategyId: "breakout-hunter", symbol: "the-graph", timeframe: "position", winRate: 50, expectancy: 0.192, profitFactor: 1.46, maxDrawdownR: 3.53, trades: 64, tier: "proven" },
  { strategyId: "trend-rider", symbol: "fantom", timeframe: "position", winRate: 56.3, expectancy: 0.276, profitFactor: 1.93, maxDrawdownR: 2.7, trades: 64, tier: "strong" },
  { strategyId: "momentum-burst", symbol: "fantom", timeframe: "position", winRate: 44.9, expectancy: 0.199, profitFactor: 1.4, maxDrawdownR: 7.41, trades: 89, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "fantom", timeframe: "position", winRate: 53.6, expectancy: 0.446, profitFactor: 2.13, maxDrawdownR: 3.82, trades: 56, tier: "proven" },
  { strategyId: "golden-trend", symbol: "fantom", timeframe: "position", winRate: 50.7, expectancy: 0.364, profitFactor: 1.82, maxDrawdownR: 6.14, trades: 73, tier: "strong" },
  { strategyId: "supertrend-follow", symbol: "fantom", timeframe: "position", winRate: 61.3, expectancy: 0.353, profitFactor: 2.61, maxDrawdownR: 1.77, trades: 31, tier: "proven" },
  // --- Expanded US equities (Alpaca data, same >=30 trades / expectancy>0 / PF>=1.3 bar) ---
  { strategyId: "trend-rider", symbol: "AMD", timeframe: "swing", winRate: 47, expectancy: 0.257, profitFactor: 1.74, maxDrawdownR: 4.75, trades: 66, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "AMD", timeframe: "swing", winRate: 53.2, expectancy: 0.289, profitFactor: 1.69, maxDrawdownR: 3.04, trades: 47, tier: "proven" },
  { strategyId: "golden-trend", symbol: "AMD", timeframe: "swing", winRate: 45.2, expectancy: 0.246, profitFactor: 1.52, maxDrawdownR: 5.74, trades: 84, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "AMD", timeframe: "swing", winRate: 55, expectancy: 0.22, profitFactor: 1.69, maxDrawdownR: 2.47, trades: 40, tier: "proven" },
  { strategyId: "trend-rider", symbol: "NFLX", timeframe: "swing", winRate: 52.9, expectancy: 0.209, profitFactor: 1.66, maxDrawdownR: 3.75, trades: 68, tier: "proven" },
  { strategyId: "golden-trend", symbol: "NFLX", timeframe: "swing", winRate: 55.6, expectancy: 0.297, profitFactor: 1.75, maxDrawdownR: 7.08, trades: 81, tier: "proven" },
  { strategyId: "trend-rider", symbol: "COIN", timeframe: "swing", winRate: 50.9, expectancy: 0.178, profitFactor: 1.62, maxDrawdownR: 4.23, trades: 55, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "COIN", timeframe: "swing", winRate: 46.8, expectancy: 0.228, profitFactor: 1.5, maxDrawdownR: 4.29, trades: 47, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "COIN", timeframe: "swing", winRate: 51.5, expectancy: 0.275, profitFactor: 1.88, maxDrawdownR: 3.75, trades: 33, tier: "proven" },
  { strategyId: "trend-rider", symbol: "PLTR", timeframe: "swing", winRate: 52.9, expectancy: 0.189, profitFactor: 1.59, maxDrawdownR: 3.3, trades: 68, tier: "proven" },
  { strategyId: "golden-trend", symbol: "PLTR", timeframe: "swing", winRate: 47.1, expectancy: 0.185, profitFactor: 1.43, maxDrawdownR: 8.32, trades: 87, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "PLTR", timeframe: "swing", winRate: 55.6, expectancy: 0.084, profitFactor: 1.3, maxDrawdownR: 2.58, trades: 36, tier: "proven" },
  { strategyId: "momentum-burst", symbol: "JPM", timeframe: "swing", winRate: 44.8, expectancy: 0.161, profitFactor: 1.31, maxDrawdownR: 10.11, trades: 96, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "JPM", timeframe: "swing", winRate: 70.6, expectancy: 0.243, profitFactor: 1.95, maxDrawdownR: 2.04, trades: 34, tier: "strong" },
  { strategyId: "golden-trend", symbol: "JPM", timeframe: "swing", winRate: 47.7, expectancy: 0.154, profitFactor: 1.33, maxDrawdownR: 9.01, trades: 86, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "SOFI", timeframe: "swing", winRate: 43.3, expectancy: 0.106, profitFactor: 1.34, maxDrawdownR: 6.18, trades: 30, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "GME", timeframe: "swing", winRate: 44, expectancy: 0.179, profitFactor: 1.36, maxDrawdownR: 4.74, trades: 50, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "GME", timeframe: "swing", winRate: 59.1, expectancy: 0.238, profitFactor: 1.83, maxDrawdownR: 3.24, trades: 44, tier: "strong" },
  { strategyId: "trend-rider", symbol: "AVGO", timeframe: "swing", winRate: 53.2, expectancy: 0.196, profitFactor: 1.61, maxDrawdownR: 4.28, trades: 77, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "AVGO", timeframe: "swing", winRate: 60, expectancy: 0.306, profitFactor: 1.99, maxDrawdownR: 3.48, trades: 45, tier: "strong" },
  { strategyId: "golden-trend", symbol: "AVGO", timeframe: "swing", winRate: 51.6, expectancy: 0.297, profitFactor: 1.7, maxDrawdownR: 8.23, trades: 91, tier: "proven" },
  { strategyId: "trend-rider", symbol: "CRM", timeframe: "swing", winRate: 59.2, expectancy: 0.107, profitFactor: 1.34, maxDrawdownR: 5.06, trades: 76, tier: "proven" },
  { strategyId: "golden-trend", symbol: "CRM", timeframe: "swing", winRate: 50, expectancy: 0.244, profitFactor: 1.6, maxDrawdownR: 7, trades: 84, tier: "proven" },
  { strategyId: "trend-rider", symbol: "ORCL", timeframe: "swing", winRate: 54.8, expectancy: 0.254, profitFactor: 1.9, maxDrawdownR: 2.81, trades: 73, tier: "strong" },
  { strategyId: "momentum-burst", symbol: "ORCL", timeframe: "swing", winRate: 48.9, expectancy: 0.21, profitFactor: 1.41, maxDrawdownR: 5.89, trades: 88, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "ORCL", timeframe: "swing", winRate: 50, expectancy: 0.346, profitFactor: 1.89, maxDrawdownR: 3.04, trades: 30, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "ORCL", timeframe: "swing", winRate: 50, expectancy: 0.155, profitFactor: 1.33, maxDrawdownR: 4.46, trades: 50, tier: "proven" },
  { strategyId: "golden-trend", symbol: "ORCL", timeframe: "swing", winRate: 48.8, expectancy: 0.255, profitFactor: 1.58, maxDrawdownR: 5.44, trades: 84, tier: "proven" },
  { strategyId: "trend-rider", symbol: "PYPL", timeframe: "swing", winRate: 52.2, expectancy: 0.122, profitFactor: 1.4, maxDrawdownR: 5.49, trades: 69, tier: "proven" },
  { strategyId: "trend-rider", symbol: "MU", timeframe: "swing", winRate: 48, expectancy: 0.182, profitFactor: 1.54, maxDrawdownR: 7.66, trades: 75, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "MU", timeframe: "swing", winRate: 62.5, expectancy: 0.434, profitFactor: 2.73, maxDrawdownR: 2.1, trades: 32, tier: "strong" },
  { strategyId: "breakout-hunter", symbol: "MU", timeframe: "swing", winRate: 49, expectancy: 0.2, profitFactor: 1.42, maxDrawdownR: 8.01, trades: 51, tier: "proven" },
  { strategyId: "trend-rider", symbol: "SMCI", timeframe: "swing", winRate: 45.7, expectancy: 0.122, profitFactor: 1.33, maxDrawdownR: 4.26, trades: 70, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "SMCI", timeframe: "swing", winRate: 57.5, expectancy: 0.26, profitFactor: 1.89, maxDrawdownR: 5.21, trades: 40, tier: "strong" },
  { strategyId: "trend-rider", symbol: "MSTR", timeframe: "swing", winRate: 51.6, expectancy: 0.171, profitFactor: 1.5, maxDrawdownR: 3.87, trades: 62, tier: "proven" },
  { strategyId: "momentum-burst", symbol: "MSTR", timeframe: "swing", winRate: 48.5, expectancy: 0.315, profitFactor: 1.64, maxDrawdownR: 7.07, trades: 97, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "MSTR", timeframe: "swing", winRate: 56.6, expectancy: 0.402, profitFactor: 2.06, maxDrawdownR: 5, trades: 53, tier: "strong" },
  { strategyId: "golden-trend", symbol: "MSTR", timeframe: "swing", winRate: 50.6, expectancy: 0.276, profitFactor: 1.63, maxDrawdownR: 5.82, trades: 83, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "MSTR", timeframe: "swing", winRate: 59, expectancy: 0.347, profitFactor: 2.22, maxDrawdownR: 3.55, trades: 39, tier: "strong" },
  { strategyId: "trend-rider", symbol: "AMD", timeframe: "position", winRate: 55.6, expectancy: 0.301, profitFactor: 1.83, maxDrawdownR: 5.58, trades: 54, tier: "strong" },
  { strategyId: "breakout-hunter", symbol: "AMD", timeframe: "position", winRate: 48.9, expectancy: 0.295, profitFactor: 1.68, maxDrawdownR: 3.04, trades: 45, tier: "proven" },
  { strategyId: "golden-trend", symbol: "AMD", timeframe: "position", winRate: 39.2, expectancy: 0.278, profitFactor: 1.49, maxDrawdownR: 7.02, trades: 74, tier: "proven" },
  { strategyId: "trend-rider", symbol: "NFLX", timeframe: "position", winRate: 55.6, expectancy: 0.211, profitFactor: 1.6, maxDrawdownR: 4.21, trades: 54, tier: "proven" },
  { strategyId: "golden-trend", symbol: "NFLX", timeframe: "position", winRate: 49.3, expectancy: 0.27, profitFactor: 1.56, maxDrawdownR: 7.08, trades: 67, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "NFLX", timeframe: "position", winRate: 53.1, expectancy: 0.116, profitFactor: 1.31, maxDrawdownR: 3.45, trades: 32, tier: "proven" },
  { strategyId: "golden-trend", symbol: "COIN", timeframe: "position", winRate: 44.4, expectancy: 0.188, profitFactor: 1.38, maxDrawdownR: 4.49, trades: 63, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "COIN", timeframe: "position", winRate: 50, expectancy: 0.268, profitFactor: 1.81, maxDrawdownR: 3.09, trades: 30, tier: "proven" },
  { strategyId: "trend-rider", symbol: "PLTR", timeframe: "position", winRate: 52.9, expectancy: 0.216, profitFactor: 1.6, maxDrawdownR: 2.91, trades: 51, tier: "proven" },
  { strategyId: "golden-trend", symbol: "PLTR", timeframe: "position", winRate: 46.9, expectancy: 0.304, profitFactor: 1.63, maxDrawdownR: 5.75, trades: 64, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "PLTR", timeframe: "position", winRate: 57.6, expectancy: 0.115, profitFactor: 1.41, maxDrawdownR: 2.65, trades: 33, tier: "proven" },
  { strategyId: "trend-rider", symbol: "JPM", timeframe: "position", winRate: 55.6, expectancy: 0.121, profitFactor: 1.32, maxDrawdownR: 4.52, trades: 54, tier: "proven" },
  { strategyId: "momentum-burst", symbol: "JPM", timeframe: "position", winRate: 47.1, expectancy: 0.326, profitFactor: 1.65, maxDrawdownR: 6.62, trades: 87, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "JPM", timeframe: "position", winRate: 60, expectancy: 0.284, profitFactor: 1.93, maxDrawdownR: 2.33, trades: 30, tier: "strong" },
  { strategyId: "golden-trend", symbol: "JPM", timeframe: "position", winRate: 46.3, expectancy: 0.188, profitFactor: 1.37, maxDrawdownR: 7.95, trades: 67, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "BABA", timeframe: "position", winRate: 58.3, expectancy: 0.116, profitFactor: 1.32, maxDrawdownR: 6.15, trades: 36, tier: "proven" },
  { strategyId: "trend-rider", symbol: "AVGO", timeframe: "position", winRate: 53.4, expectancy: 0.242, profitFactor: 1.73, maxDrawdownR: 4.55, trades: 58, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "AVGO", timeframe: "position", winRate: 53.8, expectancy: 0.378, profitFactor: 2.08, maxDrawdownR: 3.19, trades: 39, tier: "strong" },
  { strategyId: "golden-trend", symbol: "AVGO", timeframe: "position", winRate: 48, expectancy: 0.241, profitFactor: 1.5, maxDrawdownR: 8.04, trades: 75, tier: "proven" },
  { strategyId: "trend-rider", symbol: "CRM", timeframe: "position", winRate: 52.6, expectancy: 0.118, profitFactor: 1.31, maxDrawdownR: 5.22, trades: 57, tier: "proven" },
  { strategyId: "golden-trend", symbol: "CRM", timeframe: "position", winRate: 43.8, expectancy: 0.204, profitFactor: 1.41, maxDrawdownR: 6.12, trades: 64, tier: "proven" },
  { strategyId: "trend-rider", symbol: "ORCL", timeframe: "position", winRate: 50.9, expectancy: 0.236, profitFactor: 1.6, maxDrawdownR: 4.35, trades: 55, tier: "proven" },
  { strategyId: "momentum-burst", symbol: "ORCL", timeframe: "position", winRate: 42.5, expectancy: 0.207, profitFactor: 1.36, maxDrawdownR: 9.69, trades: 87, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "ORCL", timeframe: "position", winRate: 56.5, expectancy: 0.495, profitFactor: 2.12, maxDrawdownR: 5.29, trades: 46, tier: "strong" },
  { strategyId: "golden-trend", symbol: "ORCL", timeframe: "position", winRate: 41.2, expectancy: 0.273, profitFactor: 1.53, maxDrawdownR: 5.1, trades: 68, tier: "proven" },
  { strategyId: "trend-rider", symbol: "PYPL", timeframe: "position", winRate: 52.7, expectancy: 0.114, profitFactor: 1.32, maxDrawdownR: 6.86, trades: 55, tier: "proven" },
  { strategyId: "trend-rider", symbol: "SHOP", timeframe: "position", winRate: 50.9, expectancy: 0.136, profitFactor: 1.4, maxDrawdownR: 7.25, trades: 53, tier: "proven" },
  { strategyId: "trend-rider", symbol: "MU", timeframe: "position", winRate: 55.4, expectancy: 0.307, profitFactor: 1.93, maxDrawdownR: 6.29, trades: 56, tier: "strong" },
  { strategyId: "golden-trend", symbol: "SMCI", timeframe: "position", winRate: 43.2, expectancy: 0.228, profitFactor: 1.44, maxDrawdownR: 7.86, trades: 74, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "SMCI", timeframe: "position", winRate: 45.9, expectancy: 0.149, profitFactor: 1.41, maxDrawdownR: 5.62, trades: 37, tier: "proven" },
  { strategyId: "trend-rider", symbol: "MSTR", timeframe: "position", winRate: 51, expectancy: 0.28, profitFactor: 1.77, maxDrawdownR: 4.58, trades: 49, tier: "proven" },
  { strategyId: "momentum-burst", symbol: "MSTR", timeframe: "position", winRate: 45.6, expectancy: 0.323, profitFactor: 1.64, maxDrawdownR: 6.36, trades: 90, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "MSTR", timeframe: "position", winRate: 51, expectancy: 0.447, profitFactor: 2.02, maxDrawdownR: 4.85, trades: 51, tier: "proven" },
  { strategyId: "golden-trend", symbol: "MSTR", timeframe: "position", winRate: 44.3, expectancy: 0.291, profitFactor: 1.56, maxDrawdownR: 5.52, trades: 70, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "MSTR", timeframe: "position", winRate: 58.3, expectancy: 0.44, profitFactor: 2.41, maxDrawdownR: 2.56, trades: 36, tier: "strong" },
]

// ---------------------------------------------------------------------------
// USER-FACING NAMES. The user only ever sees these names + behavior, never the
// underlying rules. Map your real strategy ids here if they differ.
// ---------------------------------------------------------------------------
export const STRATEGY_NAME: Record<string, string> = {
  "trend-rider": "Trend Rider",
  "golden-trend": "Golden Trend",
  "pullback-buyer": "Pullback Buyer",
  "breakout-hunter": "Breakout Hunter",
  "momentum-burst": "Momentum Burst",
  "supertrend-follow": "Supertrend Follower",
  "band-fade": "Band Fade",
}

// Crypto ids in the roster (everything else is a stock/ETF ticker).
const CRYPTO_IDS = new Set([
  "avalanche-2", "binancecoin", "bitcoin", "cardano",
  "dogecoin", "ethereum", "solana", "sui",
  // expanded universe
  "ripple", "polkadot", "tron", "matic-network", "litecoin", "uniswap",
  "internet-computer", "stellar", "cosmos", "arbitrum", "sei-network",
  "render-token", "fantom", "near", "aptos", "filecoin", "hedera-hashgraph",
  "optimism", "injective-protocol", "the-graph",
])
export function isCryptoSymbol(symbol: string): boolean {
  return CRYPTO_IDS.has(symbol)
}

// ---------------------------------------------------------------------------
// DATA-DERIVED VOLATILITY TIER — classify each symbol by the AVERAGE worst
// losing streak of its proven pairings. Honest, straight from the backtests.
// ---------------------------------------------------------------------------
export type VolTier = "steady" | "moderate" | "explosive"

const VOL_TIER_BY_SYMBOL: Record<string, VolTier> = (() => {
  const bySym: Record<string, number[]> = {}
  for (const p of PROVEN_PAIRINGS) (bySym[p.symbol] ??= []).push(p.maxDrawdownR)
  const out: Record<string, VolTier> = {}
  for (const [sym, dds] of Object.entries(bySym)) {
    const avg = dds.reduce((a, b) => a + b, 0) / dds.length
    out[sym] = avg <= 5 ? "steady" : avg <= 9 ? "moderate" : "explosive"
  }
  return out
})()
export function volTier(symbol: string): VolTier {
  return VOL_TIER_BY_SYMBOL[symbol] ?? "moderate"
}

// ---------------------------------------------------------------------------
// THE 7 WIZARD QUESTIONS (plain data). Every question here MUST feed scorePairing
// below. If you add a question, score it. If you can't score it, don't ask it.
// ---------------------------------------------------------------------------
export type WizardAnswers = {
  asset: "crypto" | "stocks" | "either"
  hold: "days" | "weeks" | "either"
  comfort: "calm" | "some" | "high"
  mover: "steady" | "explosive" | "any"
  activity: "weekly" | "often" | "either"
  winStyle: "winOften" | "biggerWins" | "noPref"
  proof: "provenOnly" | "balanced" | "open"
}

export type WizardQuestion = {
  id: keyof WizardAnswers
  prompt: string
  help: string
  options: { value: string; label: string; desc: string }[]
}

export const WIZARD_QUESTIONS: WizardQuestion[] = [
  { id: "asset", prompt: "What do you want to trade?", help: "We only match you to markets we've actually tested.", options: [
    { value: "stocks", label: "Stocks & ETFs", desc: "Apple, Nvidia, S&P 500, and the like" },
    { value: "crypto", label: "Crypto", desc: "Bitcoin, Ethereum, Solana, and others" },
    { value: "either", label: "Show me either", desc: "I'm open — match me to whatever fits best" }] },
  { id: "hold", prompt: "How long do you want to hold a trade?", help: "There's no right answer — it's about what fits your life.", options: [
    { value: "days", label: "A few days", desc: "In and out within the week" },
    { value: "weeks", label: "A few weeks", desc: "Patient — let the bigger move play out" },
    { value: "either", label: "No preference", desc: "Whatever has the strongest track record" }] },
  { id: "comfort", prompt: "How do you feel about price swings?", help: "This sets how bumpy a ride we'll match you to.", options: [
    { value: "calm", label: "Keep it calm", desc: "I'd rather avoid big ups and downs" },
    { value: "some", label: "Some is fine", desc: "I can handle a normal amount of movement" },
    { value: "high", label: "Bring it on", desc: "Big swings don't rattle me" }] },
  { id: "mover", prompt: "What kind of market appeals to you?", help: "Steadier names move less; explosive ones move hard in both directions.", options: [
    { value: "steady", label: "Steady & established", desc: "Large, well-known, slower movers" },
    { value: "explosive", label: "Fast & volatile", desc: "High-energy names that move quickly" },
    { value: "any", label: "Doesn't matter", desc: "Match me on results, not vibe" }] },
  { id: "activity", prompt: "How often do you want to check in?", help: "Be honest — a plan you'll actually follow beats a perfect one you won't.", options: [
    { value: "weekly", label: "About once a week", desc: "I don't want to babysit it" },
    { value: "often", label: "A few times a week", desc: "I'll stay closer to it" },
    { value: "either", label: "Flexible", desc: "Whatever the strategy needs" }] },
  { id: "winStyle", prompt: "What feels better to you?", help: "Both can be profitable — it's about what keeps you steady.", options: [
    { value: "winOften", label: "Winning more often", desc: "Frequent small wins, even if each is modest" },
    { value: "biggerWins", label: "Bigger wins", desc: "Fewer wins, but the winners more than pay for the losers" },
    { value: "noPref", label: "No preference", desc: "Just match me to the strongest track record" }] },
  { id: "proof", prompt: "How much proof do you want behind it?", help: "Our gold standard is a strategy that kept working on data it had never seen.", options: [
    { value: "provenOnly", label: "Only the most proven", desc: "Stick to gold-standard survivors" },
    { value: "balanced", label: "Lean proven", desc: "Prefer the most-tested, but stay open" },
    { value: "open", label: "Show me the best fit", desc: "Match me on fit; I'll read the track record myself" }] },
]

// ---------------------------------------------------------------------------
// SCORING — every answer changes the score. No question is decorative.
// NOTE: this engine has no out-of-sample (OOS) field; "proof" is weighted by
// tier ("strong" = the gold standard here). If you import real OOS verdicts,
// swap the `robust` check to use them.
// ---------------------------------------------------------------------------
export function scorePairing(p: ProvenPairing, a: WizardAnswers): number {
  let score = 0

  // Hold length (swing = days, position = weeks); activity reinforces it.
  const wantsSwing = a.hold === "days" || (a.hold === "either" && a.activity === "often")
  const wantsPosition = a.hold === "weeks" || (a.hold === "either" && a.activity === "weekly")
  if (a.hold === "either" && a.activity === "either") score += 1
  else if (wantsSwing && p.timeframe === "swing") score += 3
  else if (wantsPosition && p.timeframe === "position") score += 3
  else if (a.hold === "either") score += 1
  else score -= 2

  // Swing comfort vs worst losing streak.
  const dd = p.maxDrawdownR
  if (a.comfort === "calm") score += dd <= 5 ? 3 : dd <= 9 ? 0 : -3
  else if (a.comfort === "some") score += dd <= 9 ? 2 : dd <= 14 ? 1 : -1
  else score += dd > 9 ? 2 : 1

  // Mover type vs data-derived volatility tier.
  const tier = volTier(p.symbol)
  if (a.mover === "steady") score += tier === "steady" ? 3 : tier === "moderate" ? 1 : -2
  else if (a.mover === "explosive") score += tier === "explosive" ? 3 : tier === "moderate" ? 1 : -2

  // Win style: win-often rewards win rate; bigger-wins rewards profit factor.
  if (a.winStyle === "winOften") score += p.winRate >= 60 ? 3 : p.winRate >= 50 ? 1 : -1
  else if (a.winStyle === "biggerWins") score += p.profitFactor >= 1.8 ? 3 : p.profitFactor >= 1.4 ? 1 : -1

  // Proof appetite: "strong" tier is the most-tested. Weight it by appetite.
  const robust = p.tier === "strong"
  const proofWeight = a.proof === "provenOnly" ? 8 : a.proof === "balanced" ? 4 : 2
  if (robust) score += proofWeight

  // Asset preference: strong nudge, NEVER a hard filter (keeps a match guaranteed).
  if (a.asset === "crypto") score += isCryptoSymbol(p.symbol) ? 6 : -6
  else if (a.asset === "stocks") score += isCryptoSymbol(p.symbol) ? -6 : 6

  // Edge as final tiebreaker.
  score += p.expectancy * 2
  return score
}

export function fitReasons(p: ProvenPairing, a: WizardAnswers): string[] {
  const r: string[] = []
  r.push(p.timeframe === "swing" ? "Holds for a few days, matching your pace" : "Holds for weeks, matching your patience")
  const tier = volTier(p.symbol)
  if (a.mover === "steady" && tier === "steady") r.push("A steadier, established market like you wanted")
  else if (a.mover === "explosive" && tier === "explosive") r.push("A high-energy mover like you wanted")
  if (a.comfort === "calm" && p.maxDrawdownR <= 5) r.push("Kept its worst losing streak small")
  if (a.winStyle === "winOften" && p.winRate >= 60) r.push(`Wins often — ${p.winRate}% of trades closed green`)
  else if (a.winStyle === "biggerWins" && p.profitFactor >= 1.8) r.push(`Winners outweigh losers — ${p.profitFactor}x profit factor`)
  if (p.tier === "strong") r.push("One of the most-tested, highest-confidence pairings we have")
  return r
}

// ---------------------------------------------------------------------------
// THE MATCHER — the ONE entry point. Always returns a strategy (never null).
// ---------------------------------------------------------------------------
export type WizardMatch = {
  best: ProvenPairing & { strategyName: string }
  alternatives: (ProvenPairing & { strategyName: string })[]
  reasons: string[]
}

function named(p: ProvenPairing) {
  return { ...p, strategyName: STRATEGY_NAME[p.strategyId] ?? p.strategyId }
}

export function matchWizard(answers: WizardAnswers): WizardMatch {
  const ranked = [...PROVEN_PAIRINGS]
    .sort((x, y) => scorePairing(y, answers) - scorePairing(x, answers))
    .map(named)
  const best = ranked[0]
  return { best, alternatives: ranked.slice(1, 4), reasons: fitReasons(best, answers) }
}
