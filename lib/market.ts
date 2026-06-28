import type { Candle } from "./indicators"
import { COIN_IDS } from "./coins"

const CG = "https://api.coingecko.com/api/v3"

export type MarketRow = {
  id: string
  symbol: string
  name: string
  price: number
  change24h: number
  change7d: number | null
  volume24h: number
  marketCap: number
  sparkline: number[]
}

// Fetch the market table for the whole coin universe.
export async function getMarkets(): Promise<MarketRow[]> {
  const url =
    `${CG}/coins/markets?vs_currency=usd&ids=${COIN_IDS.join(",")}` +
    `&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=24h,7d`

  const res = await fetch(url, {
    headers: { accept: "application/json" },
    // cache at the edge to stay within free-tier limits
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`CoinGecko markets failed: ${res.status}`)
  const data = (await res.json()) as any[]

  return data.map((c) => ({
    id: c.id,
    symbol: (c.symbol ?? "").toUpperCase(),
    name: c.name,
    price: c.current_price ?? 0,
    change24h: c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h ?? 0,
    change7d: c.price_change_percentage_7d_in_currency ?? null,
    volume24h: c.total_volume ?? 0,
    marketCap: c.market_cap ?? 0,
    sparkline: (c.sparkline_in_7d?.price ?? []) as number[],
  }))
}

// Fetch OHLC candles for a single coin. CoinGecko returns [ts, o, h, l, c].
// days=14 yields ~4h candles which is a good swing-trade timeframe.
export async function getCandles(id: string, days = 14): Promise<Candle[]> {
  const url = `${CG}/coins/${id}/ohlc?vs_currency=usd&days=${days}`
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`CoinGecko ohlc failed: ${res.status}`)
  const data = (await res.json()) as number[][]
  return data.map(([t, o, h, l, c]) => ({ t, o, h, l, c }))
}

// Fetch a long price history for backtesting and aggregate it into OHLC candles.
// The free OHLC endpoint only returns coarse 4-day candles for long windows, so
// we pull hourly closes from market_chart (2-90 days => hourly) and bucket them
// into `bucketHours` candles, computing real open/high/low/close per bucket.
export async function getHistoryCandles(id: string, days = 90, bucketHours = 4): Promise<Candle[]> {
  const url = `${CG}/coins/${id}/market_chart?vs_currency=usd&days=${days}`
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    next: { revalidate: 1800 },
  })
  if (!res.ok) throw new Error(`CoinGecko market_chart failed: ${res.status}`)
  const data = (await res.json()) as { prices: [number, number][] }
  const prices = data.prices ?? []
  if (prices.length === 0) return []

  const bucketMs = bucketHours * 60 * 60 * 1000
  const buckets = new Map<number, { t: number; o: number; h: number; l: number; c: number }>()

  for (const [ts, price] of prices) {
    const key = Math.floor(ts / bucketMs) * bucketMs
    const existing = buckets.get(key)
    if (!existing) {
      buckets.set(key, { t: key, o: price, h: price, l: price, c: price })
    } else {
      existing.h = Math.max(existing.h, price)
      existing.l = Math.min(existing.l, price)
      existing.c = price
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.t - b.t)
}
