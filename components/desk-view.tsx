"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BadgeCheck, Plus, Trash2, TrendingUp, Compass, Info } from "lucide-react"
import { getDesk, removeFromDesk, type DeskItem } from "@/lib/desk"
import { DeskSignalPath } from "@/components/desk-signal-path"

const TF_LABEL: Record<string, string> = {
  swing: "Swing (days)",
  position: "Position (weeks)",
}

export function DeskView() {
  const [items, setItems] = useState<DeskItem[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const sync = () => setItems(getDesk())
    sync()
    setReady(true)
    window.addEventListener("desk:changed", sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener("desk:changed", sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  if (!ready) return null

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

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <DeskCard key={item.id} item={item} onRemove={() => removeFromDesk(item.id)} />
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

function DeskCard({ item, onRemove }: { item: DeskItem; onRemove: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold">{item.name}</h3>
            {item.survived && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-chart-4/15 px-2 py-0.5 text-[10px] font-medium text-chart-4">
                <BadgeCheck className="size-3" /> Survived OOS
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
        <Metric label="Edge / trade" value={`${item.expectancy > 0 ? "+" : ""}${item.expectancy}R`} tone="good" />
        <Metric label="Profit factor" value={item.profitFactor.toFixed(2)} tone="good" />
      </div>
      <DeskSignalPath coinId={item.symbol} timeframe={item.timeframe} assetName={item.assetName} />
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
