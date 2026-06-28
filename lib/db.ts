import { neon } from "@neondatabase/serverless"

// Lean, HTTP-based SQL client for our personal alerting tables. No auth/ORM —
// this is a single-user tool, so we use Neon's serverless driver directly.
export const sql = neon(process.env.DATABASE_URL!)

export type AlertSubscription = {
  id: number
  phone: string
  ticker: string
  asset_id: string
  active: boolean
  created_at: string
}

export type SignalDirection = "LONG" | "SHORT" | "NEUTRAL"
