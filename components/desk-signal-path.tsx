"use client"

import useSWR from "swr"
import Link from "next/link"
import { Compass, Loader2, BellRing, ArrowUpRight, ArrowDownRight, Radio, RefreshCw, PauseCircle, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

type SeriesPoint = { t: number; c: number }

// The assigned strategy's OWN trade plan, returned by the live engine only when
// a qualifying entry has actually fired. When there is no setup, this is null
// and the chart draws no levels — nothing is invented.
type LivePlan = {
  direction: "LONG" | "SHORT"
  entry: number
  stopLoss: number
  target: number
}

// The honest two-part read from /api/playbook-live: it runs the SAME logic that
// produced the strategy's proven track record — never an AI/generic signal.
type LiveResponse = {
  bias: "BULL" | "BEAR" | "NEUTRAL"
  entry: "QUALIFIED" | "DEVELOPING" | "STAND_ASIDE"
  enoughData: boolean
  asOf: number | null
  isCrypto?: boolean
  series: SeriesPoint[]
  plan: LivePlan | null
}

// POST the assigned strategy id + market + timeframe to the strategy's own live
// engine. This is the whole point of the honest Desk: what we monitor is the
// exact strategy whose name and track record sit on this card.
async function fetchLive([, strategyId, symbol, timeframe]: [string, string, string, string]): Promise<LiveResponse> {
  const res = await fetch("/api/playbook-live", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ strategyId, symbol, timeframe }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? "Live read unavailable")
  }
  return res.json()
}

type Stage = "watching" | "lining-up" | "live"

// Stage is derived DIRECTLY from the strategy's own entry status — no
// confidence thresholds or model conviction involved.
//   QUALIFIED  -> live      (the entry trigger has fired right now)
//   DEVELOPING -> lining-up (favored direction, trigger not yet met)
//   else       -> watching  (nothing to act on)
function deriveStage(data: LiveResponse | undefined): Stage {
  if (!data || !data.enoughData) return "watching"
  if (data.entry === "QUALIFIED") return "live"
  if (data.entry === "DEVELOPING") return "lining-up"
  return "watching"
}

// Resolve the accent colour for the current state. A live BULL setup glows
// green, a live BEAR setup glows red, lining-up is amber, watching is muted.
function stageColor(stage: Stage, bias: LiveResponse["bias"] | undefined): string {
  if (stage === "live") return bias === "BEAR" ? "var(--color-destructive)" : "var(--color-chart-3)"
  if (stage === "lining-up") return "var(--color-chart-4)"
  return "var(--color-muted-foreground)"
}

const STAGE_LABEL: Record<Stage, string> = {
  watching: "Watching",
  "lining-up": "Lining up",
  live: "Signal live",
}

// Smooth a set of [x,y] points into an SVG path `d` string using a
// Catmull-Rom spline converted to cubic beziers. This is what gives the
// SightLine Path its flowing, deliberate line rather than a jagged price plot.
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ""
  if (pts.length === 2) return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return d
}

// Round-number price ticks for the axis, so the gutter reads like a real
// trading HUD (…, 536, 538, 540, …) instead of arbitrary values.
function niceTicks(min: number, max: number, count = 5): number[] {
  const range = max - min || 1
  const raw = range / count
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag
  const start = Math.ceil(min / step) * step
  const ticks: number[] = []
  for (let v = start; v <= max + 1e-9; v += step) ticks.push(Number(v.toFixed(6)))
  return ticks
}

const fmtLevel = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtAxis = (v: number) => (Math.abs(v) >= 100 ? Math.round(v).toLocaleString() : v.toFixed(2))

// A named horizontal level with its own colour + style. The Path travels
// through these: entry (green), target (gold) and invalidation (red floor).
// Every level here comes from the strategy's real plan — never fabricated.
type Level = { key: string; label: string; value: number; color: string; style: "solid" | "dashed"; star?: boolean }

const PILL_LABEL: Record<Stage, string> = {
  watching: "WATCHING",
  "lining-up": "APPROACHING",
  live: "ENTRY ALIGNED",
}

