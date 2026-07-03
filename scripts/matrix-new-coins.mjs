// In-sample backtest matrix for candidate coins -> produces PROVEN_PAIRINGS rows.
// Robustness bar (from mapping.ts): trades >= 30 AND expectancy > 0 AND profitFactor >= 1.3
// tier: strong = trades >= 60 AND profitFactor >= 1.6, else proven
import { writeFileSync } from "node:fs"

const BASE = process.env.BASE_URL || "http://localhost:3000"

const CANDIDATES = [
  "ripple", "chainlink", "polkadot", "tron", "matic-network", "litecoin",
  "near", "uniswap", "internet-computer", "aptos", "stellar", "cosmos",
  "filecoin", "hedera-hashgraph", "arbitrum", "optimism", "injective-protocol",
  "sei-network", "render-token", "the-graph", "fantom", "pepe",
]
const TIMEFRAMES = ["swing", "position"]

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d
const proven = []
const rawByTf = {}

for (const timeframe of TIMEFRAMES) {
  process.stderr.write(`\n### timeframe=${timeframe}\n`)
  const res = await fetch(`${BASE}/api/playbook-matrix`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ symbols: CANDIDATES, timeframe }),
  })
  if (!res.ok) { process.stderr.write(`  HTTP ${res.status}\n`); continue }
  const json = await res.json()
  rawByTf[timeframe] = json.rows ?? []
  for (const r of json.rows ?? []) {
    const pass = r.trades >= 30 && r.expectancy > 0 && r.profitFactor >= 1.3
    if (!pass) continue
    const tier = r.trades >= 60 && r.profitFactor >= 1.6 ? "strong" : "proven"
    proven.push({
      strategyId: r.strategyId,
      symbol: r.symbol,
      timeframe,
      winRate: round(r.winRate, 1),
      expectancy: round(r.expectancy, 3),
      profitFactor: round(r.profitFactor, 2),
      maxDrawdownR: round(r.maxDrawdownR, 2),
      trades: r.trades,
      tier,
    })
    process.stderr.write(`  PASS ${r.strategyId}|${r.symbol}|${timeframe} tr=${r.trades} exp=${round(r.expectancy,3)} pf=${round(r.profitFactor,2)} (${tier})\n`)
  }
}

const symbolsWithProven = [...new Set(proven.map((p) => p.symbol))]
writeFileSync(new URL("./matrix-new-result.json", import.meta.url), JSON.stringify({ symbolsWithProven, proven, rawByTf }, null, 2))
process.stderr.write(`\n\nCoins with >=1 PROVEN in-sample pairing: ${symbolsWithProven.join(", ")}\n`)
process.stderr.write(`Total proven pairings: ${proven.length}\n`)

// Emit paste-ready PROVEN_PAIRINGS lines
console.log("\n// --- NEW proven pairings (paste into PROVEN_PAIRINGS) ---")
for (const p of proven) {
  console.log(`  { strategyId: "${p.strategyId}", symbol: "${p.symbol}", timeframe: "${p.timeframe}", winRate: ${p.winRate}, expectancy: ${p.expectancy}, profitFactor: ${p.profitFactor}, maxDrawdownR: ${p.maxDrawdownR}, trades: ${p.trades}, tier: "${p.tier}" },`)
}
