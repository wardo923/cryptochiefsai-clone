"use client"

import { useMemo, useState } from "react"
import { BadgeCheck, TrendingUp, ShieldCheck, Calculator, Eye, Info } from "lucide-react"
import type { PublicPairing } from "@/lib/playbook/public"

const HORIZON: Record<string, string> = {
  swing: "Holds for days",
  position: "Holds for weeks",
}

// The full reference card: the three-part "honesty stack" plus the
// position-size calculator. Everything here is safe to show — it reads only
// PublicPairing fields and never exposes entry/exit logic.
export function StrategyCard({
  pairing,
  reasons,
}: {
  pairing: PublicPairing
  reasons?: string[]
}) {
  const survived = pairing.oosVerdict === "robust"

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* Part A — What it is */}
      <div className="border-b border-border p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{pairing.strategyName}</h2>
          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
            {pairing.symbol}
          </span>
          {survived && (
            <span className="inline-flex items-center gap-1 rounded-full bg-chart-4/15 px-2.5 py-1 text-xs font-semibold text-chart-4">
              <BadgeCheck className="size-3.5" /> Survived OOS
            </span>
          )}
        </div>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{pairing.assetName}</span>
          <span className="text-muted-foreground/50">·</span>
          <span className="inline-flex items-center gap-1">
            <TrendingUp className="size-3.5" />
            {HORIZON[pairing.timeframe]}
          </span>
        </p>
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-secondary/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <Eye className="mt-0.5 size-3.5 shrink-0 text-primary" />
          Only acts when its conditions are present — it sits out otherwise. That patience is already in its track
          record.
        </p>
      </div>

      {/* Part B — Why this fits you */}
      {reasons && reasons.length > 0 && (
        <div className="border-b border-border p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why this fits you</h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span className="text-pretty">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Part C — How it actually behaved */}
      <div className="border-b border-border p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How it actually behaved</h3>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat label="Won" value={`${pairing.winRate}%`} sub="of trades" />
          <Stat label="Winners vs losers" value={`${pairing.profitFactor.toFixed(2)}x`} sub="profit factor" tone="good" />
          <Stat label="Roughest streak" value={`~${Math.round(pairing.maxDrawdownR)}`} sub="trades of risk" tone="warn" />
          <Stat label="Tested across" value={`${pairing.trades}`} sub="trades" />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          On average, each trade gained more than it risked
          {pairing.oosConsistency != null && survived
            ? `, and it held up in ${pairing.oosConsistency}% of out-of-sample windows`
            : ""}
          . These numbers already include every quiet and losing day in testing.
        </p>
      </div>

      {/* Position-size calculator — a risk guide, never a profit forecast */}
      <PositionCalculator maxDrawdownR={pairing.maxDrawdownR} />
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub: string
  tone?: "good" | "warn"
}) {
  const valueTone = tone === "good" ? "text-chart-3" : tone === "warn" ? "text-chart-4" : "text-foreground"
  return (
    <div className="rounded-lg bg-secondary/50 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${valueTone}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  )
}

function PositionCalculator({ maxDrawdownR }: { maxDrawdownR: number }) {
  const [account, setAccount] = useState(5000)
  const [riskPct, setRiskPct] = useState(1)

  const { riskPerTrade, worstStreak, worstStreakPct } = useMemo(() => {
    const rpt = account * (riskPct / 100)
    const ws = maxDrawdownR * rpt
    return {
      riskPerTrade: rpt,
      worstStreak: ws,
      worstStreakPct: account > 0 ? (ws / account) * 100 : 0,
    }
  }, [account, riskPct, maxDrawdownR])

  const money = (n: number) => `$${Math.round(n).toLocaleString()}`
  const aggressive = riskPct > 2

  return (
    <div className="p-5">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Calculator className="size-3.5" /> Position-size guide
      </h3>

      <div className="mt-3 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">Account size</span>
          <div className="flex items-center rounded-lg border border-border bg-background px-3">
            <span className="text-sm text-muted-foreground">$</span>
            <input
              type="number"
              inputMode="numeric"
              value={account}
              min={0}
              onChange={(e) => setAccount(Math.max(0, Number(e.target.value)))}
              className="h-11 w-full bg-transparent px-1 text-base tabular-nums outline-none"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Risk per trade</span>
            <span className="text-sm font-semibold tabular-nums">{riskPct}%</span>
          </div>
          <input
            type="range"
            min={0.25}
            max={3}
            step={0.25}
            value={riskPct}
            onChange={(e) => setRiskPct(Number(e.target.value))}
            className="h-11 w-full accent-primary"
            aria-label="Risk per trade percent"
          />
        </label>
      </div>

      {/* Outputs */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-lg bg-secondary/50 px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Risk per trade</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums">{money(riskPerTrade)}</div>
        </div>
        <div className="rounded-lg bg-chart-4/10 px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Worst tested streak</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums text-chart-4">−{worstStreakPct.toFixed(0)}%</div>
        </div>
      </div>

      <p className="mt-3 text-pretty text-xs leading-relaxed text-muted-foreground">
        At <span className="font-medium text-foreground">{riskPct}%</span> risk, this strategy&apos;s roughest tested
        losing streak (~{Math.round(maxDrawdownR)} trades) would have drawn down about{" "}
        <span className="font-medium text-chart-4">{money(worstStreak)}</span> — roughly{" "}
        <span className="font-medium text-foreground">{worstStreakPct.toFixed(0)}%</span> of your account. Make sure you
        can sit through that.
      </p>

      {aggressive && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Risking more than 2% per trade gets dangerous fast. Most disciplined traders stay at or below 1–2%.
        </p>
      )}

      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
        This is a risk guide, not a profit forecast. No strategy&apos;s past results guarantee future ones.
      </p>
    </div>
  )
}
