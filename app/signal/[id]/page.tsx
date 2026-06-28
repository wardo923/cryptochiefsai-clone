import Link from "next/link"
import { ArrowLeft, Hexagon } from "lucide-react"
import { ASSET_BY_ID } from "@/lib/coins"
import { SignalView } from "@/components/signal-view"

export default async function SignalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const decoded = decodeURIComponent(id)
  const asset = ASSET_BY_ID[decoded]

  const symbol = asset?.symbol ?? decoded.toUpperCase()
  const name = asset?.name ?? decoded

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
          <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-xs font-semibold">
            {symbol.slice(0, 4)}
          </div>
          <div className="mr-auto min-w-0">
            <h1 className="truncate text-sm font-semibold leading-tight sm:text-base">{name}</h1>
            <p className="text-xs text-muted-foreground">{symbol} · live technical signal</p>
          </div>
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Hexagon className="size-5" />
          </div>
        </div>
      </header>

      <main className="p-4 sm:px-6">
        <SignalView assetId={decoded} symbol={symbol} name={name} />
      </main>

      <footer className="mt-auto border-t border-border px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
        Signals are generated from live technical indicators for educational purposes only. Not financial advice.
      </footer>
    </div>
  )
}
