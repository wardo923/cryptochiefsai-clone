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

// Index-aligned EMA series: same length as `values`, with null for the leading
// bars before the EMA is seeded. Unlike `emaSeries`, indices line up with the
// source array so it can be read AT a bar during a backtest.
export function emaSeriesAligned(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null)
  if (values.length < period) return out
  const k = 2 / (period + 1)
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period
  out[period - 1] = prev
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k)
    out[i] = prev
  }
  return out
}

// Index-aligned ATR series (Wilder). null until the period is satisfied.
export function atrSeries(candles: Candle[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null)
  if (candles.length < period + 1) return out
  const trs: number[] = [0]
  for (let i = 1; i < candles.length; i++) {
    const prevClose = candles[i - 1].c
    trs.push(Math.max(candles[i].h - candles[i].l, Math.abs(candles[i].h - prevClose), Math.abs(candles[i].l - prevClose)))
  }
  let prev = trs.slice(1, period + 1).reduce((a, b) => a + b, 0) / period
  out[period] = prev
  for (let i = period + 1; i < candles.length; i++) {
    prev = (prev * (period - 1) + trs[i]) / period
    out[i] = prev
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

// Bar-by-bar ADX series (aligned to candle indices, leading bars are null
// until enough history exists). Used by strategies that need ADX AT a past bar
// during a backtest, not just the latest scalar value. Returns an array the
// same length as `candles`.
export function adxSeries(candles: Candle[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null)
  if (candles.length < period * 2 + 1) return out
  const plusDM: number[] = []
  const minusDM: number[] = []
  const trs: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const up = candles[i].h - candles[i - 1].h
    const down = candles[i - 1].l - candles[i].l
    plusDM.push(up > down && up > 0 ? up : 0)
    minusDM.push(down > up && down > 0 ? down : 0)
    const prevClose = candles[i - 1].c
    trs.push(Math.max(candles[i].h - candles[i].l, Math.abs(candles[i].h - prevClose), Math.abs(candles[i].l - prevClose)))
  }
  const smooth = (arr: number[]) => {
    let prev = arr.slice(0, period).reduce((a, b) => a + b, 0)
    const o = [prev]
    for (let i = period; i < arr.length; i++) {
      prev = prev - prev / period + arr[i]
      o.push(prev)
    }
    return o
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
  if (dx.length < period) return out
  // Wilder-average the DX into ADX, then map each ADX value back to its candle
  // index. The first smoothed TR corresponds to candle index `period`, and the
  // first ADX value needs `period` DX values, so adxStartIdx = period*2.
  let adxVal = dx.slice(0, period).reduce((a, b) => a + b, 0) / period
  const adxArr = [adxVal]
  for (let i = period; i < dx.length; i++) {
    adxVal = (adxVal * (period - 1) + dx[i]) / period
    adxArr.push(adxVal)
  }
  const adxStartIdx = period * 2
  for (let k = 0; k < adxArr.length; k++) {
    const idx = adxStartIdx + k
    if (idx < out.length) out[idx] = adxArr[k]
  }
  return out
}

export type SupertrendPoint = { value: number; dir: 1 | -1 } | null

// Supertrend series (aligned to candle indices). dir = +1 bullish (price above
// the line), -1 bearish. Standard ATR-band flip logic. Leading bars are null
// until ATR is available.
export function supertrend(candles: Candle[], period = 10, mult = 3): SupertrendPoint[] {
  const out: SupertrendPoint[] = new Array(candles.length).fill(null)
  if (candles.length < period + 1) return out
  // Wilder ATR series.
  const trs: number[] = [0]
  for (let i = 1; i < candles.length; i++) {
    const prevClose = candles[i - 1].c
    trs.push(Math.max(candles[i].h - candles[i].l, Math.abs(candles[i].h - prevClose), Math.abs(candles[i].l - prevClose)))
  }
  const atrArr: (number | null)[] = new Array(candles.length).fill(null)
  let prevAtr = trs.slice(1, period + 1).reduce((a, b) => a + b, 0) / period
  atrArr[period] = prevAtr
  for (let i = period + 1; i < candles.length; i++) {
    prevAtr = (prevAtr * (period - 1) + trs[i]) / period
    atrArr[i] = prevAtr
  }

  let finalUpper = 0
  let finalLower = 0
  let dir: 1 | -1 = 1
  for (let i = period; i < candles.length; i++) {
    const a = atrArr[i]
    if (a == null) continue
    const hl2 = (candles[i].h + candles[i].l) / 2
    const basicUpper = hl2 + mult * a
    const basicLower = hl2 - mult * a
    const prevClose = candles[i - 1].c
    // Carry the bands forward per the standard recursive definition.
    finalUpper = basicUpper < finalUpper || prevClose > finalUpper ? basicUpper : finalUpper
    finalLower = basicLower > finalLower || prevClose < finalLower ? basicLower : finalLower
    if (i === period) {
      // Seed: choose side by where close sits.
      dir = candles[i].c >= hl2 ? 1 : -1
    } else {
      const close = candles[i].c
      if (dir === 1 && close < finalLower) dir = -1
      else if (dir === -1 && close > finalUpper) dir = 1
    }
    out[i] = { value: dir === 1 ? finalLower : finalUpper, dir }
  }
  return out
}

export function bollinger(values: number[], period = 20, mult = 2) {
  const mid = sma(values, period)
  if (mid == null) return null
  const slice = values.slice(-period)
  const variance = slice.reduce((acc, v) => acc + (v - mid) ** 2, 0) / period
  const sd = Math.sqrt(variance)
  return { upper: mid + mult * sd, middle: mid, lower: mid - mult * sd }
}

// ---- INTRADAY (day-trade) INDICATORS ---------------------------------------

// Session-anchored VWAP plus 1σ volume-weighted bands. Requires volume on the
// candles; returns null when volume is unavailable (e.g. some crypto feeds).
export function vwap(
  candles: Candle[],
  anchorMs: number,
): { vwap: number; upper: number; lower: number } | null {
  const session = candles.filter((c) => c.t >= anchorMs && typeof c.v === "number" && c.v > 0)
  if (session.length < 2) return null
  let cumVol = 0
  let cumPV = 0
  for (const c of session) {
    const typical = (c.h + c.l + c.c) / 3
    cumVol += c.v as number
    cumPV += typical * (c.v as number)
  }
  if (cumVol <= 0) return null
  const vw = cumPV / cumVol
  // Volume-weighted variance of typical price around VWAP.
  let cumVar = 0
  for (const c of session) {
    const typical = (c.h + c.l + c.c) / 3
    cumVar += (c.v as number) * (typical - vw) ** 2
  }
  const sd = Math.sqrt(cumVar / cumVol)
  return { vwap: vw, upper: vw + sd, lower: vw - sd }
}

// Relative volume: average per-bar volume in the current session vs the average
// per-bar volume across all available history. ~1.0 = normal, >1.2 = active.
export function relativeVolume(candles: Candle[], anchorMs: number): number | null {
  const withVol = candles.filter((c) => typeof c.v === "number" && c.v > 0) as Required<Candle>[]
  if (withVol.length < 10) return null
  const session = withVol.filter((c) => c.t >= anchorMs)
  if (session.length === 0) return null
  const sessionAvg = session.reduce((a, c) => a + c.v, 0) / session.length
  const baseline = withVol.reduce((a, c) => a + c.v, 0) / withVol.length
  if (baseline <= 0) return null
  return sessionAvg / baseline
}

// Opening range: high/low/mid of the first `minutes` of the session.
export function openingRange(
  candles: Candle[],
  anchorMs: number,
  minutes = 30,
): { high: number; low: number; mid: number } | null {
  const endMs = anchorMs + minutes * 60 * 1000
  const orBars = candles.filter((c) => c.t >= anchorMs && c.t < endMs)
  if (orBars.length === 0) return null
  const high = Math.max(...orBars.map((c) => c.h))
  const low = Math.min(...orBars.map((c) => c.l))
  return { high, low, mid: (high + low) / 2 }
}

export type IntradaySnapshot = {
  vwap: { vwap: number; upper: number; lower: number } | null
  rvol: number | null
  openingRange: { high: number; low: number; mid: number } | null
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
  // Intraday day-trade tools (only populated when buildSnapshot is given an
  // anchor; null fields when volume/session data is unavailable)
  intraday: IntradaySnapshot | null
}

export function buildSnapshot(
  candles: Candle[],
  opts?: { anchorMs?: number; intraday?: boolean },
): IndicatorSnapshot {
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

  // Intraday tooling: only computed when an anchor is provided (day-trade mode).
  let intraday: IntradaySnapshot | null = null
  if (opts?.intraday && opts.anchorMs != null) {
    intraday = {
      vwap: vwap(candles, opts.anchorMs),
      rvol: relativeVolume(candles, opts.anchorMs),
      openingRange: openingRange(candles, opts.anchorMs, 30),
    }
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
    intraday,
  }
}
