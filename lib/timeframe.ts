// Selectable analysis timeframes. Each maps to a candle granularity for both
// crypto (CoinGecko hourly closes bucketed to N hours) and stocks (Yahoo
// interval + lookback). The same config drives signal generation and backtests
// so what you see is what gets tested.

export type Timeframe = "scalp" | "swing" | "position"

export type TimeframeConfig = {
  label: string
  hold: string // human description of the hold horizon
  bar: string // the candle size, used in invalidation copy
  // crypto: CoinGecko market_chart lookback (days) + bucket size (hours)
  cryptoDays: number
  cryptoBucketHours: number
  // stocks: Yahoo interval + lookback (days)
  stockInterval: "60m" | "1d"
  stockDays: number
  // backtest: max bars to hold before a timeout exit at this granularity
  holdBars: number
}

export const TIMEFRAMES: Record<Timeframe, TimeframeConfig> = {
  scalp: {
    label: "Scalp",
    hold: "Intraday (hours)",
    bar: "1h",
    cryptoDays: 14,
    cryptoBucketHours: 1,
    stockInterval: "60m",
    stockDays: 60,
    holdBars: 24,
  },
  swing: {
    label: "Swing",
    hold: "Swing (2-7 days)",
    bar: "4h",
    cryptoDays: 90,
    cryptoBucketHours: 4,
    stockInterval: "1d",
    stockDays: 400,
    holdBars: 14,
  },
  position: {
    label: "Position",
    hold: "Position (weeks)",
    bar: "daily",
    cryptoDays: 365,
    cryptoBucketHours: 24,
    stockInterval: "1d",
    stockDays: 1095,
    holdBars: 20,
  },
}

export const DEFAULT_TIMEFRAME: Timeframe = "swing"

export function isTimeframe(v: unknown): v is Timeframe {
  return v === "scalp" || v === "swing" || v === "position"
}
