"use client"

import Link from "next/link"
import { ArrowRight, EyeOff, Plus } from "lucide-react"
import type { MarketRow } from "@/lib/market"
import { Sparkline } from "@/components/sparkline"
import { formatPrice, formatPct } from "@/lib/format"
import { cn } from "@/lib/utils"

export function MarketTable({
  rows,
  loading,
  hidden = false,
  onToggleHide,
}: {
  rows: MarketRow[]
  loading?: boolean
  hidden?: boolean
  onToggleHide?: (id: string) => void
}) {
  if (loading && rows.length === 0) {
    return (
      <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-border">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse bg-card" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Nothing here.
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => {
        const up = row.change24h >= 0
        return (
          <li
            key={row.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-ring/60"
          >
            {/* Identity */}
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-semibold">
                {row.symbol.slice(0, 4)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium leading-tight">{row.symbol}</p>
                <p className="truncate text-xs text-muted-foreground">{row.name}</p>
              </div>
            </div>

            {/* Price + change */}
            <div className="shrink-0 text-right">
              <p className="text-sm font-medium tabular-nums leading-tight">{formatPrice(row.price)}</p>
              <p className={cn("text-xs tabular-nums", up ? "text-chart-3" : "text-destructive")}>
                {formatPct(row.change24h)}
              </p>
            </div>

            {/* Sparkline (hidden on the smallest screens) */}
            <div className="hidden shrink-0 sm:block">
              <Sparkline data={row.sparkline} positive={(row.change7d ?? row.change24h) >= 0} />
            </div>

            {/* Inline signal action */}
            <Link
              href={`/signal/${encodeURIComponent(row.id)}`}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              aria-label={`Generate signal for ${row.symbol}`}
            >
              <span className="hidden xs:inline sm:inline">Signal</span>
              <ArrowRight className="size-4" />
            </Link>

            {/* Hide / restore toggle */}
            {onToggleHide && (
              <button
                onClick={() => onToggleHide(row.id)}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
                aria-label={hidden ? `Restore ${row.symbol}` : `Hide ${row.symbol}`}
                title={hidden ? "Restore to list" : "Hide from list"}
              >
                {hidden ? <Plus className="size-4" /> : <EyeOff className="size-4" />}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
