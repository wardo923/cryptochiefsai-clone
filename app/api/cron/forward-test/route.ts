import { logNewSignals, resolveOpenSignals } from "@/lib/forward-test"

// Node runtime (Neon driver), never cached.
export const dynamic = "force-dynamic"
export const maxDuration = 60

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // allow when unset (local/dev); set it in prod
  return req.headers.get("authorization") === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Resolve first (score what already played out), then log fresh signals.
  const resolved = await resolveOpenSignals()
  const logged = await logNewSignals()

  return Response.json({
    ok: true,
    resolved: resolved.resolved,
    logged: logged.logged,
    skipped: logged.skipped,
    at: new Date().toISOString(),
  })
}
