import { getStats } from "@/lib/forward-test"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const stats = await getStats()
    return Response.json(stats)
  } catch (err) {
    return Response.json({ error: (err as Error).message, lanes: [], recent: [] }, { status: 500 })
  }
}
