import Link from "next/link"
import { ArrowLeft, LineChart } from "lucide-react"
import { ForwardTestView } from "@/components/forward-test-view"

export const metadata = {
  title: "Track Record · Sightline",
  description: "Live forward-tested results for Sightline signals on crypto and SPY. Educational use only.",
}

export default function ForwardTestPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Back to markets"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="mr-auto min-w-0">
            <h1 className="truncate text-sm font-semibold leading-tight sm:text-base">Track Record</h1>
            <p className="text-xs text-muted-foreground">Live forward test · crypto &amp; SPY</p>
          </div>
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <LineChart className="size-5" />
          </div>
        </div>
      </header>

      <main className="p-4 sm:px-6">
        <ForwardTestView />
      </main>

      <footer className="mt-auto border-t border-border px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
        Forward-tested results accumulate from live signals for educational purposes only. Not financial advice.
      </footer>
    </div>
  )
}