// ---------------------------------------------------------------------------
// The SightLine Path — the one and only chart on the card. Rendered as a
// terminal-style HUD: a glowing path that starts as grey history and turns
// live-state colour (green LONG / red SHORT / amber approaching) as it climbs,
// with a bright travelling tip marking NOW, a price axis down the right, and
// OPEN/MID/NOW along the bottom. Named levels appear ONLY when the assigned
// strategy has an actual qualifying setup (plan != null).
// ---------------------------------------------------------------------------
function SightLinePathChart({
  series,
  stage,
  plan,
  color,
}: {
  series: SeriesPoint[]
  stage: Stage
  plan: LivePlan | null
  color: string
}) {
  const W = 600
  const H = 220
  const PLOT_R = 0.85 // reserve the right gutter for the price axis
  const plotW = W * PLOT_R
  const padY = 14

  const closes = series.map((p) => p.c)
  const dir = plan?.direction
  const active = stage !== "watching"

  // Named levels straight off the strategy's own plan. No plan -> no levels.
  const levels: Level[] = []
  if (plan) {
    levels.push({ key: "target", label: "TARGET", value: plan.target, color: "var(--color-chart-4)", style: "dashed", star: true })
    levels.push({ key: "entry", label: "ENTRY", value: plan.entry, color: "var(--color-chart-3)", style: "dashed" })
    levels.push({ key: "inval", label: "INVALIDATION", value: plan.stopLoss, color: "var(--color-destructive)", style: "dashed" })
  }

  // Vertical domain covers the price series and every level, padded so nothing
  // sits flush against an edge.
  const domainVals = [...closes, ...levels.map((l) => l.value)]
  let min = Math.min(...domainVals)
  let max = Math.max(...domainVals)
  const rawRange = max - min || 1
  min -= rawRange * 0.08
  max += rawRange * 0.08
  const range = max - min || 1

  const x = (i: number) => (i / Math.max(1, closes.length - 1)) * plotW
  const y = (v: number) => padY + (1 - (v - min) / range) * (H - padY * 2)
  const pct = (n: number, total: number) => `${((n / total) * 100).toFixed(2)}%`

  const pts = closes.map((v, i) => ({ x: x(i), y: y(v) }))
  // Split the Path into settled history (grey) and the live leg (state colour).
  const splitIdx = Math.max(1, Math.floor(pts.length * 0.55))
  const historyD = smoothPath(pts.slice(0, splitIdx + 1))
  const activeD = smoothPath(pts.slice(splitIdx))

  const tipX = x(closes.length - 1)
  const tipY = y(closes[closes.length - 1])
  const uid = `${stage}-${dir ?? "n"}`
  const glowId = `pathglow-${uid}`
  const areaId = `patharea-${uid}`

  const entryLevel = levels.find((l) => l.key === "entry")
  const targetLevel = levels.find((l) => l.key === "target")
  const ticks = niceTicks(min + range * 0.05, max - range * 0.05, 5)

  return (
    <div className="relative h-44 w-full overflow-hidden bg-[oklch(0.16_0.01_260)] font-mono sm:h-52">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`SightLine Path, ${STAGE_LABEL[stage].toLowerCase()}`}
      >
        <defs>
          <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          <filter id={glowId} x="-30%" y="-60%" width="160%" height="220%">
            <feGaussianBlur stdDeviation={active ? 4 : 2} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* faint price gridlines */}
        {ticks.map((v) => (
          <line key={`g${v}`} x1={0} x2={plotW} y1={y(v)} y2={y(v)} stroke="var(--color-border)" strokeWidth={1} opacity={0.4} />
        ))}

        {/* target zone (entry -> target) tinted green, invalidation floor tinted red */}
        {entryLevel && targetLevel && (
          <rect
            x={0}
            width={plotW}
            y={Math.min(y(targetLevel.value), y(entryLevel.value))}
            height={Math.abs(y(entryLevel.value) - y(targetLevel.value)) || 1}
            fill="var(--color-chart-3)"
            opacity={0.06}
          />
        )}
        {plan && (
          <rect x={0} width={plotW} y={y(plan.stopLoss)} height={Math.max(0, H - padY - y(plan.stopLoss))} fill="var(--color-destructive)" opacity={0.06} />
        )}

        {/* named level lines */}
        {levels.map((l) => (
          <line
            key={l.key}
            x1={0}
            x2={plotW}
            y1={y(l.value)}
            y2={y(l.value)}
            stroke={l.color}
            strokeWidth={l.style === "solid" ? 2 : 1.4}
            strokeDasharray={l.style === "dashed" ? "6 5" : undefined}
            opacity={0.95}
          />
        ))}

        {/* area under the Path */}
        {historyD && (
          <path
            d={`${smoothPath(pts)} L ${plotW.toFixed(1)},${(H - padY).toFixed(1)} L 0,${(H - padY).toFixed(1)} Z`}
            fill={`url(#${areaId})`}
            stroke="none"
          />
        )}

        {/* settled history (grey) */}
        <path d={historyD} fill="none" stroke="var(--color-muted-foreground)" strokeOpacity={0.55} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {/* live leg (state colour, glowing) */}
        <path d={activeD} fill="none" stroke={color} strokeWidth={active ? 4 : 3} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" filter={`url(#${glowId})`} />

        {/* travelling tip = NOW */}
        {active && (
          <circle cx={tipX} cy={tipY} r={11} fill={color} opacity={0.3}>
            <animate attributeName="r" values="6;14;6" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0;0.4" dur="1.8s" repeatCount="indefinite" />
          </circle>
        )}
        <circle cx={tipX} cy={tipY} r={8} fill={color} opacity={0.35} filter={`url(#${glowId})`} />
        <circle cx={tipX} cy={tipY} r={4.5} fill="var(--color-foreground)" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* ---- HTML overlay: crisp monospace labels (SVG text would stretch) ---- */}
      <div className="pointer-events-none absolute inset-0">
        {/* price axis */}
        {ticks.map((v) => (
          <span
            key={`t${v}`}
            className="absolute right-1 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
            style={{ top: pct(y(v), H) }}
          >
            {fmtAxis(v)}
          </span>
        ))}

        {/* named level chips */}
        {levels.map((l) => (
          <span
            key={`c${l.key}`}
            className="absolute left-1 -translate-y-1/2 whitespace-nowrap rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide tabular-nums backdrop-blur-sm"
            style={{ top: pct(y(l.value), H), color: l.color }}
          >
            {l.star ? "★ " : ""}
            {l.label} {fmtLevel(l.value)}
          </span>
        ))}

        {/* state pill near the tip */}
        <span
          className="absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{
            left: `min(${pct(tipX, W)}, 74%)`,
            top: `calc(${pct(tipY, H)} - 8px)`,
            color,
            borderColor: color,
            backgroundColor: "oklch(0.16 0.01 260 / 0.85)",
          }}
        >
          <span className="mr-1 inline-block size-1.5 rounded-full align-middle" style={{ backgroundColor: color }} />
          {PILL_LABEL[stage]}
        </span>

        {/* time axis */}
        <span className="absolute bottom-1 left-1 text-[9px] uppercase tracking-widest text-muted-foreground">Open</span>
        <span className="absolute bottom-1 left-[42%] text-[9px] uppercase tracking-widest text-muted-foreground">Mid</span>
        <span
          className="absolute bottom-1 -translate-x-1/2 text-[9px] font-semibold uppercase tracking-widest"
          style={{ left: pct(tipX, W), color }}
        >
          Now
        </span>
      </div>
    </div>
  )
}

