import { generateText, Output } from "ai"
import { getCandles } from "@/lib/market"
import { buildSnapshot } from "@/lib/indicators"
import { COIN_BY_ID } from "@/lib/coins"
import { signalSchema } from "@/lib/signal"

export const maxDuration = 30

function fmt(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "n/a"
  return n.toLocaleString("en-US", { maximumFractionDigits: 8 })
}

export async function POST(req: Request) {
  try {
    const { coinId } = (await req.json()) as { coinId?: string }
    if (!coinId || !COIN_BY_ID[coinId]) {
      return Response.json({ error: "Unknown coin" }, { status: 400 })
    }
    const coin = COIN_BY_ID[coinId]

    const candles = await getCandles(coinId, 14)
    if (candles.length < 30) {
      return Response.json({ error: "Not enough market data" }, { status: 422 })
    }
    const snap = buildSnapshot(candles)

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
    ].join("\n")

    const { experimental_output } = await generateText({
      model: "openai/gpt-5.4-mini",
      experimental_output: Output.object({ schema: signalSchema }),
      system: [
        "You are a disciplined crypto technical analyst producing a single actionable swing-trade signal.",
        "You are given pre-computed technical indicators from 4h candles. Base your call strictly on this data.",
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

    return Response.json({
      coin,
      indicators: snap,
      signal: experimental_output,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    const message = (err as Error).message || ""
    console.log("[v0] signal route error:", message)
    if (message.includes("credit card") || message.includes("402") || message.includes("403")) {
      return Response.json(
        {
          error:
            "AI Gateway needs a valid credit card on file to unlock free credits. Add one in your Vercel AI settings, then try again.",
        },
        { status: 402 },
      )
    }
    return Response.json({ error: "Failed to generate signal" }, { status: 500 })
  }
}
