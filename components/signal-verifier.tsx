"use client"

import { useState } from "react"
import { ShieldCheck, AlertTriangle, Loader2, Info } from "lucide-react"
import type { VerifyResult } from "@/lib/verify"
import { cn } from "@/lib/utils"

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string
  value: string
  hint?: string
  tone?: "default" | "good" | "bad"
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          tone === "good" && "text-chart-3",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

export function SignalVerifier() {
  const [text, setText] = useState("")
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to verify.")
      } else {
        setResult(data as VerifyResult)
      }
    } catch {
      setError("Network error. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Paste signals to verify</h2>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
          Export a Telegram channel via{" "}
          <span className="text-foreground">Telegram Desktop &rarr; ⋯ &rarr; Export chat history &rarr; JSON</span> and
          paste it here, or paste individual signal posts (each must include a ticker like{" "}
          <span className="text-foreground">BTC_USDT</span>, a date, entry, stop, and take-profit). Timestamps are
          required so each trade can be replayed against real price.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Paste Telegram JSON export, or signal posts like:&#10;&#10;2026-04-01 12:30  SOL_USDT LONG&#10;Entry Range $83.58 - $84.96&#10;Stop using 5% buffer&#10;TP1 $88.10  TP2 $91.40  TP3 $95.00'
          rows={8}
          className="w-full resize-y rounded-lg border border-border bg-background p-3 font-mono text-xs outline-none focus:border-ring"
        />
        <button
          onClick={run}
          disabled={loading || !text.trim()}
          className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          {loading ? "Replaying against price..." : "Verify signals"}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label='"Touched TP1" win rate'
              value={`${result.touchWinRate}%`}
              hint="Their likely metric"
              tone="good"
            />
            <StatCard
              label="Honest win rate"
              value={`${result.honestWinRate}%`}
              hint="Closed trades, stop-first"
            />
            <StatCard
              label="Expectancy"
              value={`${result.expectancy > 0 ? "+" : ""}${result.expectancy}R`}
              hint="Avg profit per trade"
              tone={result.expectancy > 0 ? "good" : "bad"}
            />
            <StatCard
              label="Profit factor"
              value={result.profitFactor === 999 ? "∞" : String(result.profitFactor)}
              hint={`${result.scored} scored / ${result.skipped} skipped`}
              tone={result.profitFactor >= 1 ? "good" : "bad"}
            />
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              The gap between the two win rates is the story. A high &quot;touched TP1&quot; rate with low expectancy
              means price often tapped the first target but wide stops erased the gains. Avg win{" "}
              <span className="text-chart-3">{result.avgWinR}R</span>, avg loss{" "}
              <span className="text-destructive">{result.avgLossR}R</span>. Assumes {result.feePct}% round-trip cost.
              Results only cover posted signals — deleted or unposted losers are not measured.
            </span>
          </div>

          {result.horizons.some((h) => h.sample > 0) && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-1 text-sm font-semibold">Assumption-free outcome</div>
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                Directional price move from entry after a fixed time, ignoring any target or stop. This needs no
                guess about how they exit, so it&apos;s the most objective read on whether the calls moved the right
                way.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {result.horizons.map((h) => (
                  <div key={h.label} className="rounded-lg border border-border bg-background p-3">
                    <div className="text-xs text-muted-foreground">After {h.label}</div>
                    <div
                      className={cn(
                        "mt-1 text-xl font-semibold tabular-nums",
                        h.avgReturnPct > 0 ? "text-chart-3" : h.avgReturnPct < 0 ? "text-destructive" : "",
                      )}
                    >
                      {h.avgReturnPct > 0 ? "+" : ""}
                      {h.avgReturnPct}%
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {h.winRate}% moved up &middot; n={h.sample}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.trades.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-card text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Coin</th>
                    <th className="px-3 py-2 font-medium">Dir</th>
                    <th className="px-3 py-2 font-medium">Date</th>
                    <th className="px-3 py-2 font-medium">Touch TP1</th>
                    <th className="px-3 py-2 text-right font-medium">Result (R)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.trades.map((t, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{t.symbol}</td>
                      <td className="px-3 py-2">
                        <span className={cn(t.direction === "LONG" ? "text-chart-3" : "text-destructive")}>
                          {t.direction}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(t.timestamp).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2">
                        {t.touchedOutcome === "win" ? (
                          <span className="text-chart-3">win</span>
                        ) : t.touchedOutcome === "loss" ? (
                          <span className="text-destructive">loss</span>
                        ) : (
                          <span className="text-muted-foreground">open</span>
                        )}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right tabular-nums",
                          t.rMultiple > 0 ? "text-chart-3" : t.rMultiple < 0 ? "text-destructive" : "text-muted-foreground",
                        )}
                      >
                        {t.rMultiple > 0 ? "+" : ""}
                        {t.rMultiple}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.skippedReasons.length > 0 && (
            <details className="rounded-xl border border-border bg-card p-4 text-xs">
              <summary className="cursor-pointer font-medium text-muted-foreground">
                {result.skipped} signal(s) skipped — why
              </summary>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {result.skippedReasons.map((s, i) => (
                  <li key={i}>
                    <span className="text-foreground">{s.signal || "unknown"}</span>: {s.reasons.join(", ")}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
