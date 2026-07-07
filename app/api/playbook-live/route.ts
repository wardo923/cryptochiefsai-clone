import { getSignalCandles, isStock } from "@/lib/market"
import { PLAYBOOK_BY_ID } from "@/lib/playbook/strategies"
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

// Returns the CURRENT direction the assigned strategy would take on this exact
// market, by running that strategy's own evaluate() on the latest candles — the
// same function and data source that produced its proven track record. This is
// a live, computed fact, never a stored/fabricated value.
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
      return Response.json({ direction: "NEUTRAL", enoughData: false })
    }

    // Run the strategy's OWN logic on the most recent bar (the live read).
    const plan = strat.evaluate(candles)
    const direction = plan?.direction ?? "NEUTRAL"

    return Response.json({
      direction, // "LONG" | "SHORT" | "NEUTRAL"
      enoughData: true,
      asOf: candles[candles.length - 1]?.t ?? null,
      isCrypto: !isStock(body.symbol),
    })
  } catch (err) {
    console.log("[v0] playbook-live error:", (err as Error).message)
    return Response.json({ error: "Failed to read live signal" }, { status: 500 })
  }
}
