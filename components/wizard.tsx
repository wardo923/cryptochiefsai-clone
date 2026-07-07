"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  BadgeCheck,
  Check,
  CircleAlert,
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
  // Every entry belongs to the assigned system — enforced in the memo below.
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

    // INVARIANT: every selectable ticker MUST belong to the assigned system.
    // We only ever narrow within `best.strategyId` — a ticker proven under a
    // different system (or none) can never appear here. We prefer the assigned
    // timeframe + the user's asset class, then relax those two preferences (but
    // never the strategy) so the picker still offers a real choice.
    let markets = pairings.filter(
      (p) => p.strategyId === best.strategyId && p.timeframe === best.timeframe && inClass(p),
    )
    if (markets.length < 2) {
      // Same assigned system, any timeframe — still restricted to the chosen class.
      markets = pairings.filter((p) => p.strategyId === best.strategyId && inClass(p))
    }
    if (markets.length === 0) {
      // Never dead-end: keep the assigned SYSTEM, relax only the class preference.
      markets = pairings.filter((p) => p.strategyId === best.strategyId)
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
        <ConfiguringSplash onDone={() => setPhase("strategy")} />
      )}

      {phase === "strategy" && assigned && primary && (
        <StrategyStep
          primary={primary}
          reasons={primaryReasons}
          validatedCount={assigned.markets.length}
          onContinue={() => setPhase("markets")}
          onBack={restart}
        />
      )}

      {phase === "markets" && assigned && (
        <MarketPicker
          assigned={assigned}
          selected={selected}
          onToggle={toggleMarket}
          limit={limit}
          frozen={frozen}
          planLabel={plan ? statusLabel(plan) : ""}
          name={name}
          setName={setName}
          onDeploy={deploy}
          onBack={() => setPhase("strategy")}
          onRestart={restart}
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
// "Configuring" splash — the cinematic analysis beat between the final question
// and the reveal. It reads as genuine work: a radar sweep over a node field,
// with each analysis line only appearing after the previous one completes,
// then a "Match found" confirmation before handing off to the reveal.
function ConfiguringSplash({ onDone }: { onDone: () => void }) {
  const STEPS = [
    "Evaluating your trading style",
    "Analyzing your preferred market conditions",
    "Measuring your risk profile",
    "Comparing compatible trading systems",
    "Validating your best match",
  ]
  // How many checklist lines have completed (0..STEPS.length).
  const [done, setDone] = useState(0)
  // Splash stage: sequential analysis → match confirmed → preparing handoff.
  const [stage, setStage] = useState<"analyzing" | "matched" | "preparing">("analyzing")

  useEffect(() => {
    const stepMs = 680
    const timers: number[] = []
    // Reveal + complete each line strictly in sequence.
    for (let n = 1; n <= STEPS.length; n++) {
      timers.push(window.setTimeout(() => setDone(n), stepMs * n))
    }
    const afterList = stepMs * STEPS.length
    timers.push(window.setTimeout(() => setStage("matched"), afterList + 300))
    timers.push(window.setTimeout(() => setStage("preparing"), afterList + 1150))
    timers.push(window.setTimeout(onDone, afterList + 2100))
    return () => timers.forEach((t) => window.clearTimeout(t))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const matched = stage !== "analyzing"

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-9 py-10 text-center">
      {/* Radar / network visualization */}
      <div className="relative flex size-40 items-center justify-center">
        {/* concentric range rings */}
        <span className="absolute inset-0 rounded-full border border-primary/15" />
        <span className="absolute inset-[14%] rounded-full border border-primary/15" />
        <span className="absolute inset-[30%] rounded-full border border-primary/20" />
        {/* crosshair guides */}
        <span className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-primary/10" />
        <span className="absolute bottom-0 top-0 left-1/2 w-px -translate-x-1/2 bg-primary/10" />

        {/* node field — subtle pinging targets */}
        <span className="absolute left-[22%] top-[30%] size-1.5 animate-ping rounded-full bg-primary/50" style={{ animationDuration: "2.2s" }} />
        <span className="absolute right-[26%] top-[40%] size-1 animate-ping rounded-full bg-chart-4/60" style={{ animationDuration: "2.8s" }} />
        <span className="absolute left-[38%] bottom-[24%] size-1 animate-ping rounded-full bg-primary/40" style={{ animationDuration: "3.1s" }} />

        {/* rotating sweep */}
        {!matched && (
          <span
            className="absolute inset-0 animate-spin rounded-full"
            style={{
              animationDuration: "2.4s",
              background:
                "conic-gradient(from 0deg, transparent 0deg, transparent 290deg, color-mix(in oklch, var(--primary) 35%, transparent) 350deg, color-mix(in oklch, var(--primary) 55%, transparent) 360deg)",
              maskImage: "radial-gradient(circle, transparent 30%, black 31%)",
              WebkitMaskImage: "radial-gradient(circle, transparent 30%, black 31%)",
            }}
          />
        )}

        {/* center icon */}
        <span
          className={cn(
            "relative flex size-16 items-center justify-center rounded-full border transition-colors duration-500",
            matched ? "border-chart-3/50 bg-chart-3/15 text-chart-3" : "border-primary/40 bg-primary/10 text-primary",
          )}
        >
          {matched ? <Check className="size-7" /> : <Radar className="size-7 animate-pulse" />}
        </span>
      </div>

      {/* Headline / subheading */}
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-balance text-xl font-semibold leading-tight sm:text-2xl">
          {stage === "analyzing"
            ? "Analyzing your trading profile\u2026"
            : stage === "matched"
              ? "Match found"
              : "Preparing your personalized SightLine Path\u2026"}
        </h2>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          {stage === "preparing"
            ? "Bringing up the system that best matches how you naturally trade."
            : "Comparing your responses against the SightLine Strategy Matrix to identify the system that best matches how you naturally trade."}
        </p>
      </div>

      {/* Sequential checklist — a line only appears once the prior one is done */}
      <div className="flex w-full max-w-sm flex-col gap-2.5">
        {STEPS.map((s, idx) => {
          // Hidden until it's this line's turn. Active while processing, done after.
          const visible = matched || idx <= done
          if (!visible) return null
          const state = matched || idx < done ? "done" : "active"
          return (
            <div
              key={s}
              className={cn(
                "flex items-center gap-2.5 text-left text-sm transition-all duration-300",
                state === "active" ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                  state === "done" ? "border-chart-3 bg-chart-3/15 text-chart-3" : "border-primary text-primary",
                )}
              >
                {state === "done" ? (
                  <Check className="size-3" />
                ) : (
                  <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                )}
              </span>
              <span>{s}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Strategy reveal — Step 1 of the calibration. SightLine shows the system it
// assigned (never its internal logic), then hands off to asset selection. This
// leads with the personalized match, not raw statistics.
function StrategyStep({
  primary,
  reasons,
  validatedCount,
  onContinue,
  onBack,
}: {
  primary: PublicPairing
  reasons: string[]
  validatedCount: number
  onContinue: () => void
  onBack: () => void
}) {
  const p = primary
  const survived = p.oosVerdict === "robust"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
          <Sparkles className="size-4" />
          Step 1 · We found your system
        </div>
        <button onClick={onBack} className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <RotateCcw className="size-3" /> Start over
        </button>
      </div>
      <p className="text-pretty text-sm text-muted-foreground">
        We found the system that fits how you trade. Next, you&apos;ll choose the assets where we&apos;ve validated it
        {validatedCount > 1 ? ` — ${validatedCount} qualified for this system.` : "."}
      </p>

      <div className={cn("overflow-hidden rounded-2xl border bg-card", survived ? "border-chart-4/50" : "border-primary/40")}>
        <div className={cn("border-b border-border px-5 py-4", survived ? "bg-chart-4/10" : "bg-primary/5")}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-lg font-semibold">Your Assigned System</span>
            {survived && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-chart-4/15 px-2 py-1 text-xs font-medium text-chart-4"
                title="Still made money on data it was never tuned on — the check most strategies fail"
              >
                <BadgeCheck className="size-3.5" /> SightLine Validated
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="size-3.5" />
              {TF_LABEL[p.timeframe]}
            </span>
            <span
              className="inline-flex items-center gap-1"
              title={
                p.bias === "long"
                  ? "This system only buys (goes long) — it never sells short."
                  : "This system can trade in either direction — buying (long) or short-selling — depending on conditions."
              }
            >
              {p.bias === "long" ? <TrendingUp className="size-3.5" /> : <ArrowUpDown className="size-3.5" />}
              {p.bias === "long" ? "Buys only (long)" : "Trades long or short"}
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

          {/* Asset-agnostic validation summary. NO win rate / edge / profit factor
              or trade counts here — those are per-ASSET and would imply a single
              universal number for the system. They appear per asset in Step 2. */}
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-secondary/30 p-3">
            <ValidationCheck label="Matched to your trading style" ok />
            <ValidationCheck
              label={survived ? "Out-of-sample validation passed" : "Out-of-sample results were mixed"}
              ok={survived}
            />
            <ValidationCheck
              label={`Validated across ${validatedCount} compatible ${validatedCount === 1 ? "asset" : "assets"}`}
              ok
            />
            <ValidationCheck label="Robust across multiple market conditions" ok={survived} />
          </div>
          <p className="mt-3 text-pretty text-[11px] leading-relaxed text-muted-foreground">
            This tells you <span className="font-medium text-foreground">how</span> you&apos;ll trade. Next, choose{" "}
            <span className="font-medium text-foreground">where</span> — you&apos;ll see each asset&apos;s own win rate
            and edge as you pick it.
          </p>
        </div>
      </div>

      <button
        onClick={onContinue}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Next: Choose compatible assets <ArrowRight className="size-4" />
      </button>
      <p className="text-center text-[11px] text-muted-foreground">
        We&apos;ll show you the markets where this system met our validation standards.
      </p>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Live methodology read — evaluates the assigned methodology against this exact
// market's latest candles (via /api/playbook-live). Deliberately NOT a "buy/sell
// signal": it reports two separate, computed facts — the current market bias and
// whether a qualifying entry exists yet — so it reads as monitoring, not a call.
type MarketBias = "BULL" | "BEAR" | "NEUTRAL"
type EntryStatus = "QUALIFIED" | "DEVELOPING" | "STAND_ASIDE"

const BIAS_COPY: Record<MarketBias, { label: string; desc: string; dot: string; text: string }> = {
  BULL: {
    label: "Bullish Bias",
    desc: "Based on your assigned methodology, current market conditions favor long opportunities.",
    dot: "bg-chart-3",
    text: "text-chart-3",
  },
  BEAR: {
    label: "Bearish Bias",
    desc: "Based on your assigned methodology, current market conditions favor short opportunities.",
    dot: "bg-destructive",
    text: "text-destructive",
  },
  NEUTRAL: {
    label: "Neutral",
    desc: "Current market conditions do not favor either direction.",
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
  },
}

const ENTRY_COPY: Record<EntryStatus, { label: string; desc: string; dot: string; text: string }> = {
  QUALIFIED: {
    label: "Qualified",
    desc: "All required criteria are currently satisfied — this market meets your assigned methodology's criteria.",
    dot: "bg-chart-3",
    text: "text-chart-3",
  },
  DEVELOPING: {
    label: "Developing",
    desc: "Conditions are moving into alignment, but your entry criteria are not yet fully met. This market is being monitored for you.",
    dot: "bg-chart-4",
    text: "text-chart-4",
  },
  STAND_ASIDE: {
    label: "Stand Aside",
    desc: "No qualifying setup currently exists.",
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
  },
}

function LiveDirection({ pairing }: { pairing: PublicPairing }) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "done"; bias: MarketBias; entry: EntryStatus; enoughData: boolean }
    | { status: "error" }
  >({ status: "loading" })

  useEffect(() => {
    let alive = true
    setState({ status: "loading" })
    fetch("/api/playbook-live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        strategyId: pairing.strategyId,
        symbol: pairing.symbol,
        timeframe: pairing.timeframe,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        if (d?.error) setState({ status: "error" })
        else setState({ status: "done", bias: d.bias, entry: d.entry, enoughData: d.enoughData })
      })
      .catch(() => {
        if (alive) setState({ status: "error" })
      })
    return () => {
      alive = false
    }
  }, [pairing.strategyId, pairing.symbol, pairing.timeframe])

  if (state.status === "loading") {
    return <p className="text-[10px] text-muted-foreground">Evaluating current conditions…</p>
  }
  if (state.status === "error") {
    return <p className="text-[10px] text-muted-foreground">Live evaluation unavailable right now.</p>
  }
  if (!state.enoughData) {
    return <p className="text-[10px] text-muted-foreground">Not enough recent data to evaluate this market yet.</p>
  }

  const bias = BIAS_COPY[state.bias]
  const entry = ENTRY_COPY[state.entry]

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/30 p-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Current Market Read</span>
        <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold", bias.text)}>
          <span className={cn("size-1.5 rounded-full", bias.dot)} aria-hidden="true" />
          {bias.label}
        </span>
        <p className="text-[10px] leading-relaxed text-muted-foreground">{bias.desc}</p>
      </div>
      <div className="flex flex-col gap-0.5 border-t border-border/60 pt-1.5">
        <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Entry Status</span>
        <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold", entry.text)}>
          <span className={cn("size-1.5 rounded-full", entry.dot)} aria-hidden="true" />
          {entry.label}
        </span>
        <p className="text-[10px] leading-relaxed text-muted-foreground">{entry.desc}</p>
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
  name,
  setName,
  onDeploy,
  onBack,
  onRestart,
}: {
  assigned: AssignedSystem
  selected: string[]
  onToggle: (symbol: string) => void
  limit: number
  frozen: boolean
  planLabel: string
  name: string
  setName: (v: string) => void
  onDeploy: () => void
  onBack: () => void
  onRestart: () => void
}) {
  const atLimit = selected.length >= limit
  // The tier caps how many assets you can MONITOR at once — not which validated
  // tickers you may choose among. So the whole menu stays interactive; tapping a
  // new one while already at the cap surfaces a gentle hint instead of locking.
  const [capHint, setCapHint] = useState(false)

  const handleToggle = (symbol: string) => {
    if (frozen) return
    const isSelected = selected.includes(symbol)
    if (!isSelected && atLimit) {
      setCapHint(true)
      return
    }
    setCapHint(false)
    onToggle(symbol)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-3" /> Back
        </button>
        <button onClick={onRestart} className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <RotateCcw className="size-3" /> Start over
        </button>
      </div>

      <div>
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-chart-4/15 px-2.5 py-1 text-[11px] font-medium text-chart-4">
          <BadgeCheck className="size-3.5" /> Step 2 · Validated for you
        </div>
        <h2 className="text-balance text-2xl font-semibold leading-tight sm:text-3xl">
          Your strategy has been assigned
        </h2>
        <p className="mt-2 text-pretty text-sm text-muted-foreground">
          {frozen
            ? "Your plan is paused. Upgrade to start monitoring markets again."
            : `We tested thousands of historical combinations and found the assets where your assigned system consistently met SightLine's validation standards. Only those appear below — pick up to ${limit} to monitor.`}
        </p>
      </div>

      {frozen ? (
        <UpgradeBanner />
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs">
            <span className="text-muted-foreground">
              Watching on your <span className="font-medium text-foreground">{planLabel}</span> plan
            </span>
            <span className="font-semibold tabular-nums">
              {selected.length} of {limit}
            </span>
          </div>
          <p className="text-pretty text-[11px] leading-relaxed text-muted-foreground">
            {assigned.markets.length === 1
              ? "This is the only market where your assigned system met our validation bar — a deliberately short, high-conviction list."
              : `Showing all ${assigned.markets.length} markets where your assigned system cleared our validation bar. A short, curated list is by design — we'd rather show a few proven fits than pad it with unvalidated tickers.`}
          </p>
          {capHint && (
            <p className="text-pretty text-[11px] leading-relaxed text-chart-3">
              Your {planLabel} plan monitors up to {limit} assets at once. Deselect one to swap, or upgrade to watch
              more — every validated asset stays available to choose from.
            </p>
          )}
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
          // Only a paused plan locks a card. Hitting the tier cap never disables
          // other validated tickers — the full menu stays choosable.
          const locked = frozen
          return (
            <button
              key={m.symbol}
              onClick={() => handleToggle(m.symbol)}
              aria-disabled={locked}
              className={cn(
                "group relative flex min-h-[88px] flex-col justify-center gap-0.5 rounded-xl border px-4 py-3 text-left transition-all",
                isSelected
                  ? "border-primary bg-primary/5"
                  : locked
                    ? "cursor-not-allowed border-border bg-card/40 opacity-50"
                    : "border-border bg-card hover:border-primary/50 hover:bg-secondary/40",
              )}
            >
              <span className="font-mono text-lg font-bold tracking-tight">{m.symbol.toUpperCase()}</span>
              <span className="truncate font-mono text-xs text-muted-foreground">{m.assetName}</span>
              <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-chart-4">
                <BadgeCheck className="size-3" /> Validated · {m.trades} trades
              </span>

              {/* Truthful, per-ASSET numbers — only shown once this specific asset
                  is selected, since win rate / edge vary by market. */}
              {isSelected && (
                <div className="mt-2 flex flex-col gap-1.5 border-t border-primary/20 pt-2">
                  <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
                    <span>
                      <span className="text-foreground">{m.winRate}%</span> win
                    </span>
                    <span>
                      <span className="text-chart-4">
                        {m.expectancy > 0 ? "+" : ""}
                        {m.expectancy}R
                      </span>{" "}
                      edge
                    </span>
                    <span>
                      <span className="text-chart-4">{m.profitFactor.toFixed(2)}×</span> PF
                    </span>
                  </div>
                  <LiveDirection pairing={m} />
                </div>
              )}

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
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-secondary/30 p-5">
          <div>
            <label htmlFor="path-name" className="text-sm font-medium">
              Name this Path
            </label>
            <p className="mt-0.5 text-xs text-muted-foreground">How it&apos;ll show on your Desk.</p>
            <input
              id="path-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Path"
              maxLength={40}
              className="mt-3 h-12 w-full rounded-lg border border-border bg-card px-3 text-base outline-none transition-colors focus:border-primary"
            />
          </div>
          <button
            onClick={onDeploy}
            disabled={selected.length === 0}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {selected.length === 0
              ? "Select an asset to continue"
              : selected.length > 1
                ? `Deploy ${selected.length} markets to my Desk`
                : "Deploy to my Desk"}
            <ArrowRight className="size-4" />
          </button>
        </div>
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

function ValidationCheck({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CircleCheck className="size-4 shrink-0 text-chart-4" />
      ) : (
        <CircleAlert className="size-4 shrink-0 text-muted-foreground" />
      )}
      <span className={cn("text-pretty", ok ? "text-foreground" : "text-muted-foreground")}>{label}</span>
    </div>
  )
}
