# Strategy Card — Designer / Replit Handoff Spec

How to display a matched/deployed strategy on the **wizard result screen** and the **Desk card**. The rule of thumb: show enough that a user can *trust* the strategy and *size their risk*, never enough to *reverse-engineer the rules*.

---

## 1. The data contract (what the engine hands you)

Every strategy is one `PublicPairing` object. These are the ONLY fields that exist client-side — the entry/exit logic is deliberately not included.

| Field | Type | Example | Use it for |
|---|---|---|---|
| `strategyName` | string | "Trend Rider" | Card title (user-facing alias) |
| `assetName` | string | "Nasdaq 100 ETF" | Subtitle |
| `symbol` | string | "QQQ" | Small ticker chip |
| `assetClass` | "crypto" \| "stock" | "stock" | Icon / grouping |
| `timeframe` | "swing" \| "position" | "swing" | Horizon badge (see §2) |
| `winRate` | number (%) | 61 | "Wins X% of the time" — **never alone** |
| `expectancy` | number (R) | 0.119 | Translate, don't print raw (see §3) |
| `profitFactor` | number | 1.45 | "Winners outweigh losers 1.45x" |
| `maxDrawdownR` | number (R) | 6.2 | The risk/"reading" number + calculator input |
| `trades` | number | 77 | "Tested across 77 trades" (credibility) |
| `oosVerdict` | "robust" \| "fragile" \| "inconclusive" \| "untested" | "robust" | "Survived OOS" badge when `robust` |
| `oosConsistency` | number (%) \| null | 100 | "Held up in X% of test windows" |

**NEVER displayed / never sent to client:** the strategy's entry rules, exit rules, indicator settings, internal id, or `edge`/`evaluate`. If the designer asks "what makes it trigger?" the answer is: that stays hidden by design.

---

## 2. Card layout — the three-part honesty stack

**Part A — What it is**
- Title: `strategyName` + ticker chip (`symbol`)
- Subtitle: `assetName`
- Horizon badge: `timeframe === "swing"` → **"Holds for days"**, `"position"` → **"Holds for weeks"**
- Gold **"Survived OOS"** badge ONLY when `oosVerdict === "robust"`. This is the hero trust element — make it prominent.
- The quiet-day line: *"Only acts when its conditions are present — it sits out otherwise. That patience is already in its track record."*

**Part B — Why this fits you** (wizard result only)
- Render the `reasons[]` array as 2–4 short bullet lines. Already plain-English; do not modify.

**Part C — How it actually behaved** (the track record)
- Win rate, profit factor, max drawdown, trades tested — see §3 for wording.
- Show these as a small stat row, all together, never win rate in isolation.

---

## 3. Stat wording — translate the jargon

| Raw stat | Show to beginner | Detail-on-tap (optional) |
|---|---|---|
| `winRate` 61 | "Won 61% of trades in testing" | — |
| `expectancy` 0.119R | "On average, each trade gained more than it risked" | "+0.119R per trade" |
| `profitFactor` 1.45 | "Winners outweighed losers by 1.45x" | — |
| `maxDrawdownR` 6.2 | "Roughest losing streak in testing: about 6 trades' worth of risk" | "−6.2R max drawdown" |
| `trades` 77 | "Tested across 77 trades" | — |
| `oosConsistency` 100 | "Held up in 100% of out-of-sample windows" | — |

**Hard rule:** win rate must always render adjacent to drawdown + sample size. A win rate shown alone reads as a promise — that's the one thing we never do.

---

## 4. The Position-Size Calculator (the honest "calculator")

This is the calculator to build. It does **NOT predict profit**. It answers: *"How much should I risk per trade so the strategy's worst historical losing streak wouldn't wipe me out?"*

### Inputs (user enters)
- **Account size** ($)
- **Risk per trade** (%) — default 1%, cap the slider at 2% and warn above that.

### Outputs (calculated)
1. **Dollars risked per trade:**
   `riskPerTrade$ = accountSize * (riskPct / 100)`

2. **Survivable-streak reality check** (this is the trust-builder — uses real `maxDrawdownR`):
   `worstStreak$ = maxDrawdownR * riskPerTrade$`
   `worstStreakPctOfAccount = (worstStreak$ / accountSize) * 100`

   Display: *"At {riskPct}% risk, this strategy's roughest tested losing streak (~{maxDrawdownR}R) would have drawn down about **{worstStreakPctOfAccount}%** of your account. Make sure you can sit through that."*

### Wording / guardrails
- Frame everything as **risk and survival**, never as expected gains.
- Do NOT multiply win rate × account to show projected returns — that's a prediction and is banned.
- Add the standing line: *"This is a risk guide, not a profit forecast. No strategy's past results guarantee future ones."*

### Why this is the right formula to expose
Win rate alone can't tell a user how to trade safely — but win rate + drawdown + their own risk % can tell them how to **not blow up**. That's process, on-brand, and Apple-review safe.

---

## 5. Live state indicator (Desk card)

Three honest states, driven by existing strategy state — never invent one:
- **"Conditions aligning"** — setup forming.
- **"Watching — no setup today"** — standing aside (normal/healthy, not a failure).
- **"In a trade"** — position active.

---

## 6. Tone rules (apply everywhere on the card)
- Descriptive, never imperative. "Conditions are present", never "buy now".
- Quiet days are a feature. Never imply the user is missing out.
- Never show or imply a profit projection.
- Never reveal entry/exit logic.
