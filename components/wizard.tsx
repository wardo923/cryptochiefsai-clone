"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CircleCheck,
  Compass,
  Info,
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
import { cn } from "@/lib/utils"

const TF_LABEL: Record<string, string> = {
  swing: "Swing (days)",
  position: "Position (weeks)",
}

type Phase = "questions" | "result" | "deployed"

export function Wizard({ pairings }: { pairings: PublicPairing[] }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Partial<WizardAnswers>>({})
  const [phase, setPhase] = useState<Phase>("questions")
  const [name, setName] = useState("")
  const [deployedName, setDeployedName] = useState("")

  const total = WIZARD_QUESTIONS.length
  const q = WIZARD_QUESTIONS[step]

  // Score on the client — pairings are already stripped of hidden logic.
  const match = useMemo(() => {
    if (phase === "questions") return null
    const a = answers as WizardAnswers
    const pool = pairings.filter((p) => {
      if (a.asset === "crypto") return p.assetClass === "crypto"
      if (a.asset === "stocks") return p.assetClass === "stock"
      return true
    })
    if (pool.length === 0) return { best: null, alternatives: [] as PublicPairing[], reasons: [] as string[] }
    const ranked = [...pool].sort((x, y) => scorePairing(y, a) - scorePairing(x, a))
    const best = ranked[0]
    return { best, alternatives: ranked.slice(1, 3), reasons: best ? fitReasons(best, a) : [] }
  }, [phase, answers, pairings])

  function choose(value: string) {
    const next = { ...answers, [q.id]: value }
    setAnswers(next)
    if (step + 1 < total) {
      setStep(step + 1)
    } else {
      setPhase("result")
    }
  }

  function restart() {
    setStep(0)
    setAnswers({})
    setName("")
    setPhase("questions")
  }

  function deploy() {
    if (!match?.best) return
    const p = match.best
    const finalName = name.trim() || `My ${p.assetName} Plan`
    addToDesk({
      name: finalName,
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
    setDeployedName(finalName)
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

      {phase === "result" && match && (
        <ResultStep
          match={match}
          name={name}
          setName={setName}
          onDeploy={deploy}
          onRestart={restart}
        />
      )}

      {phase === "deployed" && (
        <DeployedStep name={deployedName} onRestart={restart} />
      )}
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
      {/* Progress */}
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
                active
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-secondary/40",
              )}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">{opt.label}</div>
                <div className="mt-0.5 text-pretty text-xs text-muted-foreground">{opt.desc}</div>
              </div>
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent group-hover:border-primary/50",
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
function ResultStep({
  match,
  name,
  setName,
  onDeploy,
  onRestart,
}: {
  match: { best: PublicPairing | null; alternatives: PublicPairing[]; reasons: string[] }
  name: string
  setName: (v: string) => void
  onDeploy: () => void
  onRestart: () => void
}) {
  if (!match.best) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <Info className="mx-auto size-7 text-muted-foreground" />
        <h2 className="mt-3 text-base font-semibold">Nothing proven fits that combination yet</h2>
        <p className="mx-auto mt-1 max-w-sm text-pretty text-sm text-muted-foreground">
          We&apos;d rather tell you that than hand you a guess. Try widening one answer — it usually opens up a strong
          match.
        </p>
        <button
          onClick={onRestart}
          className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          <RotateCcw className="size-4" /> Start over
        </button>
      </div>
    )
  }

  const p = match.best
  const survived = p.oosVerdict === "robust"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
        <Sparkles className="size-4" />
        Your matched strategy
      </div>

      {/* The matched strategy — name + outcome only, logic stays hidden */}
      <div className={cn("overflow-hidden rounded-2xl border bg-card", survived ? "border-chart-4/50" : "border-primary/40")}>
        <div className={cn("border-b border-border px-5 py-4", survived ? "bg-chart-4/10" : "bg-primary/5")}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-lg font-semibold">{p.strategyName}</span>
            {survived && (
              <span className="inline-flex items-center gap-1 rounded-full bg-chart-4/15 px-2 py-1 text-xs font-medium text-chart-4">
                <BadgeCheck className="size-3.5" /> Survived OOS
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{p.assetName}</span>
            <span className="text-muted-foreground/60">·</span>
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="size-3.5" />
              {TF_LABEL[p.timeframe]}
            </span>
          </div>
        </div>

        <div className="p-5">
          {/* Why it fits you */}
          <div className="mb-4 flex flex-col gap-1.5">
            {match.reasons.map((r) => (
              <div key={r} className="flex items-start gap-2 text-sm">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-chart-3" />
                <span className="text-pretty text-muted-foreground">{r}</span>
              </div>
            ))}
          </div>

          {/* Track record */}
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

      {/* Name it + deploy */}
      <div className="rounded-2xl border border-border bg-secondary/30 p-5">
        <label htmlFor="strat-name" className="text-sm font-medium">
          Name your strategy
        </label>
        <p className="mt-0.5 text-xs text-muted-foreground">Make it yours — this is how it&apos;ll show on your Desk.</p>
        <input
          id="strat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`e.g. My ${p.assetName} Plan`}
          maxLength={40}
          className="mt-3 h-12 w-full rounded-lg border border-border bg-card px-3 text-base outline-none transition-colors focus:border-primary"
        />
        <button
          onClick={onDeploy}
          className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Deploy to my Desk
          <ArrowRight className="size-4" />
        </button>
        <button
          onClick={onRestart}
          className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="size-3.5" /> Start over
        </button>
      </div>

      {match.alternatives.length > 0 && (
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Other strong fits
          </div>
          <div className="flex flex-col gap-2">
            {match.alternatives.map((alt) => (
              <div
                key={`${alt.strategyId}-${alt.symbol}-${alt.timeframe}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{alt.strategyName}</span>
                    {alt.oosVerdict === "robust" && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-chart-4/15 px-1 py-0.5 text-[9px] font-medium text-chart-4">
                        <BadgeCheck className="size-2.5" /> survived
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {alt.assetName} · {TF_LABEL[alt.timeframe]}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[10px] uppercase text-muted-foreground">Edge</div>
                  <div className="text-sm font-semibold tabular-nums text-chart-3">+{alt.expectancy}R</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
function DeployedStep({ name, onRestart }: { name: string; onRestart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-chart-3/40 bg-chart-3/5 p-7 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-chart-3/15">
        <Check className="size-7 text-chart-3" />
      </div>
      <div>
        <h2 className="text-balance text-lg font-semibold">&ldquo;{name}&rdquo; is on your Desk</h2>
        <p className="mx-auto mt-1 max-w-sm text-pretty text-sm text-muted-foreground">
          Your Clerk will watch its conditions and let you know when the structure lines up. You decide every move — we
          never tell you to buy.
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
