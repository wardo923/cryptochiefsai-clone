import { getMarkets } from "@/lib/market"

export const revalidate = 60

export async function GET() {
  try {
    const rows = await getMarkets()
    return Response.json({ markets: rows, updatedAt: new Date().toISOString() })
  } catch (err) {
    console.log("[v0] markets route error:", (err as Error).message)
    return Response.json({ error: "Failed to load markets" }, { status: 502 })
  }
}
