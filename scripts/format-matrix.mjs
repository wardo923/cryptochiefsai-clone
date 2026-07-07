import { readFileSync } from "node:fs"

const rows = JSON.parse(readFileSync("/tmp/matrix.json", "utf8"))

const tfOrder = { intraday: 0, swing: 1, position: 2 }
rows.sort((a, b) => {
  if (tfOrder[a.timeframe] !== tfOrder[b.timeframe]) return tfOrder[a.timeframe] - tfOrder[b.timeframe]
  if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol)
  return b.expectancy - a.expectancy
})

const fmt = (r) =>
  `  { strategyId: ${JSON.stringify(r.strategyId)}, symbol: ${JSON.stringify(r.symbol)}, timeframe: ${JSON.stringify(r.timeframe)}, winRate: ${r.winRate}, expectancy: ${r.expectancy}, profitFactor: ${r.profitFactor}, maxDrawdownR: ${r.maxDrawdownR}, trades: ${r.trades}, tier: ${JSON.stringify(r.tier)} },`

const sections = [
  ["intraday", "  // --- Intraday / same-session (15m bars, flat by the close) ---"],
  ["swing", "  // --- Swing (multi-day holds) ---"],
  ["position", "  // --- Position (multi-week holds) ---"],
]

const lines = []
for (const [tf, header] of sections) {
  const group = rows.filter((r) => r.timeframe === tf)
  if (!group.length) continue
  lines.push(header)
  for (const r of group) lines.push(fmt(r))
}

const strong = rows.filter((r) => r.tier === "strong").length
process.stderr.write(`rows: ${rows.length} (strong: ${strong}, proven: ${rows.length - strong})\n`)
process.stdout.write(lines.join("\n"))
