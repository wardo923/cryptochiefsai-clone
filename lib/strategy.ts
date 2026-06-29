import type { Candle } from "./indicators"
import { buildSnapshot } from "./indicators"
import type { TradeSignal } from "./signal"
import { TIMEFRAMES, type Timeframe } from "./timeframe"

// A deterministic, rule-based trade plan derived purely from indicators.
// No AI involved — this is the logic the backtester replays over history,
// and it also powers the free "indicator-only" signal mode.

export type RuleSignal = {
  direction: "LONG" | "SHORT" | "NEUTRAL"
  score: number // -100..100 (negative = bearish, positive = bullish)
  confidence: number // 0..100 — honest probability-style estimate
  regime: "trending" | "ranging"
  entry: number
  stopLoss: number
  target: number
  riskReward: number
  reasons: string[]
}

// Minimum aggregate conviction required to take a directional trade. Higher =
// more selective (fewer, higher-quality signals) — the chosen objective.
const CONVICTION_THRESHOLD = 50

// Regime-gated rule engine. The market is first classified as TRENDING or
// RANGING, then ONLY the rule set suited to that regime votes. This prevents
// trend-following and mean-reversion rules from cancelling each other out
// (the main weakness of the old additive model). A directional call also
// requires explicit confirmation, or it is downgraded to NEUTRAL.
export function ruleSignal(candles: Candle[]): RuleSignal {
  const snap = buildSnapshot(candles)
  const reasons: string[] = []
  const price = snap.price
  const atr = snap.atr14 ?? price * 0.02

  let score = 0
  let confirmed = false // did the regime's confirmation trigger fire?
  let confirmations = 0 // count of aligned factors (drives calibrated confidence)

  reasons.push(
    snap.regime === "trending"
      ? `Regime: TRENDING (ADX ${snap.adx14?.toFixed(0) ?? "n/a"}) — using trend-following rules`
      : `Regime: RANGING (ADX ${snap.adx14?.toFixed(0) ?? "n/a"}) — using mean-reversion rules`,
  )

  if (snap.regime === "trending") {
    // ---- TREND-FOLLOWING RULE SET ----
    // 1) EMA stack defines direction (heaviest weight).
    let trendDir = 0
    if (snap.ema20 != null && snap.ema50 != null) {
      if (price > snap.ema20 && snap.ema20 > snap.ema50) {
        score += 30
        trendDir = 1
        confirmations++
        reasons.push("Price above rising EMA20 > EMA50 (uptrend)")
      } else if (price < snap.ema20 && snap.ema20 < snap.ema50) {
        score -= 30
        trendDir = -1
        confirmations++
        reasons.push("Price below falling EMA20 < EMA50 (downtrend)")
      }
    }

    // 2) EMA200 level + slope must agree to add long-term bias.
    if (snap.ema200 != null) {
      const above = price > snap.ema200
      const slopeUp = (snap.ema200Slope ?? 0) > 0
      if (above && slopeUp) {
        score += 15
        confirmations++
        reasons.push("Above rising EMA200 (long-term bullish)")
      } else if (!above && !slopeUp) {
        score -= 15
        confirmations++
        reasons.push("Below falling EMA200 (long-term bearish)")
      }
    }

    // 3) MACD CONFIRMATION — momentum must agree with the trend direction.
    if (snap.macd && trendDir !== 0) {
      const macdDir = snap.macd.histogram > 0 ? 1 : -1
      if (macdDir === trendDir) {
        score += 20 * trendDir
        confirmed = true
        confirmations++
        reasons.push("MACD histogram confirms trend momentum")
      } else {
        reasons.push("MACD diverges from trend — confirmation missing")
      }
    }

    // 4) VOLUME filter — reward moves backed by participation (when available).
    if (snap.volumeRatio != null && trendDir !== 0) {
      if (snap.volumeRatio >= 1.2) {
        score += 10 * trendDir
        confirmations++
        reasons.push(`Volume ${snap.volumeRatio.toFixed(1)}x average (participation)`)
      } else if (snap.volumeRatio < 0.8) {
        score -= 6 * trendDir
        reasons.push(`Volume only ${snap.volumeRatio.toFixed(1)}x average (weak participation)`)
      }
    }

    // 5) Exhaustion guard — don't chase into an overextended RSI.
    if (snap.rsi14 != null && trendDir !== 0) {
      if (trendDir > 0 && snap.rsi14 > 80) {
        score -= 12
        reasons.push(`RSI ${snap.rsi14.toFixed(0)} overextended — late to chase`)
      } else if (trendDir < 0 && snap.rsi14 < 20) {
        score += 12
        reasons.push(`RSI ${snap.rsi14.toFixed(0)} overextended — late to chase`)
      }
    }
  } else {
    // ---- MEAN-REVERSION RULE SET ----
    let mrDir = 0
    // 1) RSI extreme defines the fade direction.
    if (snap.rsi14 != null) {
      if (snap.rsi14 < 30) {
        score += 30
        mrDir = 1
        confirmations++
        reasons.push(`RSI ${snap.rsi14.toFixed(0)} oversold (bounce bias)`)
      } else if (snap.rsi14 > 70) {
        score -= 30
        mrDir = -1
        confirmations++
        reasons.push(`RSI ${snap.rsi14.toFixed(0)} overbought (fade bias)`)
      }
    }

    // 2) Bollinger band touch in the same direction.
    if (snap.bollinger && mrDir !== 0) {
      if (mrDir > 0 && price <= snap.bollinger.lower) {
        score += 20
        confirmations++
        reasons.push("Price at/below lower Bollinger band")
      } else if (mrDir < 0 && price >= snap.bollinger.upper) {
        score -= 20
        confirmations++
        reasons.push("Price at/above upper Bollinger band")
      }
    }

    // 3) REJECTION CANDLE CONFIRMATION — require price to start turning back.
    if (mrDir !== 0 && candles.length >= 2) {
      const last = candles[candles.length - 1]
      const prev = candles[candles.length - 2]
      if (mrDir > 0 && last.c > prev.c) {
        score += 10
        confirmed = true
        confirmations++
        reasons.push("Bullish rejection candle (turning up off support)")
      } else if (mrDir < 0 && last.c < prev.c) {
        score -= 10
        confirmed = true
        confirmations++
        reasons.push("Bearish rejection candle (turning down off resistance)")
      } else {
        reasons.push("No rejection candle yet — confirmation missing")
      }
    }
  }

  const score_clamped = Math.max(-100, Math.min(100, score))
  const abs = Math.abs(score_clamped)

  // A directional trade requires BOTH enough conviction AND its regime's
  // confirmation trigger. Otherwise stand aside.
  let direction: RuleSignal["direction"] = "NEUTRAL"
  if (abs >= CONVICTION_THRESHOLD && confirmed) {
    direction = score_clamped > 0 ? "LONG" : "SHORT"
  }

  // Calibrated confidence: an honest probability-style estimate anchored near
  // realistic win rates (~50%) rather than the old inflated 40-95 band. Each
  // aligned confirmation nudges it up, capped at 72%.
  const confidence =
    direction === "NEUTRAL"
      ? Math.round(Math.min(45, 30 + abs * 0.2))
      : Math.round(Math.min(72, 48 + confirmations * 5 + (abs - CONVICTION_THRESHOLD) * 0.15))

  // ---- STRUCTURE-BASED RISK MODEL ----
  // Anchor the stop just beyond the recent swing level (real invalidation),
  // with an ATR buffer, and clamp the risk to a sane 1.0x-3.0x ATR band so a
  // far-away structure level doesn't create an oversized stop. Target = 2R.
  const entry = price
  const minRisk = atr * 1.0
  const maxRisk = atr * 3.0
  let stopLoss: number
  let target: number
  if (direction === "SHORT") {
    const structureStop = snap.recentHigh + atr * 0.25
    let risk = structureStop - entry
    risk = Math.max(minRisk, Math.min(maxRisk, risk))
    stopLoss = entry + risk
    target = entry - risk * 2
    reasons.push("Stop above recent swing high; target at 2R")
  } else {
    // LONG and NEUTRAL preview both frame a long-style plan.
    const structureStop = snap.recentLow - atr * 0.25
    let risk = entry - structureStop
    risk = Math.max(minRisk, Math.min(maxRisk, risk))
    stopLoss = entry - risk
    target = entry + risk * 2
    if (direction === "LONG") reasons.push("Stop below recent swing low; target at 2R")
  }
  const risk = Math.abs(entry - stopLoss)
  const reward = Math.abs(target - entry)
  const riskReward = risk > 0 ? reward / risk : 0

  return {
    direction,
    score: score_clamped,
    confidence,
    regime: snap.regime,
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
export function ruleSignalToTradeSignal(candles: Candle[], tf: Timeframe = "swing"): TradeSignal {
  const r = ruleSignal(candles)
  const cfg = TIMEFRAMES[tf]
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
    timeframe: cfg.hold,
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
        ? `A ${cfg.bar} close below the stop-loss invalidates the long.`
        : r.direction === "SHORT"
          ? `A ${cfg.bar} close above the stop-loss invalidates the short.`
          : "A decisive break of the recent range would create a directional bias.",
  }
}
