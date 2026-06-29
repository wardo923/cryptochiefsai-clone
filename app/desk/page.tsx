import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { DeskView } from "@/components/desk-view"

export const metadata: Metadata = {
  title: "My Desk · Sightline",
  description: "Your deployed strategies. Your Clerk watches each one and tells you when its conditions line up.",
}

export default function DeskPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col">
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
            <h1 className="text-sm font-semibold leading-tight sm:text-base">My Desk</h1>
            <p className="text-xs text-muted-foreground">Your deployed strategies</p>
          </div>
        </div>
      </header>
      <DeskView />
    </main>
  )
}
