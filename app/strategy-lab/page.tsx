import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { StrategyLab } from "@/components/strategy-lab"

export const metadata: Metadata = {
  title: "Strategy Lab · Sightline",
  description:
    "Backtest intraday trading strategies head-to-head with realistic costs. Ranked by after-cost expectancy across liquid symbols.",
}

export default function StrategyLabPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <div>
            <h1 className="text-sm font-semibold leading-tight sm:text-base">Strategy Lab</h1>
            <p className="text-xs text-muted-foreground">Backtested head-to-head · after costs</p>
          </div>
        </div>
      </header>
      <StrategyLab />
    </main>
  )
}
