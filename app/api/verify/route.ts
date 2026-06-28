import { parseExport } from "@/lib/parse-signals"
import { getBinanceCandles } from "@/lib/market"
import { verifyOne, aggregate, type VerifiedTrade } from "@/lib/verify"

export const maxDuration = 60

const HOLD_DAYS = 10 // how long to give each trade to resolve

export async function POST(req: Request) {
  try {
    const { text } = (await req.json()) as { text?: string }
    if (!text || !text.trim()) {
      return Response.json({ error: "Paste a Telegram export or signal posts first." }, { status: 400 })
    }

    const parsed = parseExport(text)
    if (parsed.length === 0) {
      return Response.json(
        { error: "No signals detected. Make sure each post includes a ticker like BTC_USDT." },
        { status: 422 },
      )
    }

    const trades: VerifiedTrade[] = []
    const skippedReasons: { signal: string; reasons: string[] }[] = []

    // Resolve and verify sequentially to stay within CoinGecko free limits.
    for (const sig of parsed) {
      const label = `${sig.symbol ?? "?"} ${sig.direction ?? ""}`.trim()

      const hasStop = sig.stop != null || sig.stopBufferPct != null
      if (!sig.symbol || !sig.direction || sig.timestamp == null || sig.entryLow == null || !hasStop) {
        skippedReasons.push({ signal: label, reasons: sig.issues.length ? sig.issues : ["incomplete signal"] })
        continue
      }

      const fromMs = sig.timestamp
      const toMs = fromMs + HOLD_DAYS * 24 * 60 * 60 * 1000
      let candles
      try {
        candles = await getBinanceCandles(sig.symbol, fromMs, toMs, "4h")
      } catch {
        skippedReasons.push({ signal: label, reasons: ["price history unavailable for that ticker/date"] })
        continue
      }
      if (candles.length < 2) {
        skippedReasons.push({ signal: label, reasons: ["no price history for that window"] })
        continue
      }

      const { trade, reasons } = verifyOne({ signal: sig, candles })
      if (trade) trades.push(trade)
      else skippedReasons.push({ signal: label, reasons })
    }

    const result = aggregate(trades, skippedReasons)
    return Response.json(result)
  } catch (err) {
    console.log("[v0] verify route error:", (err as Error).message)
    return Response.json({ error: "Failed to verify signals." }, { status: 500 })
  }
}
