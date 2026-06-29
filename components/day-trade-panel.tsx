"use client"

import { useMemo, useState } from "react"
import { Clock, Gauge, TrendingUp, AlertTriangle, Calculator, ShieldCheck, ShieldAlert } from "lucide-react"
import type { SignalResponse } from "@/components/signal-view"
import { formatPrice } from "@/lib/format"
import { positionSize } from "@/lib/risk"
import { cn } from "@/lib/utils"

export function DayTradePanel({ data }: { data: SignalResponse }) {
  const intr = data.indicators.intraday
  const session = data.session
  const signal = data.signal
  const floor = data.confidenceFloor ?? 60
  const passes = data.passesFloor ?? false

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4" aria-label="Day trade tools">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-chart-3/15 text-chart-3">
            <TrendingUp className="size-4" />
          </span>
          <h2 className="text-sm font-semibold">Day Trade tools</h2>
        </div>
        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
          {data.timeframe === "intraday5m" ? "5-minute" : "15-minute"}
        </span>
      </div>

      {/* Session clock + no-trade warning */}
      {session && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-background/50 p-3">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="size-4 text-muted-foreground" />
            <span className="font-medium">{session.phaseLabel}</span>
          </div>
          {session.noTrade.blocked && session.noTrade.reason && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>{session.noTrade.reason}</span>
            </div>
          )}
        </div>
      )}

      {/* Confidence floor gate */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border p-3",
          passes ? "border-chart-2/40 bg-chart-2/10" : "border-border bg-background/50",
        )}
      >
        {passes ? (
          <ShieldCheck className="size-5 shrink-0 text-chart-2" />
        ) : (
          <ShieldAlert className="size-5 shrink-0 text-muted-foreground" />
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {passes ? "Clears alert confidence floor" : "Below alert confidence floor"}
          </span>
          <span className="text-xs text-muted-foreground">
            Confidence {signal.confidence}% vs {floor}% minimum.{" "}
            {passes ? "This setup would alert." : "Alerts are suppressed for this signal."}
          </span>
        </div>
      </div>

      {/* Intraday levels */}
      <div className="grid grid-cols-2 gap-2">
        <LevelCard
          label="Session VWAP"
          value={intr?.vwap ? formatPrice(intr.vwap.vwap) : "—"}
          sub={
            intr?.vwap
              ? `bands ${formatPrice(intr.vwap.lower)} / ${formatPrice(intr.vwap.upper)}`
              : "volume unavailable"
          }
        />
        <LevelCard
          label="Relative volume"
          value={intr?.rvol != null ? `${intr.rvol.toFixed(2)}x` : "—"}
          sub={
            intr?.rvol == null
              ? "no volume feed"
              : intr.rvol >= 1.2
                ? "active tape"
                : intr.rvol < 0.9
                  ? "thin — caution"
                  : "normal"
          }
          tone={intr?.rvol != null ? (intr.rvol >= 1.2 ? "good" : intr.rvol < 0.9 ? "warn" : "neutral") : "neutral"}
        />
        <LevelCard
          label="Opening range high"
          value={intr?.openingRange ? formatPrice(intr.openingRange.high) : "—"}
          sub={intr?.openingRange ? "first 30 min" : "not formed yet"}
        />
        <LevelCard
          label="Opening range low"
          value={intr?.openingRange ? formatPrice(intr.openingRange.low) : "—"}
          sub={intr?.openingRange ? "first 30 min" : "not formed yet"}
        />
      </div>

      <PositionSizer entry={(signal.entry.low + signal.entry.high) / 2} stop={signal.stopLoss} />
    </section>
  )
}

function LevelCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string
  value: string
  sub: string
  tone?: "good" | "warn" | "neutral"
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-background/50 p-3">
      <span className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Gauge className="size-3" /> {label}
      </span>
      <span className="font-mono text-sm font-semibold tabular-nums">{value}</span>
      <span
        className={cn(
          "text-[11px]",
          tone === "good" ? "text-chart-2" : tone === "warn" ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {sub}
      </span>
    </div>
  )
}

function PositionSizer({ entry, stop }: { entry: number; stop: number }) {
  const [account, setAccount] = useState(25000)
  const [riskPct, setRiskPct] = useState(1)

  const result = useMemo(
    () => positionSize({ accountSize: account, riskPct, entry, stop }),
    [account, riskPct, entry, stop],
  )

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background/50 p-3">
      <div className="flex items-center gap-2">
        <Calculator className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Position size calculator</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Account size ($)
          <input
            type="number"
            inputMode="decimal"
            value={account}
            min={0}
            onChange={(e) => setAccount(Math.max(0, Number(e.target.value)))}
            className="h-11 rounded-md border border-border bg-background px-3 text-base text-foreground outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Risk per trade (%)
          <input
            type="number"
            inputMode="decimal"
            value={riskPct}
            min={0}
            step={0.25}
            onChange={(e) => setRiskPct(Math.max(0, Number(e.target.value)))}
            className="h-11 rounded-md border border-border bg-background px-3 text-base text-foreground outline-none focus:border-primary"
          />
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Shares" value={result.shares.toLocaleString()} />
        <Stat label="$ at risk" value={`$${result.dollarRisk.toFixed(0)}`} />
        <Stat label="Position $" value={`$${result.positionValue.toFixed(0)}`} />
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Sized so a stop-out loses about {riskPct}% of the account ({formatPrice(result.riskPerShare)} risk per share).
        Entry {formatPrice(entry)}, stop {formatPrice(stop)}.
      </p>
      {result.note && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-2.5 py-2 text-[11px] text-destructive">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>{result.note}</span>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border bg-card p-2">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-mono text-sm font-semibold tabular-nums">{value}</span>
    </div>
  )
}
