import { getSignalCandles, isStock } from "@/lib/market"
import { backtest } from "@/lib/backtest"
import { ASSET_BY_ID } from "@/lib/coins"
import { TIMEFRAMES, isTimeframe, isIntraday, DEFAULT_TIMEFRAME } from "@/lib/timeframe"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { coinId?: string; timeframe?: string }
    const { coinId } = body
    if (!coinId || typeof coinId !== "string") {
      return Response.json({ error: "coinId is required" }, { status: 400 })
    }
    if (!ASSET_BY_ID[coinId]) {
      return Response.json({ error: "Unknown asset" }, { status: 400 })
    }
    const timeframe = isTimeframe(body.timeframe) ? body.timeframe : DEFAULT_TIMEFRAME
    const intraday = isIntraday(timeframe)

    // Pull history at the selected timeframe's granularity so the backtest
    // replays the exact rules a user sees for that timeframe.
    const candles = await getSignalCandles(coinId, timeframe)
    // Intraday needs far less warmup, so allow a smaller minimum sample.
    const minCandles = intraday ? 90 : 210
    if (candles.length < minCandles) {
      return Response.json(
        { error: "Not enough historical data to backtest this market at this timeframe yet." },
        { status: 422 },
      )
    }

    const result = backtest(coinId, candles, {
      holdBars: TIMEFRAMES[timeframe].holdBars,
      intraday,
      isCrypto: !isStock(coinId),
    })
    return Response.json({ result, timeframe, intraday, lowSample: result.trades < 20 })
  } catch (err) {
    console.log("[v0] backtest route error:", (err as Error).message)
    return Response.json({ error: "Failed to run backtest" }, { status: 500 })
  }
}
