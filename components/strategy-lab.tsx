"use client"

import { useState } from "react"
import {
  FlaskConical,
  Loader2,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Trophy,
  Info,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"

type StratTrade = {
  entryTime: number
  exitTime: number
  direction: "LONG" | "SHORT"
  entry: number
  stop: number
  rMultiple: number
  exitReason: string
  grade?: string
  score?: number
}

type SymbolResult = {
  strategyId: string
  symbol: string
  trades: number
  winRate: number
  expectancy: number
  profitFactor: number
  maxDrawdownR: number
  totalR: number
  lowSample: boolean
  tradeLog: StratTrade[]
}

type PerStrategy = {
  strategyId: string
  name: string
  family: string
  description: string
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
  bySymbol: SymbolResult[]
}

type LabResponse = {
  symbols: string[]
  skipped: string[]
  strategies: PerStrategy[]
  candleDays: string
  costModel: { feePct: number; spreadPct: number; slipPct: number }
}

const FAMILY_LABEL: Record<string, string> = {
  multi_timeframe: "Multi-timeframe",
  breakout: "Breakout",
  mean_reversion: "Mean reversion",
  trend: "Trend",
}

export function StrategyLab() {
  const [data, setData] = useState<LabResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/strategy-lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to run the lab")
      setData(json as LabResponse)
      setExpanded(json.strategies?.[0]?.strategyId ?? null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-5 px-4 py-5 sm:px-6">
      {/* Intro */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-5 text-primary" />
          <h2 className="text-base font-semibold">Strategies, ranked by what survives costs</h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Four intraday strategies — your A+ multi-timeframe spec plus three classic archetypes — run through the same
          engine on 15-minute data across liquid symbols. Every fill is charged commission, spread on both sides, and
          extra slippage on stops. They&apos;re ranked by after-cost expectancy, so the data decides the winner.
        </p>
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Free 15m history caps at ~37 trading days, and these filters are selective — so trade counts are low and
            results are preliminary. Treat anything under 20 trades as a hint, not proof.
          </span>
        </div>
      </section>

      {!data && (
        <button
          onClick={run}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Running backtests…
            </>
          ) : (
            <>Run the lab</>
          )}
        </button>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {data && (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              Tested on <span className="text-foreground">{data.symbols.join(", ")}</span>
            </span>
            {data.skipped.length > 0 && <span>Skipped (no data): {data.skipped.join(", ")}</span>}
            <button onClick={run} disabled={loading} className="ml-auto inline-flex items-center gap-1.5 text-primary">
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Re-run
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {data.strategies.map((s, idx) => (
              <StrategyCard
                key={s.strategyId}
                rank={idx + 1}
                s={s}
                open={expanded === s.strategyId}
                onToggle={() => setExpanded(expanded === s.strategyId ? null : s.strategyId)}
              />
            ))}
          </div>

          <p className="text-pretty text-center text-xs text-muted-foreground">
            Research only — not financial advice. Past performance does not predict future results.
          </p>
        </>
      )}
    </div>
  )
}

function StrategyCard({
  rank,
  s,
  open,
  onToggle,
}: {
  rank: number
  s: PerStrategy
  open: boolean
  onToggle: () => void
}) {
  const positive = s.expectancy > 0
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", rank === 1 ? "border-primary/50" : "border-border")}>
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold",
            rank === 1 ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
          )}
        >
          {rank === 1 ? <Trophy className="size-4" /> : rank}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{s.name}</h3>
            <span className="hidden rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
              {FAMILY_LABEL[s.family] ?? s.family}
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={cn(
                "inline-flex items-center gap-1 font-medium",
                positive ? "text-chart-3" : "text-destructive",
              )}
            >
              {positive ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {s.expectancy > 0 ? "+" : ""}
              {s.expectancy}R / trade
            </span>
            <span>·</span>
            <span>{s.trades} trades</span>
            {s.lowSample && (
              <span className="rounded bg-chart-4/15 px-1.5 py-0.5 text-[10px] text-chart-4">low sample</span>
            )}
          </p>
        </div>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-border p-4">
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{s.description}</p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Win rate" value={`${s.winRate}%`} />
            <Stat label="Expectancy" value={`${s.expectancy > 0 ? "+" : ""}${s.expectancy}R`} tone={positive ? "good" : "bad"} />
            <Stat label="Profit factor" value={s.profitFactor === 999 ? "∞" : `${s.profitFactor}`} tone={s.profitFactor >= 1 ? "good" : "bad"} />
            <Stat label="Total" value={`${s.totalR > 0 ? "+" : ""}${s.totalR}R`} tone={s.totalR > 0 ? "good" : "bad"} />
            <Stat label="Max drawdown" value={`${s.maxDrawdownR}R`} tone="bad" />
            <Stat label="Cost drag" value={`-${s.avgCostR}R`} tone="bad" hint="per trade" />
            <Stat label="Wins / losses" value={`${s.wins}/${s.losses}`} />
            <Stat label="Breakevens" value={`${s.breakevens}`} />
          </div>

          {s.pooledEquityR.length > 1 && (
            <div className="mt-4">
              <div className="mb-1.5 text-[11px] text-muted-foreground">Pooled equity (R)</div>
              <Sparkline data={s.pooledEquityR} positive={s.totalR > 0} />
            </div>
          )}

          {/* Per-symbol breakdown */}
          <div className="mt-4">
            <div className="mb-1.5 text-[11px] text-muted-foreground">By symbol</div>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-muted-foreground">
                    <th className="px-2.5 py-1.5 text-left font-medium">Symbol</th>
                    <th className="px-2.5 py-1.5 text-right font-medium">Trades</th>
                    <th className="px-2.5 py-1.5 text-right font-medium">Win%</th>
                    <th className="px-2.5 py-1.5 text-right font-medium">Exp</th>
                    <th className="px-2.5 py-1.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {s.bySymbol
                    .filter((r) => r.trades > 0)
                    .sort((a, b) => b.expectancy - a.expectancy)
                    .map((r) => (
                      <tr key={r.symbol} className="border-b border-border last:border-0">
                        <td className="px-2.5 py-1.5 font-medium">{r.symbol}</td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums">{r.trades}</td>
                        <td className="px-2.5 py-1.5 text-right tabular-nums">{r.winRate}%</td>
                        <td
                          className={cn(
                            "px-2.5 py-1.5 text-right tabular-nums",
                            r.expectancy > 0 ? "text-chart-3" : "text-destructive",
                          )}
                        >
                          {r.expectancy > 0 ? "+" : ""}
                          {r.expectancy}R
                        </td>
                        <td
                          className={cn(
                            "px-2.5 py-1.5 text-right tabular-nums",
                            r.totalR > 0 ? "text-chart-3" : "text-destructive",
                          )}
                        >
                          {r.totalR > 0 ? "+" : ""}
                          {r.totalR}R
                        </td>
                      </tr>
                    ))}
                  {s.bySymbol.every((r) => r.trades === 0) && (
                    <tr>
                      <td colSpan={5} className="px-2.5 py-3 text-center text-muted-foreground">
                        No qualifying setups in the available window.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string
  value: string
  tone?: "good" | "bad" | "neutral"
  hint?: string
}) {
  return (
    <div className="rounded-lg bg-secondary/40 p-2.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-0.5 text-sm font-semibold tabular-nums",
          tone === "good" && "text-chart-3",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  )
}

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const w = 320
  const h = 48
  const min = Math.min(0, ...data)
  const max = Math.max(0, ...data)
  const range = max - min || 1
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
  const zeroY = h - ((0 - min) / range) * h
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full" preserveAspectRatio="none" role="img" aria-label="Equity curve">
      <line x1="0" y1={zeroY} x2={w} y2={zeroY} stroke="currentColor" strokeWidth="0.5" className="text-border" />
      <polyline
        points={pts}
        fill="none"
        strokeWidth="1.5"
        className={positive ? "text-chart-3" : "text-destructive"}
        stroke="currentColor"
      />
    </svg>
  )
}
