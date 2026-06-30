// ============================================================================
// SightlineDeskView — STANDALONE HANDOFF FILE
//
// The "Desk" is where a user's named, deployed strategies live. This is a
// self-contained copy of our clean Desk design for the Replit build:
//   - No external imports (icons are inline SVGs, not lucide-react)
//   - DeskItem type + a localStorage-backed store are inlined
//   - Ships with SAMPLE data so it renders the moment you mount it
//
// Assumptions: React + Tailwind with standard shadcn tokens
// (bg-card, border-border, text-muted-foreground, text-primary, secondary,
//  chart-3, chart-4, destructive). If the site doesn't use these tokens,
// map them to the existing palette.
//
// HOW TO WIRE REAL DATA (later):
//   - Replace SAMPLE_DESK with getDesk() reading from the user's deployed
//     strategies. During the free trial that's localStorage; once accounts
//     exist, it's the Supabase `desk` rows (same shape).
//   - Each item is a SNAPSHOT of a validated pairing's track record taken at
//     deploy time. NEVER store or show the strategy's entry/exit rules — only
//     name, asset, timeframe, and the behavior stats below.
//
// HONESTY RULES (keep intact):
//   - Win rate is always shown alongside edge/trade + profit factor, never alone
//   - Only swing/position timeframes exist (no intraday)
//   - "Survived OOS" badge only shows when the pairing truly survived
//   - The Clerk "watching" line manages quiet-day expectations — keep it
//   - Never say "buy/sell/guaranteed"
// ============================================================================

"use client"

import { useEffect, useState } from "react"

// ---- Data shape (mirrors a future Supabase `desk` row) ---------------------
export type DeskItem = {
  id: string
  name: string // the user's own name for their strategy
  strategyId: string // underlying validated pairing id (kept hidden in UI)
  strategyName: string
  symbol: string
  assetName: string
  timeframe: "swing" | "position"
  winRate: number
  expectancy: number // average R per trade
  profitFactor: number
  survived: boolean
  deployedAt: number
}

const TF_LABEL: Record<DeskItem["timeframe"], string> = {
  swing: "Swing (days)",
  position: "Position (weeks)",
}

// ---- Sample data so the file renders standalone ----------------------------
const SAMPLE_DESK: DeskItem[] = [
  {
    id: "sample-1",
    name: "My Steady Climber",
    strategyId: "hidden",
    strategyName: "Trend Rider",
    symbol: "GOOGL",
    assetName: "Alphabet",
    timeframe: "swing",
    winRate: 61,
    expectancy: 0.12,
    profitFactor: 1.83,
    survived: true,
    deployedAt: Date.now(),
  },
  {
    id: "sample-2",
    name: "Slow Burn BTC",
    strategyId: "hidden",
    strategyName: "Range Reclaim",
    symbol: "BTC",
    assetName: "Bitcoin",
    timeframe: "position",
    winRate: 54,
    expectancy: 0.21,
    profitFactor: 1.66,
    survived: true,
    deployedAt: Date.now() - 86400000,
  },
]

// ---- Inline icons (no external icon dependency) ----------------------------
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
const ICON = {
  badgeCheck:
    "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76ZM9 12l2 2 4-4",
  plus: "M5 12h14M12 5v14",
  trash: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  trendingUp: "M16 7h6v6M22 7l-8.5 8.5-5-5L2 17",
  compass: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.24 5.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12Z",
  info: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 6h.01M11 12h1v4h1",
}

// ---- localStorage-backed store (swap for Supabase later) -------------------
const KEY = "sightline.desk.guest.v1"
function readDesk(): DeskItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as DeskItem[]) : []
  } catch {
    return []
  }
}
function removeFromDesk(id: string): void {
  if (typeof window === "undefined") return
  const next = readDesk().filter((i) => i.id !== id)
  window.localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent("desk:changed"))
}

// ---- Main view -------------------------------------------------------------
export function SightlineDeskView({ demo = true }: { demo?: boolean }) {
  const [items, setItems] = useState<DeskItem[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const sync = () => setItems(demo ? SAMPLE_DESK : readDesk())
    sync()
    setReady(true)
    window.addEventListener("desk:changed", sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener("desk:changed", sync)
      window.removeEventListener("storage", sync)
    }
  }, [demo])

  if (!ready) return null

  if (items.length === 0) {
    return (
      <div className="px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
            <Icon path={ICON.compass} className="size-7 text-primary" />
          </div>
          <h2 className="mt-4 text-base font-semibold">Your Desk is empty</h2>
          <p className="mx-auto mt-1 max-w-sm text-pretty text-sm text-muted-foreground">
            Answer a few quick questions and we&apos;ll match you to a strategy that has actually worked. Name it, and it
            lands here for your Clerk to watch.
          </p>
          <a
            href="/wizard"
            className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            <Icon path={ICON.plus} /> Build your first strategy
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-5 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {items.length} strateg{items.length === 1 ? "y" : "ies"} deployed
        </p>
        <a
          href="/wizard"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground"
        >
          <Icon path={ICON.plus} /> New
        </a>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <DeskCard key={item.id} item={item} onRemove={() => (demo ? setItems((p) => p.filter((i) => i.id !== item.id)) : removeFromDesk(item.id))} />
        ))}
      </div>

      <div className="mt-1 flex items-start gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
        <Icon path={ICON.info} className="mt-0.5 size-3.5 shrink-0" />
        <span>
          You&apos;re on a free trial, so this Desk is saved to this device. Create an account anytime to keep it synced
          across your phone and computer.
        </span>
      </div>
    </div>
  )
}

function DeskCard({ item, onRemove }: { item: DeskItem; onRemove: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold">{item.name}</h3>
            {item.survived && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-chart-4/15 px-2 py-0.5 text-[10px] font-medium text-chart-4">
                <Icon path={ICON.badgeCheck} className="size-3" /> Survived OOS
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{item.assetName}</span>
            <span className="text-muted-foreground/60">·</span>
            <span className="inline-flex items-center gap-1">
              <Icon path={ICON.trendingUp} className="size-3" />
              {TF_LABEL[item.timeframe]}
            </span>
          </div>
        </div>
        <button
          onClick={onRemove}
          aria-label={`Remove ${item.name} from Desk`}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
        >
          <Icon path={ICON.trash} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 p-4">
        <Metric label="Win rate" value={`${item.winRate}%`} />
        <Metric label="Edge / trade" value={`${item.expectancy > 0 ? "+" : ""}${item.expectancy}R`} tone="good" />
        <Metric label="Profit factor" value={item.profitFactor.toFixed(2)} tone="good" />
      </div>
      <div className="border-t border-border px-4 py-2.5">
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Icon path={ICON.compass} className="size-3.5 text-primary" />
          Your Clerk is watching this market for your conditions to line up.
        </p>
      </div>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "good" }) {
  return (
    <div className="rounded-lg bg-secondary/50 px-2.5 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold tabular-nums ${tone === "good" ? "text-chart-3" : ""}`}>{value}</div>
    </div>
  )
}
