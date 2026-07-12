"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BadgeCheck, Plus, Trash2, TrendingUp, Compass, Info, ArrowRight, Snowflake } from "lucide-react"
import { getDesk, removeFromDesk, type DeskItem } from "@/lib/desk"
import { getPlan, isFrozen, type PlanState } from "@/lib/plan"
import { DeskSignalPath } from "@/components/desk-signal-path"

const TF_LABEL: Record<string, string> = {
  intraday: "Intraday (same session)",
  swing: "Swing (days)",
  position: "Position (weeks)",
}

export function DeskView() {
  const [items, setItems] = useState<DeskItem[]>([])
  const [plan, setPlan] = useState<PlanState | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const sync = () => setItems(getDesk())
    const syncPlan = () => setPlan(getPlan())
    sync()
    syncPlan()
    setReady(true)
    window.addEventListener("desk:changed", sync)
    window.addEventListener("storage", sync)
    window.addEventListener("plan:changed", syncPlan)
    return () => {
      window.removeEventListener("desk:changed", sync)
      window.removeEventListener("storage", sync)
      window.removeEventListener("plan:changed", syncPlan)
    }
  }, [])

  if (!ready) return null

  const frozen = plan ? isFrozen(plan) : false

  if (items.length === 0) {
    return (
      <div className="px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
            <Compass className="size-7 text-primary" />
          </div>
          <h2 className="mt-4 text-base font-semibold">Your Desk is empty</h2>
          <p className="mx-auto mt-1 max-w-sm text-pretty text-sm text-muted-foreground">
            Answer a few quick questions and we&apos;ll match you to a strategy that has actually worked. Name it, and
            it lands here for your Clerk to watch.
          </p>
          <Link
            href="/wizard"
            className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" /> Build your first strategy
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-5 sm:px-6">
      {frozen && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <Snowflake className="size-4" /> Your subscription expired
          </div>
          <p className="mt-1 text-pretty text-xs text-muted-foreground">
            Your Desk is still here, but live monitoring is paused. Upgrade to resume live Path updates and alerts.
          </p>
          <Link
            href="/plan"
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Upgrade to resume live monitoring <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {items.length} strateg{items.length === 1 ? "y" : "ies"} deployed
        </p>
        <Link
          href="/wizard"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground"
        >
          <Plus className="size-4" /> New
        </Link>
      </div>

      <details className="group -mt-1">
        <summary className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground">
          <Info className="size-3" />
          What do the numbers on each card mean?
        </summary>
        <div className="mt-1.5 space-y-1.5 rounded-lg bg-secondary/40 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Win rate</span> — how often it finished a trade in profit.
          </p>
          <p>
            <span className="font-medium text-foreground">Historical Edge</span> — the typical result per trade,
            measured against what you risked. +0.30R means about 0.30× your risk earned each time on average, after
            costs.
          </p>
          <p>
            <span className="font-medium text-foreground">Historical Consistency</span> — total winnings divided by
            total losses. Above 1× means it won more than it lost.
          </p>
        </div>
      </details>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <DeskCard key={item.id} item={item} frozen={frozen} onRemove={() => removeFromDesk(item.id)} />
        ))}
      </div>

      {/* Trial note — guest Desk lives on this device until they make an account */}
      <div className="mt-1 flex items-start gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>
          You&apos;re on a free trial, so this Desk is saved to this device. Create an account anytime to keep it synced
          across your phone and computer.
        </span>
      </div>
    </div>
  )
}

function DeskCard({ item, frozen, onRemove }: { item: DeskItem; frozen: boolean; onRemove: () => void }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-border bg-card ${frozen ? "opacity-90" : ""}`}>
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold">{item.name}</h3>
            {item.survived && (
              <span
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-chart-4/15 px-2 py-0.5 text-[10px] font-medium text-chart-4"
                title="Still made money on data it was never tuned on — the check most strategies fail"
              >
                <BadgeCheck className="size-3" /> SightLine Validated
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{item.assetName}</span>
            <span className="text-muted-foreground/60">·</span>
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="size-3" />
              {TF_LABEL[item.timeframe]}
            </span>
          </div>
        </div>
        <button
          onClick={onRemove}
          aria-label={`Remove ${item.name} from Desk`}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 p-4">
        <Metric label="Win rate" value={`${item.winRate}%`} />
        <Metric label="Historical Edge" value={`${item.expectancy > 0 ? "+" : ""}${item.expectancy}R`} tone="good" />
        <Metric label="Historical Consistency" value={`${item.profitFactor.toFixed(2)}×`} tone="good" />
      </div>
      <DeskSignalPath
        strategyId={item.strategyId}
        symbol={item.symbol}
        timeframe={item.timeframe}
        assetName={item.assetName}
        frozen={frozen}
      />
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "good" }) {
  return (
    <div className="rounded-lg bg-secondary/50 px-2.5 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold tabular-nums ${tone === "good" ? "text-chart-3" : ""}`}>
        {value}
      </div>
    </div>
  )
}
