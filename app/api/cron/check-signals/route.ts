import { sql } from "@/lib/db"
import { getCandles } from "@/lib/market"
import { ruleSignal } from "@/lib/strategy"
import { sendSms } from "@/lib/sms"
import { ASSET_BY_ID } from "@/lib/coins"

// Run on the Node runtime (Twilio + Neon driver), and never cache.
export const dynamic = "force-dynamic"
export const maxDuration = 60

type Sub = { phone: string; asset_id: string; ticker: string }
type StateRow = { asset_id: string; last_direction: string }

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // allow if unset (local/dev); set it in prod
  const header = req.headers.get("authorization")
  return header === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 1) Gather every distinct asset someone is subscribed to.
  const subs = (await sql`
    SELECT phone, asset_id, ticker FROM alert_subscriptions WHERE active = TRUE
  `) as Sub[]

  if (subs.length === 0) {
    return Response.json({ checked: 0, alertsSent: 0, note: "no active subscriptions" })
  }

  const assetIds = [...new Set(subs.map((s) => s.asset_id))]

  // 2) Load previous direction for those assets.
  const prevRows = (await sql`
    SELECT asset_id, last_direction FROM signal_state WHERE asset_id = ANY(${assetIds})
  `) as StateRow[]
  const prevByAsset = new Map(prevRows.map((r) => [r.asset_id, r.last_direction]))

  let alertsSent = 0
  const results: { asset: string; from: string; to: string; flipped: boolean }[] = []

  // 3) Evaluate each asset once, compare to stored state.
  for (const assetId of assetIds) {
    const asset = ASSET_BY_ID[assetId]
    if (!asset) continue

    let direction = "NEUTRAL"
    let confidence = 0
    let entry = 0
    try {
      const candles = await getCandles(assetId, 14)
      if (candles.length < 30) continue
      const s = ruleSignal(candles)
      direction = s.direction
      confidence = s.confidence
      entry = s.entry
    } catch {
      continue
    }

    const prev = prevByAsset.get(assetId) ?? "NEUTRAL"
    // Alert only on a NEW flip INTO a directional signal.
    const flipped = direction !== prev && (direction === "LONG" || direction === "SHORT")
    results.push({ asset: assetId, from: prev, to: direction, flipped })

    if (flipped) {
      const recipients = subs.filter((s) => s.asset_id === assetId)
      const arrow = direction === "LONG" ? "▲ LONG" : "▼ SHORT"
      const body = `Sightline alert: ${asset.symbol} just flipped ${arrow} (confidence ${confidence}%). Entry near ${entry}. Not financial advice.`
      for (const r of recipients) {
        const sent = await sendSms(r.phone, body)
        if (sent.ok) alertsSent++
        else console.log("[v0] SMS failed:", sent.error)
      }
    }

    // 4) Persist the latest direction (upsert).
    await sql`
      INSERT INTO signal_state (asset_id, ticker, last_direction, last_confidence, updated_at)
      VALUES (${assetId}, ${asset.symbol}, ${direction}, ${confidence}, now())
      ON CONFLICT (asset_id)
      DO UPDATE SET last_direction = ${direction}, last_confidence = ${confidence}, updated_at = now()
    `
  }

  return Response.json({ checked: assetIds.length, alertsSent, results })
}
