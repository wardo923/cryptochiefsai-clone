// Path B: run candidate coins through the REAL walk-forward validator.
// Keeps only robust/fragile verdicts (inconclusive = not enough OOS signal).

const BASE = process.env.BASE_URL || "http://localhost:3000"

const STRATEGIES = [
  "trend-rider",
  "momentum-burst",
  "pullback-buyer",
  "range-reversal",
  "breakout-hunter",
  "golden-trend",
  "supertrend-follow",
  "band-fade",
]

// Unvalidated candidates (crypto ids from lib/coins.ts not already in OOS_VALIDATION)
const CANDIDATES = [
  "ripple", "chainlink", "polkadot", "tron", "matic-network", "litecoin",
  "near", "uniswap", "internet-computer", "aptos", "stellar", "cosmos",
  "filecoin", "hedera-hashgraph", "arbitrum", "optimism", "injective-protocol",
  "sei-network", "render-token", "the-graph", "fantom", "pepe",
]

const TIMEFRAMES = ["swing", "position"]

function pairingsFor(symbol) {
  const out = []
  for (const tf of TIMEFRAMES) for (const s of STRATEGIES) out.push({ strategyId: s, symbol, timeframe: tf })
  return out
}

const all = []
for (const symbol of CANDIDATES) {
  process.stderr.write(`\n=== ${symbol} ===\n`)
  try {
    const res = await fetch(`${BASE}/api/playbook-validate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pairings: pairingsFor(symbol) }),
    })
    if (!res.ok) { process.stderr.write(`  HTTP ${res.status}\n`); continue }
    const json = await res.json()
    for (const r of json.results ?? []) {
      const keep = r.verdict === "robust" || r.verdict === "fragile"
      if (keep) all.push(r)
      const flag = r.verdict === "robust" ? "GOLD " : r.verdict === "fragile" ? "keep " : "  -  "
      process.stderr.write(
        `  ${flag}${r.strategyId}|${r.symbol}|${r.timeframe} -> ${r.verdict} (cons ${r.consistency}%, holdout ${r.holdoutExpectancy ?? "n/a"})${r.error ? " ["+r.error+"]" : ""}\n`,
      )
    }
  } catch (e) {
    process.stderr.write(`  ERROR ${e.message}\n`)
  }
}

// Summary: which coins earned robust vs fragile pairings
const bySymbol = {}
for (const r of all) {
  bySymbol[r.symbol] ??= { robust: 0, fragile: 0 }
  bySymbol[r.symbol][r.verdict]++
}

const robustCoins = Object.entries(bySymbol).filter(([, c]) => (c.robust || 0) > 0).map(([s]) => s)

import { writeFileSync } from "node:fs"
writeFileSync(
  new URL("./new-coins-result.json", import.meta.url),
  JSON.stringify({ bySymbol, robustCoins, all }, null, 2),
)
process.stderr.write(`\n\nWrote scripts/new-coins-result.json\n`)
process.stderr.write(`Coins with >=1 ROBUST pairing: ${robustCoins.join(", ")}\n`)
