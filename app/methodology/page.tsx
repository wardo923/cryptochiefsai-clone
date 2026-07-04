import Link from "next/link"
import {
  ArrowLeft,
  BookOpenCheck,
  ShieldCheck,
  Coins,
  Activity,
  FlaskConical,
  LineChart,
  ArrowRight,
  Clock,
  Layers,
  Eye,
  TriangleAlert,
} from "lucide-react"

export const metadata = {
  title: "How we test — Sightline",
  description:
    "How Sightline validates strategies: independent testing, real trading costs, ongoing monitoring, and live forward results kept separate from historical backtests.",
}

export default function MethodologyPage() {
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
            <BookOpenCheck className="size-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight sm:text-base">How we test</h1>
            <p className="text-xs text-muted-foreground">The short version, then the details</p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 sm:px-6">
        {/* Intro */}
        <section className="rounded-xl border border-border bg-secondary/30 p-4 sm:p-5">
          <h2 className="text-pretty text-base font-semibold sm:text-lg">
            We only show you strategies that earned their place.
          </h2>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
            A strategy makes it into Sightline only after it holds up against years of real market history — with real
            trading costs included. If it can&apos;t prove itself, we don&apos;t show it. Here&apos;s how that works, in
            plain terms.
          </p>
        </section>

        {/* The four plain-language pillars */}
        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Pillar
            icon={<ShieldCheck className="size-4" />}
            title="Independently validated"
            body="Every strategy is run through the same rigorous test against years of real price data before it ever reaches you. Nothing is included on a hunch."
          />
          <Pillar
            icon={<Coins className="size-4" />}
            title="Trading costs are included"
            body="Fees and slippage — the gap between the price you expect and the price you actually get — are built into every test. A strategy that only looks good before costs doesn't make the cut."
          />
          <Pillar
            icon={<Activity className="size-4" />}
            title="Performance is monitored over time"
            body="We don't freeze results at one flattering moment. Strategies are checked across different market conditions so the track record reflects good stretches and bad ones."
          />
          <Pillar
            icon={<FlaskConical className="size-4" />}
            title="Live testing is kept separate"
            body="Real-time results going forward are tracked on their own — never blended into the historical numbers. Backtests and live performance are always shown apart."
          />
        </section>

        {/* Honest limits */}
        <section className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <TriangleAlert className="size-4 text-chart-4" />
            <h3 className="text-sm font-semibold">The honest limits</h3>
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
              A strong past test is evidence, not a promise. Markets change, and no strategy wins every time.
            </li>
            <li className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
              Live trading can differ from a test because of real order fills, timing, and market shifts.
            </li>
            <li className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
              Sightline is for research and education. It is not financial advice, and none of this guarantees a profit.
            </li>
          </ul>
        </section>

        {/* Advanced, opt-in */}
        <section className="mt-6">
          <details className="group rounded-xl border border-border bg-card">
            <summary className="flex cursor-pointer items-center gap-2 px-4 py-3.5 text-sm font-semibold">
              <Layers className="size-4 text-primary" />
              For advanced users: the technical details
              <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-open:rotate-90" />
            </summary>
            <div className="space-y-4 border-t border-border px-4 py-4">
              <TechBlock
                icon={<Eye className="size-4" />}
                title="No look-ahead bias"
                body="The backtester walks forward one bar at a time and only ever sees information available at that moment. A trade is resolved only against future bars it couldn't have known about. When a single bar could hit both the stop and the target, we assume the stop hit first — the pessimistic, honest choice."
              />
              <TechBlock
                icon={<Coins className="size-4" />}
                title="Commissions and slippage"
                body="Each trade pays a commission, crosses half the spread on both entry and exit, and takes extra adverse slippage on stop-outs. Faster, shorter-horizon strategies are charged wider costs, because that's where costs bite hardest. Results are reported net of all of it."
              />
              <TechBlock
                icon={<Layers className="size-4" />}
                title="Walk-forward validation"
                body="Beyond a single train/test split, each strategy is checked across multiple sequential time segments and an unseen holdout. The strict 'passed unseen data' label requires the edge to survive on data it was never tuned on, across a majority of those segments — not just one lucky stretch."
              />
              <TechBlock
                icon={<Clock className="size-4" />}
                title="Live forward testing"
                body="Signals are logged the moment they fire and later scored against real subsequent price. This live track record is stored and displayed separately from historical backtests, so you can compare what a strategy did in the past with what it's doing now."
              />
              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <Link
                  href="/forward-test"
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium transition-colors hover:border-ring"
                >
                  <LineChart className="size-4" /> See the live track record
                </Link>
                <Link
                  href="/strategy-lab"
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium transition-colors hover:border-ring"
                >
                  <FlaskConical className="size-4" /> Open the Strategy Lab
                </Link>
              </div>
            </div>
          </details>
        </section>
      </main>

      <footer className="mt-auto border-t border-border px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
        Backtests describe the past and cannot guarantee future results. For research and education only — not financial
        advice.
      </footer>
    </div>
  )
}

function Pillar({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-pretty text-xs leading-relaxed text-muted-foreground sm:text-sm">{body}</p>
    </div>
  )
}

function TechBlock({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
        {icon}
      </span>
      <div>
        <h4 className="text-sm font-medium">{title}</h4>
        <p className="mt-0.5 text-pretty text-xs leading-relaxed text-muted-foreground sm:text-sm">{body}</p>
      </div>
    </div>
  )
}
