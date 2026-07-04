import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, LayoutGrid } from "lucide-react"
import { PlanManager } from "@/components/plan-manager"

export const metadata: Metadata = {
  title: "Your plan · Sightline",
  description:
    "Manage how many markets Sightline monitors for you. Upgrade to watch more markets at once, or resume live monitoring if your account is frozen.",
}

export default function PlanPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/desk"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
            <div>
              <h1 className="text-sm font-semibold leading-tight sm:text-base">Your plan</h1>
              <p className="text-xs text-muted-foreground">Choose how many markets I watch for you</p>
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
      <PlanManager />
    </main>
  )
}
