import type { Candle } from "./indicators"
import { COIN_IDS, STOCKS, STOCK_SYMBOLS, ASSET_BY_ID } from "./coins"
import { TIMEFRAMES, type Timeframe } from "./timeframe"

const CG = "https://api.coingecko.com/api/v3"

// Yahoo Finance v8 chart — free, no-key daily OHLC for US stocks/ETFs/indices.
const YF = "https://query1.finance.yahoo.com/v8/finance/chart"
const YF_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  accept: "application/json",
}
const DAY_MS = 24 * 60 * 60 * 1000

export function isStock(id: string): boolean {
  return ASSET_BY_ID[id]?.kind === "stock" || STOCK_SYMBOLS.has(id.toUpperCase())
}

// ---------------------------------------------------------------------------
// Alpaca market data (keyed) — cleaner, deeper stock OHLC than free Yahoo.
// Free IEX feed serves years of daily bars and months of paginated intraday,
// which is the data Yahoo cannot provide. We use it as the PRIMARY stock source
// and fall back to Yahoo on any failure or for symbols Alpaca can't serve
// (e.g. raw indices like SPX, which is not a tradeable equity on Alpaca).
// ---------------------------------------------------------------------------
const ALPACA_DATA = "https://data.alpaca.markets/v2/stocks"

// Map our stock interval ids -> Alpaca timeframe strings.
const ALPACA_TF: Record<string, string> = {
  "1d": "1Day",
  "60m": "1Hour",
  "15m": "15Min",
  "5m": "5Min",
}

// Indices have no Alpaca equity equivalent, so they stay on Yahoo.
const ALPACA_UNSUPPORTED = new Set(["SPX"])

function alpacaCreds(): { id: string; secret: string } | null {
  const id = process.env.ALPACA_API_KEY_ID
  const secret = process.env.ALPACA_API_SECRET_KEY
  if (!id || !secret) return null
  return { id, secret }
}

// Fetch OHLC candles for a US equity/ETF from Alpaca between two dates at the
// given interval, paginating via next_page_token until the window is covered.
async function getAlpacaBars(
  symbol: string,
  fromMs: number,
  toMs: number,
  interval = "1d",
  revalidate = 300,
): Promise<Candle[]> {
  const creds = alpacaCreds()
  if (!creds) throw new Error("Alpaca credentials missing")
  const sym = symbol.trim().toUpperCase()
  if (ALPACA_UNSUPPORTED.has(sym)) throw new Error(`Alpaca does not serve ${sym}`)
  const tf = ALPACA_TF[interval] ?? "1Day"
  const headers = { "APCA-API-KEY-ID": creds.id, "APCA-API-SECRET-KEY": creds.secret, accept: "application/json" }
  const out: Candle[] = []
  let pageToken: string | undefined
  // Cap pages so a bad range can never loop forever; intraday needs more pages.
  const maxPages = interval === "1d" ? 6 : 40
  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      timeframe: tf,
      start: new Date(fromMs).toISOString(),
      end: new Date(toMs).toISOString(),
      limit: "10000",
      adjustment: "all",
      feed: "iex",
    })
    if (pageToken) params.set("page_token", pageToken)
    const res = await fetch(`${ALPACA_DATA}/${encodeURIComponent(sym)}/bars?${params}`, {
      headers,
      next: { revalidate },
    })
    if (!res.ok) {
      if (out.length) break // partial history is still useful
      throw new Error(`Alpaca bars failed: ${res.status}`)
    }
    const json = (await res.json()) as { bars?: Record<string, number | string>[]; next_page_token?: string | null }
    const bars = json.bars ?? []
    for (const b of bars) {
      out.push({ t: new Date(b.t as string).getTime(), o: +b.o, h: +b.h, l: +b.l, c: +b.c, v: +b.v })
    }
    if (!json.next_page_token) break
    pageToken = json.next_page_token
  }
  return out
}

