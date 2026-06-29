import type { Strategy, StratSignal } from "./types"
import type { MarketContext } from "./context"

// Faithful port of the "SPY 15m Final A+ Tracker" Pine spec.
// 1H trend filter (EMA20>EMA50) + 15m execution with VWAP, EMA20/50,
// Supertrend(10,3), ADX>=20, RVOL>=1.2, opening-range break, pullback +
// confirmation candle, "not extended" guard, score gate >=90, 12-bar cooldown.
// Risk: stop 1.8*ATR, TP1 0.8R -> move to breakeven, trail to min(EMA20,ST),
// final target 1.5R.

const ENTRY_START = 9 * 60 + 50 // 09:50 ET
const ENTRY_END = 14 * 60 + 30 // 14:30 ET
const ATR_STOP_MULT = 1.8
const TP1_R = 0.8
const TP2_R = 1.5
const RVOL_MIN = 1.2
const ADX_MIN = 20
const MIN_SCORE = 90
const BODY_MIN = 0.45
const EXTEND_ATR_MULT = 1.2

export const aplus15m: Strategy = {
  id: "aplus-15m",
  name: "A+ Multi-Timeframe 15m",
  family: "multi-timeframe",
  description:
    "1H trend filter + 15m execution. Requires opening-range break, VWAP/EMA alignment, Supertrend, ADX, RVOL, a pullback and a confirmation candle — all gated at a 90+ score. Stop 1.8 ATR, TP1 0.8R to breakeven, trail to EMA20/Supertrend, target 1.5R.",
  warmup: 60,
  cooldownBars: 12,
  evaluate(ctx: MarketContext, i: number): StratSignal | null {
    if (i < 1) return null
    const m = ctx.minuteOfDay[i]
    if (m < ENTRY_START || m > ENTRY_END) return null

    const close = ctx.candles[i].c
    const open = ctx.candles[i].o
    const high = ctx.candles[i].h
    const prevHigh = ctx.candles[i - 1].h
    const prevLow = ctx.candles[i - 1].l

    const ema20 = ctx.ema20[i]
    const ema20Prev = ctx.ema20[i - 1]
    const ema50Val = ctx.ema50[i]
    const vwap = ctx.vwap[i]
    const vwapPrev = ctx.vwap[i - 1]
    const atr = ctx.atr14[i]
    const st = ctx.st[i]
    const adx = ctx.adx[i]
    const rvol = ctx.rvol[i]
    const orHigh = ctx.orHigh[i]
    const orLow = ctx.orLow[i]
    const hEma20 = ctx.htfEma20[i]
    const hEma50 = ctx.htfEma50[i]

    // Hard requirements (any missing => no setup).
    if (
      ema20 == null ||
      ema20Prev == null ||
      ema50Val == null ||
      vwap == null ||
      vwapPrev == null ||
      atr == null ||
      atr <= 0 ||
      st == null ||
      adx == null ||
      rvol == null ||
      orHigh == null ||
      orLow == null ||
      hEma20 == null ||
      hEma50 == null
    ) {
      return null
    }

    // 15m EMA stack (fast=ema20, slow=ema50 in the spec inputs).
    const htfBull = hEma20 > hEma50
    const htfBear = hEma20 < hEma50
    const emaBull = ema20 > ema50Val
    const emaBear = ema20 < ema50Val
    const bullST = st.dir === 1
    const bearST = st.dir === -1
    const adxOK = adx >= ADX_MIN
    const rvolOK = rvol >= RVOL_MIN

    const body = Math.abs(close - open)
    const rng = high - ctx.candles[i].l
    const bodyOK = rng > 0 && body / rng >= BODY_MIN

    const aboveOR = close > orHigh
    const belowOR = close < orLow

    const pullbackLong = prevLow <= ema20Prev || prevLow <= vwapPrev
    const pullbackShort = prevHigh >= ema20Prev || prevHigh >= vwapPrev
    const bullConfirm = close > open && close > prevHigh
    const bearConfirm = close < open && close < prevLow
    const notExtendedLong = close - ema20 <= atr * EXTEND_ATR_MULT
    const notExtendedShort = ema20 - close <= atr * EXTEND_ATR_MULT

    // Scores (mirror the Pine weights; sum to 100 when all true).
    let longScore = 0
    longScore += htfBull ? 25 : 0
    longScore += close > vwap ? 20 : 0
    longScore += emaBull ? 15 : 0
    longScore += bullST ? 10 : 0
    longScore += pullbackLong ? 10 : 0
    longScore += bullConfirm && bodyOK ? 10 : 0
    longScore += rvolOK ? 5 : 0
    longScore += adxOK ? 5 : 0

    let shortScore = 0
    shortScore += htfBear ? 25 : 0
    shortScore += close < vwap ? 20 : 0
    shortScore += emaBear ? 15 : 0
    shortScore += bearST ? 10 : 0
    shortScore += pullbackShort ? 10 : 0
    shortScore += bearConfirm && bodyOK ? 10 : 0
    shortScore += rvolOK ? 5 : 0
    shortScore += adxOK ? 5 : 0

    const buySignal =
      htfBull &&
      aboveOR &&
      close > vwap &&
      emaBull &&
      bullST &&
      pullbackLong &&
      bullConfirm &&
      bodyOK &&
      notExtendedLong &&
      rvolOK &&
      adxOK &&
      longScore >= MIN_SCORE

    const sellSignal =
      htfBear &&
      belowOR &&
      close < vwap &&
      emaBear &&
      bearST &&
      pullbackShort &&
      bearConfirm &&
      bodyOK &&
      notExtendedShort &&
      rvolOK &&
      adxOK &&
      shortScore >= MIN_SCORE

    if (buySignal) {
      const entry = close
      const stop = entry - atr * ATR_STOP_MULT
      const risk = entry - stop
      return {
        direction: "LONG",
        entry,
        stop,
        tp1: entry + risk * TP1_R,
        breakevenAfterTp1: true,
        target: entry + risk * TP2_R,
        trailMode: "ema20_st",
        grade: gradeOf(longScore),
        score: longScore,
      }
    }
    if (sellSignal) {
      const entry = close
      const stop = entry + atr * ATR_STOP_MULT
      const risk = stop - entry
      return {
        direction: "SHORT",
        entry,
        stop,
        tp1: entry - risk * TP1_R,
        breakevenAfterTp1: true,
        target: entry - risk * TP2_R,
        trailMode: "ema20_st",
        grade: gradeOf(shortScore),
        score: shortScore,
      }
    }
    return null
  },
}

function gradeOf(score: number): string {
  if (score >= 95) return "A+"
  if (score >= 90) return "A"
  if (score >= 85) return "B"
  return "IGNORE"
}
