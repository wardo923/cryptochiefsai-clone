export type ParsedSignal = {
  raw: string
  symbol: string | null
  direction: "LONG" | "SHORT" | null
  timestamp: number | null // ms epoch
  entryLow: number | null
  entryHigh: number | null
  stop: number | null
  stopBufferPct: number | null // when stop is given as "X% buffer"
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

  // Ticker: BTC_USDT, SOL/USDT, RLC_USDT, etc.
  const tickerMatch = text.match(/\b([A-Z0-9]{2,12})[\s]*[_/-]\s*USDT?\b/i)
  const symbol = tickerMatch ? tickerMatch[1].toUpperCase() : null
  if (!symbol) return null

  // Direction
  let direction: ParsedSignal["direction"] = null
  if (/\bLONG\b/i.test(text)) direction = "LONG"
  if (/\bSHORT\b/i.test(text)) direction = "SHORT"
  if (!direction) issues.push("No direction (LONG/SHORT) found")

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

  // Stop loss: explicit price or "X% buffer"
  let stop: number | null = null
  let stopBufferPct: number | null = null
  const stopPrice = text.match(/stop[^$\d%]*\$?\s*([\d.,]+)(?!\s*%)/i)
  const stopBuffer = text.match(/([\d.]+)\s*%\s*buffer/i)
  if (stopPrice) stop = num(stopPrice[1])
  else if (stopBuffer) stopBufferPct = Number(stopBuffer[1])
  if (stop == null && stopBufferPct == null) issues.push("No stop-loss found (assumed 5%)")

  // Take-profit ladder: TP1/TP2/TP3 or "Take Profit" levels
  const tps: number[] = []
  const tpRegex = /(?:tp\s*\d|take[\s-]*profit)[\s:$=-]*([\d.,]+)/gi
  let m: RegExpExecArray | null
  while ((m = tpRegex.exec(text))) {
    const v = num(m[1])
    if (Number.isFinite(v)) tps.push(v)
  }
  if (tps.length === 0) issues.push("No take-profit target found")

  if (timestamp == null) issues.push("No timestamp (cannot replay against price)")

  return {
    raw: raw.slice(0, 280),
    symbol,
    direction,
    timestamp,
    entryLow,
    entryHigh,
    stop,
    stopBufferPct,
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
