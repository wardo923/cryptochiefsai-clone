import type { Candle } from "./indicators"
import { COIN_IDS, STOCKS, STOCK_SYMBOLS, ASSET_BY_ID } from "./coins"

const CG = "https://api.coingecko.com/api/v3"

// Stooq — free, no-key daily CSV history for US stocks/ETFs. Unlike Yahoo it
// serves datacenter IPs reliably. US tickers use the ".us" suffix.
const STOOQ = "https://stooq.com/q/d/l"
const DAY_MS = 24 * 60 * 60 * 1000

export function isStock(id: string): boolean {
  return ASSET_BY_ID[id]?.kind === "stock" || STOCK_SYMBOLS.has(id.toUpperCase())
}

function ymd(ms: number): string {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`
}

// Fetch daily OHLC candles for a US stock/ETF from Stooq between two dates.
async function getStooqDaily(symbol: string, fromMs: number, toMs: number, revalidate = 300): Promise<Candle[]> {
  const url = `${STOOQ}/?s=${symbol.toLowerCase()}.us&i=d&d1=${ymd(fromMs)}&d2=${ymd(toMs)}`
  const res = await fetch(url, { next: { revalidate } })
  if (!res.ok) throw new Error(`Stooq failed: ${res.status}`)
  const csv = await res.text()
  const lines = csv.trim().split(/\r?\n/)
  if (lines.length < 2 || !/^date,/i.test(lines[0])) return []
  const out: Candle[] = []
  for (const line of lines.slice(1)) {
    const [date, o, h, l, c] = line.split(",")
    const t = Date.parse(date + "T00:00:00Z")
    const nums = [o, h, l, c].map(Number)
    if (Number.isNaN(t) || nums.some((v) => !Number.isFinite(v))) continue
    out.push({ t, o: nums[0], h: nums[1], l: nums[2], c: nums[3] })
  }
  return out
}

// Fetch recent stock candles for signals: `days` of daily history up to now.
async function getStockChart(symbol: string, days: number, revalidate = 300): Promise<Candle[]> {
  const now = Date.now()
  return getStooqDaily(symbol, now - days * DAY_MS, now, revalidate)
}

// Fetch stock candles for an exact time window (used by the verifier).
export async function getStockRangeCandles(symbol: string, fromMs: number, toMs: number): Promise<Candle[]> {
  return getStooqDaily(symbol, fromMs, toMs, 3600)
}

// Build a market-table row for one stock from ~6 weeks of daily candles.
async function getStockMarketRow(symbol: string, name: string): Promise<MarketRow | null> {
  try {
    const candles = await getStockChart(symbol, 45, 60)
    if (candles.length < 2) return null
    const closes = candles.map((c) => c.c)
    const price = closes[closes.length - 1]
    const prev = closes[closes.length - 2]
    const change24h = prev ? ((price - prev) / prev) * 100 : 0
    const weekAgo = closes.length >= 6 ? closes[closes.length - 6] : closes[0]
    const change7d = weekAgo ? ((price - weekAgo) / weekAgo) * 100 : null
    return {
      id: symbol,
      symbol,
      name,
      kind: "stock" as const,
      price,
      change24h,
      change7d,
      volume24h: 0,
      marketCap: 0,
      sparkline: closes,
    }
  } catch {
    return null
  }
}

export type MarketRow = {
  id: string
  symbol: string
  name: string
  kind: "crypto" | "stock"
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

  const cryptoRows: MarketRow[] = data.map((c) => ({
    id: c.id,
    symbol: (c.symbol ?? "").toUpperCase(),
    name: c.name,
    kind: "crypto" as const,
    price: c.current_price ?? 0,
    change24h: c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h ?? 0,
    change7d: c.price_change_percentage_7d_in_currency ?? null,
    volume24h: c.total_volume ?? 0,
    marketCap: c.market_cap ?? 0,
    sparkline: (c.sparkline_in_7d?.price ?? []) as number[],
  }))

  // Stocks are priced via Yahoo in parallel; failures are dropped, not fatal.
  const stockRows = (await Promise.all(STOCKS.map((s) => getStockMarketRow(s.symbol, s.name)))).filter(
    (r): r is MarketRow => r !== null,
  )

  return [...cryptoRows, ...stockRows]
}

// Fetch OHLC candles for a single coin. CoinGecko returns [ts, o, h, l, c].
// days=14 yields ~4h candles which is a good swing-trade timeframe.
export async function getCandles(id: string, days = 14): Promise<Candle[]> {
  // Stocks: ~6 months of daily candles (enough indicator warmup for a swing call).
  if (isStock(id)) return getStockChart(id, "6mo", "1d", 300)

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
  // Stocks: ~2 years of daily candles for backtesting (well past EMA200 warmup).
  if (isStock(id)) return getStockChart(id, "2y", "1d", 1800)

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

// Binance public market-data host (no key, generous limits, real OHLC).
// Signals are quoted as TICKER_USDT, which maps 1:1 to Binance symbols, so this
// is far more reliable than CoinGecko's rate-limited historical endpoints.
const BINANCE = "https://data-api.binance.vision/api/v3"

// Fetch real OHLC candles for an exact window from Binance klines.
export async function getBinanceCandles(
  ticker: string,
  fromMs: number,
  toMs: number,
  interval = "4h",
): Promise<Candle[]> {
  const symbol = `${ticker.trim().toUpperCase()}USDT`
  const url = `${BINANCE}/klines?symbol=${symbol}&interval=${interval}&startTime=${fromMs}&endTime=${toMs}&limit=1000`
  const res = await fetch(url, { headers: { accept: "application/json" }, next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`Binance klines failed: ${res.status}`)
  const rows = (await res.json()) as (string | number)[][]
  return rows.map((r) => ({
    t: Number(r[0]),
    o: Number(r[1]),
    h: Number(r[2]),
    l: Number(r[3]),
    c: Number(r[4]),
  }))
}

// Fetch with retry/backoff so CoinGecko's free-tier rate limit (HTTP 429)
// doesn't silently drop requests when we verify many signals in a row.
async function fetchWithRetry(url: string, revalidate: number, tries = 4): Promise<Response> {
  let delay = 1500
  for (let attempt = 0; attempt < tries; attempt++) {
    const res = await fetch(url, { headers: { accept: "application/json" }, next: { revalidate } })
    if (res.status !== 429) return res
    await new Promise((r) => setTimeout(r, delay))
    delay *= 2
  }
  return fetch(url, { headers: { accept: "application/json" }, next: { revalidate } })
}

// Fetch price history for an EXACT time window (used to verify a dated signal)
// and aggregate into OHLC candles. CoinGecko auto-picks hourly granularity for
// spans under ~90 days, which is what we want for replaying a single trade.
export async function getRangeCandles(
  id: string,
  fromSec: number,
  toSec: number,
  bucketHours = 4,
): Promise<Candle[]> {
  const url = `${CG}/coins/${id}/market_chart/range?vs_currency=usd&from=${fromSec}&to=${toSec}`
  const res = await fetchWithRetry(url, 3600)
  if (!res.ok) throw new Error(`CoinGecko range failed: ${res.status}`)
  const data = (await res.json()) as { prices: [number, number][] }
  const prices = data.prices ?? []
  if (prices.length === 0) return []

  const bucketMs = bucketHours * 60 * 60 * 1000
  const buckets = new Map<number, { t: number; o: number; h: number; l: number; c: number }>()
  for (const [ts, price] of prices) {
    const key = Math.floor(ts / bucketMs) * bucketMs
    const ex = buckets.get(key)
    if (!ex) buckets.set(key, { t: key, o: price, h: price, l: price, c: price })
    else {
      ex.h = Math.max(ex.h, price)
      ex.l = Math.min(ex.l, price)
      ex.c = price
    }
  }
  return Array.from(buckets.values()).sort((a, b) => a.t - b.t)
}

// Resolve a ticker symbol (e.g. "SOL", "RLC") to a CoinGecko coin id.
// Known tickers map directly so we never hit the rate-limited search API for
// them; anything else falls back to search. Disambiguates symbols that several
// coins share (e.g. GMT, GRT) to the intended market.
const TICKER_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  DOT: "polkadot",
  MATIC: "matic-network",
  NEAR: "near",
  ATOM: "cosmos",
  LTC: "litecoin",
  UNI: "uniswap",
  DOGE: "dogecoin",
  GRT: "the-graph",
  RLC: "iexec-rlc",
  EGLD: "elrond-erd-2",
  GMT: "stepn",
  QNT: "quant-network",
  QTUM: "qtum",
  STG: "stargate-finance",
  APT: "aptos",
  ARB: "arbitrum",
  OP: "optimism",
  FIL: "filecoin",
  ICP: "internet-computer",
  INJ: "injective-protocol",
}
const symbolCache = new Map<string, string | null>()

export async function resolveSymbol(symbol: string): Promise<string | null> {
  const key = symbol.trim().toUpperCase()
  if (!key) return null
  if (TICKER_MAP[key]) return TICKER_MAP[key]
  if (symbolCache.has(key)) return symbolCache.get(key) ?? null

  try {
    const res = await fetchWithRetry(`${CG}/search?query=${encodeURIComponent(key)}`, 86400)
    if (!res.ok) throw new Error(`search ${res.status}`)
    const data = (await res.json()) as {
      coins: { id: string; symbol: string; market_cap_rank: number | null }[]
    }
    const coins = data.coins ?? []
    const exact = coins
      .filter((c) => c.symbol?.toUpperCase() === key)
      .sort((a, b) => (a.market_cap_rank ?? 1e9) - (b.market_cap_rank ?? 1e9))
    const chosen = exact[0]?.id ?? coins[0]?.id ?? null
    symbolCache.set(key, chosen)
    return chosen
  } catch {
    symbolCache.set(key, null)
    return null
  }
}
