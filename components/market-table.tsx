"use client"

import type { MarketRow } from "@/lib/market"
import { Sparkline } from "@/components/sparkline"
import { formatPrice, formatPct, formatCompact } from "@/lib/format"
import { cn } from "@/lib/utils"

export function MarketTable({
  rows,
  selectedId,
  onSelect,
  loading,
}: {
  rows: MarketRow[]
  selectedId: string | null
  onSelect: (row: MarketRow) => void
  loading: boolean
}) {
  if (loading && rows.length === 0) {
    return (
      <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-border">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse bg-card" />
        ))}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr_96px] items-center gap-2 border-b border-border bg-secondary/40 px-4 py-2.5 text-xs font-medium text-muted-foreground sm:grid">
        <span>Asset</span>
        <span className="text-right">Price</span>
        <span className="text-right">24h</span>
        <span className="text-right">Volume</span>
        <span className="text-right">7d</span>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((row) => {
          const active = row.id === selectedId
          const up = row.change24h >= 0
          return (
            <li key={row.id}>
              <button
                onClick={() => onSelect(row)}
                aria-pressed={active}
                className={cn(
                  "grid w-full grid-cols-[1fr_auto] items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-secondary/40 sm:grid-cols-[1.5fr_1fr_1fr_1fr_96px]",
                  active && "bg-primary/10 hover:bg-primary/10",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-xs font-semibold">
                    {row.symbol.slice(0, 4)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">{row.symbol}</p>
                  </div>
                </div>

                <div className="text-right sm:hidden">
                  <p className="text-sm font-medium tabular-nums">{formatPrice(row.price)}</p>
                  <p className={cn("text-xs tabular-nums", up ? "text-chart-3" : "text-destructive")}>
                    {formatPct(row.change24h)}
                  </p>
                </div>

                <p className="hidden text-right text-sm font-medium tabular-nums sm:block">{formatPrice(row.price)}</p>
                <p className={cn("hidden text-right text-sm tabular-nums sm:block", up ? "text-chart-3" : "text-destructive")}>
                  {formatPct(row.change24h)}
                </p>
                <p className="hidden text-right text-sm text-muted-foreground tabular-nums sm:block">
                  {row.volume24h > 0 ? `$${formatCompact(row.volume24h)}` : "—"}
                </p>
                <div className="hidden justify-end sm:flex">
                  <Sparkline data={row.sparkline} positive={(row.change7d ?? row.change24h) >= 0} />
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
