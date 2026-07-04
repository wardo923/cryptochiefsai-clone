"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { Search, RefreshCw, Activity, Hexagon, ShieldCheck, ChevronDown, EyeOff, LineChart, FlaskConical, BookOpen, Compass, LayoutGrid, ArrowRight, Coins } from "lucide-react"
import type { MarketRow } from "@/lib/market"
import { MarketTable } from "@/components/market-table"
import { formatPct } from "@/lib/format"
import { cn } from "@/lib/utils"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type MarketsResponse = { markets: MarketRow[]; updatedAt: string; error?: string }

const HIDDEN_KEY = "sightline:hidden-tickers"

function loadHidden(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(HIDDEN_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function Portal() {
  const { data, isLoading, mutate, isValidating } = useSWR<MarketsResponse>("/api/markets", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  })

  const [query, setQuery] = useState("")
  const [assetClass, setAssetClass] = useState<"all" | "crypto" | "stock">("all")
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  const [showHidden, setShowHidden] = useState(false)

  // Load the user's hidden list once on mount, then keep it synced to storage.
  useEffect(() => {
    setHiddenIds(loadHidden())
  }, [])
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(HIDDEN_KEY, JSON.stringify(hiddenIds))
    }
  }, [hiddenIds])

  const toggleHide = (id: string) =>
    setHiddenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const rows = data?.markets ?? []
  const hiddenSet = useMemo(() => new Set(hiddenIds), [hiddenIds])

  const { visible, hidden } = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = (r: MarketRow) => {
      if (assetClass !== "all" && r.kind !== assetClass) return false
      if (!q) return true
      return r.name.toLowerCase().includes(q) || r.symbol.toLowerCase().includes(q)
    }
    const filtered = rows.filter(matches)
    return {
      visible: filtered.filter((r) => !hiddenSet.has(r.id)),
      hidden: rows.filter((r) => hiddenSet.has(r.id)),
    }
  }, [rows, query, assetClass, hiddenSet])

  const movers = useMemo(() => {
    if (visible.length === 0) return null
    const sorted = [...visible].sort((a, b) => b.change24h - a.change24h)
    return { top: sorted[0], bottom: sorted[sorted.length - 1] }
  }, [visible])

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
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
            href="/forward-test"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <LineChart className="size-4" />
            <span className="hidden sm:inline">Track record</span>
          </Link>
          <Link
            href="/verify"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ShieldCheck className="size-4" />
            <span className="hidden sm:inline">Verify</span>
          </Link>
          <Link
            href="/playbook"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <BookOpen className="size-4" />
            <span className="hidden sm:inline">Playbook</span>
          </Link>
          <Link
            href="/strategy-lab"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <FlaskConical className="size-4" />
            <span className="hidden sm:inline">Strategy Lab</span>
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

      <section className="flex flex-col gap-3 px-4 pt-5 sm:px-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            href="/wizard"
            className="group flex flex-col gap-2 rounded-xl border border-primary/40 bg-primary/5 p-4 transition-colors hover:border-primary"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Compass className="size-5" />
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Step 1</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                Wizard <ArrowRight className="size-3.5 text-primary transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-0.5 text-pretty text-xs text-muted-foreground">
                Answer a few questions, get matched to a proven strategy.
              </p>
            </div>
          </Link>

          <Link
            href="/playbook"
            className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:border-ring"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-foreground">
                <LayoutGrid className="size-5" />
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Step 2</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                Matrix <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-0.5 text-pretty text-xs text-muted-foreground">
                Browse every validated strategy and its real track record.
              </p>
            </div>
          </Link>

          <Link
            href="/desk"
            className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:border-ring"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-foreground">
                <BookOpen className="size-5" />
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Step 3</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                Desk <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="mt-0.5 text-pretty text-xs text-muted-foreground">
                Your deployed strategies, watched for you condition by condition.
              </p>
            </div>
          </Link>
        </div>
      </section>

      <section className="px-4 pt-5 sm:px-6">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Why you can trust the numbers</h3>
            <Link
              href="/methodology"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-80"
            >
              How we test <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TrustPoint
              icon={<ShieldCheck className="size-4" />}
              title="Independently validated"
              body="Every strategy is tested against years of real price data before it's ever shown to you."
            />
            <TrustPoint
              icon={<Coins className="size-4" />}
              title="Trading costs included"
              body="Fees and slippage are built into every test, so the results reflect real-world trading."
            />
            <TrustPoint
              icon={<Activity className="size-4" />}
              title="Monitored over time"
              body="Performance is tracked continuously, not frozen at a single flattering snapshot."
            />
            <TrustPoint
              icon={<FlaskConical className="size-4" />}
              title="Live testing kept separate"
              body="Real-time forward results are tracked apart from historical backtests — never mixed together."
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 p-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Live markets</h3>
            <p className="text-xs text-muted-foreground">Context only &mdash; not a list of things to buy.</p>
          </div>
        </div>
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
                  assetClass === c
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {c === "all" ? "All" : c === "crypto" ? "Crypto" : "Stocks"}
              </button>
            ))}
          </div>
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

        {data?.error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Couldn&apos;t load market data right now. Try refreshing in a moment.
          </div>
        ) : (
          <MarketTable rows={visible} loading={isLoading} onToggleHide={toggleHide} />
        )}

        {hidden.length > 0 && (
          <div className="mt-2 rounded-xl border border-border bg-secondary/30">
            <button
              onClick={() => setShowHidden((s) => !s)}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              aria-expanded={showHidden}
            >
              <EyeOff className="size-4" />
              Hidden tickers
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs tabular-nums">{hidden.length}</span>
              <ChevronDown className={cn("ml-auto size-4 transition-transform", showHidden && "rotate-180")} />
            </button>
            {showHidden && (
              <div className="px-3 pb-3">
                <MarketTable rows={hidden} hidden onToggleHide={toggleHide} />
              </div>
            )}
          </div>
        )}
      </section>

      <footer className="mt-auto border-t border-border px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
        Signals are generated from live technical indicators for educational purposes only. Not financial advice.
      </footer>
    </div>
  )
}

function TrustPoint({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <p className="mt-0.5 text-pretty text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}
