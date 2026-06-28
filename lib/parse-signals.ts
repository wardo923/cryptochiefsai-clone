import { STOCK_SYMBOLS } from "./coins"

export type ParsedSignal = {
  raw: string
  symbol: string | null
  direction: "LONG" | "SHORT" | null
  directionInferred: boolean // true when derived from stop placement, not stated
  timestamp: number | null // ms epoch
  entryLow: number | null
  entryHigh: number | null
  stop: number | null
  stopBufferPct: number | null // when stop is given as "X% buffer"
  stopMode: string | null // "Adaptive" | "Entry Zone Based" | "Liquidation Sweep"
  riskPct: number | null // "Risk: 5.00%"
  tps: number[]
  issues: string[] // why a signal can't be fully scored
}

// Pull a number out of a string like "$0.09327" / "1,234.56" / "83.58"
function num(s: string): number {
  return Number(s.replace(/[$,\s]/g, ""))
}

function extractText(text: unknown): string {
  if (typeof text === "string") return text
  if (Array.isArray(text)) {
    return text
      .map((p) => (typeof p === "string" ? p : typeof p?.text === "string" ? p.text : ""))
      .join("")
  }
  return ""
}

// Parse a single message's text block into a signal (or null if no ticker).
export function parseSignalText(raw: string, timestamp: number | null): ParsedSignal | null {
  const text = raw.replace(/\u00a0/g, " ")
  const issues: string[] = []

  // Ticker: crypto pairs (BTC_USDT, SOL/USDT) or a bare known stock (SPY, QQQ).
  const tickerMatch = text.match(/\b([A-Z0-9]{2,12})[\s]*[_/-]\s*USDT?\b/i)
  let symbol = tickerMatch ? tickerMatch[1].toUpperCase() : null
  if (!symbol) {
    const stockMatch = text.match(/\$?\b([A-Z]{1,5})\b/g)
    symbol = stockMatch?.map((s) => s.replace(/[$\s]/g, "").toUpperCase()).find((s) => STOCK_SYMBOLS.has(s)) ?? null
  }
  if (!symbol) return null

  // Direction (stated). Often absent on signal cards — inferred later
  // from stop placement relative to entry.
  let direction: ParsedSignal["direction"] = null
  let directionInferred = false
  if (/\bLONG\b/i.test(text)) direction = "LONG"
  if (/\bSHORT\b/i.test(text)) direction = "SHORT"

  // Entry range: "Entry Range $83.58 - $84.96" or "Entry $83.58"
  let entryLow: number | null = null
  let entryHigh: number | null = null
  const rangeMatch = text.match(
    /entry[^$\d]*\$?\s*([\d.,]+)\s*[-–to]+\s*\$?\s*([\d.,]+)/i,
  )
  if (rangeMatch) {
    entryLow = num(rangeMatch[1])
    entryHigh = num(rangeMatch[2])
  } else {
    const singleMatch = text.match(/entry[^$\d]*\$?\s*([\d.,]+)/i)
    if (singleMatch) {
      entryLow = entryHigh = num(singleMatch[1])
    }
  }
  if (entryLow == null) issues.push("No entry price found")

  // Stop-loss mode (Adaptive / Entry Zone Based / Liquidation Sweep)
  let stopMode: string | null = null
  if (/adaptive/i.test(text)) stopMode = "Adaptive"
  else if (/entry[\s-]*zone[\s-]*based/i.test(text)) stopMode = "Entry Zone Based"
  else if (/liquidation[\s-]*sweep/i.test(text)) stopMode = "Liquidation Sweep"

  // Risk percent: "Risk: 5.00%"
  let riskPct: number | null = null
  const riskMatch = text.match(/risk[^\d%]*([\d.]+)\s*%/i)
  if (riskMatch) riskPct = Number(riskMatch[1])

  // Stop loss: explicit price or "X% buffer". Avoid matching the Risk % line.
  let stop: number | null = null
  let stopBufferPct: number | null = null
  const stopPrice = text.match(/stop[^$\d%]*\$?\s*([\d.,]+)(?!\s*%)/i)
  const stopBuffer = text.match(/([\d.]+)\s*%\s*buffer/i)
  if (stopPrice) stop = num(stopPrice[1])
  else if (stopBuffer) stopBufferPct = Number(stopBuffer[1])
  else if (riskPct != null) stopBufferPct = riskPct // "Risk 5%" implies a 5% stop

  // Infer direction from stop placement when not explicitly stated.
  if (!direction && stop != null && entryLow != null) {
    const entryMid = (entryLow + (entryHigh ?? entryLow)) / 2
    direction = stop < entryMid ? "LONG" : "SHORT"
    directionInferred = true
  }
  if (!direction) issues.push("No direction (not stated, and no stop to infer from)")
  if (stop == null && stopBufferPct == null) issues.push("No stop-loss found")

  // Take-profit ladder (optional — many signal cards omit fixed TPs
  // and exit on 4h acceptance, so a missing TP is NOT a blocker).
  const tps: number[] = []
  const tpRegex = /(?:tp\s*\d|take[\s-]*profit)[\s:$=-]*([\d.,]+)/gi
  let m: RegExpExecArray | null
  while ((m = tpRegex.exec(text))) {
    const v = num(m[1])
    if (Number.isFinite(v)) tps.push(v)
  }

  if (timestamp == null) issues.push("No timestamp (cannot replay against price)")

  return {
    raw: raw.slice(0, 280),
    symbol,
    direction,
    directionInferred,
    timestamp,
    entryLow,
    entryHigh,
    stop,
    stopBufferPct,
    stopMode,
    riskPct,
    tps,
    issues,
  }
}

// Parse a Telegram export. Accepts the JSON export ({ messages: [...] }),
// an array of messages, or raw pasted text (one signal per blank-line block).
export function parseExport(input: string): ParsedSignal[] {
  const trimmed = input.trim()
  if (!trimmed) return []

  // Try JSON first (Telegram Desktop "Export chat history" -> JSON)
  try {
    const json = JSON.parse(trimmed)
    const messages: any[] = Array.isArray(json) ? json : (json.messages ?? [])
    const out: ParsedSignal[] = []
    for (const msg of messages) {
      const text = extractText(msg.text ?? msg.message ?? "")
      if (!text) continue
      let ts: number | null = null
      if (msg.date_unixtime) ts = Number(msg.date_unixtime) * 1000
      else if (typeof msg.date === "string") {
        const parsed = Date.parse(msg.date)
        ts = Number.isNaN(parsed) ? null : parsed
      }
      const sig = parseSignalText(text, ts)
      if (sig) out.push(sig)
    }
    return out
  } catch {
    // Not JSON: treat as pasted text, split into blocks by blank lines
    const blocks = trimmed.split(/\n\s*\n/)
    const out: ParsedSignal[] = []
    for (const block of blocks) {
      // Try to find an ISO date in the block
      const dateMatch = block.match(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?/)
      const ts = dateMatch ? Date.parse(dateMatch[0]) : null
      const sig = parseSignalText(block, Number.isNaN(ts as number) ? null : ts)
      if (sig) out.push(sig)
    }
    return out
  }
}
