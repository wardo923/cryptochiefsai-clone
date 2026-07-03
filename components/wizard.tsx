"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CircleCheck,
  Compass,
  Info,
  Lock,
  Radar,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import type { PublicPairing } from "@/lib/playbook/public"
import {
  WIZARD_QUESTIONS,
  scorePairing,
  fitReasons,
  type WizardAnswers,
} from "@/lib/playbook/wizard"
import { addToDesk } from "@/lib/desk"
import {
  effectiveTickerLimit,
  getPlan,
  isFrozen,
  statusLabel,
  type PlanState,
} from "@/lib/plan"
import { cn } from "@/lib/utils"

const TF_LABEL: Record<string, string> = {
  intraday: "Intraday (same session)",
  swing: "Swing (days)",
  position: "Position (weeks)",
}

type Phase = "questions" | "configuring" | "markets" | "strategy" | "deployed"

type AssignedSystem = {
  best: PublicPairing
  reasons: string[]
  markets: PublicPairing[]
}

export function Wizard({ pairings }: { pairings: PublicPairing[] }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Partial<WizardAnswers>>({})
  const [phase, setPhase] = useState<Phase>("questions")
  const [selected, setSelected] = useState<string[]>([])
  const [name, setName] = useState("")
  const [deployedCount, setDeployedCount] = useState(0)

  // Plan state drives how many markets the user may monitor.
  const [plan, setPlan] = useState<PlanState | null>(null)
  useEffect(() => {
    setPlan(getPlan())
    const sync = () => setPlan(getPlan())
    window.addEventListener("plan:changed", sync)
    return () => window.removeEventListener("plan:changed", sync)
  }, [])

  const total = WIZARD_QUESTIONS.length
  const q = WIZARD_QUESTIONS[step]

  // Assign ONE system from the answers, then expose the markets it supports.
  // Done client-side over the already-stripped pairings (no hidden logic ships).
  const assigned = useMemo<AssignedSystem | null>(() => {
    if (phase === "questions") return null
    const a = answers as WizardAnswers
    const assetBonus = (p: PublicPairing) => {
      if (a.asset === "crypto") return p.assetClass === "crypto" ? 6 : -6
      if (a.asset === "stocks") return p.assetClass === "stock" ? 6 : -6
      return 0
    }
    const ranked = [...pairings].sort(
      (x, y) => scorePairing(y, a) + assetBonus(y) - (scorePairing(x, a) + assetBonus(x)),
    )
    const best = ranked[0]

    // If the user picked a specific market type, we ONLY ever show that type.
    // Picking "Crypto" must never surface a stock ticker on the picker, and
    // vice-versa. "No preference" leaves both classes eligible.
    const wantClass = a.asset === "crypto" ? "crypto" : a.asset === "stocks" ? "stock" : null
    const inClass = (p: PublicPairing) => wantClass === null || p.assetClass === wantClass

    // Markets the assigned system supports, at its timeframe. Broaden if thin,
    // but keep the asset-class filter locked at every widening step.
    let markets = pairings.filter(
      (p) => p.strategyId === best.strategyId && p.timeframe === best.timeframe && inClass(p),
    )
    if (markets.length < 2) {
      // Same strategy, any timeframe — still restricted to the chosen class.
      markets = pairings.filter((p) => p.strategyId === best.strategyId && inClass(p))
    }
    if (markets.length < 2 && wantClass !== null) {
      // Last resort: any proven system in the chosen class, so a crypto picker
      // always gets crypto options instead of being shown stocks.
      markets = pairings.filter(inClass)
    }

    // Sort by trust (survivors first), then edge. Asset class is already locked.
    const rank: Record<string, number> = { robust: 0, fragile: 1, inconclusive: 2, untested: 3 }
    markets = [...markets].sort((x, y) => {
      const r = (rank[x.oosVerdict] ?? 3) - (rank[y.oosVerdict] ?? 3)
      if (r !== 0) return r
      return y.expectancy - x.expectancy
    })

    return { best, reasons: fitReasons(best, a), markets }
  }, [phase, answers, pairings])

  const limit = plan ? effectiveTickerLimit(plan) : 0
  const frozen = plan ? isFrozen(plan) : false

  // The market the strategy reveal speaks to: the highest-ranked market the
  // user actually picked (falls back to the assigned system's best market).
  const primary = useMemo<PublicPairing | null>(() => {
    if (!assigned) return null
    return assigned.markets.find((m) => selected.includes(m.symbol)) ?? assigned.best
  }, [assigned, selected])

  const primaryReasons = useMemo(
    () => (primary ? fitReasons(primary, answers as WizardAnswers) : []),
    [primary, answers],
  )

  function choose(value: string) {
    const next = { ...answers, [q.id]: value }
    setAnswers(next)
    if (step + 1 < total) setStep(step + 1)
    else setPhase("configuring") // → thinking splash, then market selection
  }

  function restart() {
    setStep(0)
    setAnswers({})
    setSelected([])
    setName("")
    setPhase("questions")
  }

  function toggleMarket(symbol: string) {
    setSelected((prev) => {
      if (prev.includes(symbol)) return prev.filter((s) => s !== symbol)
      if (prev.length >= limit) return prev // at limit — locked
      return [...prev, symbol]
    })
  }

  function deploy() {
    if (!assigned) return
    const chosen = assigned.markets.filter((m) => selected.includes(m.symbol))
    chosen.forEach((p, i) => {
      const trimmed = name.trim()
      const label = chosen.length > 1 ? `${trimmed || "My Path"} · ${p.assetName}` : trimmed || `My ${p.assetName} Path`
      addToDesk({
        name: label,
        strategyId: p.strategyId,
        strategyName: p.strategyName,
        symbol: p.symbol,
        assetName: p.assetName,
        timeframe: p.timeframe,
        winRate: p.winRate,
        expectancy: p.expectancy,
        profitFactor: p.profitFactor,
        survived: p.oosVerdict === "robust",
      })
      void i
    })
    setDeployedCount(chosen.length)
    setPhase("deployed")
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-5 sm:px-6">
      {phase === "questions" && (
        <QuestionStep
          step={step}
          total={total}
          selected={answers[q.id]}
          onChoose={choose}
          onBack={() => setStep(Math.max(0, step - 1))}
        />
      )}

      {phase === "configuring" && assigned && (
        <ConfiguringSplash onDone={() => setPhase("markets")} />
      )}

      {phase === "markets" && assigned && (
        <MarketPicker
          assigned={assigned}
          selected={selected}
          onToggle={toggleMarket}
          limit={limit}
          frozen={frozen}
          planLabel={plan ? statusLabel(plan) : ""}
          onContinue={() => setPhase("strategy")}
          onRestart={restart}
        />
      )}

      {phase === "strategy" && assigned && primary && (
        <StrategyStep
          primary={primary}
          reasons={primaryReasons}
          marketCount={selected.length}
          name={name}
          setName={setName}
          onDeploy={deploy}
          onBack={() => setPhase("markets")}
        />
      )}

      {phase === "deployed" && <DeployedStep count={deployedCount} onRestart={restart} />}
    </div>
  )
}

