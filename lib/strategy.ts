import type { Candle } from "./indicators"
import { buildSnapshot } from "./indicators"
import type { TradeSignal } from "./signal"

// A deterministic, rule-based trade plan derived purely from indicators.
// No AI involved — this is the logic the backtester replays over history,
// and it also powers the free "indicator-only" signal mode.

export type RuleSignal = {
  direction: "LONG" | "SHORT" | "NEUTRAL"
  score: number // -100..100 (negative = bearish, positive = bullish)
  confidence: number // 0..100
  entry: number
  stopLoss: number
  target: number
  riskReward: number
  reasons: string[]
}

// Weighted voting across well-known indicators. Each check contributes a
// signed vote; the aggregate decides direction and confidence.
export function ruleSignal(candles: Candle[]): RuleSignal {
  const snap = buildSnapshot(candles)
  const reasons: string[] = []
  let score = 0

  const price = snap.price

  // 1) Trend via EMA stack
  if (snap.ema20 != null && snap.ema50 != null) {
    if (price > snap.ema20 && snap.ema20 > snap.ema50) {
      score += 25
      reasons.push("Price above rising EMA20 > EMA50 (uptrend)")
    } else if (price < snap.ema20 && snap.ema20 < snap.ema50) {
      score -= 25
      reasons.push("Price below falling EMA20 < EMA50 (downtrend)")
    }
  }

  // 2) Long-term bias via EMA200
  if (snap.ema200 != null) {
    if (price > snap.ema200) {
      score += 10
      reasons.push("Above EMA200 (long-term bullish)")
    } else {
      score -= 10
      reasons.push("Below EMA200 (long-term bearish)")
    }
  }

  // 3) RSI momentum / mean reversion
  if (snap.rsi14 != null) {
    if (snap.rsi14 < 30) {
      score += 20
      reasons.push(`RSI ${snap.rsi14.toFixed(0)} oversold (bounce bias)`)
    } else if (snap.rsi14 > 70) {
      score -= 20
      reasons.push(`RSI ${snap.rsi14.toFixed(0)} overbought (pullback bias)`)
    } else if (snap.rsi14 >= 50) {
      score += 8
    } else {
      score -= 8
    }
  }

  // 4) MACD histogram
  if (snap.macd) {
    if (snap.macd.histogram > 0) {
      score += 15
      reasons.push("MACD histogram positive (bullish momentum)")
    } else {
      score -= 15
      reasons.push("MACD histogram negative (bearish momentum)")
    }
  }

  // 5) Bollinger position
  if (snap.bollinger) {
    if (price <= snap.bollinger.lower) {
      score += 12
      reasons.push("Price at/below lower Bollinger band")
    } else if (price >= snap.bollinger.upper) {
      score -= 12
      reasons.push("Price at/above upper Bollinger band")
    }
  }

  const score_clamped = Math.max(-100, Math.min(100, score))
  const abs = Math.abs(score_clamped)
  // Require a minimum conviction to take a directional trade
  const direction: RuleSignal["direction"] = abs < 25 ? "NEUTRAL" : score_clamped > 0 ? "LONG" : "SHORT"
  const confidence = Math.round(Math.min(95, 40 + abs * 0.55))

  // Risk model: ATR-based stop, 2R target.
  const atr = snap.atr14 ?? price * 0.02
  const entry = price
  let stopLoss: number
  let target: number
  if (direction === "LONG") {
    stopLoss = entry - atr * 1.5
    target = entry + atr * 3
  } else if (direction === "SHORT") {
    stopLoss = entry + atr * 1.5
    target = entry - atr * 3
  } else {
    stopLoss = entry - atr * 1.5
    target = entry + atr * 3
  }
  const risk = Math.abs(entry - stopLoss)
  const reward = Math.abs(target - entry)
  const riskReward = risk > 0 ? reward / risk : 0

  return {
    direction,
    score: score_clamped,
    confidence,
    entry,
    stopLoss,
    target,
    riskReward,
    reasons,
  }
}

// Map the deterministic rule signal into the same TradeSignal shape the AI
// returns. This powers the free, no-billing fallback when the AI Gateway is
// unavailable, so the UI renders identically either way.
export function ruleSignalToTradeSignal(candles: Candle[]): TradeSignal {
  const r = ruleSignal(candles)
  // Build a small entry zone around the current price (±0.2%).
  const band = r.entry * 0.002
  const low = Math.min(r.entry - band, r.entry + band)
  const high = Math.max(r.entry - band, r.entry + band)
  const mid = (r.entry + r.target) / 2

  const summary =
    r.direction === "NEUTRAL"
      ? "Indicators are mixed; no high-conviction trade right now. Stand aside or wait for confirmation."
      : `Rule-based ${r.direction} setup with ${r.confidence}% conviction, targeting ${r.riskReward.toFixed(1)}R from an ATR-sized stop.`

  return {
    direction: r.direction,
    confidence: r.confidence,
    timeframe: "Swing (2-7 days)",
    entry: { low, high },
    stopLoss: r.stopLoss,
    targets:
      r.direction === "NEUTRAL"
        ? [{ price: r.target, label: "TP1" }]
        : [
            { price: mid, label: "TP1" },
            { price: r.target, label: "TP2" },
          ],
    riskReward: Number(r.riskReward.toFixed(2)),
    summary,
    reasoning: r.reasons.length ? r.reasons : ["No single indicator showed strong conviction."],
    invalidation:
      r.direction === "LONG"
        ? "A 4h close below the stop-loss invalidates the long."
        : r.direction === "SHORT"
          ? "A 4h close above the stop-loss invalidates the short."
          : "A decisive break of the recent range would create a directional bias.",
  }
}
