import { sql } from "@/lib/db"
import { getSignalCandles, isStock } from "@/lib/market"
import { ruleSignal } from "@/lib/strategy"
import { ASSET_BY_ID } from "@/lib/coins"
import { TIMEFRAMES, isIntraday, type Timeframe } from "@/lib/timeframe"
import { sessionAnchorMs } from "@/lib/session"
import type { Candle } from "@/lib/indicators"

// The forward-test universe: crypto majors + SPY across swing/position, plus
// SPY (and BTC) on the day-trade intraday timeframes so the new mode also
// accumulates a real track record. Intraday lanes stay low-sample until enough
// resolve. Scalp is excluded — its sample sizes are too thin to forward-test.
export const TRACKED = [
  { assetId: "bitcoin", timeframes: ["intraday15m", "swing", "position"] as Timeframe[] },
  { assetId: "ethereum", timeframes: ["swing", "position"] as Timeframe[] },
  { assetId: "solana", timeframes: ["swing", "position"] as Timeframe[] },
  { assetId: "SPY", timeframes: ["intraday5m", "intraday15m", "swing", "position"] as Timeframe[] },
]

// Milliseconds per bar for a timeframe, derived from its config.
function barMs(tf: Timeframe): number {
  return TIMEFRAMES[tf].barMinutes * 60 * 1000
}

export type ForwardSignal = {
  id: number
  asset_id: string
  ticker: string
  timeframe: Timeframe
  direction: "LONG" | "SHORT"
  confidence: number
  regime: string | null
  entry: number
  stop_loss: number
  target: number
  risk_reward: number
  status: "open" | "win" | "loss" | "expired"
  outcome: string | null
  exit_price: number | null
  realized_r: number | null
  opened_at: string
  resolved_at: string | null
  expires_at: string
}

// ---- LOGGING ----------------------------------------------------------------
// For each tracked asset+timeframe, compute the current signal. If it is a
// fresh LONG/SHORT and there is no already-open signal for that lane, record
// it. This captures exactly what the live engine would have alerted on.
export async function logNewSignals(): Promise<{ logged: number; skipped: number }> {
  let logged = 0
  let skipped = 0

  for (const t of TRACKED) {
    const asset = ASSET_BY_ID[t.assetId]
    if (!asset) continue

    for (const tf of t.timeframes) {
      try {
        const candles = await getSignalCandles(t.assetId, tf)
        if (candles.length < 30) {
          skipped++
          continue
        }
        const intraday = isIntraday(tf)
        const lastTs = candles[candles.length - 1]?.t ?? Date.now()
        const s = intraday
          ? ruleSignal(candles, { intraday: true, anchorMs: sessionAnchorMs(lastTs, !isStock(t.assetId)) })
          : ruleSignal(candles)
        if (s.direction === "NEUTRAL") {
          skipped++
          continue
        }

        // Skip if there is already an open signal for this exact lane.
        const open = (await sql`
          SELECT id FROM forward_test_signals
          WHERE asset_id = ${t.assetId} AND timeframe = ${tf} AND status = 'open'
          LIMIT 1
        `) as { id: number }[]
        if (open.length > 0) {
          skipped++
          continue
        }

        const expiresAt = new Date(Date.now() + TIMEFRAMES[tf].holdBars * barMs(tf)).toISOString()
        await sql`
          INSERT INTO forward_test_signals
            (asset_id, ticker, timeframe, direction, confidence, regime,
             entry, stop_loss, target, risk_reward, expires_at)
          VALUES
            (${t.assetId}, ${asset.symbol}, ${tf}, ${s.direction}, ${s.confidence}, ${s.regime},
             ${s.entry}, ${s.stopLoss}, ${s.target}, ${s.riskReward}, ${expiresAt})
        `
        logged++
      } catch {
        skipped++
      }
    }
  }

  return { logged, skipped }
}

