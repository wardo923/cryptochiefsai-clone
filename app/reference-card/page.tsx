import { allPublicPairings } from "@/lib/playbook/public"
import { StrategyCard } from "@/components/strategy-card"

export const metadata = {
  title: "Strategy Card — Reference",
  description: "Reference implementation of the strategy result card and position-size guide.",
}

// Reference implementation for the designer/Replit build. Picks a real
// gold-standard survivor from the validated set so the card shows true data.
export default function ReferenceCardPage() {
  const all = allPublicPairings()
  const pick = all.find((p) => p.oosVerdict === "robust") ?? all[0]

  const reasons = [
    pick.timeframe === "swing" ? "Holds for days, matching your pace" : "Holds for weeks, matching your patience",
    "A market with the energy you said you wanted",
    `Wins often — ${pick.winRate}% of trades closed green`,
    "Survived testing on data it had never seen — the gold standard",
  ]

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-8">
      <header className="mb-5">
        <h1 className="text-balance text-xl font-semibold">Strategy card — reference</h1>
        <p className="mt-1 text-pretty text-sm text-muted-foreground">
          The exact result/Desk card and honest position-size guide for the designer to match. All values are real,
          pulled from the validated set.
        </p>
      </header>
      <StrategyCard pairing={pick} reasons={reasons} />
    </main>
  )
}
