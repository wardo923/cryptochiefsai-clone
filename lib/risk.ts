// Position-size calculator. Pure math, no account data is stored anywhere.
// Given an account size, the % of the account to risk, and the trade's entry +
// stop, it returns the share count and dollar figures so a day trader can size
// a position to a fixed risk budget.

export type PositionSizeInput = {
  accountSize: number
  riskPct: number // percent of account to risk on the trade, e.g. 1 = 1%
  entry: number
  stop: number
}

export type PositionSizeResult = {
  riskPerShare: number
  dollarRisk: number // intended dollar risk (accountSize * riskPct%)
  shares: number
  positionValue: number // shares * entry
  leverageX: number // positionValue / accountSize
  valid: boolean
  note: string | null
}

export function positionSize(input: PositionSizeInput): PositionSizeResult {
  const { accountSize, riskPct, entry, stop } = input
  const riskPerShare = Math.abs(entry - stop)
  const dollarRisk = accountSize * (riskPct / 100)

  if (!(accountSize > 0) || !(riskPct > 0) || !(entry > 0) || !(riskPerShare > 0)) {
    return {
      riskPerShare,
      dollarRisk,
      shares: 0,
      positionValue: 0,
      leverageX: 0,
      valid: false,
      note: "Enter a valid account size, risk %, entry and stop.",
    }
  }

  const rawShares = dollarRisk / riskPerShare
  const shares = Math.floor(rawShares)
  const positionValue = shares * entry
  const leverageX = accountSize > 0 ? positionValue / accountSize : 0

  return {
    riskPerShare,
    dollarRisk,
    shares,
    positionValue,
    leverageX,
    valid: shares > 0,
    note:
      shares <= 0
        ? "Risk budget is smaller than one share at this stop distance. Increase risk % or widen the stop."
        : leverageX > 1
          ? "Position value exceeds account size (would require margin/leverage)."
          : null,
  }
}
