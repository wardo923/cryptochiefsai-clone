import type { MarketContext } from "./context"

// A trade signal emitted by a strategy at a given bar. Entry is assumed at the
// close of bar `index`. Exit behaviour is described declaratively so the staged
// runner can manage partials, breakeven and trailing identically for all
// strategies.
export type StratSignal = {
  direction: "LONG" | "SHORT"
  entry: number
  stop: number
  // Optional first take-profit (partial). When set, `tp1Fraction` of the
  // position is closed here and the stop moves to breakeven (if breakevenAfterTp1).
  tp1?: number
  tp1Fraction?: number // 0..1, default 0.5
  breakevenAfterTp1?: boolean
  // Fixed final target (full exit when hit).
  target?: number
  // Trailing applied AFTER tp1 is hit:
  //  - "atr": trail by trailAtrMult * ATR from the bar's close
  //  - "ema20_st": trail to the lower(long)/upper(short) of EMA20 and Supertrend
  //  - "none": no trail (stop stays where breakeven/initial left it)
  trailMode?: "atr" | "ema20_st" | "none"
  trailAtrMult?: number
  // Force-flatten at/after this ET minute same day (intraday realism). When
  // omitted the runner flattens at the last regular-hours bar (~15:55 ET).
  flattenAtMinute?: number
  // Reporting
  grade?: string
  score?: number
}

export type Strategy = {
  id: string
  name: string
  family: "trend-pullback" | "breakout" | "mean-reversion"
  description: string
  // Bars of 15m warmup before the strategy may fire.
  warmup: number
  // Bars to wait after a trade closes before a new entry (default 6).
  cooldownBars?: number
  // Pure: inspect the context AT `index` (only data up to and including index
  // is valid to read) and return a signal or null. Must not look ahead.
  evaluate: (ctx: MarketContext, index: number) => StratSignal | null
}
