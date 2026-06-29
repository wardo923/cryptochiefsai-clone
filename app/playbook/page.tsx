import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Playbook } from "@/components/playbook"
import { publicStrategies, allPublicPairings, provenAssets } from "@/lib/playbook/public"

export const metadata: Metadata = {
  title: "Playbook · Sightline",
  description:
    "Pick what you trade. We tell you the strategy that has actually worked on it — proven on real data, after real costs. No jargon, no guesswork.",
}

export default function PlaybookPage() {
  const strategies = publicStrategies()
  const pairings = allPublicPairings()
  const assets = provenAssets()

  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col">
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
            <h1 className="text-sm font-semibold leading-tight sm:text-base">The Playbook</h1>
            <p className="text-xs text-muted-foreground">Proven strategy for what you trade</p>
          </div>
        </div>
      </header>
      <Playbook strategies={strategies} pairings={pairings} assets={assets} />
    </main>
  )
}
