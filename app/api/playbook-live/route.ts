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

// How many recent closes to hand the Desk chart. Enough to draw a meaningful
// Path without shipping the whole warmup history to the client.
const SERIES_POINTS = 60

// Evaluates the assigned methodology against the CURRENT market and returns a
// two-part read (NOT a fabricated buy/sell signal):
//   bias  = which direction current conditions favor (Bull/Bear/Neutral)
//   entry = whether a qualifying entry exists right now (Qualified/Developing/
//           Stand Aside)
//   plan  = the strategy's OWN trade plan (entry/stop/target), returned ONLY
//           when a qualifying entry actually fired. These levels come straight
//           from the same evaluate() that produced the proven track record, so
//           nothing on the chart is invented — when there is no setup, there
//           are no levels.
// Everything is computed live by running the strategy's own logic on the latest
// candles. Nothing here is stored, guessed, or model-generated.
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
      return Response.json({ bias: "NEUTRAL", entry: "STAND_ASIDE", enoughData: false, series: [], plan: null })
    }

    // Two-part read (bias + entry status) — the same call used everywhere else.
    const read = readStrategy(strat.id, candles)

    // The strategy's own trade plan. evaluate() returns levels only when its
    // entry conditions fire, so `plan` is non-null iff entry === "QUALIFIED".
    const rawPlan = strat.evaluate(candles)
    const entryPrice = candles[candles.length - 1]?.c ?? null
    const plan =
      rawPlan && entryPrice != null
        ? {
            direction: rawPlan.direction, // "LONG" | "SHORT"
            entry: entryPrice, // the strategy enters at market when it fires
            stopLoss: rawPlan.stopLoss,
            target: rawPlan.target,
          }
        : null

    // Real recent closes from the same data lane the backtest ran on.
    const series = candles.slice(-SERIES_POINTS).map((c) => ({ t: c.t, c: c.c }))

    return Response.json({
      bias: read.bias, // "BULL" | "BEAR" | "NEUTRAL"
      entry: read.entry, // "QUALIFIED" | "DEVELOPING" | "STAND_ASIDE"
      enoughData: true,
      asOf: candles[candles.length - 1]?.t ?? null,
      isCrypto: !isStock(body.symbol),
      series,
      plan,
    })
  } catch (err) {
    console.log("[v0] playbook-live error:", (err as Error).message)
    return Response.json({ error: "Failed to read live market" }, { status: 500 })
  }
}
