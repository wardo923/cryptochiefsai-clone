import type { Candle } from "./indicators"
import type { ParsedSignal } from "./parse-signals"

export type VerifiedTrade = {
  symbol: string
  direction: "LONG" | "SHORT"
  timestamp: number
  entry: number
  stop: number
  tp1: number
  // Their likely metric: did price touch TP1 before stop?
  touchedTp1: boolean
  touchedOutcome: "win" | "loss" | "open"
  // Honest closed-trade result (stop-first, fees included)
  rMultiple: number
  honestOutcome: "win" | "loss" | "open"
  assumptions: string[]
}

export type VerifyResult = {
  scored: number
  skipped: number
  skippedReasons: { signal: string; reasons: string[] }[]
  // Advertised-style metric (touch TP1 = win)
  touchWinRate: number
  touchWins: number
  touchLosses: number
  // Honest metric
  honestWinRate: number
  expectancy: number // avg R
  profitFactor: number
  avgWinR: number
  avgLossR: number
  trades: VerifiedTrade[]
  feePct: number
}

const FEE_PCT = 0.1 // round-trip cost assumption
const DEFAULT_STOP_PCT = 5 // when only "5% buffer" or nothing is given

type ResolveInput = {
  signal: ParsedSignal
  candles: Candle[] // candles at/after the signal timestamp
}

// Score one signal. Returns null with reasons if it can't be objectively scored.
export function verifyOne(input: ResolveInput): { trade: VerifiedTrade | null; reasons: string[] } {
  const { signal, candles } = input
  const reasons: string[] = []
  const assumptions: string[] = []

  if (!signal.direction) reasons.push("missing direction")
  if (signal.timestamp == null) reasons.push("missing timestamp")
  if (signal.entryLow == null) reasons.push("missing entry")
  if (signal.stop == null && signal.stopBufferPct == null) reasons.push("missing stop")
  if (candles.length < 2) reasons.push("no price history for that window")
  if (reasons.length) return { trade: null, reasons }

  const dir = signal.direction as "LONG" | "SHORT"
  const entry = ((signal.entryLow as number) + (signal.entryHigh ?? (signal.entryLow as number))) / 2

  // Determine stop
  let stop: number
  if (signal.stop != null) {
    stop = signal.stop
  } else {
    const pct = signal.stopBufferPct ?? DEFAULT_STOP_PCT
    stop = dir === "LONG" ? entry * (1 - pct / 100) : entry * (1 + pct / 100)
    assumptions.push(`stop assumed at ${pct}% (${signal.stopBufferPct != null ? "stated buffer" : "default"})`)
  }

  const risk = Math.abs(entry - stop)
  if (risk <= 0) return { trade: null, reasons: ["entry equals stop"] }

  // TP1 = nearest stated take-profit. Crypto Chiefs cards usually omit fixed
  // TPs and exit on "4h acceptance", so when none is stated we use a disclosed
  // implied target at 2R (their typical risk:reward framing).
  const IMPLIED_RR = 2
  let tp1: number
  if (signal.tps.length > 0) {
    tp1 = dir === "LONG" ? Math.min(...signal.tps) : Math.max(...signal.tps)
  } else {
    tp1 = dir === "LONG" ? entry + risk * IMPLIED_RR : entry - risk * IMPLIED_RR
    assumptions.push(`no stated TP — implied target at ${IMPLIED_RR}R`)
  }
  if (signal.directionInferred) assumptions.push("direction inferred from stop placement")

  // Walk candles intrabar. Conservative: if both stop and tp hit in same bar, stop first.
  let touchedOutcome: VerifiedTrade["touchedOutcome"] = "open"
  let honestExit: number | null = null
  let honestOutcome: VerifiedTrade["honestOutcome"] = "open"

  for (const bar of candles) {
    const hitStop = dir === "LONG" ? bar.l <= stop : bar.h >= stop
    const hitTp = dir === "LONG" ? bar.h >= tp1 : bar.l <= tp1

    if (hitStop && touchedOutcome === "open") touchedOutcome = "loss"
    if (hitTp && touchedOutcome === "open") touchedOutcome = "win"
    // note: for "touch" metric we let TP win even if stop also in same bar? No —
    // be conservative and consistent: stop-first within the same bar.
    if (hitStop && hitTp) {
      if (touchedOutcome === "open") touchedOutcome = "loss"
    }

    if (honestOutcome === "open") {
      if (hitStop) {
        honestExit = stop
        honestOutcome = "loss"
        break
      }
      if (hitTp) {
        honestExit = tp1
        honestOutcome = "win"
        break
      }
    }
  }

  // touch metric uses the same scan but ignores the closed break above
  const touchedTp1 = touchedOutcome === "win"

  // Honest R-multiple. If never resolved, mark-to-last-close.
  let rMultiple: number
  if (honestExit != null) {
    const gross = dir === "LONG" ? honestExit - entry : entry - honestExit
    rMultiple = (gross - entry * (FEE_PCT / 100)) / risk
  } else {
    const last = candles[candles.length - 1].c
    const gross = dir === "LONG" ? last - entry : entry - last
    rMultiple = (gross - entry * (FEE_PCT / 100)) / risk
    honestOutcome = "open"
  }

  return {
    trade: {
      symbol: signal.symbol as string,
      direction: dir,
      timestamp: signal.timestamp as number,
      entry,
      stop,
      tp1,
      touchedTp1,
      touchedOutcome,
      rMultiple: Number(rMultiple.toFixed(3)),
      honestOutcome,
      assumptions,
    },
    reasons: [],
  }
}

export function aggregate(
  trades: VerifiedTrade[],
  skippedReasons: { signal: string; reasons: string[] }[],
): VerifyResult {
  const touchClosed = trades.filter((t) => t.touchedOutcome !== "open")
  const touchWins = touchClosed.filter((t) => t.touchedOutcome === "win").length
  const touchLosses = touchClosed.filter((t) => t.touchedOutcome === "loss").length
  const touchWinRate = touchClosed.length ? (touchWins / touchClosed.length) * 100 : 0

  const wins = trades.filter((t) => t.rMultiple > 0)
  const losses = trades.filter((t) => t.rMultiple < 0)
  const honestWinRate = trades.length ? (wins.length / trades.length) * 100 : 0
  const sumR = trades.reduce((a, t) => a + t.rMultiple, 0)
  const expectancy = trades.length ? sumR / trades.length : 0
  const grossWin = wins.reduce((a, t) => a + t.rMultiple, 0)
  const grossLoss = Math.abs(losses.reduce((a, t) => a + t.rMultiple, 0))
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 999 : 0

  return {
    scored: trades.length,
    skipped: skippedReasons.length,
    skippedReasons,
    touchWinRate: Number(touchWinRate.toFixed(1)),
    touchWins,
    touchLosses,
    honestWinRate: Number(honestWinRate.toFixed(1)),
    expectancy: Number(expectancy.toFixed(3)),
    profitFactor: profitFactor === 999 ? 999 : Number(profitFactor.toFixed(2)),
    avgWinR: wins.length ? Number((grossWin / wins.length).toFixed(2)) : 0,
    avgLossR: losses.length ? Number((-grossLoss / losses.length).toFixed(2)) : 0,
    trades,
    feePct: FEE_PCT,
  }
}