// Stock OHLC with Alpaca primary + Yahoo fallback. Centralizes the routing so
// every stock path (signals, market rows, backtests) benefits from clean data.
async function getStockBars(
  symbol: string,
  fromMs: number,
  toMs: number,
  interval = "1d",
  revalidate = 300,
): Promise<Candle[]> {
  if (alpacaCreds() && !ALPACA_UNSUPPORTED.has(symbol.toUpperCase())) {
    try {
      const bars = await getAlpacaBars(symbol, fromMs, toMs, interval, revalidate)
      if (bars.length >= 2) return bars
    } catch (err) {
      console.log("[v0] Alpaca failed, falling back to Yahoo:", (err as Error).message)
    }
  }
  return getYahooDaily(symbol, fromMs, toMs, revalidate, interval)
}

// Map an asset id to its Yahoo symbol. Equities/ETFs are 1:1; indices differ
// (e.g. SPX -> ^GSPC for the S&P 500 index).
const YF_SYMBOL: Record<string, string> = { SPX: "^GSPC" }
function yahooSymbol(id: string): string {
  return YF_SYMBOL[id.toUpperCase()] ?? id.toUpperCase()
}

// Fetch OHLC candles for a US stock/ETF/index from Yahoo between two dates at
// the given interval (e.g. "1d" daily, "60m" hourly).
async function getYahooDaily(
  symbol: string,
  fromMs: number,
  toMs: number,
  revalidate = 300,
  interval = "1d",
): Promise<Candle[]> {
  const p1 = Math.floor(fromMs / 1000)
  const p2 = Math.floor(toMs / 1000)
  const url = `${YF}/${encodeURIComponent(yahooSymbol(symbol))}?period1=${p1}&period2=${p2}&interval=${interval}`
  const res = await fetch(url, { headers: YF_HEADERS, next: { revalidate } })
  if (!res.ok) throw new Error(`Yahoo failed: ${res.status}`)
  const json = (await res.json()) as any
  const r = json?.chart?.result?.[0]
  if (!r?.timestamp) return []
  const q = r.indicators?.quote?.[0] ?? {}
  const out: Candle[] = []
  for (let i = 0; i < r.timestamp.length; i++) {
    const o = q.open?.[i]
    const h = q.high?.[i]
    const l = q.low?.[i]
    const c = q.close?.[i]
    const v = q.volume?.[i]
    if ([o, h, l, c].some((v) => v == null || Number.isNaN(v))) continue
    out.push({ t: r.timestamp[i] * 1000, o, h, l, c, v: typeof v === "number" ? v : undefined })
  }
  return out
}

// Fetch recent stock candles for signals: `days` of daily history up to now.
async function getStockChart(symbol: string, days: number, revalidate = 300): Promise<Candle[]> {
  const now = Date.now()
  return getStockBars(symbol, now - days * DAY_MS, now, "1d", revalidate)
}

// Fetch stock candles for an exact time window (used by the verifier).
export async function getStockRangeCandles(symbol: string, fromMs: number, toMs: number): Promise<Candle[]> {
  return getStockBars(symbol, fromMs, toMs, "1d", 3600)
}

