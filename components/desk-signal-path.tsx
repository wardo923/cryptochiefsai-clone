"use client"

import useSWR from "swr"
import { Compass, Loader2, BellRing, ArrowUpRight, ArrowDownRight, Radio, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/format"
import type { TradeSignal } from "@/lib/signal"

type SeriesPoint = { t: number; c: number }

type SignalResponse = {
  signal: TradeSignal
  mode: "ai" | "indicator"
  passesFloor: boolean
  confidenceFloor: number
  series?: SeriesPoint[]
  generatedAt: string
}

// One shared fetcher — POST the coin id + timeframe to the live signal engine.
async function fetchSignal([, coinId, timeframe]: [string, string, string]): Promise<SignalResponse> {
  const res = await fetch("/api/signal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coinId, timeframe }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? "Signal unavailable")
  }
  return res.json()
}

type Stage = "watching" | "lining-up" | "live"

function deriveStage(data: SignalResponse | undefined): Stage {
  if (!data) return "watching"
  if (data.passesFloor) return "live"
  const { signal, confidenceFloor } = data
  const warmup = confidenceFloor * 0.6
  if (signal.direction !== "NEUTRAL" && signal.confidence >= warmup) return "lining-up"
  return "watching"
}

// Resolve the accent colour for the current state. LONG lives glow green,
// SHORT lives glow red, lining-up is amber, watching is muted.
function stageColor(stage: Stage, dir: TradeSignal["direction"] | undefined): string {
  if (stage === "live") return dir === "SHORT" ? "var(--color-destructive)" : "var(--color-chart-3)"
  if (stage === "lining-up") return "var(--color-chart-4)"
  return "var(--color-muted-foreground)"
}

const STAGE_LABEL: Record<Stage, string> = {
  watching: "Watching",
  "lining-up": "Lining up",
  live: "Signal live",
}

// ---------------------------------------------------------------------------
// The chart — the hero of the card. Plots the recent price line, tinted by the
// live state, and overlays the strategy's entry band, stop and first target as
// dashed reference lines the moment a setup fires so you can see the plan on
// the chart itself.
// ---------------------------------------------------------------------------
function LiveChart({
  series,
  stage,
  signal,
  color,
}: {
  series: SeriesPoint[]
  stage: Stage
  signal: TradeSignal | undefined
  color: string
}) {
  const W = 600
  const H = 200
  const PAD = 6

  const closes = series.map((p) => p.c)
  const live = stage === "live" && signal
  // When a setup is live, fold the plan levels into the vertical domain so the
  // dashed entry/stop/target lines are always visible on the chart.
  const domainVals = [...closes]
  if (live && signal) {
    domainVals.push(signal.entry.low, signal.entry.high, signal.stopLoss)
    if (signal.targets[0]) domainVals.push(signal.targets[0].price)
  }
  const min = Math.min(...domainVals)
  const max = Math.max(...domainVals)
  const range = max - min || 1
  const x = (i: number) => PAD + (i / (closes.length - 1)) * (W - PAD * 2)
  const y = (v: number) => PAD + (1 - (v - min) / range) * (H - PAD * 2)

  const linePts = closes.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")
  const areaPts = `${PAD},${H - PAD} ${linePts} ${(W - PAD).toFixed(1)},${H - PAD}`
  const lastX = x(closes.length - 1)
  const lastY = y(closes[closes.length - 1])
  const gid = `deskgrad-${stage}-${signal?.direction ?? "n"}`

  const levelLine = (v: number, stroke: string, label: string, dashed = true) => {
    const yy = y(v)
    // Keep the label inside the chart: below the line if it's near the top edge,
    // above it otherwise, so the topmost/bottommost levels never clip.
    const labelY = yy < 16 ? yy + 12 : yy - 3
    return (
      <g>
        <line
          x1={PAD}
          x2={W - PAD}
          y1={yy}
          y2={yy}
          stroke={stroke}
          strokeWidth={1.25}
          strokeDasharray={dashed ? "5 4" : undefined}
          opacity={0.9}
        />
        <text x={PAD + 3} y={labelY} fontSize={11} fill={stroke} className="font-medium tabular-nums">
          {label}
        </text>
      </g>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-32 w-full sm:h-36"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Live price chart, ${STAGE_LABEL[stage].toLowerCase()}`}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* price area + line */}
      <polygon points={areaPts} fill={`url(#${gid})`} stroke="none" />
      <polyline
        points={linePts}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* plan overlays once a setup is live */}
      {live && signal && (
        <>
          {/* entry band */}
          <rect
            x={PAD}
            width={W - PAD * 2}
            y={Math.min(y(signal.entry.high), y(signal.entry.low))}
            height={Math.abs(y(signal.entry.low) - y(signal.entry.high)) || 1}
            fill={color}
            opacity={0.1}
          />
          {levelLine(signal.stopLoss, "var(--color-destructive)", `Stop ${formatPrice(signal.stopLoss)}`)}
          {signal.targets[0] &&
            levelLine(signal.targets[0].price, "var(--color-chart-3)", `Target ${formatPrice(signal.targets[0].price)}`)}
          {levelLine(signal.entry.high, color, `Entry ${formatPrice(signal.entry.high)}`)}
        </>
      )}

      {/* current price marker */}
      <circle cx={lastX} cy={lastY} r={3.5} fill={color} vectorEffect="non-scaling-stroke" />
      {stage !== "watching" && <circle cx={lastX} cy={lastY} r={7} fill={color} opacity={0.25}>
        <animate attributeName="r" values="4;9;4" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.35;0;0.35" dur="1.8s" repeatCount="indefinite" />
      </circle>}
    </svg>
  )
}

function ChartSkeleton() {
  return <div className="h-32 w-full animate-pulse bg-secondary/50 sm:h-36" aria-hidden />
}

export function DeskSignalPath({
  coinId,
  timeframe,
  assetName,
}: {
  coinId: string
  timeframe: "swing" | "position"
  assetName: string
}) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(["signal", coinId, timeframe], fetchSignal, {
    // Feels live without hammering the model: re-check on an interval and on focus.
    refreshInterval: 90_000,
    revalidateOnFocus: true,
    dedupingInterval: 30_000,
    keepPreviousData: true,
    shouldRetryOnError: false,
  })

  const stage = deriveStage(data)
  const isLive = stage === "live"
  const dir = data?.signal.direction
  const color = stageColor(stage, dir)
  const series = data?.series ?? []

  return (
    <div
      className={cn(
        "border-t border-border transition-colors",
        isLive && "bg-chart-3/5",
        isLive && dir === "SHORT" && "bg-destructive/5",
        stage === "lining-up" && "bg-chart-4/5",
      )}
    >
      {/* Header row: what the Clerk is doing right now */}
      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="relative flex size-2.5 shrink-0">
            <span
              className={cn(
                "absolute inline-flex size-full rounded-full opacity-75",
                stage !== "watching" ? "animate-ping" : "",
              )}
              style={{ backgroundColor: stage !== "watching" ? color : "transparent" }}
            />
            <span
              className="relative inline-flex size-2.5 rounded-full"
              style={{ backgroundColor: stage === "watching" ? "var(--color-muted-foreground)" : color }}
            />
          </span>
          <p className="truncate text-xs font-semibold" style={{ color }}>
            {isLoading && !data ? "Clerk is checking the market…" : `Clerk · ${STAGE_LABEL[stage]}`}
          </p>
        </div>
        <button
          onClick={() => mutate()}
          aria-label="Re-check now"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
        >
          {isValidating ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
        </button>
      </div>

      {/* The chart — the main feature. Colours shift with the live state. */}
      <div className="mt-2">
        {error ? (
          <div className="flex h-32 items-center justify-center px-4 sm:h-36">
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              Couldn&apos;t reach the market just now.
              <br />
              The Clerk will keep trying.
            </p>
          </div>
        ) : series.length >= 2 ? (
          <LiveChart series={series} stage={stage} signal={data?.signal} color={color} />
        ) : (
          <ChartSkeleton />
        )}
      </div>

      {/* Payload row: the Clerk's message for the current state */}
      <div className="px-4 pb-3 pt-1">
        {isLive && data ? (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "flex items-start gap-2 rounded-lg border px-3 py-2.5",
              dir === "SHORT"
                ? "border-destructive/30 bg-destructive/10"
                : "border-chart-3/30 bg-chart-3/10",
            )}
          >
            <BellRing className="mt-0.5 size-4 shrink-0" style={{ color }} />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color }}>
                {dir === "LONG" ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                {dir} setup is live on {assetName}
                <span className="font-normal text-muted-foreground">· {data.signal.confidence}% conviction</span>
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{data.signal.summary}</p>
            </div>
          </div>
        ) : stage === "lining-up" && data ? (
          <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-chart-4">
            <Radio className="size-3.5 shrink-0" />
            Conditions are lining up ({data.signal.confidence}% conviction). The Clerk alerts you the moment it crosses
            the line.
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <Compass className="size-3.5 shrink-0 text-primary" />
            Your Clerk is watching {assetName}. Nothing to do until the chart lights up.
          </p>
        )}
      </div>
    </div>
  )
}
