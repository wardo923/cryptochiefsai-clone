"use client"

import { useState } from "react"
import { BarChart3, Loader2, TrendingUp, TrendingDown, Info, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react"
import type { MarketRow } from "@/lib/market"
import type { BacktestResult } from "@/lib/backtest"
import type { WalkForwardResult } from "@/lib/walk-forward"
import { TIMEFRAMES, DEFAULT_TIMEFRAME, type Timeframe } from "@/lib/timeframe"
import { cn } from "@/lib/utils"

function EquityCurve({ data }: { data: number[] }) {
  if (!data || data.length < 2) {
    return (
      <div className="flex h-28 items-center justify-center rounded-lg border border-border bg-secondary/40 text-xs text-muted-foreground">
        Not enough trades to plot an equity curve.
      </div>
    )
  }
  const width = 320
  const height = 112
  const min = Math.min(0, ...data)
  const max = Math.max(0, ...data)
  const range = max - min || 1
  const step = width / (data.length - 1)
  const points = data
    .map((v, i) => {
      const x = i * step
      const y = height - ((v - min) / range) * height
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(" ")
  const last = data[data.length - 1]
  const positive = last >= 0
  const zeroY = height - ((0 - min) / range) * height

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Cumulative R-multiple equity curve"
      className="rounded-lg border border-border bg-secondary/40"
    >
      <line x1={0} y1={zeroY} x2={width} y2={zeroY} stroke="var(--color-border)" strokeWidth={1} strokeDasharray="4 4" />
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "var(--color-chart-3)" : "var(--color-destructive)"}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
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
  tone?: "neutral" | "good" | "bad"
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums",
          tone === "good" && "text-chart-3",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  )
}

function FoldBars({ result }: { result: WalkForwardResult }) {
  const exps = result.folds.map((f) => f.result.expectancy)
  const maxAbs = Math.max(0.1, ...exps.map((e) => Math.abs(e)))
  return (
    <div className="flex items-end gap-1.5">
      {result.folds.map((f, i) => {
        const e = f.result.expectancy
        const pct = (Math.abs(e) / maxAbs) * 100
        const pos = e > 0
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-16 w-full items-end justify-center">
              <div
                className={cn("w-full rounded-t", pos ? "bg-chart-3" : "bg-destructive")}
                style={{ height: `${Math.max(6, pct)}%` }}
                title={`Segment ${i + 1}: ${e}R on ${f.result.trades} trades`}
              />
            </div>
            <span className="text-[10px] tabular-nums text-muted-foreground">{e}R</span>
            <span className="text-[9px] text-muted-foreground">n{f.result.trades}</span>
          </div>
        )
      })}
    </div>
  )
}

function WalkForwardSection({ coin, timeframe }: { coin: MarketRow; timeframe: Timeframe }) {
  const [wf, setWf] = useState<WalkForwardResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setLoading(true)
    setError(null)
    setWf(null)
    try {
      const res = await fetch("/api/walk-forward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coinId: coin.id, timeframe }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to run validation")
      setWf(json.result as WalkForwardResult)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const verdictTone =
    wf?.verdict === "robust" ? "good" : wf?.verdict === "fragile" ? "bad" : "neutral"
  const VerdictIcon =
    wf?.verdict === "robust" ? ShieldCheck : wf?.verdict === "fragile" ? ShieldAlert : ShieldQuestion

  return (
    <div className="mt-3 rounded-lg border border-border bg-secondary/30 p-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Walk-forward validation</h3>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
        Splits the deep history into ordered time segments and an unseen 30% holdout, then checks whether the edge
        holds out-of-sample instead of living in one lucky stretch. This is the real test of robustness.
      </p>

      <button
        onClick={run}
        disabled={loading}
        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Validating…
          </>
        ) : (
          <>Validate {coin.symbol} out-of-sample</>
        )}
      </button>

      {error && <div className="mt-3 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{error}</div>}

      {wf && (
        <div className="mt-3 flex flex-col gap-3">
          <div
            className={cn(
              "flex items-start gap-2 rounded-lg border p-3",
              verdictTone === "good" && "border-chart-3/40 bg-chart-3/10",
              verdictTone === "bad" && "border-destructive/40 bg-destructive/10",
              verdictTone === "neutral" && "border-border bg-card",
            )}
          >
            <VerdictIcon
              className={cn(
                "mt-0.5 size-4 shrink-0",
                verdictTone === "good" && "text-chart-3",
                verdictTone === "bad" && "text-destructive",
              )}
            />
            <div>
              <div className="text-sm font-semibold capitalize">{wf.verdict}</div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{wf.verdictReason}</p>
            </div>
          </div>

          {wf.train && wf.holdout && (
            <div className="grid grid-cols-2 gap-2">
              <Stat
                label="In-sample (train)"
                value={`${wf.train.expectancy > 0 ? "+" : ""}${wf.train.expectancy}R`}
                tone={wf.train.expectancy > 0 ? "good" : "bad"}
                hint={`${wf.train.trades} trades`}
              />
              <Stat
                label="Holdout (unseen)"
                value={`${wf.holdout.expectancy > 0 ? "+" : ""}${wf.holdout.expectancy}R`}
                tone={wf.holdout.expectancy > 0 ? "good" : "bad"}
                hint={`${wf.holdout.trades} trades`}
              />
            </div>
          )}

          <div>
            <div className="mb-1.5 text-[11px] text-muted-foreground">
              Per-segment expectancy · {wf.positiveFolds}/{wf.totalFolds} profitable ({wf.consistency}% consistency)
            </div>
            <FoldBars result={wf} />
          </div>
        </div>
      )}
    </div>
  )
}

