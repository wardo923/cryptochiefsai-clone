// Pure technical-analysis helpers. All take arrays of closing/HLC prices.

export type Candle = { t: number; o: number; h: number; l: number; c: number; v?: number }

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

// Average Directional Index — measures trend STRENGTH (not direction).
// ADX > ~22-25 = trending; < ~20 = ranging/choppy. Uses Wilder's smoothing.
export function adx(candles: Candle[], period = 14): number | null {
  if (candles.length < period * 2 + 1) return null
  const plusDM: number[] = []
  const minusDM: number[] = []
  const trs: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const up = candles[i].h - candles[i - 1].h
    const down = candles[i - 1].l - candles[i].l
    plusDM.push(up > down && up > 0 ? up : 0)
    minusDM.push(down > up && down > 0 ? down : 0)
    const prevClose = candles[i - 1].c
    trs.push(
      Math.max(
        candles[i].h - candles[i].l,
        Math.abs(candles[i].h - prevClose),
        Math.abs(candles[i].l - prevClose),
      ),
    )
  }
  // Wilder-smooth TR, +DM, -DM
  const smooth = (arr: number[]) => {
    let prev = arr.slice(0, period).reduce((a, b) => a + b, 0)
    const out = [prev]
    for (let i = period; i < arr.length; i++) {
      prev = prev - prev / period + arr[i]
      out.push(prev)
    }
    return out
  }
  const trS = smooth(trs)
  const pdmS = smooth(plusDM)
  const mdmS = smooth(minusDM)
  const dx: number[] = []
  for (let i = 0; i < trS.length; i++) {
    if (trS[i] === 0) {
      dx.push(0)
      continue
    }
    const pdi = (pdmS[i] / trS[i]) * 100
    const mdi = (mdmS[i] / trS[i]) * 100
    const sum = pdi + mdi
    dx.push(sum === 0 ? 0 : (Math.abs(pdi - mdi) / sum) * 100)
  }
  if (dx.length < period) return null
  // ADX = Wilder average of DX
  let adxVal = dx.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < dx.length; i++) {
    adxVal = (adxVal * (period - 1) + dx[i]) / period
  }
  return adxVal
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
  adx14: number | null
  bollinger: { upper: number; middle: number; lower: number } | null
  // Recent swing levels from the lookback window
  recentHigh: number
  recentLow: number
  // EMA200 slope as a fraction of price over the last ~10 bars (trend tilt)
  ema200Slope: number | null
  // Latest volume / 20-bar average volume (null when source has no volume)
  volumeRatio: number | null
  // % distance of price from key emas
  trend: "bullish" | "bearish" | "neutral"
  // Market regime drives which rule set applies (trend vs mean-reversion)
  regime: "trending" | "ranging"
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
  const adx14 = adx(candles, 14)

  // EMA200 slope: compare current EMA200 to EMA200 ~10 bars ago, as a fraction
  // of price. Positive = long-term uptrend tilt, negative = downtrend tilt.
  let ema200Slope: number | null = null
  if (closes.length >= 210) {
    const prevEma200 = ema(closes.slice(0, -10), 200)
    if (ema200 != null && prevEma200 != null && price > 0) {
      ema200Slope = (ema200 - prevEma200) / price
    }
  }

  // Volume ratio (only when the data source provides volume).
  let volumeRatio: number | null = null
  const vols = candles.map((c) => c.v).filter((v): v is number => typeof v === "number" && v > 0)
  if (vols.length >= 20) {
    const avg = vols.slice(-20).reduce((a, b) => a + b, 0) / 20
    const last = vols[vols.length - 1]
    if (avg > 0) volumeRatio = last / avg
  }

  let trend: IndicatorSnapshot["trend"] = "neutral"
  if (ema20 != null && ema50 != null) {
    if (price > ema20 && ema20 > ema50) trend = "bullish"
    else if (price < ema20 && ema20 < ema50) trend = "bearish"
  }

  // Regime: trending when ADX is elevated, otherwise ranging. Fallback to
  // EMA spread when ADX is unavailable (short history).
  let regime: IndicatorSnapshot["regime"] = "ranging"
  if (adx14 != null) {
    regime = adx14 >= 22 ? "trending" : "ranging"
  } else if (ema20 != null && ema50 != null && price > 0) {
    regime = Math.abs(ema20 - ema50) / price > 0.01 ? "trending" : "ranging"
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
    adx14,
    bollinger: bollinger(closes, 20, 2),
    recentHigh,
    recentLow,
    ema200Slope,
    volumeRatio,
    trend,
    regime,
  }
}
