"use client"

import useSWR from "swr"
import { Compass, Loader2, BellRing, ArrowUpRight, ArrowDownRight, Radio, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TradeSignal } from "@/lib/signal"

type SignalResponse = {
  signal: TradeSignal
  mode: "ai" | "indicator"
  passesFloor: boolean
  confidenceFloor: number
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

const STAGE_META: Record<Stage, { index: number; label: string; tone: string; track: string }> = {
  watching: { index: 0, label: "Watching", tone: "text-muted-foreground", track: "bg-muted-foreground/40" },
  "lining-up": { index: 1, label: "Lining up", tone: "text-chart-4", track: "bg-chart-4" },
  live: { index: 2, label: "Signal live", tone: "text-chart-3", track: "bg-chart-3" },
}

const STEPS: { key: Stage; label: string }[] = [
  { key: "watching", label: "Watching" },
  { key: "lining-up", label: "Lining up" },
  { key: "live", label: "Signal live" },
]

export function DeskSignalPath({
  coinId,
  timeframe,
  assetName,
}: {
  coinId: string
  timeframe: "swing" | "position"
  assetName: string
}) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    ["signal", coinId, timeframe],
    fetchSignal,
    {
      // Feels live without hammering the model: re-check on an interval and on focus.
      refreshInterval: 90_000,
      revalidateOnFocus: true,
      dedupingInterval: 30_000,
      keepPreviousData: true,
      shouldRetryOnError: false,
    },
  )

  const stage = deriveStage(data)
  const meta = STAGE_META[stage]
  const activeIndex = meta.index
  const isLive = stage === "live"
  const dir = data?.signal.direction

  return (
    <div
      className={cn(
        "border-t border-border transition-colors",
        isLive && "bg-chart-3/5",
        stage === "lining-up" && "bg-chart-4/5",
      )}
    >
      {/* Header row: what the Clerk is doing right now */}
      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex size-2.5 shrink-0">
            <span
              className={cn(
                "absolute inline-flex size-full rounded-full opacity-75",
                isLive ? "animate-ping bg-chart-3" : stage === "lining-up" ? "animate-ping bg-chart-4" : "bg-transparent",
              )}
            />
            <span
              className={cn(
                "relative inline-flex size-2.5 rounded-full",
                isLive ? "bg-chart-3" : stage === "lining-up" ? "bg-chart-4" : "bg-muted-foreground/50",
              )}
            />
          </span>
          <p className={cn("truncate text-xs font-semibold", meta.tone)}>
            {isLoading && !data ? "Clerk is checking the market…" : `Clerk · ${meta.label}`}
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

      {/* The path: three stops the setup moves through, colouring as it advances */}
      <div className="px-4 py-3" role="group" aria-label="Signal path">
        <div className="flex items-center">
          {STEPS.map((step, i) => {
            const reached = i <= activeIndex
            const isCurrent = i === activeIndex
            return (
              <div key={step.key} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <span
                    className={cn(
                      "flex size-3 items-center justify-center rounded-full transition-colors",
                      reached ? meta.track : "bg-border",
                      isCurrent && "ring-4 ring-offset-0",
                      isCurrent && isLive && "ring-chart-3/25",
                      isCurrent && stage === "lining-up" && "ring-chart-4/25",
                      isCurrent && stage === "watching" && "ring-muted-foreground/15",
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-medium whitespace-nowrap",
                      reached ? meta.tone : "text-muted-foreground/50",
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="mx-1 h-0.5 flex-1 rounded-full bg-border -mt-4">
                    <div
                      className={cn("h-full rounded-full transition-all", i < activeIndex ? meta.track : "w-0")}
                      style={{ width: i < activeIndex ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Payload row: the Clerk's message for the current state */}
      <div className="px-4 pb-3">
        {error ? (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Couldn&apos;t reach the market just now. The Clerk will keep trying.
          </p>
        ) : isLive && data ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-2 rounded-lg border border-chart-3/30 bg-chart-3/10 px-3 py-2.5"
          >
            <BellRing className="mt-0.5 size-4 shrink-0 text-chart-3" />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-chart-3">
                {dir === "LONG" ? (
                  <ArrowUpRight className="size-3.5" />
                ) : (
                  <ArrowDownRight className="size-3.5" />
                )}
                {dir} setup is live on {assetName}
                <span className="font-normal text-muted-foreground">· {data.signal.confidence}% conviction</span>
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{data.signal.summary}</p>
              <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                Entry ${data.signal.entry.low.toLocaleString()} – ${data.signal.entry.high.toLocaleString()} · Stop $
                {data.signal.stopLoss.toLocaleString()}
              </p>
            </div>
          </div>
        ) : stage === "lining-up" && data ? (
          <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-chart-4">
            <Radio className="size-3.5 shrink-0" />
            Conditions are starting to line up ({data.signal.confidence}% conviction). The Clerk will alert you the
            moment it crosses the line.
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <Compass className="size-3.5 shrink-0 text-primary" />
            Your Clerk is watching {assetName} for your conditions to line up. Nothing to do until it alerts.
          </p>
        )}
      </div>
    </div>
  )
}
