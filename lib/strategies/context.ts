import type { Candle, SupertrendPoint } from "@/lib/indicators"
import { emaSeriesAligned, atrSeries, supertrend, adxSeries } from "@/lib/indicators"
import { etParts } from "@/lib/session"

// A fully-precomputed view of one symbol's 15m history. Every array is aligned
// to the 15m candle index, so a strategy can read any indicator AT a bar in
// O(1) during the backtest walk (no per-bar recomputation, no look-ahead).
export type MarketContext = {
  candles: Candle[]
  // 15m indicator series (index-aligned; leading entries null until warm)
  ema9: (number | null)[]
  ema20: (number | null)[]
  ema50: (number | null)[]
  atr14: (number | null)[]
  st: SupertrendPoint[] // 15m supertrend
  adx: (number | null)[] // 15m ADX
  // Session-anchored running VWAP per bar (resets each ET day)
  vwap: (number | null)[]
  // Relative volume per bar (session-so-far avg vs trailing baseline)
  rvol: (number | null)[]
  // Opening-range (09:30–09:45 ET) high/low for the bar's day; null pre-OR
  orHigh: (number | null)[]
  orLow: (number | null)[]
  // Minutes since ET midnight + a day key, per bar
  minuteOfDay: number[]
  dayKey: string[]
  // Higher-timeframe (1H) values mapped onto each 15m bar from the last CLOSED
  // 1H bar (no look-ahead). Null until the 1H series is warm.
  htfEma20: (number | null)[]
  htfEma50: (number | null)[]
  htfStDir: (1 | -1 | null)[]
  htfAdx: (number | null)[]
}

const OR_START = 9 * 60 + 30 // 09:30 ET
const OR_END = 9 * 60 + 45 // 09:45 ET

function dayKeyOf(p: { year: number; month: number; day: number }): string {
  return `${p.year}-${p.month}-${p.day}`
}

// Resample 15m candles into 1H candles grouped by ET clock-hour.
function resampleHourly(candles: Candle[]): { bars: Candle[]; lastClosedIdxForBar: number[] } {
  const bars: Candle[] = []
  const keyForBar: string[] = []
  const keys: string[] = []
  let cur: Candle | null = null
  let curKey = ""
  for (const c of candles) {
    const p = etParts(c.t)
    const k = `${p.year}-${p.month}-${p.day}-${p.hour}`
    keyForBar.push(k)
    if (k !== curKey) {
      if (cur) {
        bars.push(cur)
        keys.push(curKey)
      }
      cur = { t: c.t, o: c.o, h: c.h, l: c.l, c: c.c, v: c.v ?? 0 }
      curKey = k
    } else if (cur) {
      cur.h = Math.max(cur.h, c.h)
      cur.l = Math.min(cur.l, c.l)
      cur.c = c.c
      cur.v = (cur.v ?? 0) + (c.v ?? 0)
    }
  }
  if (cur) {
    bars.push(cur)
    keys.push(curKey)
  }
  // For each 15m bar, the index of the last FULLY CLOSED 1H bar (the previous
  // hour group) — using the current hour would be look-ahead.
  const keyToIdx = new Map<string, number>()
  keys.forEach((k, i) => keyToIdx.set(k, i))
  const lastClosedIdxForBar: number[] = candles.map((_, i) => {
    const k = keyForBar[i]
    const idx = keyToIdx.get(k)
    // previous completed hour = idx - 1
    return idx == null ? -1 : idx - 1
  })
  return { bars, lastClosedIdxForBar }
}

