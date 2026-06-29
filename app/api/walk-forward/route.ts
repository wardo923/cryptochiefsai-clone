import { getSignalCandles, isStock } from "@/lib/market"
import { walkForward } from "@/lib/walk-forward"
import { ASSET_BY_ID } from "@/lib/coins"
import { TIMEFRAMES, isTimeframe, isIntraday, DEFAULT_TIMEFRAME } from "@/lib/timeframe"

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { coinId?: string; timeframe?: string; breakeven?: boolean }
    const { coinId } = body
    if (!coinId || typeof coinId !== "string") {
      return Response.json({ error: "coinId is required" }, { status: 400 })
    }
    if (!ASSET_BY_ID[coinId]) {
      return Response.json({ error: "Unknown asset" }, { status: 400 })
    }
    const timeframe = isTimeframe(body.timeframe) ? body.timeframe : DEFAULT_TIMEFRAME
    const intraday = isIntraday(timeframe)

    const candles = await getSignalCandles(coinId, timeframe)
    // Walk-forward needs enough history to split into folds AND a holdout.
    if (candles.length < 480) {
      return Response.json(
        { error: "Not enough history to run walk-forward validation at this timeframe yet." },
        { status: 422 },
      )
    }

    const result = walkForward(coinId, candles, {
      folds: 4,
      holdBars: TIMEFRAMES[timeframe].holdBars,
      intraday,
      isCrypto: !isStock(coinId),
      breakeven: body.breakeven === true,
    })
    return Response.json({ result, timeframe })
  } catch (err) {
    console.log("[v0] walk-forward route error:", (err as Error).message)
    return Response.json({ error: "Failed to run walk-forward validation" }, { status: 500 })
  }
}
