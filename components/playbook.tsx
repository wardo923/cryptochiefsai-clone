"use client"

import { useMemo, useState } from "react"
import { Search, ShieldCheck, TrendingUp, ChevronRight, Award, Info, CircleCheck, BadgeCheck } from "lucide-react"
import type { PublicStrategy, PublicPairing } from "@/lib/playbook/public"
import { cn } from "@/lib/utils"

type Asset = { symbol: string; name: string; count: number }

const TF_LABEL: Record<string, string> = {
  intraday: "Intraday (same session)",
  swing: "Swing (days)",
  position: "Position (weeks)",
}

function tierLabel(tier: string) {
  return tier === "strong" ? "Strong evidence" : "Proven"
}

function isSurvived(p: PublicPairing): boolean {
  return p.oosVerdict === "robust"
}

// Trust order: gold-standard survivors first, then by edge.
const OOS_RANK: Record<string, number> = { robust: 0, fragile: 1, inconclusive: 2, untested: 3 }
function byTrust(a: PublicPairing, b: PublicPairing): number {
  const r = OOS_RANK[a.oosVerdict] - OOS_RANK[b.oosVerdict]
  return r !== 0 ? r : b.expectancy - a.expectancy
}

// A plain-English read on win rate + expectancy so a beginner knows what to expect.
function plainOutcome(p: PublicPairing): string {
  const winners = Math.round(p.winRate)
  const base = `Won ${winners} of every 100 trades, and on average made money after costs across ${p.trades} tests.`
  if (isSurvived(p)) {
    return `${base} It also kept working on data it had never seen — the test most strategies fail.`
  }
  return base
}

