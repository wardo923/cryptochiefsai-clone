// Regenerate OOS validation verdicts for the CURRENT proven pairings.
// Calls the real /api/playbook-validate walk-forward endpoint in batches.
import fs from "node:fs"

const BASE = process.env.BASE_URL || "http://localhost:3000"

// The playbook uses a 3-value timeframe (intraday|swing|position) but the
// engine/validate endpoint expects the 5-value engine timeframe. Translate the
// same way regen-matrix.mjs does (intraday -> intraday15m), then relabel the
// verdict back to the playbook label so the OOS keys match mapping.ts exactly.
const TF_TO_API = { intraday: "intraday15m", swing: "swing", position: "position" }
const API_TO_TF = { intraday15m: "intraday", swing: "swing", position: "position" }

// Parse the current PROVEN_PAIRINGS out of mapping.ts (strategyId, symbol, timeframe).
const map = fs.readFileSync("lib/playbook/mapping.ts", "utf8")
const pairings = [...map.matchAll(
  /strategyId: "([^"]+)", symbol: "([^"]+)", timeframe: "([^"]+)"/g,
)].map((m) => ({ strategyId: m[1], symbol: m[2], timeframe: TF_TO_API[m[3]] ?? m[3] }))

console.error(`validating ${pairings.length} pairings`)

const out = []
const BATCH = 8
for (let i = 0; i < pairings.length; i += BATCH) {
  const batch = pairings.slice(i, i + BATCH)
  try {
    const res = await fetch(`${BASE}/api/playbook-validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pairings: batch }),
    })
    const json = await res.json()
    // Relabel engine timeframe back to the playbook label for the OOS key.
    if (json.results) out.push(...json.results.map((r) => ({ ...r, timeframe: API_TO_TF[r.timeframe] ?? r.timeframe })))
    console.error(`  ${Math.min(i + BATCH, pairings.length)}/${pairings.length}`)
  } catch (e) {
    console.error(`  batch ${i} failed: ${e.message}`)
  }
}

fs.writeFileSync("/tmp/validation.json", JSON.stringify(out, null, 2))
console.error(`done: ${out.length} results`)
