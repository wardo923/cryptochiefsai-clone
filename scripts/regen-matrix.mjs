// Regenerates the PROVEN_PAIRINGS mapping from the REAL backtest engine by
// calling the /api/playbook-matrix endpoint (same engine, same data sources)
// across the full asset universe, then applying the documented robustness bar.
//
// Robustness bar (from mapping.ts header):
//   trades >= 30  AND  expectancy > 0  AND  profitFactor >= 1.3
// Tier:
//   strong = trades >= 60 AND profitFactor >= 1.6
//   proven = otherwise (met the bar)
//
// Usage: node scripts/regen-matrix.mjs > /tmp/matrix.json

const BASE = process.env.MATRIX_BASE ?? "http://localhost:3000"

const CRYPTO = [
  "bitcoin", "ethereum", "solana", "binancecoin", "ripple", "cardano", "dogecoin",
  "avalanche-2", "chainlink", "polkadot", "tron", "matic-network", "litecoin", "near",
  "uniswap", "internet-computer", "aptos", "stellar", "cosmos", "filecoin",
  "hedera-hashgraph", "arbitrum", "optimism", "injective-protocol", "sui",
  "sei-network", "render-token", "the-graph", "fantom", "pepe",
]
const STOCKS = ["SPX", "SPY", "QQQ", "IWM", "DIA", "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "GOOGL"]
const ALL = [...CRYPTO, ...STOCKS]

// mapping timeframe label -> api timeframe id
const TF = [
  { label: "intraday", api: "intraday15m", chunk: 2 },
  { label: "swing", api: "swing", chunk: 3 },
  { label: "position", api: "position", chunk: 3 },
]

function chunkArr(arr, n) {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

async function runChunk(symbols, api, attempt = 0) {
  try {
    const res = await fetch(`${BASE}/api/playbook-matrix`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols, timeframe: api }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return json.rows ?? []
  } catch (err) {
    if (attempt < 2) {
      process.stderr.write(`  retry ${symbols.join(",")} (${err.message})\n`)
      await new Promise((r) => setTimeout(r, 3000))
      return runChunk(symbols, api, attempt + 1)
    }
    process.stderr.write(`  FAILED ${symbols.join(",")} @ ${api}: ${err.message}\n`)
    return []
  }
}

const allRows = []
for (const { label, api, chunk } of TF) {
  process.stderr.write(`\n=== ${label} (${api}) ===\n`)
  for (const group of chunkArr(ALL, chunk)) {
    process.stderr.write(`  ${group.join(", ")}\n`)
    const rows = await runChunk(group, api)
    for (const r of rows) allRows.push({ ...r, mappingTf: label })
  }
}

// Apply the robustness bar and assign tiers.
const passed = allRows
  .filter((r) => r.trades >= 30 && r.expectancy > 0 && r.profitFactor >= 1.3)
  .map((r) => ({
    strategyId: r.strategyId,
    symbol: r.symbol,
    timeframe: r.mappingTf,
    winRate: r.winRate,
    expectancy: r.expectancy,
    profitFactor: r.profitFactor,
    maxDrawdownR: r.maxDrawdownR,
    trades: r.trades,
    tier: r.trades >= 60 && r.profitFactor >= 1.6 ? "strong" : "proven",
  }))

process.stderr.write(`\nTotal evaluated: ${allRows.length}, passed bar: ${passed.length}\n`)
process.stdout.write(JSON.stringify(passed, null, 0))
