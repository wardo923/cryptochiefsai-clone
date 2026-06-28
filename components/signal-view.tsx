"use client"

import useSWR from "swr"
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Sparkles,
  Target,
  ShieldAlert,
  Crosshair,
  Loader2,
  TriangleAlert,
} from "lucide-react"
import type { MarketRow } from "@/lib/market"
import type { TradeSignal } from "@/lib/signal"
import type { IndicatorSnapshot } from "@/lib/indicators"
import { formatPrice, formatPct } from "@/lib/format"
import { cn } from "@/lib/utils"
import { AlertButton } from "@/components/alert-button"
import { BacktestPanel } from "@/components/backtest-panel"

type SignalResponse = {
  coin: { id: string; symbol: string; name: string }
  indicators: IndicatorSnapshot
  signal: TradeSignal
  mode?: "ai" | "indicator"
  generatedAt: string
}

const directionStyles: Record<TradeSignal["direction"], { badge: string; icon: typeof ArrowUpRight; label: string }> = {
  LONG: { badge: "bg-chart-3/15 text-chart-3 border-chart-3/30", icon: ArrowUpRight, label: "Long" },
  SHORT: { badge: "bg-destructive/15 text-destructive border-destructive/30", icon: ArrowDownRight, label: "Short" },
  NEUTRAL: { badge: "bg-muted text-muted-foreground border-border", icon: Minus, label: "Neutral" },
}

async function postSignal(assetId: string): Promise<SignalResponse> {
  const res = await fetch("/api/signal", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ coinId: assetId }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || "Failed to generate signal")
  }
  return res.json()
}

export function SignalView({ assetId, symbol, name }: { assetId: string; symbol: string; name: string }) {
  const { data, error, isLoading } = useSWR(["signal", assetId], () => postSignal(assetId), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  const coinForBacktest = {
    id: assetId,
    symbol,
    name,
    kind: "crypto",
    price: 0,
    change24h: 0,
    change7d: null,
    volume24h: 0,
    marketCap: 0,
    sparkline: [],
  } as MarketRow

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-card p-5">
        {isLoading && <SignalSkeleton />}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <TriangleAlert className="size-4 shrink-0" />
            {(error as Error).message}
          </div>
        )}

        {data && (
          <div className="flex flex-col gap-5">
            <SignalResult data={data} />
            <AlertButton assetId={assetId} symbol={symbol} />
          </div>
        )}
      </div>

      <BacktestPanel coin={coinForBacktest} />
    </div>
  )
}

function SignalResult({ data }: { data: SignalResponse }) {
  const { signal, indicators } = data
  const dir = directionStyles[signal.direction]
  const DirIcon = dir.icon
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold",
            dir.badge,
          )}
        >
          <DirIcon className="size-4" />
          {dir.label}
        </span>
        <span className="text-sm text-muted-foreground">{signal.timeframe}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Confidence</span>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary" style={{ width: `${signal.confidence}%` }} />
          </div>
          <span className="text-sm font-medium tabular-nums">{Math.round(signal.confidence)}%</span>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-pretty">{signal.summary}</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Entry zone"
          value={`${formatPrice(signal.entry.low)} – ${formatPrice(signal.entry.high)}`}
          icon={Crosshair}
        />
        <Stat label="Stop loss" value={formatPrice(signal.stopLoss)} icon={ShieldAlert} tone="danger" />
        <Stat label="Primary target" value={formatPrice(signal.targets[0]?.price)} icon={Target} tone="success" />
        <Stat label="Risk / reward" value={`${signal.riskReward.toFixed(2)}R`} icon={Sparkles} />
      </div>

      {signal.targets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {signal.targets.map((t, i) => (
            <span key={i} className="rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs">
              <span className="text-muted-foreground">{t.label}: </span>
              <span className="font-medium tabular-nums">{formatPrice(t.price)}</span>
            </span>
          ))}
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold">Reasoning</h3>
        <ul className="flex flex-col gap-1.5">
          {signal.reasoning.map((r, i) => (
            <li key={i} className="flex gap-2 text-sm text-muted-foreground">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span className="leading-relaxed">{r}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-border bg-secondary/40 p-3">
        <p className="text-xs font-medium text-muted-foreground">Invalidation</p>
        <p className="mt-1 text-sm leading-relaxed">{signal.invalidation}</p>
      </div>

      <IndicatorGrid indicators={indicators} />

      <p className="text-xs text-muted-foreground">
        {data.mode === "indicator" ? "Indicator engine" : "Engine analysis"} · Generated{" "}
        {new Date(data.generatedAt).toLocaleString()} · Educational analysis, not financial advice.
      </p>
    </div>
  )
}

function IndicatorGrid({ indicators }: { indicators: IndicatorSnapshot }) {
  const items: [string, string][] = [
    ["RSI(14)", indicators.rsi14 != null ? indicators.rsi14.toFixed(1) : "—"],
    ["Trend", indicators.trend],
    ["EMA20", formatPrice(indicators.ema20)],
    ["EMA50", formatPrice(indicators.ema50)],
    ["MACD hist", indicators.macd ? indicators.macd.histogram.toFixed(4) : "—"],
    ["ATR(14)", indicators.atr14 != null ? indicators.atr14.toFixed(4) : "—"],
    ["Swing high", formatPrice(indicators.recentHigh)],
    ["Swing low", formatPrice(indicators.recentLow)],
  ]
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">Indicator snapshot</h3>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        {items.map(([k, v]) => (
          <div key={k} className="bg-card px-3 py-2">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="text-sm font-medium capitalize tabular-nums">{v}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: typeof Target
  tone?: "success" | "danger"
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <p
        className={cn(
          "text-sm font-semibold tabular-nums",
          tone === "success" && "text-chart-3",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  )
}

function SignalSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="h-7 w-40 animate-pulse rounded-full bg-secondary" />
      <div className="h-4 w-full animate-pulse rounded bg-secondary" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-secondary" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-secondary" />
        ))}
      </div>
    </div>
  )
}
