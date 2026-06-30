/**
 * SightlineStrategyCard.tsx — STANDALONE handoff component
 * =============================================================================
 * Drop this single file into the Replit project (e.g. components/) and import it.
 * It has ZERO project dependencies: the data type is inlined, the icons are
 * inlined SVGs (no lucide-react needed), and it renders sample data out of the
 * box so you can see it immediately and design around it.
 *
 * Requirements: React + Tailwind CSS (already in the Sightline site).
 *
 * ---------------------------------------------------------------------------
 * THE HONESTY RULES (please keep these intact — they ARE the product):
 *   1. Never show win rate alone. It always sits next to drawdown + sample size.
 *   2. Always reveal the roughest losing streak (drawdown). Hiding risk is what
 *      scam apps do; showing it honestly is our whole differentiator.
 *   3. NEVER expose the strategy's entry/exit rules or indicator settings.
 *      This component only ever receives "behavior" data, never logic.
 *   4. The calculator is a RISK guide, not a profit forecast. Never multiply
 *      win rate x account to project earnings. It only helps the user size
 *      positions so they can survive the worst tested streak.
 *   5. Tone: calm, premium, trustworthy. Never the words "buy", "sell",
 *      or "guaranteed".
 *
 * WIRING IN REPLIT:
 *   Feed `pairing` from the STRIPPED strategy data in Supabase (win rate,
 *   profit factor, drawdown, OOS verdict, trades) — NOT from raw strategy
 *   definitions. Pass the plain-English `reasons` array from the wizard match.
 * ---------------------------------------------------------------------------
 */
"use client"

import { useMemo, useState } from "react"

// --- Inlined data shape (mirror of the lab's PublicPairing; no logic fields) -
export type StrategyCardData = {
  strategyName: string // user-facing alias only (never the internal id)
  symbol: string // e.g. "GOOGL" or "bitcoin"
  assetName: string // e.g. "Alphabet" or "Bitcoin"
  timeframe: "swing" | "position"
  winRate: number // e.g. 61
  profitFactor: number // e.g. 1.83
  maxDrawdownR: number // roughest losing streak, in units of risk (R)
  trades: number // sample size
  oosVerdict: "robust" | "fragile" | "untested"
  oosConsistency?: number | null // % of out-of-sample windows that held up
}

const HORIZON: Record<string, string> = {
  swing: "Holds for days",
  position: "Holds for weeks",
}

// --- Tiny inlined icons (so there's no icon-library dependency) -------------
function Icon({ path, className = "size-4" }: { path: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  )
}
const I = {
  check: "M20 6 9 17l-5-5",
  badge: "M9 12l2 2 4-4 M7.5 4.2a2.4 2.4 0 0 1 1.7-.7 2.4 2.4 0 0 0 1.7-.7 2.4 2.4 0 0 1 3.4 0 2.4 2.4 0 0 0 1.7.7 2.4 2.4 0 0 1 2.4 2.4c0 .6.3 1.2.7 1.7a2.4 2.4 0 0 1 0 3.4c-.4.5-.7 1.1-.7 1.7a2.4 2.4 0 0 1-2.4 2.4c-.6 0-1.2.3-1.7.7a2.4 2.4 0 0 1-3.4 0 2.4 2.4 0 0 0-1.7-.7 2.4 2.4 0 0 1-2.4-2.4c0-.6-.3-1.2-.7-1.7a2.4 2.4 0 0 1 0-3.4c.4-.5.7-1.1.7-1.7a2.4 2.4 0 0 1 .7-1.7z",
  trend: "M22 7 13.5 15.5l-5-5L2 17",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  calc: "M9 7h6 M9 11h6 M9 15h3 M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  info: "M12 16v-4 M12 8h.01 M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",
}

// --- The card ----------------------------------------------------------------
export function SightlineStrategyCard({
  pairing = SAMPLE,
  reasons = SAMPLE_REASONS,
}: {
  pairing?: StrategyCardData
  reasons?: string[]
}) {
  const survived = pairing.oosVerdict === "robust"

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
      {/* Part A — What it is */}
      <div className="border-b border-border p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{pairing.strategyName}</h2>
          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
            {pairing.symbol}
          </span>
          {survived && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <Icon path={I.badge} className="size-3.5" /> Survived OOS
            </span>
          )}
        </div>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{pairing.assetName}</span>
          <span className="text-muted-foreground/50">·</span>
          <span className="inline-flex items-center gap-1">
            <Icon path={I.trend} className="size-3.5" />
            {HORIZON[pairing.timeframe]}
          </span>
        </p>
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-secondary/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <Icon path={I.eye} className="mt-0.5 size-3.5 shrink-0 text-primary" />
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
  const valueTone =
    tone === "good" ? "text-emerald-600 dark:text-emerald-400" : tone === "warn" ? "text-amber-600 dark:text-amber-400" : "text-foreground"
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
        <Icon path={I.calc} className="size-3.5" /> Position-size guide
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

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="rounded-lg bg-secondary/50 px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Risk per trade</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums">{money(riskPerTrade)}</div>
        </div>
        <div className="rounded-lg bg-amber-500/10 px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Worst tested streak</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums text-amber-600 dark:text-amber-400">
            −{worstStreakPct.toFixed(0)}%
          </div>
        </div>
      </div>

      <p className="mt-3 text-pretty text-xs leading-relaxed text-muted-foreground">
        At <span className="font-medium text-foreground">{riskPct}%</span> risk, this strategy&apos;s roughest tested
        losing streak (~{Math.round(maxDrawdownR)} trades) would have drawn down about{" "}
        <span className="font-medium text-amber-600 dark:text-amber-400">{money(worstStreak)}</span> — roughly{" "}
        <span className="font-medium text-foreground">{worstStreakPct.toFixed(0)}%</span> of your account. Make sure you
        can sit through that.
      </p>

      {aggressive && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive">
          <Icon path={I.info} className="mt-0.5 size-3.5 shrink-0" />
          Risking more than 2% per trade gets dangerous fast. Most disciplined traders stay at or below 1–2%.
        </p>
      )}

      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <Icon path={I.shield} className="mt-0.5 size-3.5 shrink-0 text-primary" />
        This is a risk guide, not a profit forecast. No strategy&apos;s past results guarantee future ones.
      </p>
    </div>
  )
}

// --- Built-in sample data so the file renders on its own --------------------
const SAMPLE: StrategyCardData = {
  strategyName: "Trend Rider",
  symbol: "GOOGL",
  assetName: "Alphabet",
  timeframe: "swing",
  winRate: 61,
  profitFactor: 1.83,
  maxDrawdownR: 6,
  trades: 77,
  oosVerdict: "robust",
  oosConsistency: 100,
}
const SAMPLE_REASONS = [
  "Holds for days, matching your pace",
  "A steadier, established market like you wanted",
  "Wins often — 61% of trades closed green",
  "Survived testing on data it had never seen — the gold standard",
]

export default SightlineStrategyCard
