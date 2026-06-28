import { sql } from "@/lib/db"
import { sendSms } from "@/lib/sms"
import { ASSET_BY_ID } from "@/lib/coins"

export const dynamic = "force-dynamic"

// Normalize a phone number to a loose E.164 shape (+ and digits).
function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim().replace(/[\s()\-.]/g, "")
  const e164 = trimmed.startsWith("+") ? trimmed : `+${trimmed}`
  return /^\+\d{8,15}$/.test(e164) ? e164 : null
}

// Subscribe a phone to new LONG/SHORT alerts for one asset.
export async function POST(req: Request) {
  const { assetId, phone } = (await req.json().catch(() => ({}))) as {
    assetId?: string
    phone?: string
  }

  const asset = assetId ? ASSET_BY_ID[assetId] : undefined
  if (!asset) return Response.json({ error: "Unknown asset" }, { status: 400 })

  const e164 = phone ? normalizePhone(phone) : null
  if (!e164) {
    return Response.json({ error: "Enter a valid phone number with country code, e.g. +15551234567" }, { status: 400 })
  }

  try {
    await sql`
      INSERT INTO alert_subscriptions (phone, ticker, asset_id, active)
      VALUES (${e164}, ${asset.symbol}, ${asset.id}, TRUE)
      ON CONFLICT (phone, asset_id)
      DO UPDATE SET active = TRUE
    `
  } catch (e) {
    console.log("[v0] alert subscribe DB error:", (e as Error).message)
    return Response.json({ error: "Couldn't save your alert. Try again." }, { status: 500 })
  }

  // Best-effort confirmation text; don't fail the request if SMS isn't set up.
  const confirm = await sendSms(
    e164,
    `Sightline: alerts on for ${asset.symbol}. You'll get a text when it flips LONG or SHORT. Reply STOP to opt out.`,
  )

  return Response.json({ ok: true, ticker: asset.symbol, smsConfirmed: confirm.ok })
}

// Unsubscribe a phone from one asset's alerts.
export async function DELETE(req: Request) {
  const { assetId, phone } = (await req.json().catch(() => ({}))) as {
    assetId?: string
    phone?: string
  }
  const e164 = phone ? normalizePhone(phone) : null
  if (!assetId || !e164) return Response.json({ error: "Missing asset or phone" }, { status: 400 })

  try {
    await sql`
      UPDATE alert_subscriptions SET active = FALSE
      WHERE asset_id = ${assetId} AND phone = ${e164}
    `
  } catch (e) {
    console.log("[v0] alert unsubscribe DB error:", (e as Error).message)
    return Response.json({ error: "Couldn't update your alert." }, { status: 500 })
  }
  return Response.json({ ok: true })
}
