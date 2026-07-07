import { getSignalCandles, isStock } from "@/lib/market"
import { PLAYBOOK_BY_ID, readStrategy } from "@/lib/playbook/strategies"
import { ASSET_BY_ID } from "@/lib/coins"
import { type Timeframe } from "@/lib/timeframe"
import { type PlaybookTimeframe } from "@/lib/playbook/mapping"

export const maxDuration = 30

// The playbook's 3-value timeframe -> the engine granularity the proven numbers
// were computed at. This MUST match how scripts/regen-matrix.mjs mapped them so
// the live read runs on the SAME data lane the backtest used.
const TF_TO_ENGINE: Record<PlaybookTimeframe, Timeframe> = {
  intraday: "intraday15m",
  swing: "swing",
  position: "position",
}

// Evaluates the assigned methodology against the CURRENT market and returns a
// two-part read (NOT a buy/sell signal):
//   bias  = which direction current conditions favor (Bullish/Bearish/Neutral)
//   entry = whether a qualifying entry exists right now (Qualified/Developing/
//           Stand Aside)
// Both are computed live by running the strategy's own logic (readStrategy) on
// the latest candles — the same logic and data source behind its proven track
// record. Nothing here is stored or fabricated.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      strategyId?: string
      symbol?: string
      timeframe?: PlaybookTimeframe
    }
    const strat = body.strategyId ? PLAYBOOK_BY_ID[body.strategyId] : undefined
    if (!strat) return Response.json({ error: "Unknown strategy" }, { status: 400 })
    if (!body.symbol || !ASSET_BY_ID[body.symbol]) {
      return Response.json({ error: "Unknown market" }, { status: 400 })
    }
    const engineTf = TF_TO_ENGINE[body.timeframe ?? "swing"] ?? "swing"

    const candles = await getSignalCandles(body.symbol, engineTf)
    if (candles.length < strat.warmup + 2) {
      return Response.json({ bias: "NEUTRAL", entry: "STAND_ASIDE", enoughData: false })
    }

    const read = readStrategy(strat.id, candles)

    return Response.json({
      bias: read.bias, // "BULL" | "BEAR" | "NEUTRAL"
      entry: read.entry, // "QUALIFIED" | "DEVELOPING" | "STAND_ASIDE"
      enoughData: true,
      asOf: candles[candles.length - 1]?.t ?? null,
      isCrypto: !isStock(body.symbol),
    })
  } catch (err) {
    console.log("[v0] playbook-live error:", (err as Error).message)
    return Response.json({ error: "Failed to read live market" }, { status: 500 })
  }
}
