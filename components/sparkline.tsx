type Props = {
  data: number[]
  width?: number
  height?: number
  positive?: boolean
  className?: string
}

export function Sparkline({ data, width = 96, height = 32, positive = true, className }: Props) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className={className} aria-hidden />
  }
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)
  const points = data
    .map((v, i) => {
      const x = i * step
      const y = height - ((v - min) / range) * height
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(" ")

  const stroke = positive ? "var(--color-chart-3)" : "var(--color-destructive)"

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label="7 day price trend"
      preserveAspectRatio="none"
    >
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
