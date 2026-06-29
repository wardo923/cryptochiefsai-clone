// ============================================================================
// PROVEN MAPPING — which named strategy actually works on which ticker/timeframe.
//
// Every row below was produced by running the 8 Playbook strategies through the
// SAME realistic-cost backtest engine the rest of the app uses, across the full
// asset universe at swing and position timeframes. Only pairings that cleared a
// strict robustness bar are kept:
//     trades >= 30  AND  expectancy > 0  AND  profitFactor >= 1.3
//
// "tier" reflects confidence in the edge:
//   strong = large sample (>=60 trades) AND profit factor >= 1.6
//   proven = met the robustness bar above
//
// This is the hidden layer: a user only ever sees a strategy NAME and its proven
// outcome on their ticker. We never surface a pairing that failed testing.
// Regenerate with the /api/playbook-matrix endpoint if data is refreshed.
// ============================================================================

export type ProvenTier = "strong" | "proven"

export type ProvenPairing = {
  strategyId: string
  symbol: string
  timeframe: "swing" | "position"
  winRate: number
  expectancy: number
  profitFactor: number
  maxDrawdownR: number
  trades: number
  tier: ProvenTier
}

export const PROVEN_PAIRINGS: ProvenPairing[] = [
  { strategyId: "momentum-burst", symbol: "AAPL", timeframe: "swing", winRate: 48.5, expectancy: 0.25, profitFactor: 1.52, maxDrawdownR: 5.92, trades: 132, tier: "proven" },
  { strategyId: "golden-trend", symbol: "AAPL", timeframe: "position", winRate: 46.8, expectancy: 0.228, profitFactor: 1.45, maxDrawdownR: 9.41, trades: 190, tier: "proven" },
  { strategyId: "momentum-burst", symbol: "AAPL", timeframe: "position", winRate: 43.2, expectancy: 0.198, profitFactor: 1.35, maxDrawdownR: 9.92, trades: 227, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "AAPL", timeframe: "position", winRate: 52.9, expectancy: 0.187, profitFactor: 1.54, maxDrawdownR: 3.9, trades: 85, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "AAPL", timeframe: "swing", winRate: 63.3, expectancy: 0.174, profitFactor: 1.61, maxDrawdownR: 4.47, trades: 49, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "AAPL", timeframe: "position", winRate: 49.3, expectancy: 0.16, profitFactor: 1.37, maxDrawdownR: 5.83, trades: 73, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "AAPL", timeframe: "swing", winRate: 60.5, expectancy: 0.127, profitFactor: 1.37, maxDrawdownR: 4.16, trades: 43, tier: "proven" },
  { strategyId: "trend-rider", symbol: "AAPL", timeframe: "swing", winRate: 56.4, expectancy: 0.122, profitFactor: 1.39, maxDrawdownR: 3.78, trades: 101, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "AMZN", timeframe: "position", winRate: 57.1, expectancy: 0.279, profitFactor: 1.84, maxDrawdownR: 4.89, trades: 77, tier: "strong" },
  { strategyId: "supertrend-follow", symbol: "AMZN", timeframe: "swing", winRate: 60, expectancy: 0.22, profitFactor: 1.95, maxDrawdownR: 2.22, trades: 50, tier: "proven" },
  { strategyId: "golden-trend", symbol: "AMZN", timeframe: "position", winRate: 47.3, expectancy: 0.185, profitFactor: 1.37, maxDrawdownR: 11.51, trades: 201, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "AMZN", timeframe: "swing", winRate: 57.8, expectancy: 0.184, profitFactor: 1.6, maxDrawdownR: 3.72, trades: 45, tier: "proven" },
  { strategyId: "trend-rider", symbol: "AMZN", timeframe: "position", winRate: 52.2, expectancy: 0.147, profitFactor: 1.39, maxDrawdownR: 6.08, trades: 161, tier: "proven" },
  { strategyId: "band-fade", symbol: "DIA", timeframe: "position", winRate: 54.3, expectancy: 0.279, profitFactor: 1.55, maxDrawdownR: 9.98, trades: 35, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "DIA", timeframe: "swing", winRate: 64.4, expectancy: 0.097, profitFactor: 1.36, maxDrawdownR: 4.63, trades: 59, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "GOOGL", timeframe: "swing", winRate: 72.2, expectancy: 0.447, profitFactor: 3.51, maxDrawdownR: 2.05, trades: 54, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "GOOGL", timeframe: "position", winRate: 65.5, expectancy: 0.401, profitFactor: 2.53, maxDrawdownR: 4.16, trades: 84, tier: "strong" },
  { strategyId: "trend-rider", symbol: "GOOGL", timeframe: "position", winRate: 56.6, expectancy: 0.224, profitFactor: 1.65, maxDrawdownR: 5.97, trades: 152, tier: "strong" },
  { strategyId: "golden-trend", symbol: "GOOGL", timeframe: "position", winRate: 44.2, expectancy: 0.208, profitFactor: 1.42, maxDrawdownR: 7.61, trades: 181, tier: "proven" },
  { strategyId: "trend-rider", symbol: "GOOGL", timeframe: "swing", winRate: 63.7, expectancy: 0.203, profitFactor: 1.79, maxDrawdownR: 5.12, trades: 102, tier: "strong" },
  { strategyId: "golden-trend", symbol: "GOOGL", timeframe: "swing", winRate: 47.5, expectancy: 0.159, profitFactor: 1.38, maxDrawdownR: 7.33, trades: 122, tier: "proven" },
  { strategyId: "band-fade", symbol: "IWM", timeframe: "position", winRate: 50, expectancy: 0.208, profitFactor: 1.4, maxDrawdownR: 4.12, trades: 32, tier: "proven" },
  { strategyId: "golden-trend", symbol: "META", timeframe: "position", winRate: 50, expectancy: 0.269, profitFactor: 1.59, maxDrawdownR: 5.64, trades: 180, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "META", timeframe: "position", winRate: 57.5, expectancy: 0.222, profitFactor: 1.73, maxDrawdownR: 2.59, trades: 73, tier: "strong" },
  { strategyId: "golden-trend", symbol: "META", timeframe: "swing", winRate: 55.7, expectancy: 0.182, profitFactor: 1.46, maxDrawdownR: 5.01, trades: 122, tier: "proven" },
  { strategyId: "trend-rider", symbol: "META", timeframe: "position", winRate: 54, expectancy: 0.162, profitFactor: 1.47, maxDrawdownR: 4.13, trades: 150, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "META", timeframe: "swing", winRate: 63.4, expectancy: 0.139, profitFactor: 1.56, maxDrawdownR: 3.93, trades: 41, tier: "proven" },
  { strategyId: "trend-rider", symbol: "META", timeframe: "swing", winRate: 54, expectancy: 0.095, profitFactor: 1.31, maxDrawdownR: 4.84, trades: 100, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "MSFT", timeframe: "swing", winRate: 67.4, expectancy: 0.297, profitFactor: 2.3, maxDrawdownR: 2.84, trades: 43, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "MSFT", timeframe: "position", winRate: 58.8, expectancy: 0.295, profitFactor: 2.08, maxDrawdownR: 5.12, trades: 80, tier: "strong" },
  { strategyId: "golden-trend", symbol: "MSFT", timeframe: "swing", winRate: 54.6, expectancy: 0.21, profitFactor: 1.53, maxDrawdownR: 5.22, trades: 119, tier: "proven" },
  { strategyId: "trend-rider", symbol: "MSFT", timeframe: "position", winRate: 52.3, expectancy: 0.18, profitFactor: 1.52, maxDrawdownR: 8.57, trades: 155, tier: "proven" },
  { strategyId: "golden-trend", symbol: "MSFT", timeframe: "position", winRate: 47.1, expectancy: 0.176, profitFactor: 1.36, maxDrawdownR: 10.33, trades: 204, tier: "proven" },
  { strategyId: "trend-rider", symbol: "MSFT", timeframe: "swing", winRate: 63, expectancy: 0.167, profitFactor: 1.59, maxDrawdownR: 5.16, trades: 100, tier: "proven" },
  { strategyId: "golden-trend", symbol: "NVDA", timeframe: "swing", winRate: 50.4, expectancy: 0.289, profitFactor: 1.64, maxDrawdownR: 6.62, trades: 129, tier: "strong" },
  { strategyId: "pullback-buyer", symbol: "NVDA", timeframe: "position", winRate: 57.6, expectancy: 0.278, profitFactor: 1.87, maxDrawdownR: 3.84, trades: 85, tier: "strong" },
  { strategyId: "golden-trend", symbol: "NVDA", timeframe: "position", winRate: 46, expectancy: 0.258, profitFactor: 1.51, maxDrawdownR: 15.13, trades: 213, tier: "proven" },
  { strategyId: "trend-rider", symbol: "NVDA", timeframe: "swing", winRate: 57.4, expectancy: 0.253, profitFactor: 1.89, maxDrawdownR: 4.76, trades: 101, tier: "strong" },
  { strategyId: "pullback-buyer", symbol: "NVDA", timeframe: "swing", winRate: 56.3, expectancy: 0.239, profitFactor: 1.83, maxDrawdownR: 3.39, trades: 48, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "NVDA", timeframe: "swing", winRate: 47.4, expectancy: 0.186, profitFactor: 1.4, maxDrawdownR: 4.53, trades: 57, tier: "proven" },
  { strategyId: "trend-rider", symbol: "NVDA", timeframe: "position", winRate: 52.4, expectancy: 0.172, profitFactor: 1.46, maxDrawdownR: 10.13, trades: 168, tier: "proven" },
  { strategyId: "momentum-burst", symbol: "NVDA", timeframe: "swing", winRate: 44.8, expectancy: 0.161, profitFactor: 1.31, maxDrawdownR: 8.41, trades: 134, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "QQQ", timeframe: "swing", winRate: 75, expectancy: 0.34, profitFactor: 2.65, maxDrawdownR: 2.06, trades: 48, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "QQQ", timeframe: "position", winRate: 61.1, expectancy: 0.245, profitFactor: 1.84, maxDrawdownR: 12.44, trades: 90, tier: "strong" },
  { strategyId: "golden-trend", symbol: "QQQ", timeframe: "position", winRate: 48.3, expectancy: 0.223, profitFactor: 1.44, maxDrawdownR: 12.07, trades: 205, tier: "proven" },
  { strategyId: "trend-rider", symbol: "QQQ", timeframe: "swing", winRate: 66, expectancy: 0.176, profitFactor: 1.64, maxDrawdownR: 3.1, trades: 106, tier: "strong" },
  { strategyId: "golden-trend", symbol: "QQQ", timeframe: "swing", winRate: 50.8, expectancy: 0.176, profitFactor: 1.39, maxDrawdownR: 6.3, trades: 130, tier: "proven" },
  { strategyId: "trend-rider", symbol: "QQQ", timeframe: "position", winRate: 57.8, expectancy: 0.174, profitFactor: 1.5, maxDrawdownR: 10.54, trades: 166, tier: "proven" },
  { strategyId: "golden-trend", symbol: "SPY", timeframe: "swing", winRate: 55.6, expectancy: 0.14, profitFactor: 1.32, maxDrawdownR: 4.97, trades: 124, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "SPY", timeframe: "position", winRate: 57.4, expectancy: 0.129, profitFactor: 1.36, maxDrawdownR: 7.98, trades: 101, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "SPY", timeframe: "swing", winRate: 54.1, expectancy: 0.127, profitFactor: 1.39, maxDrawdownR: 5.61, trades: 61, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "TSLA", timeframe: "swing", winRate: 51.5, expectancy: 0.305, profitFactor: 1.75, maxDrawdownR: 3.9, trades: 66, tier: "strong" },
  { strategyId: "trend-rider", symbol: "TSLA", timeframe: "swing", winRate: 46.9, expectancy: 0.188, profitFactor: 1.57, maxDrawdownR: 5.86, trades: 96, tier: "proven" },
  { strategyId: "golden-trend", symbol: "TSLA", timeframe: "swing", winRate: 43, expectancy: 0.187, profitFactor: 1.39, maxDrawdownR: 10.33, trades: 121, tier: "proven" },
  { strategyId: "breakout-hunter", symbol: "TSLA", timeframe: "position", winRate: 46.4, expectancy: 0.168, profitFactor: 1.34, maxDrawdownR: 6.59, trades: 125, tier: "proven" },
  { strategyId: "pullback-buyer", symbol: "TSLA", timeframe: "swing", winRate: 47.4, expectancy: 0.145, profitFactor: 1.48, maxDrawdownR: 4.55, trades: 38, tier: "proven" },
  { strategyId: "supertrend-follow", symbol: "TSLA", timeframe: "position", winRate: 54.8, expectancy: 0.142, profitFactor: 1.4, maxDrawdownR: 6.57, trades: 93, tier: "proven" },
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
]

// All pairings for a given ticker, best edge first.
export function provenForSymbol(symbol: string): ProvenPairing[] {
  return PROVEN_PAIRINGS.filter((p) => p.symbol === symbol).sort((a, b) => b.expectancy - a.expectancy)
}

// The single best-fit strategy for a ticker (optionally at a fixed timeframe).
export function bestForSymbol(symbol: string, timeframe?: "swing" | "position"): ProvenPairing | null {
  const list = provenForSymbol(symbol).filter((p) => !timeframe || p.timeframe === timeframe)
  return list[0] ?? null
}

// Exact stats for one strategy/ticker/timeframe assignment, or null if it never
// passed testing (so the UI can honestly say "not proven on this market").
export function statsFor(
  strategyId: string,
  symbol: string,
  timeframe: "swing" | "position",
): ProvenPairing | null {
  return (
    PROVEN_PAIRINGS.find(
      (p) => p.strategyId === strategyId && p.symbol === symbol && p.timeframe === timeframe,
    ) ?? null
  )
}

// Every ticker that has at least one proven strategy.
export function provenSymbols(): string[] {
  return Array.from(new Set(PROVEN_PAIRINGS.map((p) => p.symbol)))
}
