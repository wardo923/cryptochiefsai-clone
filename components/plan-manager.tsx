"use client"

import { useEffect, useState } from "react"
import { BadgeCheck, Check, Clock, Snowflake } from "lucide-react"
import {
  PLAN_META,
  TRIAL_LIMIT,
  getPlan,
  setPlan,
  statusLabel,
  trialDaysLeft,
  type AccountStatus,
  type PlanState,
  type PlanTier,
} from "@/lib/plan"
import { cn } from "@/lib/utils"

export function PlanManager() {
  const [plan, setLocalPlan] = useState<PlanState | null>(null)

  useEffect(() => {
    setLocalPlan(getPlan())
    const sync = () => setLocalPlan(getPlan())
    window.addEventListener("plan:changed", sync)
    return () => window.removeEventListener("plan:changed", sync)
  }, [])

  if (!plan) return null

  const daysLeft = trialDaysLeft(plan)

  function choose(tier: PlanTier) {
    setPlan({ tier, status: "active" })
    setLocalPlan(getPlan())
  }

  function simulate(status: AccountStatus) {
    const patch: Partial<PlanState> =
      status === "trial"
        ? { status, trialEndsAt: Date.now() + 5 * 24 * 60 * 60 * 1000 }
        : { status }
    setPlan(patch)
    setLocalPlan(getPlan())
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-5 sm:px-6">
      {/* Current status */}
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-2xl border p-4",
          plan.status === "frozen"
            ? "border-destructive/40 bg-destructive/5"
            : plan.status === "trial"
              ? "border-chart-4/40 bg-chart-4/10"
              : "border-chart-3/40 bg-chart-3/5",
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-full",
              plan.status === "frozen"
                ? "bg-destructive/15 text-destructive"
                : plan.status === "trial"
                  ? "bg-chart-4/15 text-chart-4"
                  : "bg-chart-3/15 text-chart-3",
            )}
          >
            {plan.status === "frozen" ? (
              <Snowflake className="size-5" />
            ) : plan.status === "trial" ? (
              <Clock className="size-5" />
            ) : (
              <BadgeCheck className="size-5" />
            )}
          </div>
          <div>
            <div className="text-sm font-semibold">{statusLabel(plan)}</div>
            <p className="text-xs text-muted-foreground">
              {plan.status === "frozen"
                ? "Live monitoring is paused. Choose a plan to resume."
                : plan.status === "trial"
                  ? `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left · ${TRIAL_LIMIT} markets included`
                  : "Active — thanks for being here."}
            </p>
          </div>
        </div>
      </div>

      {/* Tier cards */}
      <div className="flex flex-col gap-3">
        {PLAN_META.map((meta) => {
          const isCurrent = plan.status === "active" && plan.tier === meta.tier
          return (
            <div
              key={meta.tier}
              className={cn(
                "rounded-2xl border bg-card p-5 transition-colors",
                isCurrent ? "border-primary" : "border-border",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold">{meta.name}</span>
                    {isCurrent && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-pretty text-xs text-muted-foreground">{meta.blurb}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-base font-semibold tabular-nums">{meta.price}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {meta.limit} {meta.limit === 1 ? "market" : "markets"}
                  </div>
                </div>
              </div>

              <ul className="mt-3 flex flex-col gap-1.5">
                {meta.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="size-3.5 shrink-0 text-chart-3" />
                    {perk}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => choose(meta.tier)}
                disabled={isCurrent}
                className={cn(
                  "mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-opacity",
                  isCurrent
                    ? "cursor-default border border-border text-muted-foreground"
                    : "bg-primary text-primary-foreground hover:opacity-90",
                )}
              >
                {isCurrent ? "Your current plan" : `Choose ${meta.name}`}
              </button>
            </div>
          )
        })}
      </div>

      {/* Demo / development switch — clearly labeled, replaces real billing for now. */}
      <div className="rounded-2xl border border-dashed border-border bg-secondary/20 p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Demo controls
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Simulate account states while billing is wired up. This will be replaced by real subscription management.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <DemoButton active={plan.status === "trial"} onClick={() => simulate("trial")}>
            Trial
          </DemoButton>
          <DemoButton active={plan.status === "active"} onClick={() => simulate("active")}>
            Active
          </DemoButton>
          <DemoButton active={plan.status === "frozen"} onClick={() => simulate("frozen")}>
            Frozen
          </DemoButton>
        </div>
      </div>
    </div>
  )
}

function DemoButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center rounded-lg border px-3 text-xs font-medium transition-colors",
        active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
