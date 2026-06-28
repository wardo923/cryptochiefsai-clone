// Pure technical-analysis helpers. All take arrays of closing/HLC prices.

export type Candle = { t: number; o: number; h: number; l: number; c: number }

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null
  const slice = values.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

export function ema(values: number[], period: number): number | null {
  if (values.length < period) return null
  const k = 2 / (period + 1)
  // seed with SMA of first `period` values
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k)
  }
  return prev
}

function emaSeries(values: number[], period: number): number[] {
  if (values.length < period) return []
  const k = 2 / (period + 1)
  const out: number[] = []
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period
  out.push(prev)
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k)
    out.push(prev)
  }
  return out
}

export function rsi(values: number[], period = 14): number | null {
  if (values.length < period + 1) return null
  let gains = 0
  let losses = 0
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1]
    if (diff >= 0) gains += diff
    else losses -= diff
  }
  let avgGain = gains / period
  let avgLoss = losses / period
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1]
    const gain = diff >= 0 ? diff : 0
    const loss = diff < 0 ? -diff : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

export function macd(values: number[], fast = 12, slow = 26, signalPeriod = 9) {
  if (values.length < slow + signalPeriod) return null
  const fastSeries = emaSeries(values, fast)
  const slowSeries = emaSeries(values, slow)
  // align series to same length (tail)
  const len = Math.min(fastSeries.length, slowSeries.length)
  const fastTail = fastSeries.slice(fastSeries.length - len)
  const slowTail = slowSeries.slice(slowSeries.length - len)
  const macdLine = fastTail.map((v, i) => v - slowTail[i])
  const signalSeries = emaSeries(macdLine, signalPeriod)
  if (signalSeries.length === 0) return null
  const macdVal = macdLine[macdLine.length - 1]
  const signalVal = signalSeries[signalSeries.length - 1]
  return { macd: macdVal, signal: signalVal, histogram: macdVal - signalVal }
}

export function atr(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 1) return null
  const trs: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const cur = candles[i]
    const prevClose = candles[i - 1].c
    const tr = Math.max(cur.h - cur.l, Math.abs(cur.h - prevClose), Math.abs(cur.l - prevClose))
    trs.push(tr)
  }
  // Wilder's smoothing
  let prev = trs.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < trs.length; i++) {
    prev = (prev * (period - 1) + trs[i]) / period
  }
  return prev
}

export function bollinger(values: number[], period = 20, mult = 2) {
  const mid = sma(values, period)
  if (mid == null) return null
  const slice = values.slice(-period)
  const variance = slice.reduce((acc, v) => acc + (v - mid) ** 2, 0) / period
  const sd = Math.sqrt(variance)
  return { upper: mid + mult * sd, middle: mid, lower: mid - mult * sd }
}

export type IndicatorSnapshot = {
  price: number
  rsi14: number | null
  ema20: number | null
  ema50: number | null
  ema200: number | null
  sma20: number | null
  macd: { macd: number; signal: number; histogram: number } | null
  atr14: number | null
  bollinger: { upper: number; middle: number; lower: number } | null
  // Recent swing levels from the lookback window
  recentHigh: number
  recentLow: number
  // % distance of price from key emas
  trend: "bullish" | "bearish" | "neutral"
}

export function buildSnapshot(candles: Candle[]): IndicatorSnapshot {
  const closes = candles.map((c) => c.c)
  const price = closes[closes.length - 1]
  const ema20 = ema(closes, 20)
  const ema50 = ema(closes, 50)
  const ema200 = ema(closes, 200)
  const highs = candles.map((c) => c.h)
  const lows = candles.map((c) => c.l)
  const lookback = Math.min(candles.length, 60)
  const recentHigh = Math.max(...highs.slice(-lookback))
  const recentLow = Math.min(...lows.slice(-lookback))

  let trend: IndicatorSnapshot["trend"] = "neutral"
  if (ema20 != null && ema50 != null) {
    if (price > ema20 && ema20 > ema50) trend = "bullish"
    else if (price < ema20 && ema20 < ema50) trend = "bearish"
  }

  return {
    price,
    rsi14: rsi(closes, 14),
    ema20,
    ema50,
    ema200,
    sma20: sma(closes, 20),
    macd: macd(closes),
    atr14: atr(candles, 14),
    bollinger: bollinger(closes, 20, 2),
    recentHigh,
    recentLow,
    trend,
  }
}