// ----------------------------------------------------------------------------
function QuestionStep({
  step,
  total,
  selected,
  onChoose,
  onBack,
}: {
  step: number
  total: number
  selected: string | undefined
  onChoose: (v: string) => void
  onBack: () => void
}) {
  const q = WIZARD_QUESTIONS[step]
  const pct = Math.round((step / total) * 100)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Compass className="size-3.5 text-primary" />
            Question {step + 1} of {total}
          </span>
          {step > 0 && (
            <button onClick={onBack} className="inline-flex items-center gap-1 transition-colors hover:text-foreground">
              <ArrowLeft className="size-3" /> Back
            </button>
          )}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div>
        <h2 className="text-balance text-lg font-semibold leading-tight sm:text-xl">{q.prompt}</h2>
        <p className="mt-1 text-pretty text-sm text-muted-foreground">{q.help}</p>
      </div>

      <div className="flex flex-col gap-2.5">
        {q.options.map((opt) => {
          const active = selected === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onChoose(opt.value)}
              className={cn(
                "group flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3.5 text-left transition-all",
                active ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/40",
              )}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="mt-0.5 text-pretty text-xs text-muted-foreground">{opt.desc}</div>
              </div>
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-transparent group-hover:border-primary/50",
                )}
              >
                <Check className="size-3.5" />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// "Configuring" splash — the thinking beat between the questions and the market
// list. SightLine appears to work: a scanning radar + rotating status lines,
// then it auto-advances to the markets that actually matched.
function ConfiguringSplash({ onDone }: { onDone: () => void }) {
  const STEPS = [
    "Reading your answers",
    "Scanning proven systems",
    "Matching markets to how you trade",
    "Ranking by real-cost edge",
  ]
  const [i, setI] = useState(0)

  useEffect(() => {
    const stepMs = 620
    const tick = window.setInterval(() => setI((n) => Math.min(n + 1, STEPS.length - 1)), stepMs)
    const done = window.setTimeout(onDone, stepMs * STEPS.length + 350)
    return () => {
      window.clearInterval(tick)
      window.clearTimeout(done)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 py-10 text-center">
      <div className="relative flex size-28 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <span className="absolute inset-2 rounded-full border border-primary/30" />
        <span
          className="absolute inset-2 rounded-full border-2 border-transparent border-t-primary animate-spin"
          style={{ animationDuration: "1.4s" }}
        />
        <Radar className="size-10 text-primary" />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-balance text-lg font-semibold leading-tight sm:text-xl">
          SightLine is checking which markets qualify for your Path
        </h2>
        <p className="text-pretty text-sm text-muted-foreground">This takes a moment — we only match what we&apos;ve tested.</p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2.5">
        {STEPS.map((s, idx) => {
          const state = idx < i ? "done" : idx === i ? "active" : "pending"
          return (
            <div
              key={s}
              className={cn(
                "flex items-center gap-2.5 text-sm transition-colors",
                state === "pending" && "text-muted-foreground/40",
                state === "active" && "text-foreground",
                state === "done" && "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border",
                  state === "done" && "border-chart-3 bg-chart-3/15 text-chart-3",
                  state === "active" && "border-primary text-primary",
                  state === "pending" && "border-border text-transparent",
                )}
              >
                {state === "done" ? (
                  <Check className="size-3" />
                ) : state === "active" ? (
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                ) : null}
              </span>
              <span className="text-left">{s}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Strategy reveal — shown AFTER the user picks their markets. We never print the
// strategy's internal name; the user names their own Path here, then deploys.
function StrategyStep({
  primary,
  reasons,
  marketCount,
  name,
  setName,
  onDeploy,
  onBack,
}: {
  primary: PublicPairing
  reasons: string[]
  marketCount: number
  name: string
  setName: (v: string) => void
  onDeploy: () => void
  onBack: () => void
}) {
  const p = primary
  const survived = p.oosVerdict === "robust"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
          <Sparkles className="size-4" />
          Your strategy is ready
        </div>
        <button onClick={onBack} className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-3" /> Back
        </button>
      </div>
      <p className="text-pretty text-sm text-muted-foreground">
            Based on your answers, SightLine assigned the system that fits how you trade — and validated it on your{" "}
            {marketCount > 1 ? `${marketCount} markets` : "market"}.
      </p>

      <div className={cn("overflow-hidden rounded-2xl border bg-card", survived ? "border-chart-4/50" : "border-primary/40")}>
        <div className={cn("border-b border-border px-5 py-4", survived ? "bg-chart-4/10" : "bg-primary/5")}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-lg font-semibold">Build your strategy</span>
            {survived && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-chart-4/15 px-2 py-1 text-xs font-medium text-chart-4"
                title="Still made money on data it was never tuned on — the check most strategies fail"
              >
                <BadgeCheck className="size-3.5" /> Passed unseen data
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="size-3.5" />
              {TF_LABEL[p.timeframe]}
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="mb-4 flex flex-col gap-1.5">
            {reasons.map((r) => (
              <div key={r} className="flex items-start gap-2 text-sm">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-chart-3" />
                <span className="text-pretty text-muted-foreground">{r}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Metric label="Win rate" value={`${p.winRate}%`} />
            <Metric label="Edge / trade" value={`${p.expectancy > 0 ? "+" : ""}${p.expectancy}R`} tone="good" />
            <Metric label="Profit factor" value={p.profitFactor.toFixed(2)} tone="good" />
          </div>
          <p className="mt-3 text-pretty text-[11px] leading-relaxed text-muted-foreground">
            Tested over {p.trades} trades on real data, after real costs.{" "}
            {survived
              ? `It also kept working on data it never trained on (+${p.oosHoldoutExpectancy ?? 0}R on the holdout).`
              : "Past results don't guarantee future ones — this is structure, not a promise."}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-secondary/30 p-5">
        <label htmlFor="strat-name" className="text-sm font-medium">
          Name this Path
        </label>
        <p className="mt-0.5 text-xs text-muted-foreground">How it&apos;ll show on your Desk.</p>
        <input
          id="strat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`My ${p.assetName} Path`}
          maxLength={40}
          className="mt-3 h-12 w-full rounded-lg border border-border bg-card px-3 text-base outline-none transition-colors focus:border-primary"
        />
        <button
          onClick={onDeploy}
          className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {marketCount > 1 ? `Deploy ${marketCount} markets to my Desk` : "Deploy to my Desk"}
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Market selection — the markets that actually matched the assigned system,
// shown as a ticker grid. Multi-select capped by the plan limit; continue to
// the strategy reveal once at least one is picked.
function MarketPicker({
  assigned,
  selected,
  onToggle,
  limit,
  frozen,
  planLabel,
  onContinue,
  onRestart,
}: {
  assigned: AssignedSystem
  selected: string[]
  onToggle: (symbol: string) => void
  limit: number
  frozen: boolean
  planLabel: string
  onContinue: () => void
  onRestart: () => void
}) {
  const atLimit = selected.length >= limit

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-widest text-chart-3">
          <Compass className="size-3.5" />
          Markets · Matched to you
        </div>
        <button onClick={onRestart} className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <RotateCcw className="size-3" /> Start over
        </button>
      </div>

      <div>
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-chart-4/15 px-2.5 py-1 text-[11px] font-medium text-chart-4">
          <BadgeCheck className="size-3.5" /> Validated for you
        </div>
        <h2 className="text-balance text-2xl font-semibold leading-tight sm:text-3xl">
          The markets that qualify for your system
        </h2>
        <p className="mt-2 text-pretty text-sm text-muted-foreground">
          {frozen
            ? "Your plan is paused. Upgrade to start monitoring markets again."
            : `Based on your Wizard answers, these are the assets that matched your trading profile and passed SightLine's validation standards. We run one system per market — pick up to ${limit}.`}
        </p>
      </div>

      {frozen ? (
        <UpgradeBanner />
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            Watching on your <span className="font-medium text-foreground">{planLabel}</span> plan
          </span>
          <span className="font-semibold tabular-nums">
            {selected.length} of {limit}
          </span>
        </div>
      )}

      {!frozen && (
        <details className="group">
          <summary className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground">
            <Info className="size-3" />
            Why only these markets?
          </summary>
          <p className="mt-1.5 text-pretty rounded-lg bg-secondary/40 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
            Your trading system isn&apos;t designed for every market. Rather than handing you thousands of symbols to
            sort through, SightLine only shows the assets where this system has been validated against our research
            standards <span className="font-medium text-foreground">and</span> fits the profile from your answers.
          </p>
        </details>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        {assigned.markets.map((m) => {
          const isSelected = selected.includes(m.symbol)
          // Locked if we're at the limit (and it isn't already picked) or frozen.
          const locked = frozen || (!isSelected && atLimit)
          const survived = m.oosVerdict === "robust"
          return (
            <button
              key={m.symbol}
              onClick={() => (locked ? undefined : onToggle(m.symbol))}
              aria-disabled={locked}
              className={cn(
                "group relative flex min-h-[76px] flex-col justify-center gap-0.5 rounded-xl border px-4 py-3 text-left transition-all",
                isSelected
                  ? "border-primary bg-primary/5"
                  : locked
                    ? "cursor-not-allowed border-border bg-card/40 opacity-50"
                    : "border-border bg-card hover:border-primary/50 hover:bg-secondary/40",
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-lg font-bold tracking-tight">{m.symbol.toUpperCase()}</span>
                {survived && <BadgeCheck className="size-3.5 text-chart-4" aria-label="Survived out-of-sample" />}
              </div>
              <span className="truncate font-mono text-xs text-muted-foreground">{m.assetName}</span>

              {/* selection / lock indicator */}
              <span
                className={cn(
                  "absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-full border transition-colors",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : locked
                      ? "border-border text-muted-foreground"
                      : "border-border text-transparent group-hover:border-primary/50",
                )}
              >
                {locked && !isSelected ? <Lock className="size-2.5" /> : <Check className="size-3" />}
              </span>
            </button>
          )
        })}
      </div>

      {/* Elite request footer — mirrors the reference "Don't see your ticker?" row. */}
      {!frozen && (
        <Link
          href="/plan"
          className="flex items-center gap-2.5 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <Lock className="size-4 shrink-0" />
          <span className="text-pretty">
            Don&apos;t see your market? <span className="font-medium text-foreground">Request it on Elite.</span>
          </span>
        </Link>
      )}

      {/* Upgrade nudge appears once they hit the limit (and aren't frozen). */}
      {!frozen && atLimit && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Lock className="size-4 text-primary" /> Monitor more markets
          </div>
          <p className="mt-1 text-pretty text-xs text-muted-foreground">
            Upgrade your plan to watch additional markets simultaneously.
          </p>
          <Link
            href="/plan"
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Upgrade your plan <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}

      {!frozen && (
        <button
          onClick={onContinue}
          disabled={selected.length === 0}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {selected.length === 0
            ? "Pick a market to continue"
            : selected.length > 1
              ? `Build my strategy for ${selected.length} markets`
              : "Build my strategy"}
          <ArrowRight className="size-4" />
        </button>
      )}
    </div>
  )
}

function UpgradeBanner() {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Lock className="size-4 text-primary" /> Monitor more markets
      </div>
      <p className="mt-1 text-pretty text-xs text-muted-foreground">
        Upgrade your plan to watch markets simultaneously.
      </p>
      <Link
        href="/plan"
        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Upgrade your plan <ArrowRight className="size-3.5" />
      </Link>
    </div>
  )
}

// ----------------------------------------------------------------------------
function DeployedStep({ count, onRestart }: { count: number; onRestart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-chart-3/40 bg-chart-3/5 p-7 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-chart-3/15">
        <Check className="size-7 text-chart-3" />
      </div>
      <div>
        <h2 className="text-balance text-lg font-semibold">
          {count > 1 ? `${count} markets are on your Desk` : "Your Path is on your Desk"}
        </h2>
        <p className="mx-auto mt-1 max-w-sm text-pretty text-sm text-muted-foreground">
          Your Clerk will watch {count > 1 ? "each market" : "its conditions"} and let you know when the structure lines
          up. You decide every move — we never tell you to buy.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <Link
          href="/desk"
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
        >
          Go to my Desk <ArrowRight className="size-4" />
        </Link>
        <button
          onClick={onRestart}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-border text-sm font-medium transition-colors hover:bg-secondary"
        >
          <RotateCcw className="size-4" /> Build another
        </button>
      </div>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "good" }) {
  return (
    <div className="rounded-lg bg-secondary/50 px-2.5 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-sm font-semibold tabular-nums", tone === "good" && "text-chart-3")}>{value}</div>
    </div>
  )
}
