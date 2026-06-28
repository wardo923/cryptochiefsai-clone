import { getHistoryCandles } from "@/lib/market"
import { backtest } from "@/lib/backtest"
import { ASSET_BY_ID } from "@/lib/coins"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { coinId } = await req.json()
    if (!coinId || typeof coinId !== "string") {
      return Response.json({ error: "coinId is required" }, { status: 400 })
    }
    if (!ASSET_BY_ID[coinId]) {
      return Response.json({ error: "Unknown asset" }, { status: 400 })
    }

    // 90 days of hourly data aggregated into 4h candles (~540 bars),
    // enough history for an EMA200 warmup with real intrabar highs/lows.
    const candles = await getHistoryCandles(coinId, 90, 4)
    if (candles.length < 210) {
      return Response.json(
        { error: "Not enough historical data to backtest this market yet." },
        { status: 422 },
      )
    }

    const result = backtest(coinId, candles)
    return Response.json({ result })
  } catch (err) {
    console.log("[v0] backtest route error:", (err as Error).message)
    return Response.json({ error: "Failed to run backtest" }, { status: 500 })
  }
}
