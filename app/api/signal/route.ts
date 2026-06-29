import { generateText, Output } from "ai"
import { getSignalCandles, isStock } from "@/lib/market"
import { buildSnapshot } from "@/lib/indicators"
import { COIN_BY_ID } from "@/lib/coins"
import { signalSchema } from "@/lib/signal"
import { ruleSignalToTradeSignal, ALERT_CONFIDENCE_MIN } from "@/lib/strategy"
import { TIMEFRAMES, isTimeframe, isIntraday, DEFAULT_TIMEFRAME } from "@/lib/timeframe"
import { sessionAnchorMs, sessionPhase, PHASE_LABEL, noTradeWindow } from "@/lib/session"

export const maxDuration = 30

function fmt(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "n/a"
  return n.toLocaleString("en-US", { maximumFractionDigits: 8 })
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { coinId?: string; timeframe?: string }
    const { coinId } = body
    if (!coinId || !COIN_BY_ID[coinId]) {
      return Response.json({ error: "Unknown coin" }, { status: 400 })
    }
    const coin = COIN_BY_ID[coinId]
    const timeframe = isTimeframe(body.timeframe) ? body.timeframe : DEFAULT_TIMEFRAME
    const tfCfg = TIMEFRAMES[timeframe]

    const candles = await getSignalCandles(coinId, timeframe)
    if (candles.length < 30) {
      return Response.json({ error: "Not enough market data" }, { status: 422 })
    }

    const intraday = isIntraday(timeframe)
    const isCrypto = !isStock(coinId)
    // Anchor intraday tooling (VWAP / opening range) to the latest session.
    const lastTs = candles[candles.length - 1]?.t ?? Date.now()
    const anchorMs = intraday ? sessionAnchorMs(lastTs, isCrypto) : undefined
    const snap = buildSnapshot(candles, intraday ? { intraday: true, anchorMs } : undefined)

    // Session context (equities only; crypto trades 24/7).
    const now = Date.now()
    const session = intraday
      ? {
          phase: isCrypto ? "midday" : sessionPhase(now),
          phaseLabel: isCrypto ? "Crypto trades 24/7" : PHASE_LABEL[sessionPhase(now)],
          noTrade: isCrypto ? { blocked: false, reason: null } : noTradeWindow(now),
          isCrypto,
        }
      : null

    const indicatorBlock = [
      `Asset: ${coin.name} (${coin.symbol})`,
      `Current price: $${fmt(snap.price)}`,
      `Trend (EMA structure): ${snap.trend}`,
      `RSI(14): ${fmt(snap.rsi14)}`,
      `EMA20: $${fmt(snap.ema20)}  EMA50: $${fmt(snap.ema50)}  EMA200: $${fmt(snap.ema200)}`,
      `SMA20: $${fmt(snap.sma20)}`,
      snap.macd
        ? `MACD: ${fmt(snap.macd.macd)} | signal ${fmt(snap.macd.signal)} | hist ${fmt(snap.macd.histogram)}`
        : "MACD: n/a",
      snap.bollinger
        ? `Bollinger(20,2): upper $${fmt(snap.bollinger.upper)} / mid $${fmt(snap.bollinger.middle)} / lower $${fmt(snap.bollinger.lower)}`
        : "Bollinger: n/a",
      `ATR(14): ${fmt(snap.atr14)} (use for stop sizing)`,
      `Recent swing high (60 bars): $${fmt(snap.recentHigh)}`,
      `Recent swing low (60 bars): $${fmt(snap.recentLow)}`,
      ...(intraday && snap.intraday
        ? [
            snap.intraday.vwap
              ? `Session VWAP: $${fmt(snap.intraday.vwap.vwap)} (bands $${fmt(snap.intraday.vwap.lower)} / $${fmt(snap.intraday.vwap.upper)})`
              : "Session VWAP: n/a (no volume)",
            snap.intraday.openingRange
              ? `Opening range: $${fmt(snap.intraday.openingRange.low)} – $${fmt(snap.intraday.openingRange.high)}`
              : "Opening range: n/a",
            `Relative volume: ${snap.intraday.rvol != null ? snap.intraday.rvol.toFixed(2) + "x" : "n/a"}`,
          ]
        : []),
    ].join("\n")

    // Try AI-written analysis first; if the AI Gateway is unavailable (no card/
    // key on the account), fall back to the deterministic indicator engine so
    // the app stays fully functional with zero billing.
    let signal
    let mode: "ai" | "indicator" = "ai"
    try {
      const { experimental_output } = await generateText({
        model: "openai/gpt-5.4-mini",
        experimental_output: Output.object({ schema: signalSchema }),
        system: [
          `You are a disciplined technical analyst producing a single actionable ${tfCfg.label.toLowerCase()} signal with a ${tfCfg.hold} hold horizon.`,
          `You are given pre-computed technical indicators from ${tfCfg.bar} candles. Base your call strictly on this data.`,
          ...(intraday
            ? [
                "This is a DAY-TRADE signal: the position must be sized to close within the same session.",
                "Prioritise intraday structure — session VWAP, the opening range, and relative volume — over slow trend indicators.",
                "Require participation: if relative volume is weak/thin, prefer NEUTRAL. Stops belong just beyond VWAP/opening-range/swing; keep targets a realistic 1.5R.",
              ]
            : []),
          "Rules:",
          "- Anchor entry zones, stop-loss and targets to the provided price, ATR, swing levels, EMAs and Bollinger bands. Numbers must be realistic relative to current price.",
          "- Size the stop using ATR (typically 1-2x ATR from entry) and place it beyond a logical level.",
          "- Targets must respect the direction (LONG targets above entry, SHORT targets below) and be ordered.",
          "- If signals conflict or are weak, return NEUTRAL with low confidence rather than forcing a trade.",
          "- riskReward should reflect the primary (first) target versus the stop.",
          "- This is educational analysis, not financial advice.",
        ].join("\n"),
        prompt: `Produce a trade signal for the following market snapshot:\n\n${indicatorBlock}`,
      })
      signal = experimental_output
    } catch (aiErr) {
      const m = (aiErr as Error).message || ""
      console.log("[v0] AI unavailable, using indicator fallback:", m)
      signal = ruleSignalToTradeSignal(candles, timeframe, intraday ? { intraday: true, anchorMs } : undefined)
      mode = "indicator"
    }

    return Response.json({
      coin,
      indicators: snap,
      signal,
      mode,
      timeframe,
      intraday,
      session,
      confidenceFloor: ALERT_CONFIDENCE_MIN,
      passesFloor: (signal?.confidence ?? 0) >= ALERT_CONFIDENCE_MIN && signal?.direction !== "NEUTRAL",
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    const message = (err as Error).message || ""
    console.log("[v0] signal route error:", message)
    return Response.json({ error: "Failed to generate signal" }, { status: 500 })
  }
}