export function prepareContext(candles: Candle[]): MarketContext {
  const closes = candles.map((c) => c.c)
  const ema9 = emaSeriesAligned(closes, 9)
  const ema20 = emaSeriesAligned(closes, 20)
  const ema50 = emaSeriesAligned(closes, 50)
  const atr14 = atrSeries(candles, 14)
  const st = supertrend(candles, 10, 3)
  const adx = adxSeries(candles, 14)

  const minuteOfDay: number[] = []
  const dayKey: string[] = []
  for (const c of candles) {
    const p = etParts(c.t)
    minuteOfDay.push(p.minutesSinceMidnight)
    dayKey.push(dayKeyOf(p))
  }

  // Running session VWAP + opening range, reset per ET day.
  const vwap: (number | null)[] = new Array(candles.length).fill(null)
  const rvol: (number | null)[] = new Array(candles.length).fill(null)
  const orHigh: (number | null)[] = new Array(candles.length).fill(null)
  const orLow: (number | null)[] = new Array(candles.length).fill(null)

  // Trailing baseline volume (all history) for rvol denominator.
  let cumVolAll = 0
  let cumCountAll = 0

  let curDay = ""
  let cumPV = 0
  let cumVol = 0
  let sessVolSum = 0
  let sessCount = 0
  let dayOrHigh: number | null = null
  let dayOrLow: number | null = null
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]
    if (dayKey[i] !== curDay) {
      curDay = dayKey[i]
      cumPV = 0
      cumVol = 0
      sessVolSum = 0
      sessCount = 0
      dayOrHigh = null
      dayOrLow = null
    }
    const m = minuteOfDay[i]
    // Opening range accumulation.
    if (m >= OR_START && m < OR_END) {
      dayOrHigh = dayOrHigh == null ? c.h : Math.max(dayOrHigh, c.h)
      dayOrLow = dayOrLow == null ? c.l : Math.min(dayOrLow, c.l)
    }
    // OR levels are only "known" once the OR window has ended.
    if (m >= OR_END) {
      orHigh[i] = dayOrHigh
      orLow[i] = dayOrLow
    }
    // Session VWAP (regular hours only).
    const vol = c.v ?? 0
    if (vol > 0) {
      const typical = (c.h + c.l + c.c) / 3
      cumPV += typical * vol
      cumVol += vol
      sessVolSum += vol
      sessCount++
      cumVolAll += vol
      cumCountAll++
    }
    vwap[i] = cumVol > 0 ? cumPV / cumVol : null
    const baseline = cumCountAll > 0 ? cumVolAll / cumCountAll : 0
    const sessAvg = sessCount > 0 ? sessVolSum / sessCount : 0
    rvol[i] = baseline > 0 && sessCount > 0 ? sessAvg / baseline : null
  }

  // Higher-timeframe (1H) values, resampled and mapped to the last CLOSED hour.
  const { bars: hbars, lastClosedIdxForBar } = resampleHourly(candles)
  const hCloses = hbars.map((b) => b.c)
  const hEma20Arr = emaSeriesAligned(hCloses, 20)
  const hEma50Arr = emaSeriesAligned(hCloses, 50)
  const hSt = supertrend(hbars, 10, 3)
  const hAdx = adxSeries(hbars, 14)
  const htfEma20: (number | null)[] = new Array(candles.length).fill(null)
  const htfEma50: (number | null)[] = new Array(candles.length).fill(null)
  const htfStDir: (1 | -1 | null)[] = new Array(candles.length).fill(null)
  const htfAdx: (number | null)[] = new Array(candles.length).fill(null)
  for (let i = 0; i < candles.length; i++) {
    const hi = lastClosedIdxForBar[i]
    if (hi < 0 || hi >= hbars.length) continue
    htfEma20[i] = hEma20Arr[hi]
    htfEma50[i] = hEma50Arr[hi]
    htfStDir[i] = hSt[hi]?.dir ?? null
    htfAdx[i] = hAdx[hi]
  }

  return {
    candles,
    ema9,
    ema20,
    ema50,
    atr14,
    st,
    adx,
    vwap,
    rvol,
    orHigh,
    orLow,
    minuteOfDay,
    dayKey,
    htfEma20,
    htfEma50,
    htfStDir,
    htfAdx,
  }
}
