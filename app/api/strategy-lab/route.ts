import { getSignalCandles } from "@/lib/market"
import { ASSET_BY_ID } from "@/lib/coins"
import { STRATEGIES } from "@/lib/strategies/registry"
import { prepareContext } from "@/lib/strategies/context"
import { runStrategy, type StrategyResult } from "@/lib/strategies/run"

export const maxDuration = 60

// Default universe: liquid index ETFs + large caps with intraday volume. All
// must exist in ASSET_BY_ID and be stocks (the strategies are equity-session
// based, so crypto is excluded).
const DEFAULT_SYMBOLS = ["SPY", "QQQ", "NVDA", "AAPL", "MSFT", "TSLA", "META"]
const MIN_CANDLES = 120

type PerStrategy = {
  strategyId: string
  name: string
  family: string
  description: string
  // pooled across symbols
  trades: number
  wins: number
  losses: number
  breakevens: number
  winRate: number
  expectancy: number
  profitFactor: number
  avgCostR: number
  totalR: number
  maxDrawdownR: number
  pooledEquityR: number[]
  lowSample: boolean
  bySymbol: StrategyResult[]
}

function poolStrategy(id: string, perSymbol: StrategyResult[]): PerStrategy {
  const meta = STRATEGIES.find((s) => s.id === id)!
  const all = perSymbol.filter((r) => r.strategyId === id)
  const trades = all.reduce((a, r) => a + r.trades, 0)
  const wins = all.reduce((a, r) => a + r.wins, 0)
  const losses = all.reduce((a, r) => a + r.losses, 0)
  const breakevens = all.reduce((a, r) => a + r.breakevens, 0)
  const totalR = all.reduce((a, r) => a + r.totalR, 0)
  const winRate = trades ? (wins / trades) * 100 : 0
  const expectancy = trades ? totalR / trades : 0
  // Profit factor pooled from trade logs.
  const logs = all.flatMap((r) => r.tradeLog)
  const grossWin = logs.filter((t) => t.rMultiple > 0).reduce((a, t) => a + t.rMultiple, 0)
  const grossLoss = Math.abs(logs.filter((t) => t.rMultiple < 0).reduce((a, t) => a + t.rMultiple, 0))
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 999 : 0
  const avgCostR = all.length ? all.reduce((a, r) => a + r.avgCostR, 0) / all.length : 0

  // Pooled equity curve: concatenate per-symbol curves in symbol order.
  const pooledEquityR: number[] = []
  let cum = 0
  let peak = 0
  let maxDD = 0
  for (const r of all) {
    for (const t of r.tradeLog) {
      cum += t.rMultiple
      pooledEquityR.push(Number(cum.toFixed(3)))
      if (cum > peak) peak = cum
      if (peak - cum > maxDD) maxDD = peak - cum
    }
  }

  return {
    strategyId: id,
    name: meta.name,
    family: meta.family,
    description: meta.description,
    trades,
    wins,
    losses,
    breakevens,
    winRate: Number(winRate.toFixed(1)),
    expectancy: Number(expectancy.toFixed(3)),
    profitFactor: profitFactor === 999 ? 999 : Number(profitFactor.toFixed(2)),
    avgCostR: Number(avgCostR.toFixed(3)),
    totalR: Number(totalR.toFixed(2)),
    maxDrawdownR: Number(maxDD.toFixed(2)),
    pooledEquityR,
    lowSample: trades < 20,
    bySymbol: all,
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { symbols?: string[] }
    let symbols = Array.isArray(body.symbols) && body.symbols.length ? body.symbols : DEFAULT_SYMBOLS
    // Keep only known stocks; cap to protect the time budget.
    symbols = symbols.filter((s) => ASSET_BY_ID[s] && ASSET_BY_ID[s].kind === "stock").slice(0, 8)
    if (!symbols.length) {
      return Response.json({ error: "No valid stock symbols provided." }, { status: 400 })
    }

    // Fetch 15m history for each symbol in parallel.
    const fetched = await Promise.all(
      symbols.map(async (sym) => {
        try {
          const candles = await getSignalCandles(sym, "intraday15m")
          return { sym, candles }
        } catch (e) {
          console.log("[v0] strategy-lab fetch failed:", sym, (e as Error).message)
          return { sym, candles: [] }
        }
      }),
    )

    const perSymbol: StrategyResult[] = []
    const usable: string[] = []
    const skipped: string[] = []
    for (const { sym, candles } of fetched) {
      if (candles.length < MIN_CANDLES) {
        skipped.push(sym)
        continue
      }
      usable.push(sym)
      // Build the market context ONCE per symbol, reuse across all strategies.
      const ctx = prepareContext(candles)
      for (const strat of STRATEGIES) {
        perSymbol.push(runStrategy(strat, sym, candles, ctx))
      }
    }

    if (!usable.length) {
      return Response.json(
        { error: "Not enough 15m history available for any symbol right now. Try again shortly." },
        { status: 422 },
      )
    }

    // Pool per strategy and rank by after-cost expectancy (then total R).
    const strategies = STRATEGIES.map((s) => poolStrategy(s.id, perSymbol)).sort(
      (a, b) => b.expectancy - a.expectancy || b.totalR - a.totalR,
    )

    return Response.json({
      symbols: usable,
      skipped,
      strategies,
      candleDays: "~37 trading days (Yahoo 15m cap)",
      costModel: { feePct: 0.01, spreadPct: 0.02, slipPct: 0.05 },
    })
  } catch (err) {
    console.log("[v0] strategy-lab route error:", (err as Error).message)
    return Response.json({ error: "Failed to run the strategy lab." }, { status: 500 })
  }
}
