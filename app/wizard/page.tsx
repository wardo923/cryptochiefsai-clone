import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, LayoutGrid } from "lucide-react"
import { Wizard } from "@/components/wizard"
import { allPublicPairings } from "@/lib/playbook/public"

export const metadata: Metadata = {
  title: "Build your strategy · Sightline",
  description:
    "Answer a few plain questions and we'll match you to a strategy that has actually worked — proven on real data, after real costs. Name it, deploy it to your Desk.",
}

export default function WizardPage() {
  // Computed on the server; only stripped, logic-free pairings cross to the client.
  const pairings = allPublicPairings()

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
            <div>
              <h1 className="text-sm font-semibold leading-tight sm:text-base">Build your strategy</h1>
              <p className="text-xs text-muted-foreground">A few questions — we&apos;ll match the rest</p>
            </div>
          </div>
          <Link
            href="/desk"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <LayoutGrid className="size-4" />
            <span className="hidden sm:inline">My Desk</span>
          </Link>
        </div>
      </header>
      <Wizard pairings={pairings} />
    </main>
  )
}
