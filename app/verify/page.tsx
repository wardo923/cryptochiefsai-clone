import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { SignalVerifier } from "@/components/signal-verifier"

export const metadata = {
  title: "Signal Verifier — Signal Engine 2",
  description:
    "Replay any channel's posted signals against real historical price to measure their true win rate and expectancy.",
}

export default function VerifyPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Back to portal"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight sm:text-base">Signal Verifier</h1>
            <p className="text-xs text-muted-foreground">Backtest any channel&apos;s posted signals</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 sm:px-6">
        <SignalVerifier />
      </main>

      <footer className="mt-auto border-t border-border px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
        Verification only measures signals you provide. Cherry-picked or deleted posts cannot be detected. For research
        and education only — not financial advice.
      </footer>
    </div>
  )
}