function ChartSkeleton() {
  return <div className="h-44 w-full animate-pulse bg-secondary/50 sm:h-52" aria-hidden />
}

// Compact relative timestamp for "last update" (e.g. "just now", "3m ago").
function formatUpdatedAt(ms: number | null): string {
  if (ms == null || Number.isNaN(ms)) return ""
  const diff = Date.now() - ms
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const BIAS_WORD: Record<LiveResponse["bias"], string> = {
  BULL: "bullish",
  BEAR: "bearish",
  NEUTRAL: "neutral",
}

export function DeskSignalPath({
  strategyId,
  symbol,
  timeframe,
  assetName,
  frozen = false,
}: {
  strategyId: string
  symbol: string
  timeframe: "intraday" | "swing" | "position"
  assetName: string
  frozen?: boolean
}) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    ["playbook-live", strategyId, symbol, timeframe],
    fetchLive,
    {
      // Feels live without hammering the data source: re-check on an interval and
      // on focus. When the account is frozen we stop polling entirely — the last
      // known Path stays on screen, but no new updates are fetched.
      refreshInterval: frozen ? 0 : 90_000,
      revalidateOnFocus: !frozen,
      revalidateIfStale: !frozen,
      dedupingInterval: 30_000,
      keepPreviousData: true,
      shouldRetryOnError: false,
    },
  )

  const stage = deriveStage(data)
  const isLive = stage === "live"
  const bias = data?.bias
  const plan = data?.plan ?? null
  const color = stageColor(stage, bias)
  const series = data?.series ?? []
  const lastUpdated = data?.asOf ? formatUpdatedAt(data.asOf) : null

  return (
    <div
      className={cn(
        "border-t border-border transition-colors",
        !frozen && isLive && "bg-chart-3/5",
        !frozen && isLive && bias === "BEAR" && "bg-destructive/5",
        !frozen && stage === "lining-up" && "bg-chart-4/5",
      )}
    >
      {/* Header row: what the Clerk is doing right now */}
      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        {frozen ? (
          <div className="flex min-w-0 items-center gap-2">
            <PauseCircle className="size-3.5 shrink-0 text-muted-foreground" />
            <p className="truncate text-xs font-semibold text-muted-foreground">Updates Paused</p>
          </div>
        ) : (
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
        )}
        <div className="flex shrink-0 items-center gap-2">
          {lastUpdated && (
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {frozen ? "Last update" : "Updated"} {lastUpdated}
            </span>
          )}
          {!frozen && (
            <button
              onClick={() => mutate()}
              aria-label="Re-check now"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            >
              {isValidating ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            </button>
          )}
        </div>
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
          <SightLinePathChart series={series} stage={stage} plan={plan} color={color} />
        ) : (
          <ChartSkeleton />
        )}
      </div>

      {/* Payload row: the Clerk's message for the current state */}
      <div className="px-4 pb-3 pt-1">
        {frozen ? (
          <div
            role="status"
            className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2.5"
          >
            <div className="flex items-start gap-2">
              <PauseCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                I&apos;m no longer monitoring this market. Upgrade your plan to resume live Path updates and alerts.
              </p>
            </div>
            <Link
              href="/plan"
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Upgrade <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : isLive && plan ? (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "flex items-start gap-2 rounded-lg border px-3 py-2.5",
              plan.direction === "SHORT"
                ? "border-destructive/30 bg-destructive/10"
                : "border-chart-3/30 bg-chart-3/10",
            )}
          >
            <BellRing className="mt-0.5 size-4 shrink-0" style={{ color }} />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-semibold" style={{ color }}>
                {plan.direction === "LONG" ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                {plan.direction} setup is live on {assetName}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground tabular-nums">
                Entry ~{fmtLevel(plan.entry)} · stop {fmtLevel(plan.stopLoss)} · target {fmtLevel(plan.target)}. These
                are your strategy&apos;s own rules firing right now.
              </p>
            </div>
          </div>
        ) : stage === "lining-up" && bias ? (
          <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-chart-4">
            <Radio className="size-3.5 shrink-0" />
            Conditions are lining up ({BIAS_WORD[bias]}), but your strategy&apos;s entry trigger hasn&apos;t fired yet.
            The Clerk alerts you the moment it does.
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <Compass className="size-3.5 shrink-0 text-primary" />
            Your Clerk is watching {assetName}. No qualifying setup right now — nothing to do until the chart lights up.
          </p>
        )}
      </div>
    </div>
  )
}