// Unified candle fetch for a given analysis timeframe. Drives both signal
// generation and backtests so the tested data matches the displayed data.
// Crypto uses CoinGecko hourly closes bucketed to the timeframe's bar size;
// stocks use Yahoo at the matching interval.
export async function getSignalCandles(id: string, tf: Timeframe): Promise<Candle[]> {
  const cfg = TIMEFRAMES[tf]
  if (isStock(id)) {
    // Any sub-daily interval (5m/15m/60m) uses an explicit period window;
    // daily uses the standard chart fetch. Alpaca serves months of intraday
    // (vs. Yahoo's ~30-day cap), so the intraday-stock lane is now testable.
    if (cfg.stockInterval !== "1d") {
      const now = Date.now()
      return getStockBars(id, now - cfg.stockDays * DAY_MS, now, cfg.stockInterval, 120)
    }
    return getStockChart(id, cfg.stockDays, 300)
  }

  // Crypto: pull DEEP real OHLC from Binance (paginated) so the backtest has
  // enough bars to produce a statistically meaningful trade count. This now
  // covers intraday too — Binance serves YEARS of free 5m/15m/1h candles, which
  // is the data Yahoo cannot provide for stocks. CoinGecko's free tier is too
  // shallow for any of this. Falls back to CoinGecko if the symbol isn't listed
  // or the request fails.
  const ticker = ASSET_BY_ID[id]?.symbol
  if (ticker && cfg.cryptoBinanceInterval) {
    try {
      const now = Date.now()
      const fromMs = now - cfg.cryptoDays * DAY_MS
      const deep = await getBinanceHistory(ticker, fromMs, now, cfg.cryptoBinanceInterval)
      if (deep.length >= 210) return deep
    } catch (err) {
      console.log("[v0] Binance deep history failed, falling back to CoinGecko:", (err as Error).message)
    }
  }
  return getHistoryCandles(id, cfg.cryptoDays, cfg.cryptoBucketHours)
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
  // Stocks: ~9 months of daily candles (enough indicator warmup for a swing call).
  if (isStock(id)) return getStockChart(id, 270, 300)

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
  // Stocks: ~3 years of daily candles for backtesting (well past EMA200 warmup).
  if (isStock(id)) return getStockChart(id, 1095, 1800)

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
    v: Number(r[5]),
  }))
}

// Binance klines cap at 1000 rows per request, so deep history (years of 4h or
// daily candles) must be paginated. We walk forward from `fromMs` in pages
// until we reach `toMs` or the data runs out. Volume is included for the
// indicator volume filter. Used for crypto swing/position backtests where the
// CoinGecko free tier is too shallow to produce a meaningful trade count.
export type BinanceInterval = "5m" | "15m" | "1h" | "4h" | "1d"

// Bar size in ms for each supported Binance interval. Drives pagination so we
// advance the cursor by exactly one bar past the last candle of each page.
const BINANCE_STEP_MS: Record<BinanceInterval, number> = {
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "1d": DAY_MS,
}

export async function getBinanceHistory(
  ticker: string,
  fromMs: number,
  toMs: number,
  interval: BinanceInterval = "4h",
): Promise<Candle[]> {
  const symbol = `${ticker.trim().toUpperCase()}USDT`
  const stepMs = BINANCE_STEP_MS[interval]
  const out: Candle[] = []
  let cursor = fromMs
  // Hard cap the page count so a bad range can never loop forever. Intraday
  // intervals need many more pages (1000 bars/page) to cover months of data,
  // so the cap scales with how fine the interval is.
  const maxPages = interval === "5m" ? 200 : interval === "15m" ? 120 : interval === "1h" ? 80 : 30
  for (let page = 0; page < maxPages && cursor < toMs; page++) {
    const url = `${BINANCE}/klines?symbol=${symbol}&interval=${interval}&startTime=${cursor}&endTime=${toMs}&limit=1000`
    const res = await fetch(url, { headers: { accept: "application/json" }, next: { revalidate: 3600 } })
    if (!res.ok) {
      if (out.length) break // partial history is still useful
      throw new Error(`Binance history failed: ${res.status}`)
    }
    const rows = (await res.json()) as (string | number)[][]
    if (!rows.length) break
    for (const r of rows) {
      out.push({ t: Number(r[0]), o: Number(r[1]), h: Number(r[2]), l: Number(r[3]), c: Number(r[4]), v: Number(r[5]) })
    }
    const lastOpen = Number(rows[rows.length - 1][0])
    if (rows.length < 1000) break // reached the end of available data
    cursor = lastOpen + stepMs // continue after the last candle
  }
  return out
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
