// Combine in-sample proven pairings + OOS verdicts into paste-ready TS blocks.
// Only emits OOS decorations for pairings that actually made PROVEN_PAIRINGS.
import { readFileSync } from "node:fs"

const matrix = JSON.parse(readFileSync(new URL("./matrix-new-result.json", import.meta.url)))
const oos = JSON.parse(readFileSync(new URL("./new-coins-result.json", import.meta.url)))

const oosByKey = {}
for (const r of oos.all) oosByKey[`${r.strategyId}|${r.symbol}|${r.timeframe}`] = r

const proven = matrix.proven
// Stable order: group by symbol (in candidate order), then timeframe, then strategy
const provenLines = proven.map(
  (p) =>
    `  { strategyId: "${p.strategyId}", symbol: "${p.symbol}", timeframe: "${p.timeframe}", winRate: ${p.winRate}, expectancy: ${p.expectancy}, profitFactor: ${p.profitFactor}, maxDrawdownR: ${p.maxDrawdownR}, trades: ${p.trades}, tier: "${p.tier}" },`,
)

const oosLines = []
for (const p of proven) {
  const key = `${p.strategyId}|${p.symbol}|${p.timeframe}`
  const r = oosByKey[key]
  if (!r) continue // no OOS row (was inconclusive/omitted) -> leave untested, honest
  oosLines.push(
    `  "${key}": { verdict: "${r.verdict}", consistency: ${r.consistency}, positiveFolds: ${r.positiveFolds}, totalFolds: ${r.totalFolds}, holdoutExpectancy: ${r.holdoutExpectancy} },`,
  )
}

console.log("=== PROVEN_PAIRINGS block ===")
console.log(provenLines.join("\n"))
console.log("\n=== OOS_VALIDATION block ===")
console.log(oosLines.join("\n"))
console.log(`\n=== counts: ${provenLines.length} proven, ${oosLines.length} oos-decorated, ${matrix.symbolsWithProven.length} coins ===`)
