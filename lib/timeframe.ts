// Selectable analysis timeframes. Each maps to a candle granularity for both
// crypto (CoinGecko hourly closes bucketed to N hours) and stocks (Yahoo
// interval + lookback). The same config drives signal generation and backtests
// so what you see is what gets tested.

export type Timeframe = "intraday5m" | "intraday15m" | "scalp" | "swing" | "position"

export type TimeframeConfig = {
  label: string
  hold: string // human description of the hold horizon
  bar: string // the candle size, used in invalidation copy
  // crypto: CoinGecko market_chart lookback (days) + bucket size (hours)
  cryptoDays: number
  cryptoBucketHours: number
  // crypto: when set, pull DEEP real OHLC from Binance at this interval instead
  // of bucketing shallow CoinGecko closes. Binance serves years of free 5m/15m
  // /1h/4h/1d candles, so this is what makes crypto intraday backtests honest.
  cryptoBinanceInterval?: "5m" | "15m" | "1h" | "4h" | "1d"
  // stocks: Yahoo interval + lookback (days)
  stockInterval: "5m" | "15m" | "60m" | "1d"
  stockDays: number
  // backtest: max bars to hold before a timeout exit at this granularity
  holdBars: number
  // intraday (day-trade) mode: drives the intraday rule set, session/VWAP
  // tooling and same-session exit behaviour
  intraday?: boolean
  // approximate minutes per bar (for session math / expiry on intraday lanes)
  barMinutes: number
}

export const TIMEFRAMES: Record<Timeframe, TimeframeConfig> = {
  intraday5m: {
    label: "Day 5m",
    hold: "Intraday (same session)",
    bar: "5m",
    // Crypto: ~30 days of real 5m candles from Binance (~8.6k bars) — a deep,
    // honest sample (hundreds of trades) that stays tractable for the per-bar
    // backtest. Stocks stay capped by Yahoo's ~30-day 5m window.
    cryptoDays: 30,
    cryptoBucketHours: 1,
    cryptoBinanceInterval: "5m",
    stockInterval: "5m",
    stockDays: 30,
    holdBars: 24, // ~2 hours of 5m bars
    intraday: true,
    barMinutes: 5,
  },
  intraday15m: {
    label: "Day 15m",
    hold: "Intraday (same session)",
    bar: "15m",
    // Crypto: ~90 days of real 15m candles from Binance (~8.6k bars).
    cryptoDays: 90,
    cryptoBucketHours: 1,
    cryptoBinanceInterval: "15m",
    stockInterval: "15m",
    stockDays: 55,
    holdBars: 16, // ~4 hours of 15m bars
    intraday: true,
    barMinutes: 15,
  },
  scalp: {
    label: "Scalp",
    hold: "Intraday (hours)",
    bar: "1h",
    // Crypto: ~300 days of real 1h candles from Binance (~7.2k bars).
    cryptoDays: 300,
    cryptoBucketHours: 1,
    cryptoBinanceInterval: "1h",
    stockInterval: "60m",
    stockDays: 60,
    holdBars: 24,
    barMinutes: 60,
  },
  swing: {
    label: "Swing",
    hold: "Swing (2-7 days)",
    bar: "4h",
    // ~2 years of 4h candles from Binance => a deep, meaningful trade sample.
    cryptoDays: 730,
    cryptoBucketHours: 4,
    cryptoBinanceInterval: "4h",
    stockInterval: "1d",
    // ~8 years of daily history from Yahoo for a robust swing sample.
    stockDays: 2920,
    holdBars: 14,
    barMinutes: 240,
  },
  position: {
    label: "Position",
    hold: "Position (weeks)",
    bar: "daily",
    // ~6 years of daily candles for the long-horizon sample.
    cryptoDays: 2190,
    cryptoBucketHours: 24,
    cryptoBinanceInterval: "1d",
    stockInterval: "1d",
    // ~15 years of daily history (covers multiple market regimes).
    stockDays: 5475,
    holdBars: 20,
    barMinutes: 1440,
  },
}

export const DEFAULT_TIMEFRAME: Timeframe = "swing"

// Order used for the UI toggle: day-trade modes first, then longer horizons.
export const TIMEFRAME_ORDER: Timeframe[] = ["intraday5m", "intraday15m", "scalp", "swing", "position"]

export function isTimeframe(v: unknown): v is Timeframe {
  return (
    v === "intraday5m" ||
    v === "intraday15m" ||
    v === "scalp" ||
    v === "swing" ||
    v === "position"
  )
}

export function isIntraday(tf: Timeframe): boolean {
  return TIMEFRAMES[tf].intraday === true
}