// ---- RESOLUTION -------------------------------------------------------------
// Walk every open signal and check real price action since it opened. A win is
// the target being touched before the stop; a loss is the stop first. Past the
// expiry with neither hit, close at the most recent price (partial R).
export async function resolveOpenSignals(): Promise<{ resolved: number }> {
  const openRows = (await sql`
    SELECT * FROM forward_test_signals WHERE status = 'open'
  `) as ForwardSignal[]

  let resolved = 0

  // Cache candles per asset+timeframe so we fetch each lane once per run.
  const candleCache = new Map<string, Candle[]>()

  for (const row of openRows) {
    const key = `${row.asset_id}:${row.timeframe}`
    let candles = candleCache.get(key)
    if (!candles) {
      try {
        candles = await getSignalCandles(row.asset_id, row.timeframe as Timeframe)
        candleCache.set(key, candles)
      } catch {
        continue
      }
    }

    const openedMs = new Date(row.opened_at).getTime()
    // Only bars formed AFTER the signal opened can resolve it (no look-ahead).
    const since = candles.filter((c) => c.t > openedMs)
    if (since.length === 0) continue

    const risk = Math.abs(row.entry - row.stop_loss)
    let outcome: "win" | "loss" | null = null
    let exitPrice: number | null = null

    for (const c of since) {
      if (row.direction === "LONG") {
        const hitStop = c.l <= row.stop_loss
        const hitTarget = c.h >= row.target
        // Conservative: if a single bar spans both, assume the stop hit first.
        if (hitStop) {
          outcome = "loss"
          exitPrice = row.stop_loss
          break
        }
        if (hitTarget) {
          outcome = "win"
          exitPrice = row.target
          break
        }
      } else {
        const hitStop = c.h >= row.stop_loss
        const hitTarget = c.l <= row.target
        if (hitStop) {
          outcome = "loss"
          exitPrice = row.stop_loss
          break
        }
        if (hitTarget) {
          outcome = "win"
          exitPrice = row.target
          break
        }
      }
    }

    const expired = Date.now() >= new Date(row.expires_at).getTime()

    if (outcome) {
      const realizedR = outcome === "win" ? row.risk_reward : -1
      await sql`
        UPDATE forward_test_signals
        SET status = ${outcome}, outcome = ${outcome}, exit_price = ${exitPrice},
            realized_r = ${realizedR}, resolved_at = now()
        WHERE id = ${row.id}
      `
      resolved++
    } else if (expired) {
      // Timeout exit at the latest close; realized R is the partial move.
      const last = since[since.length - 1].c
      const move = row.direction === "LONG" ? last - row.entry : row.entry - last
      const realizedR = risk > 0 ? move / risk : 0
      await sql`
        UPDATE forward_test_signals
        SET status = 'expired', outcome = 'expired', exit_price = ${last},
            realized_r = ${realizedR}, resolved_at = now()
        WHERE id = ${row.id}
      `
      resolved++
    }
  }

  return { resolved }
}

// ---- STATS ------------------------------------------------------------------
export type LaneStats = {
  assetId: string
  ticker: string
  timeframe: Timeframe
  total: number // resolved trades
  open: number
  wins: number
  losses: number
  expired: number
  winRate: number | null // over resolved, decided trades
  expectancy: number | null // avg realized R over resolved trades
}

export async function getStats(): Promise<{ lanes: LaneStats[]; recent: ForwardSignal[] }> {
  const rows = (await sql`
    SELECT asset_id, ticker, timeframe,
      COUNT(*) FILTER (WHERE status = 'open')                          AS open,
      COUNT(*) FILTER (WHERE status = 'win')                           AS wins,
      COUNT(*) FILTER (WHERE status = 'loss')                          AS losses,
      COUNT(*) FILTER (WHERE status = 'expired')                       AS expired,
      COUNT(*) FILTER (WHERE status IN ('win','loss','expired'))       AS resolved,
      AVG(realized_r) FILTER (WHERE status IN ('win','loss','expired')) AS expectancy
    FROM forward_test_signals
    GROUP BY asset_id, ticker, timeframe
    ORDER BY ticker, timeframe
  `) as any[]

  const lanes: LaneStats[] = rows.map((r) => {
    const wins = Number(r.wins)
    const losses = Number(r.losses)
    const expired = Number(r.expired)
    const total = Number(r.resolved)
    const decided = wins + losses
    return {
      assetId: r.asset_id,
      ticker: r.ticker,
      timeframe: r.timeframe,
      total,
      open: Number(r.open),
      wins,
      losses,
      expired,
      winRate: decided > 0 ? (wins / decided) * 100 : null,
      expectancy: total > 0 && r.expectancy != null ? Number(r.expectancy) : null,
    }
  })

  const recent = (await sql`
    SELECT * FROM forward_test_signals ORDER BY opened_at DESC LIMIT 50
  `) as ForwardSignal[]

  return { lanes, recent }
}
