import { getSignalCandles, isStock } from "@/lib/market"
import { walkForward } from "@/lib/walk-forward"
import { ASSET_BY_ID } from "@/lib/coins"
import { TIMEFRAMES, isTimeframe, DEFAULT_TIMEFRAME } from "@/lib/timeframe"
import { PLAYBOOK_BY_ID } from "@/lib/playbook/strategies"

export const maxDuration = 60

// Validates a batch of playbook pairings (strategyId + symbol + timeframe)
// out-of-sample using the SAME walk-forward engine as the rest of the app, but
// driven by each strategy's pluggable signal function. Returns the holdout
// verdict so the UI can award a "survived out-of-sample" gold badge.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      pairings?: Array<{ strategyId: string; symbol: string; timeframe?: string }>
    }
    const pairings = body.pairings ?? []
    if (!pairings.length) return Response.json({ error: "No pairings provided" }, { status: 400 })

    // Cache candles per (symbol, timeframe) so multiple strategies on the same
    // instrument don't refetch the deep history.
    const candleCache = new Map<string, Awaited<ReturnType<typeof getSignalCandles>>>()

    const results: Array<{
      strategyId: string
      symbol: string
      timeframe: string
      verdict: "robust" | "fragile" | "inconclusive"
      consistency: number
      positiveFolds: number
      totalFolds: number
      trainExpectancy: number | null
      holdoutExpectancy: number | null
      error?: string
    }> = []

    for (const p of pairings) {
      const timeframe = isTimeframe(p.timeframe) ? p.timeframe : DEFAULT_TIMEFRAME
      const strat = PLAYBOOK_BY_ID[p.strategyId]
      if (!strat || !ASSET_BY_ID[p.symbol]) {
        results.push({
          strategyId: p.strategyId,
          symbol: p.symbol,
          timeframe,
          verdict: "inconclusive",
          consistency: 0,
          positiveFolds: 0,
          totalFolds: 0,
          trainExpectancy: null,
          holdoutExpectancy: null,
          error: "unknown strategy or symbol",
        })
        continue
      }

      const key = `${p.symbol}:${timeframe}`
      let candles = candleCache.get(key)
      if (!candles) {
        try {
          candles = await getSignalCandles(p.symbol, timeframe)
          candleCache.set(key, candles)
        } catch {
          results.push({
            strategyId: p.strategyId,
            symbol: p.symbol,
            timeframe,
            verdict: "inconclusive",
            consistency: 0,
            positiveFolds: 0,
            totalFolds: 0,
            trainExpectancy: null,
            holdoutExpectancy: null,
            error: "fetch failed",
          })
          continue
        }
      }

      if (candles.length < 480) {
        results.push({
          strategyId: p.strategyId,
          symbol: p.symbol,
          timeframe,
          verdict: "inconclusive",
          consistency: 0,
          positiveFolds: 0,
          totalFolds: 0,
          trainExpectancy: null,
          holdoutExpectancy: null,
          error: "insufficient history",
        })
        continue
      }

      const wf = walkForward(p.symbol, candles, {
        folds: 4,
        holdBars: TIMEFRAMES[timeframe].holdBars,
        isCrypto: !isStock(p.symbol),
        signalFn: strat.evaluate,
      })

      results.push({
        strategyId: p.strategyId,
        symbol: p.symbol,
        timeframe,
        verdict: wf.verdict,
        consistency: wf.consistency,
        positiveFolds: wf.positiveFolds,
        totalFolds: wf.totalFolds,
        trainExpectancy: wf.train?.expectancy ?? null,
        holdoutExpectancy: wf.holdout?.expectancy ?? null,
      })
    }

    return Response.json({ results })
  } catch (err) {
    console.log("[v0] playbook-validate error:", (err as Error).message)
    return Response.json({ error: "Failed to validate pairings" }, { status: 500 })
  }
}