export function BacktestPanel({
  coin,
  timeframe = DEFAULT_TIMEFRAME,
}: {
  coin: MarketRow | null
  timeframe?: Timeframe
}) {
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    if (!coin) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coinId: coin.id, timeframe }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to run backtest")
      setResult(json.result as BacktestResult)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Strategy backtest</h2>
        {coin && (
          <span className="ml-auto text-xs text-muted-foreground">
            {coin.symbol} · {TIMEFRAMES[timeframe].label} / {TIMEFRAMES[timeframe].bar} candles
          </span>
        )}
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Replays the exact indicator rules bar-by-bar over real history with no look-ahead and structure-based stops.
        Fills are charged realistically: commission, the bid/ask spread crossed on both entry and exit, and extra
        slippage on stop-outs. These are measured results — not a promise of future performance.
      </p>

      {!coin ? (
        <div className="mt-4 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Select a market to backtest its strategy.
        </div>
      ) : (
        <button
          onClick={run}
          disabled={loading}
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Running backtest…
            </>
          ) : (
            <>Run backtest on {coin.symbol}</>
          )}
        </button>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat
              label="Win rate"
              value={`${result.winRate}%`}
              tone={result.winRate >= 50 ? "good" : "bad"}
              hint={`${result.wins}W / ${result.losses}L`}
            />
            <Stat
              label="Expectancy"
              value={`${result.expectancy > 0 ? "+" : ""}${result.expectancy}R`}
              tone={result.expectancy > 0 ? "good" : "bad"}
              hint="avg per trade"
            />
            <Stat
              label="Profit factor"
              value={`${result.profitFactor}`}
              tone={result.profitFactor >= 1 ? "good" : "bad"}
              hint="gross win / loss"
            />
            <Stat label="Trades" value={`${result.trades}`} hint={`${result.timeouts} timed out`} />
            <Stat
              label="Cost drag"
              value={`-${result.avgCostR}R`}
              tone="bad"
              hint={`spread ${result.spreadPct}% + slip`}
            />
            <Stat label="Max drawdown" value={`${result.maxDrawdownR}R`} tone="bad" hint="peak to trough" />
            <Stat
              label="Net result"
              value={`${result.equityCurveR.length ? (result.equityCurveR[result.equityCurveR.length - 1] > 0 ? "+" : "") + result.equityCurveR[result.equityCurveR.length - 1] : "0"}R`}
              tone={
                result.equityCurveR.length && result.equityCurveR[result.equityCurveR.length - 1] >= 0 ? "good" : "bad"
              }
              hint="cumulative"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              {result.equityCurveR.length && result.equityCurveR[result.equityCurveR.length - 1] >= 0 ? (
                <TrendingUp className="size-3.5 text-chart-3" />
              ) : (
                <TrendingDown className="size-3.5 text-destructive" />
              )}
              Equity curve (cumulative R)
            </div>
            <EquityCurve data={result.equityCurveR} />
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Tested on {result.candles} candles. Past performance is computed on a single recent window and small
              samples are noisy — treat low trade counts with caution. This is research, not financial advice.
            </span>
          </div>

          {coin && <WalkForwardSection coin={coin} timeframe={timeframe} />}
        </div>
      )}
    </div>
  )
}
