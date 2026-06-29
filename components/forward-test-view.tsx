"use client"

import useSWR from "swr"
import { cn } from "@/lib/utils"
import { TIMEFRAMES, type Timeframe } from "@/lib/timeframe"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type LaneStats = {
  assetId: string
  ticker: string
  timeframe: Timeframe
  total: number
  open: number
  wins: number
  losses: number
  expired: number
  winRate: number | null
  expectancy: number | null
}

type ForwardSignal = {
  id: number
  ticker: string
  timeframe: Timeframe
  direction: "LONG" | "SHORT"
  confidence: number
  entry: number
  status: "open" | "win" | "loss" | "expired"
  realized_r: number | null
  opened_at: string
}

type StatsResponse = { lanes: LaneStats[]; recent: ForwardSignal[]; error?: string }

// A lane needs this many DECIDED trades before its win rate is trustworthy.
const RELIABLE_SAMPLE = 20

function fmtPrice(n: number) {
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
  if (n >= 1) return n.toFixed(2)
  return n.toPrecision(4)
}

function statusColor(status: ForwardSignal["status"]) {
  switch (status) {
    case "win":
      return "text-chart-3"
    case "loss":
      return "text-destructive"
    case "expired":
      return "text-muted-foreground"
    default:
      return "text-foreground"
  }
}

export function ForwardTestView() {
  const { data, isLoading } = useSWR<StatsResponse>("/api/forward-test", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  })

  const lanes = data?.lanes ?? []
  const recent = data?.recent ?? []

  // Portfolio-wide totals across every lane.
  const totals = lanes.reduce(
    (acc, l) => {
      acc.wins += l.wins
      acc.losses += l.losses
      acc.expired += l.expired
      acc.open += l.open
      acc.resolved += l.total
      if (l.expectancy != null) {
        acc.rSum += l.expectancy * l.total
        acc.rCount += l.total
      }
      return acc
    },
    { wins: 0, losses: 0, expired: 0, open: 0, resolved: 0, rSum: 0, rCount: 0 },
  )
  const decided = totals.wins + totals.losses
  const overallWin = decided > 0 ? (totals.wins / decided) * 100 : null
  const overallExp = totals.rCount > 0 ? totals.rSum / totals.rCount : null

  if (isLoading) {
    return <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading live track record…</div>
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Honest framing */}
      <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
        Every LONG/SHORT signal is logged the moment it fires, then scored against real price — target hit before stop is
        a win, stop first is a loss, neither by expiry exits at market. These are <span className="text-foreground">forward-tested</span> results
        (no hindsight), so they accumulate over time. Lanes with fewer than {RELIABLE_SAMPLE} decided trades are flagged as
        low-confidence.
      </div>

      {/* Portfolio summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Decided trades" value={decided.toString()} sub={`${totals.open} open`} />
        <Stat
          label="Win rate"
          value={overallWin != null ? `${overallWin.toFixed(0)}%` : "—"}
          sub={decided < RELIABLE_SAMPLE ? "low sample" : "across all lanes"}
          tone={overallWin == null ? "muted" : overallWin >= 50 ? "good" : "bad"}
        />
        <Stat
          label="Expectancy"
          value={overallExp != null ? `${overallExp >= 0 ? "+" : ""}${overallExp.toFixed(2)}R` : "—"}
          sub="avg per trade"
          tone={overallExp == null ? "muted" : overallExp >= 0 ? "good" : "bad"}
        />
        <Stat label="Resolved" value={totals.resolved.toString()} sub={`${totals.expired} expired`} />
      </div>

      {/* Per-lane breakdown */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-12 gap-2 border-b border-border bg-secondary/40 px-4 py-2.5 text-xs font-medium text-muted-foreground">
          <div className="col-span-4">Lane</div>
          <div className="col-span-2 text-right">Win rate</div>
          <div className="col-span-2 text-right">Expect.</div>
          <div className="col-span-2 text-right">Decided</div>
          <div className="col-span-2 text-right">Open</div>
        </div>
        {lanes.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No signals logged yet. The tracker records new signals automatically as they fire — check back as trades
            accumulate.
          </div>
        ) : (
          lanes.map((l) => {
            const laneDecided = l.wins + l.losses
            const lowSample = laneDecided < RELIABLE_SAMPLE
            return (
              <div
                key={`${l.assetId}-${l.timeframe}`}
                className="grid grid-cols-12 items-center gap-2 border-b border-border px-4 py-3 text-sm last:border-0"
              >
                <div className="col-span-4">
                  <div className="font-medium">{l.ticker}</div>
                  <div className="text-xs capitalize text-muted-foreground">{TIMEFRAMES[l.timeframe].label}</div>
                </div>
                <div className="col-span-2 text-right tabular-nums">
                  {l.winRate != null ? (
                    <span className={l.winRate >= 50 ? "text-chart-3" : "text-destructive"}>
                      {l.winRate.toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                <div className="col-span-2 text-right tabular-nums">
                  {l.expectancy != null ? (
                    <span className={l.expectancy >= 0 ? "text-chart-3" : "text-destructive"}>
                      {l.expectancy >= 0 ? "+" : ""}
                      {l.expectancy.toFixed(2)}R
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                <div className="col-span-2 text-right tabular-nums">
                  <span className={cn(lowSample && laneDecided > 0 && "text-chart-5")}>{laneDecided}</span>
                  {lowSample && laneDecided > 0 && <span className="ml-1 text-xs text-chart-5">low</span>}
                </div>
                <div className="col-span-2 text-right tabular-nums text-muted-foreground">{l.open}</div>
              </div>
            )
          })
        )}
      </div>

      {/* Recent signals log */}
      <div>
        <h2 className="mb-2 px-1 text-sm font-semibold">Recent logged signals</h2>
        <div className="overflow-hidden rounded-xl border border-border">
          {recent.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing logged yet.</div>
          ) : (
            recent.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 border-b border-border px-4 py-2.5 text-sm last:border-0"
              >
                <span
                  className={cn(
                    "inline-flex w-14 justify-center rounded-md px-2 py-0.5 text-xs font-semibold",
                    s.direction === "LONG" ? "bg-chart-3/15 text-chart-3" : "bg-destructive/15 text-destructive",
                  )}
                >
                  {s.direction}
                </span>
                <span className="font-medium">{s.ticker}</span>
                <span className="text-xs capitalize text-muted-foreground">{TIMEFRAMES[s.timeframe].label}</span>
                <span className="ml-auto text-xs text-muted-foreground">{fmtPrice(s.entry)}</span>
                <span className={cn("w-16 text-right text-xs font-medium capitalize", statusColor(s.status))}>
                  {s.status === "open"
                    ? "open"
                    : `${s.status}${s.realized_r != null ? ` ${s.realized_r >= 0 ? "+" : ""}${s.realized_r.toFixed(1)}R` : ""}`}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  tone = "muted",
}: {
  label: string
  value: string
  sub?: string
  tone?: "good" | "bad" | "muted"
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          tone === "good" && "text-chart-3",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}
