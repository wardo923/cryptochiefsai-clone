export function formatPrice(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—"
  if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
  if (n >= 1) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 4 })}`
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 8 })}`
}

export function formatCompact(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—"
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n)
}

export function formatPct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—"
  const sign = n > 0 ? "+" : ""
  return `${sign}${n.toFixed(2)}%`
}
