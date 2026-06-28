"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { Search, RefreshCw, Activity, Hexagon, ShieldCheck } from "lucide-react"
import type { MarketRow } from "@/lib/market"
import { MarketTable } from "@/components/market-table"
import { SignalPanel } from "@/components/signal-panel"
import { BacktestPanel } from "@/components/backtest-panel"
import { formatPct } from "@/lib/format"
import { cn } from "@/lib/utils"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type MarketsResponse = { markets: MarketRow[]; updatedAt: string; error?: string }

export function Portal() {
  const { data, isLoading, mutate, isValidating } = useSWR<MarketsResponse>("/api/markets", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  })

  const [query, setQuery] = useState("")
  const [assetClass, setAssetClass] = useState<"all" | "crypto" | "stock">("all")
  const [selected, setSelected] = useState<MarketRow | null>(null)

  const rows = data?.markets ?? []

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (assetClass !== "all" && r.kind !== assetClass) return false
      if (!q) return true
      return r.name.toLowerCase().includes(q) || r.symbol.toLowerCase().includes(q)
    })
  }, [rows, query, assetClass])

  const movers = useMemo(() => {
    if (rows.length === 0) return null
    const sorted = [...rows].sort((a, b) => b.change24h - a.change24h)
    return { top: sorted[0], bottom: sorted[sorted.length - 1] }
  }, [rows])

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Hexagon className="size-5" />
          </div>
          <div className="mr-auto">
            <h1 className="text-sm font-semibold leading-tight sm:text-base">Sightline</h1>
            <p className="text-xs text-muted-foreground">Technical signals · all markets</p>
          </div>
          <Link
            href="/verify"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ShieldCheck className="size-4" />
            <span className="hidden sm:inline">Verify signals</span>
          </Link>
          <button
            onClick={() => mutate()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Refresh market data"
          >
            <RefreshCw className={cn("size-4", isValidating && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      <div className="grid gap-4 p-4 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-48 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search markets"
                className="h-11 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-base outline-none transition-colors focus:border-ring sm:text-sm"
              />
            </div>
            <div className="flex h-11 items-center gap-1 rounded-lg border border-border bg-card p-1">
              {(["all", "crypto", "stock"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setAssetClass(c)}
                  aria-pressed={assetClass === c}
                  className={cn(
                    "h-full rounded-md px-3 text-sm font-medium capitalize transition-colors",
                    assetClass === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c === "all" ? "All" : c === "crypto" ? "Crypto" : "Stocks"}
                </button>
              ))}
            </div>
            {movers && (
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5">
                  <Activity className="size-3.5 text-chart-3" />
                  {movers.top.symbol} <span className="text-chart-3">{formatPct(movers.top.change24h)}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5">
                  <Activity className="size-3.5 text-destructive" />
                  {movers.bottom.symbol} <span className="text-destructive">{formatPct(movers.bottom.change24h)}</span>
                </span>
              </div>
            )}
          </div>

          {data?.error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Couldn&apos;t load market data right now. Try refreshing in a moment.
            </div>
          ) : (
            <MarketTable rows={filtered} selectedId={selected?.id ?? null} onSelect={setSelected} loading={isLoading} />
          )}
        </section>

        <section className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <SignalPanel coin={selected} />
          <BacktestPanel coin={selected} />
        </section>
      </div>

      <footer className="mt-auto border-t border-border px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
        Signals are generated from live technical indicators for educational purposes only. Not financial advice.
      </footer>
    </div>
  )
}
