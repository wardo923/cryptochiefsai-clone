// US equity session helpers, expressed in Eastern Time (DST-aware via Intl).
// Regular US cash session is 09:30–16:00 ET, Monday–Friday. These helpers power
// the day-trade dashboard's session clock, VWAP/opening-range anchoring, and
// the (display-only) no-trade-window warnings.

export type SessionPhase =
  | "preopen"
  | "open_drive" // first 30 minutes
  | "midday"
  | "power_hour" // final hour
  | "close" // final 10 minutes
  | "after_hours"
  | "closed" // weekend / non-trading day

export type ETParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  weekday: number // 0=Sun … 6=Sat
  minutesSinceMidnight: number
}

const ET_TZ = "America/New_York"
const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

// Decompose a timestamp into Eastern-Time calendar parts (handles EST/EDT).
export function etParts(t: number | Date): ETParts {
  const date = typeof t === "number" ? new Date(t) : t
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: ET_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  })
  const parts = fmt.formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0"
  let hour = Number(get("hour"))
  if (hour === 24) hour = 0 // Intl can emit "24" at midnight
  const minute = Number(get("minute"))
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour,
    minute,
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 0,
    minutesSinceMidnight: hour * 60 + minute,
  }
}

const OPEN_MIN = 9 * 60 + 30 // 09:30
const CLOSE_MIN = 16 * 60 // 16:00

export function isWeekday(parts: ETParts): boolean {
  return parts.weekday >= 1 && parts.weekday <= 5
}

// Is the regular US cash session open at this instant?
export function isRegularHours(t: number | Date): boolean {
  const p = etParts(t)
  if (!isWeekday(p)) return false
  return p.minutesSinceMidnight >= OPEN_MIN && p.minutesSinceMidnight < CLOSE_MIN
}

// Classify the current session phase for an equity.
export function sessionPhase(t: number | Date): SessionPhase {
  const p = etParts(t)
  if (!isWeekday(p)) return "closed"
  const m = p.minutesSinceMidnight
  if (m < OPEN_MIN) return "preopen"
  if (m >= CLOSE_MIN) return "after_hours"
  if (m < OPEN_MIN + 30) return "open_drive"
  if (m >= CLOSE_MIN - 10) return "close"
  if (m >= CLOSE_MIN - 60) return "power_hour"
  return "midday"
}

// Human label for a phase.
export const PHASE_LABEL: Record<SessionPhase, string> = {
  preopen: "Pre-market",
  open_drive: "Opening drive (first 30m)",
  midday: "Midday",
  power_hour: "Power hour",
  close: "Closing (final 10m)",
  after_hours: "After hours",
  closed: "Market closed",
}

// Display-only no-trade window for equities: outside regular hours, or in the
// chop-prone first/last few minutes. (Not enforced in alerts — informational.)
export function noTradeWindow(t: number | Date): { blocked: boolean; reason: string | null } {
  const p = etParts(t)
  if (!isWeekday(p)) return { blocked: true, reason: "Weekend — market closed" }
  const m = p.minutesSinceMidnight
  if (m < OPEN_MIN || m >= CLOSE_MIN) return { blocked: true, reason: "Outside regular hours (09:30–16:00 ET)" }
  if (m < OPEN_MIN + 5) return { blocked: true, reason: "First 5 minutes — let the open settle" }
  if (m >= CLOSE_MIN - 5) return { blocked: true, reason: "Final 5 minutes — closing auction risk" }
  return { blocked: false, reason: null }
}

// Start-of-session timestamp (09:30 ET today, or the UTC day start for 24/7
// crypto) used to anchor VWAP and the opening range. Returns ms epoch.
export function sessionAnchorMs(t: number | Date, isCrypto: boolean): number {
  const date = typeof t === "number" ? new Date(t) : t
  if (isCrypto) {
    // Anchor crypto to the start of the current UTC day.
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  }
  // For equities, find the epoch ms corresponding to 09:30 ET on the ET date of t.
  const p = etParts(date)
  // Binary-search-free approach: compute via a probe timestamp. We know the ET
  // calendar date; construct candidate UTC times and adjust using the ET offset
  // implied by formatting. Start from the UTC midnight guess for that date.
  // Determine ET offset (minutes) at this instant.
  const offsetMin = etOffsetMinutes(date)
  // 09:30 ET in UTC = 09:30 + offset. offset is negative for ET (e.g. -240).
  const utcMinutes = OPEN_MIN - offsetMin
  const anchor = Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0) + utcMinutes * 60 * 1000
  return anchor
}

// Eastern-Time UTC offset in minutes for a given instant (e.g. -240 EDT, -300 EST).
export function etOffsetMinutes(t: number | Date): number {
  const date = typeof t === "number" ? new Date(t) : t
  // Format the same instant as ET and as UTC, then diff the wall-clock times.
  const etFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: ET_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = etFmt.formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0")
  let etHour = get("hour")
  if (etHour === 24) etHour = 0
  const etWall = Date.UTC(get("year"), get("month") - 1, get("day"), etHour, get("minute"))
  const utcWall = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
  )
  return Math.round((etWall - utcWall) / 60000)
}
