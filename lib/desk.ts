// ============================================================================
// THE DESK — where a user's named, deployed strategies live.
//
// During the free trial there is no account, so we persist to the browser
// (guest Desk). The shape here intentionally mirrors what a Supabase `desk`
// row will hold, so migrating a guest's Desk into their profile on sign-up is
// a straight copy — no reshaping. Keep this shape in sync with Supabase.
// ============================================================================

export type DeskItem = {
  // Stable id for the deployed item (not the strategy id — that stays hidden).
  id: string
  // The user's own name for their strategy (e.g. "My Steady Climber").
  name: string
  // The underlying validated pairing (identity stays hidden from the user UI,
  // but we store the ids so the live engine can resolve levels later).
  strategyId: string
  strategyName: string
  symbol: string
  assetName: string
  timeframe: "swing" | "position"
  // Snapshot of the proven track record at deploy time (for display).
  winRate: number
  expectancy: number
  profitFactor: number
  survived: boolean
  deployedAt: number
}

const KEY = "sightline.desk.guest.v1"

function read(): DeskItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as DeskItem[]) : []
  } catch {
    return []
  }
}

function write(items: DeskItem[]): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(KEY, JSON.stringify(items))
  // Let other components/tabs react to Desk changes.
  window.dispatchEvent(new CustomEvent("desk:changed"))
}

export function getDesk(): DeskItem[] {
  return read().sort((a, b) => b.deployedAt - a.deployedAt)
}

export function addToDesk(item: Omit<DeskItem, "id" | "deployedAt">): DeskItem {
  const full: DeskItem = {
    ...item,
    id: `${item.strategyId}-${item.symbol}-${item.timeframe}-${Date.now()}`,
    deployedAt: Date.now(),
  }
  write([full, ...read()])
  return full
}

export function removeFromDesk(id: string): void {
  write(read().filter((i) => i.id !== id))
}

export function deskCount(): number {
  return read().length
}