export function Playbook({
  strategies,
  pairings,
  assets,
}: {
  strategies: PublicStrategy[]
  pairings: PublicPairing[]
  assets: Asset[]
}) {
  const [mode, setMode] = useState<"asset" | "strategy">("asset")

  return (
    <div className="flex flex-col gap-4 px-4 py-5 sm:px-6">
      {/* Trust header */}
      <section className="rounded-xl border border-border bg-secondary/30 p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <ShieldCheck className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-pretty text-sm font-semibold sm:text-base">
              Pick what you trade. We show you what has actually worked on it.
            </h2>
            <p className="mt-1 text-pretty text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Every strategy below was tested on years of real price data, after real trading costs. We only show
              you the pairings that passed. No indicators to learn, no charts to decode — just a name and an honest
              track record.
            </p>
          </div>
        </div>
      </section>

      {/* Mode toggle */}
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
        <button
          onClick={() => setMode("asset")}
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            mode === "asset" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          What do you trade?
        </button>
        <button
          onClick={() => setMode("strategy")}
          className={cn(
            "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            mode === "strategy"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Browse strategies
        </button>
      </div>

      {mode === "asset" ? (
        <AssetFinder assets={assets} pairings={pairings} />
      ) : (
        <StrategyBrowser strategies={strategies} pairings={pairings} />
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// MODE 1: pick a ticker, get the best-fit strategy + alternatives.
// ----------------------------------------------------------------------------
function AssetFinder({ assets, pairings }: { assets: Asset[]; pairings: PublicPairing[] }) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return assets
    return assets.filter((a) => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q))
  }, [assets, query])

  const matches = useMemo(
    () => (selected ? pairings.filter((p) => p.symbol === selected).sort(byTrust) : []),
    [selected, pairings],
  )

  const best = matches[0]
  const rest = matches.slice(1)
  const selectedAsset = assets.find((a) => a.symbol === selected)

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a ticker — e.g. NVDA, Bitcoin, SPY"
          className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-3 text-sm outline-none transition-colors focus:border-primary"
        />
      </div>

      {/* Asset chips */}
      {!selected && (
        <div className="flex flex-wrap gap-2">
          {filtered.map((a) => (
            <button
              key={a.symbol}
              onClick={() => setSelected(a.symbol)}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-primary hover:bg-secondary"
            >
              <span className="font-medium">{a.name}</span>
              <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                {a.count} proven
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">No tested markets match that search.</p>
          )}
        </div>
      )}

      {/* Result for selected asset */}
      {selected && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setSelected(null)}
            className="self-start text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Choose a different market
          </button>

          {best ? (
            <>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Best fit for {selectedAsset?.name}
              </div>
              <BestFitCard pairing={best} />

              {rest.length > 0 && (
                <div className="mt-1">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Other strategies that also passed
                  </div>
                  <div className="flex flex-col gap-2">
                    {rest.map((p) => (
                      <AltRow key={`${p.strategyId}-${p.timeframe}`} pairing={p} />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-border bg-card p-5 text-center">
              <Info className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No strategy has proven out on this market yet.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                We&apos;d rather tell you that than sell you a guess. Try another ticker.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BestFitCard({ pairing }: { pairing: PublicPairing }) {
  const survived = isSurvived(pairing)
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", survived ? "border-chart-4/50" : "border-primary/40")}>
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b border-border px-4 py-3",
          survived ? "bg-chart-4/10" : "bg-primary/5",
        )}
      >
        <div className="flex items-center gap-2">
          <Award className={cn("size-4", survived ? "text-chart-4" : "text-primary")} />
          <span className="text-base font-semibold">{pairing.strategyName}</span>
        </div>
        {survived ? <SurvivedBadge /> : <TierBadge tier={pairing.tier} />}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingUp className="size-3.5" />
          {TF_LABEL[pairing.timeframe]} hold
        </div>
        <p className="mt-2 text-pretty text-sm leading-relaxed">{plainOutcome(pairing)}</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Metric label="Win rate" value={`${pairing.winRate}%`} />
          <Metric label="Edge / trade" value={`${pairing.expectancy > 0 ? "+" : ""}${pairing.expectancy}R`} tone="good" />
          <Metric label="Profit factor" value={pairing.profitFactor.toFixed(2)} tone="good" />
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CircleCheck className="size-3.5 text-chart-3" />
          Tested over {pairing.trades} trades. Worst losing streak: {pairing.maxDrawdownR}R.
        </p>
        {survived && (
          <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-chart-4/10 px-2.5 py-2 text-[11px] text-foreground">
            <BadgeCheck className="size-3.5 shrink-0 text-chart-4" />
            Survived out-of-sample: still profitable on {pairing.oosConsistency}% of unseen time periods
            {pairing.oosHoldoutExpectancy != null
              ? ` (+${pairing.oosHoldoutExpectancy}R on the holdout it never trained on).`
              : "."}
          </p>
        )}
      </div>
    </div>
  )
}

function AltRow({ pairing }: { pairing: PublicPairing }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{pairing.strategyName}</span>
          {isSurvived(pairing) ? <SurvivedBadge small /> : <TierBadge tier={pairing.tier} small />}
        </div>
        <div className="text-[11px] text-muted-foreground">{TF_LABEL[pairing.timeframe]}</div>
      </div>
      <div className="flex shrink-0 items-center gap-3 text-right">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Win</div>
          <div className="text-sm font-semibold tabular-nums">{pairing.winRate}%</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">Edge</div>
          <div className="text-sm font-semibold tabular-nums text-chart-3">+{pairing.expectancy}R</div>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// MODE 2: browse the 8 strategies, expand to see where each works.
// ----------------------------------------------------------------------------
function StrategyBrowser({
  strategies,
  pairings,
}: {
  strategies: PublicStrategy[]
  pairings: PublicPairing[]
}) {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-2">
      {strategies.map((s) => {
        const isOpen = open === s.id
        const works = pairings.filter((p) => p.strategyId === s.id).sort(byTrust)
        return (
          <div key={s.id} className="overflow-hidden rounded-xl border border-border bg-card">
            <button
              onClick={() => setOpen(isOpen ? null : s.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{s.name}</span>
                  {s.provenCount > 0 ? (
                    <span className="rounded bg-chart-3/15 px-1.5 py-0.5 text-[10px] font-medium text-chart-3">
                      {s.provenCount} markets
                    </span>
                  ) : (
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      no proven market
                    </span>
                  )}
                  {s.survivedCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded bg-chart-4/15 px-1.5 py-0.5 text-[10px] font-medium text-chart-4">
                      <BadgeCheck className="size-3" />
                      {s.survivedCount} survived
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-pretty text-xs leading-relaxed text-muted-foreground">{s.tagline}</p>
              </div>
              <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
            </button>

            {isOpen && (
              <div className="border-t border-border px-4 py-3">
                {works.length > 0 ? (
                  <>
                    <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Proven on these markets
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {works.map((p) => (
                        <div
                          key={`${p.symbol}-${p.timeframe}`}
                          className="flex items-center justify-between gap-2 rounded-lg bg-secondary/40 px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{p.assetName}</span>
                            <span className="text-[10px] text-muted-foreground">{TF_LABEL[p.timeframe]}</span>
                            {isSurvived(p) && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-chart-4/15 px-1 py-0.5 text-[9px] font-medium text-chart-4">
                                <BadgeCheck className="size-2.5" />
                                survived
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-right tabular-nums">
                            <span className="text-xs text-muted-foreground">{p.winRate}% win</span>
                            <span className="text-sm font-semibold text-chart-3">+{p.expectancy}R</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    This strategy hasn&apos;t cleared our testing bar on any market yet — so we don&apos;t recommend it
                    to anyone. Honesty over filler.
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ----------------------------------------------------------------------------
function Metric({ label, value, tone }: { label: string; value: string; tone?: "good" }) {
  return (
    <div className="rounded-lg bg-secondary/50 px-2.5 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-sm font-semibold tabular-nums", tone === "good" && "text-chart-3")}>{value}</div>
    </div>
  )
}

// The gold standard: this pairing held up on data it never trained on.
function SurvivedBadge({ small }: { small?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-chart-4/15 font-medium text-chart-4",
        small ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
      )}
      title="Survived out-of-sample validation — still profitable on data it never trained on"
    >
      <BadgeCheck className={small ? "size-3" : "size-3.5"} />
      Survived OOS
    </span>
  )
}

function TierBadge({ tier, small }: { tier: string; small?: boolean }) {
  const strong = tier === "strong"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        small ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
        strong ? "bg-chart-3/15 text-chart-3" : "bg-primary/10 text-primary",
      )}
    >
      <ShieldCheck className={small ? "size-3" : "size-3.5"} />
      {tierLabel(tier)}
    </span>
  )
}
