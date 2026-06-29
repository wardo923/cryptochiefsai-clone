import { getSignalCandles, isStock } from "@/lib/market"
import { backtest } from "@/lib/backtest"
import { ASSET_BY_ID } from "@/lib/coins"
import { TIMEFRAMES, isTimeframe, DEFAULT_TIMEFRAME } from "@/lib/timeframe"
import { PLAYBOOK } from "@/lib/playbook/strategies"

export const maxDuration = 120

// Runs ALL 8 Playbook strategies across the requested symbols at one timeframe.
// Candles are fetched once per symbol and reused across strategies. This is the
// engine behind the proven ticker -> strategy mapping; it uses the same
// realistic-cost backtest as everything else.
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { symbols?: string[]; timeframe?: string }
    const timeframe = isTimeframe(body.timeframe) ? body.timeframe : DEFAULT_TIMEFRAME
    const symbols = (body.symbols ?? []).filter((s) => ASSET_BY_ID[s])
    if (!symbols.length) return Response.json({ error: "No valid symbols" }, { status: 400 })

    const rows: Array<{
      strategyId: string
      strategyName: string
      symbol: string
      timeframe: string
      trades: number
      winRate: number
      expectancy: number
      profitFactor: number
      maxDrawdownR: number
      avgCostR: number
      lowSample: boolean
    }> = []

    for (const symbol of symbols) {
      let candles
      try {
        candles = await getSignalCandles(symbol, timeframe)
      } catch {
        continue
      }
      if (candles.length < 210) continue
      const crypto = !isStock(symbol)
      for (const strat of PLAYBOOK) {
        const r = backtest(symbol, candles, {
          holdBars: TIMEFRAMES[timeframe].holdBars,
          isCrypto: crypto,
          warmup: strat.warmup,
          signalFn: strat.evaluate,
        })
        rows.push({
          strategyId: strat.id,
          strategyName: strat.name,
          symbol,
          timeframe,
          trades: r.trades,
          winRate: r.winRate,
          expectancy: r.expectancy,
          profitFactor: r.profitFactor,
          maxDrawdownR: r.maxDrawdownR,
          avgCostR: r.avgCostR,
          lowSample: r.trades < 20,
        })
      }
    }

    return Response.json({ timeframe, rows })
  } catch (err) {
    console.log("[v0] playbook-matrix error:", (err as Error).message)
    return Response.json({ error: "Failed to run matrix" }, { status: 500 })
  }
}
