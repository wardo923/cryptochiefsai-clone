# SightLine — Full System Audit Report
**Prepared for:** Third-Party Audit Review
**Date:** June 28, 2026
**Version:** Registry v3 (June 2026 expansion)
**Scope:** Wizard → Normalizer → Scoring → Filter Pipeline → Strategy Matrix → Backtest Engine

---

## IMPORTANT DISCLAIMER

All backtest results in this document are produced by an **educational simulation engine** (`source: 'educational-backtest-simulation'`). They are derived from historical price data using deterministic rule sets applied retrospectively. Past performance of a simulated strategy does not guarantee future results. Win rates, expectancy figures, and drawdown estimates are provided for informational and structural audit purposes only — not as trading recommendations, financial advice, or guarantees of profit. SightLine is a structured monitoring and alerting tool, not a financial advisor or broker.

---

## SECTION 1 — WIZARD ARCHITECTURE

### 1.1 User-Facing Steps (6 Questions)

The wizard captures 6 answers from the user. No strategy names are shown at any point during the wizard.

| Step | ID | Question | Options |
|---|---|---|---|
| 01/06 | `market` | What do you trade? | `equity` (Stocks & ETFs), `crypto`, `both` |
| 02/06 | `selectedAssets` | Which ticker do you trade most? | See §1.3 — filtered by market |
| 03/06 | `holdingStyle` | How long do you typically hold? | `minutes`, `hours`, `days_1_3`, `multi_day` |
| 04/06 | `marketConditions` | What market frustrates you most? | `choppy`, `fast_volatile`, `slow_grinding`, `trend_reversals` |
| 05/06 | `riskStyle` | How do you approach risk? | `conservative`, `balanced`, `aggressive` |
| 06/06 | `experience` | How long have you been trading? | `beginner`, `developing`, `experienced`, `advanced` |

### 1.2 Silent Defaults (Never Shown to User)

These values are set automatically and never presented in the wizard UI.

| Field | Default | Source |
|---|---|---|
| `confirmationStyle` | `"balanced"` | System default |
| `tradeFrequencyPreference` | `"balanced"` | Derived from `alertFrequency = "daily"` |
| `selectivity` | `A_PLUS_AND_A` | Derived from `alertFrequency = "daily"` |
| `directionPreference` | `"both"` | System default |
| `userFailedAttemptLimit` | `2` | System default |

### 1.3 Ticker Roster (All Validated — Backtest Lanes Exist)

**Equity / ETF tickers (shown when market = equity or both):**
SPY, QQQ, IWM, DIA, AAPL, MSFT, NVDA, TSLA, AMD, META, AMZN, GOOGL, NFLX, COIN, PLTR, SOFI, SMCI, MSTR, AVGO, MU, PYPL, SHOP

**Crypto tickers (shown when market = crypto or both):**
BTC, ETH, SOL, XRP, DOGE

---

## SECTION 2 — ANSWER NORMALIZER

The `wizard-answer-normalizer.ts` module translates user-facing option values into canonical engine values before any scoring or filtering occurs. It also provides backward compatibility for users with saved wizard state in old formats.

### 2.1 Holding Style → Engine Holding Style

| User Selection | Engine Value | Description |
|---|---|---|
| `minutes` | `intraday` | Same-session, short holds |
| `hours` | `intraday` | Intraday, exits before close |
| `days_1_3` | `swing` | 1–3 day swing trades |
| `multi_day` | `swing` | Multi-day swing holds |

> `position` (multi-week) exists as a registry holdingStyle used in validated lanes. It is not currently a user-selectable wizard option.

### 2.2 Market Conditions (Frustration Mapping) → Setup Preference

This is the primary setup style classifier. The user selects which market *frustrates* them most — the engine maps this to the setup type their assigned system is **built to handle**.

| User Selection | Engine `setupPreference` | Reasoning |
|---|---|---|
| `choppy` | `pullback` | Choppy markets frustrate breakout traders; pullback systems require trending structure |
| `fast_volatile` | `breakout` | Volatile spikes frustrate level traders; breakout systems frame entries in directional expansion |
| `slow_grinding` | `key_levels` | Grinding frustrates momentum traders; key-level systems require patience at structure |
| `trend_reversals` | `reversal` | Snap reversals frustrate trend followers; reversal systems are designed for turning points |

### 2.3 Risk Style → Engine Risk Style

| User Selection | Engine Value |
|---|---|
| `conservative` | `tight` |
| `balanced` | `balanced` |
| `aggressive` | `wider` |

### 2.4 Experience → Engine Experience Level

| User Selection | Engine Value |
|---|---|
| `beginner` | `beginner` |
| `developing` | `intermediate` |
| `experienced` | `intermediate` |
| `advanced` | `advanced` |

### 2.5 Alert Frequency → Selectivity + Trade Frequency

| Alert Frequency | Selectivity | Trade Frequency |
|---|---|---|
| `only_best` | `A_PLUS_ONLY` | `very_selective` |
| `few_per_week` | `A_PLUS_AND_A` | `very_selective` |
| `daily` *(default)* | `A_PLUS_AND_A` | `balanced` |
| `as_many` | `A_PLUS_AND_A` | `more_opportunities` |

---

## SECTION 3 — SCORING ENGINE

### 3.1 100-Point Weighted Model

Every strategy × asset × holdingStyle combination is scored independently. The highest-scoring approved candidate is assigned.

| Dimension | Points | Scoring Rule |
|---|---|---|
| `setupPreference` | 25 | Exact match only (0 if no match). `no_preference` → 15 base + up to 5 hint bonus |
| `holdingStyle` | 20 | Full 20 if strategy supports style AND lane data exists; 14/20 (70%) if supported but no lane data |
| `confirmationStyle` | 10 | Full 10 for exact match; 5 for adjacent (early↔balanced, balanced↔strict) |
| `riskStyle` | 10 | Exact match only |
| `tradeFrequencyPreference` | 10 | Exact match only |
| `experience` | 10 | Full 10 for exact; 5 for adjacent. Advanced always gets partial for intermediate strategies |
| `directionPreference` | 5 | Full 5 if strategy supports direction; 3/5 partial if user selects 'both' |
| `selectivity` | 5 | Exact match only |
| `assetValidation` | 5 | `winRate × 1.6 × 5`, capped at 5. Requires approved lane status |
| **Total** | **100** | |

### 3.2 Grade Thresholds

| Score | Grade | Outcome |
|---|---|---|
| ≥ 80 | **A+** | Assigned |
| 65–79 | **A** | Assigned |
| < 65 | — | **No assignment** — explicit no-match screen shown. No silent fallback. No random assignment. |

---

## SECTION 4 — 10-STEP FILTER PIPELINE

The filter pipeline runs before scoring. Each step eliminates strategies that structurally cannot serve the user's profile. Steps run in this exact order:

| Step | Filter Function | Rejection Code | Logic |
|---|---|---|---|
| 1 | `filterByMarket` | `REJECT_MARKET` | User's market (equity/crypto/both) must match `strategy.supportedMarkets` |
| 2 | `filterByExperience` | `REJECT_EXPERIENCE` | User's normalized experience level must be in `strategy.supportedExperienceLevels` |
| 3 | `filterBySelectivity` | `REJECT_SELECTIVITY` | User's selectivity mode must match `strategy.supportedSelectivity` |
| 4 | `filterByHoldingStyle` | `REJECT_HOLDING_STYLE` | User's holdingStyle must be in `strategy.supportedHoldingStyles` |
| 5 | `filterBySetupPreference` | `REJECT_SETUP_TYPE` | Direct match OR adjacency allowed. Adjacency map: pullback↔key_levels, breakout↔pullback, reversal↔key_levels |
| 6 | `filterByConfirmation` | `REJECT_CONFIRMATION` | User's confirmationStyle must be in `strategy.supportedConfirmationStyles` |
| 7 | `filterByRisk` | `REJECT_RISK` | User's riskStyle must be in `strategy.supportedRiskStyles` |
| 8 | `filterByFrequency` | `REJECT_FREQUENCY` | User's tradeFrequencyPreference must be in `strategy.supportedFrequencyModes` |
| 9 | `filterByDirection` | `REJECT_DIRECTION` | User's directionPreference must match. 'both' always passes |
| 10 | `validateLane` | Multiple | Hard gates: lane status = 'approved' AND win rate ≥ break-even threshold AND strategy.active = true AND plan asset limit not exceeded |

### 4.1 Win Rate Break-Even Thresholds

| R:R Ratio | Break-Even Win Rate | Strategies |
|---|---|---|
| 2.0 : 1 | **33.3%** (1 ÷ 3) | BKOUT, EMA, MOMO, TPULL |
| 1.5 : 1 | **40.0%** (2 ÷ 5) | ORB, RFADE, REV, SUPP |

### 4.2 Plan-Based Asset Limits

| Plan | Max Active Assets |
|---|---|
| Trial | 1 |
| Foundation | 1 |
| Pro | 3 |
| Elite | 8 |

---

## SECTION 5 — STRATEGY REGISTRY SUMMARY

| ID | Name | R:R | Break-Even WR | Active | Approved Lanes | Assets |
|---|---|---|---|---|---|---|
| TPULL | Trend Pullback | 2.0 | 33.3% | Yes | 28 | 21 |
| SUPP | Support Bounce | 1.5 | 40.0% | Yes | 29 | 19 |
| BKOUT | Breakout Retest | 2.0 | 33.3% | Yes | 31 | 25 |
| MOMO | Momentum Continuation | 2.0 | 33.3% | Yes | 30* | 23 |
| ORB | Opening Range Breakout | 1.5 | 40.0% | Yes | 26* | 23 |
| RFADE | Range Fade | 1.5 | 40.0% | Yes | 11* | 12 |
| EMA | EMA Crossover | 2.0 | 33.3% | **No** | 6 (inactive) | 5 |
| REV | Reversal Pattern | 1.5 | 40.0% | **No** | 3 (inactive) | 2 |

*MOMO:NFLX:intraday — inactive pending onboarding. ORB:AVAX:swing and RFADE:AVAX:swing — disabled pending CoinGecko retry.

---

## SECTION 6 — STRATEGY DEFINITIONS AND BACKTEST LOGIC

### 6.1 TPULL — Trend Pullback

**R:R:** 2.0 : 1 | **Break-even:** 33.3% | **Timeframes:** 5m, 30m, 1D
**Supported markets:** Stocks, Crypto | **Directions:** Long only, Both
**Experience:** Beginner, Intermediate, Advanced

**Entry Rules:**
1. Trade only with the dominant trend
2. Enter after a controlled retracement into value
3. Wait for confirmation back with the trend
4. Keep invalidation tied to structure or adaptive volatility
5. Take profits into prior expansion or a defined multiple

**Backtest Entry Logic (exact implementation — `backtestEngine.ts → trendPullback()`):**
```
PREREQUISITE: candles.length ≥ 50; loop starts at i = 22

ENTRY TRIGGER (all conditions must be true):
  e9[i]  > e21[i]                           // EMA9 above EMA21 — uptrend confirmed
  candles[i].close > e21[i]                 // price above trend filter
  candles[i-1].close < e9[i-1]             // prior bar pulled below EMA9 (pullback occurred)
  candles[i].close  >= e9[i] × 0.997       // current bar re-entered EMA9 zone

ENTRY:   candles[i+1].open  (next bar open)
STOP:    e21[i]             (EMA21 at signal bar)
RISK:    entry - stop       (skip if risk ≤ 0)
TARGET:  entry + risk × 2.0
```

**Approved Lane Win Rates:**

| Asset | Style | Win Rate | Expectancy | Trades | Max DD | Validated |
|---|---|---|---|---|---|---|
| BTC | swing | 43.6% | 0.309 | 110 | 18% | 2026-04-26 |
| BTC | position | 44.0% | 0.402 | 68 | 21% | 2026-05-10 |
| META | intraday | 37.5% | 0.125 | 80 | 18% | 2026-04-26 |
| META | quick | 36.7% | 0.100 | 60 | 18% | 2026-04-26 |
| TSLA | intraday | 36.7% | 0.101 | 79 | 19% | 2026-04-26 |
| TSLA | quick | 37.3% | 0.119 | 67 | 19% | 2026-04-26 |
| QQQ | intraday | 38.0% | 0.140 | 297 | 12% | 2026-05-19 |
| AMD | intraday | 45.5% | 0.365 | 44 | 17% | 2026-05-19 |
| SPY | intraday | 39.2% | 0.176 | 329 | 11% | 2026-05-19 |
| NVDA | position | 37.6% | 0.128 | 202 | 18% | 2026-05-19 |
| MSFT | intraday | 38.5% | 0.155 | 208 | 13% | 2026-05-19 |
| COPPER | position | 33.8% | 0.013 | 160 | 15% | 2026-05-19 |
| GOLD | position | 37.0% | 0.111 | 135 | 13% | 2026-05-19 |
| NG | position | 33.8% | 0.014 | 139 | 18% | 2026-05-19 |
| OIL | position | 35.1% | 0.053 | 151 | 16% | 2026-05-19 |
| SILVER | position | 39.5% | 0.184 | 109 | 14% | 2026-05-19 |
| AMZN | position | 37.3% | 0.120 | 158 | 16% | 2026-06-11 |
| AMZN | swing | 34.4% | 0.031 | 96 | 17% | 2026-06-11 |
| GOOGL | position | 39.5% | 0.186 | 129 | 14% | 2026-06-11 |
| MU | swing | 40.0% | 0.200 | 80 | 15% | 2026-06-11 |
| NFLX | position | 42.3% | 0.269 | 130 | 17% | 2026-06-11 |
| PLTR | position | 44.4% | 0.333 | 36 | 19% | 2026-06-11 |
| PLTR | swing | 35.9% | 0.077 | 117 | 20% | 2026-06-11 |
| PYPL | position | 41.2% | 0.237 | 97 | 15% | 2026-06-11 |
| PYPL | swing | 38.6% | 0.158 | 101 | 16% | 2026-06-11 |
| SHOP | position | 40.2% | 0.206 | 97 | 17% | 2026-06-11 |
| SHOP | swing | 33.7% | 0.010 | 98 | 18% | 2026-06-11 |
| SOFI | swing | 38.0% | 0.141 | 92 | 18% | 2026-06-11 |

---

### 6.2 SUPP — Support Bounce

**R:R:** 1.5 : 1 | **Break-even:** 40.0% | **Timeframes:** 15m, 30m, 1h, 1D
**Supported markets:** Stocks, Crypto | **Directions:** Long only, Both
**Experience:** Beginner, Intermediate, Advanced

**Entry Rules:**
1. Require a clearly defended support area
2. Wait for price to revisit the zone
3. Demand rejection and close strength
4. Anchor risk beneath the level
5. Target the next reaction zone

**Backtest Entry Logic (`backtestEngine.ts → supportBounce()`):**
```
PREREQUISITE: candles.length ≥ 50; loop starts at i = 22

ENTRY TRIGGER:
  support     = min(candles[i-20 .. i].low)   // 20-period local low
  nearSupport = candles[i].close <= support × 1.015  // within 1.5% of support
  bouncing    = nearSupport AND candles[i].close > candles[i-1].close  // rejection close

ENTRY:   candles[i+1].open
STOP:    support - ATR × 0.3     (ATR = 14-period average true range)
RISK:    entry - stop
TARGET:  entry + risk × 1.5
```

**Approved Lane Win Rates:**

| Asset | Style | Win Rate | Expectancy | Trades | Max DD | Validated |
|---|---|---|---|---|---|---|
| AAPL | swing | 45.6% | 0.140 | 136 | 13% | 2026-04-26 |
| AAPL | position | 46.0% | 0.182 | 84 | 16% | 2026-05-10 |
| COIN | swing | 44.2% | 0.106 | 165 | 15% | 2026-04-26 |
| COIN | position | 44.6% | 0.138 | 102 | 18% | 2026-05-10 |
| DIA | swing | 50.4% | 0.260 | 119 | 11% | 2026-04-26 |
| DIA | position | 50.8% | 0.338 | 74 | 14% | 2026-05-10 |
| ETH | swing | 40.4% | 0.009 | 208 | 16% | 2026-04-26 |
| ETH | position | 40.8% | 0.012 | 129 | 19% | 2026-05-10 |
| META | swing | 42.2% | 0.055 | 128 | 15% | 2026-04-26 |
| META | position | 42.6% | 0.072 | 79 | 18% | 2026-05-10 |
| MSFT | swing | 42.1% | 0.052 | 145 | 13% | 2026-04-26 |
| MSFT | position | 42.5% | 0.068 | 90 | 16% | 2026-05-10 |
| NVDA | swing | 45.6% | 0.140 | 125 | 14% | 2026-04-26 |
| NVDA | position | 46.0% | 0.182 | 78 | 17% | 2026-05-10 |
| QQQ | swing | 40.8% | 0.021 | 120 | 12% | 2026-04-26 |
| QQQ | position | 41.2% | 0.027 | 74 | 15% | 2026-05-10 |
| SOL | swing | 41.2% | 0.029 | 221 | 17% | 2026-04-26 |
| SOL | position | 41.6% | 0.038 | 137 | 20% | 2026-05-10 |
| SPY | swing | 45.9% | 0.147 | 109 | 11% | 2026-04-26 |
| SPY | position | 46.3% | 0.191 | 68 | 14% | 2026-05-10 |
| XLF | position | 56.7% | 0.418 | 97 | 11% | 2026-05-19 |
| XLF | swing | 49.0% | 0.235 | 147 | 11% | 2026-05-19 |
| XLK | position | 58.1% | 0.454 | 43 | 12% | 2026-05-19 |
| XLK | swing | 41.8% | 0.028 | 141 | 12% | 2026-05-19 |
| USO | swing | 45.8% | 0.187 | 118 | 15% | 2026-05-19 |
| GOLD | position | 41.0% | 0.025 | 100 | 13% | 2026-05-19 |
| GOLD | swing | 43.5% | 0.086 | 313 | 13% | 2026-05-19 |
| COPPER | position | 49.0% | 0.224 | 96 | 14% | 2026-05-19 |
| SILVER | position | 41.7% | 0.042 | 48 | 14% | 2026-05-19 |
| GOOGL | position | 51.6% | 0.548 | 31 | 14% | 2026-06-11 |
| PYPL | position | 50.0% | 0.500 | 36 | 14% | 2026-06-11 |
| SMCI | swing | 40.0% | 0.200 | 60 | 19% | 2026-06-11 |

---

### 6.3 BKOUT — Breakout Retest

**R:R:** 2.0 : 1 | **Break-even:** 33.3% | **Timeframes:** 15m, 30m, 1h, 1D
**Supported markets:** Stocks, Crypto | **Directions:** Long only, Short only, Both
**Experience:** Beginner, Intermediate, Advanced

**Entry Rules:**
1. Wait for a clean break of an important level
2. Do not chase the first impulse
3. Use the retest to validate the level flip
4. Place risk beyond the failed retest
5. Scale according to continuation strength

**Backtest Entry Logic (`backtestEngine.ts → breakoutRetest()`):**
```
PREREQUISITE: candles.length ≥ 50; loop starts at i = 25

ENTRY TRIGGER:
  priorHigh = max(candles[i-25 .. i-3].high)   // 25-bar lookback high
  broke     = any(candles[i-3 .. i].close > priorHigh)   // broke out in last 3 bars
  retesting = broke
              AND candles[i].close >= priorHigh × 0.985  // within 1.5% below level
              AND candles[i].close <= priorHigh × 1.015  // within 1.5% above level

ENTRY:   candles[i+1].open
STOP:    priorHigh - ATR × 0.5
RISK:    entry - stop
TARGET:  entry + risk × 2.0
```

**Approved Lane Win Rates:**

| Asset | Style | Win Rate | Expectancy | Trades | Max DD | Validated |
|---|---|---|---|---|---|---|
| AAPL | intraday | 39.2% | 0.175 | 194 | 16% | 2026-04-26 |
| AAPL | swing | 43.6% | 0.307 | 101 | 16% | 2026-04-26 |
| AAPL | position | 44.0% | 0.399 | 63 | 19% | 2026-04-26 |
| AMD | intraday | 38.5% | 0.155 | 226 | 18% | 2026-04-26 |
| BTC | swing | 43.9% | 0.316 | 98 | 18% | 2026-04-26 |
| BTC | position | 44.3% | 0.411 | 61 | 21% | 2026-04-26 |
| DIA | swing | 39.4% | 0.182 | 198 | 14% | 2026-04-26 |
| DIA | position | 39.8% | 0.237 | 123 | 17% | 2026-04-26 |
| IWM | swing | 39.2% | 0.177 | 79 | 15% | 2026-04-26 |
| IWM | position | 39.6% | 0.230 | 49 | 18% | 2026-04-26 |
| META | swing | 44.3% | 0.329 | 70 | 17% | 2026-04-26 |
| META | position | 44.7% | 0.428 | 43 | 20% | 2026-04-26 |
| MSFT | swing | 41.9% | 0.256 | 117 | 15% | 2026-04-26 |
| MSFT | position | 42.3% | 0.333 | 73 | 18% | 2026-04-26 |
| NVDA | intraday | 34.0% | 0.021 | 188 | 19% | 2026-04-26 |
| QQQ | swing | 35.9% | 0.078 | 167 | 13% | 2026-04-26 |
| QQQ | position | 36.3% | 0.101 | 104 | 16% | 2026-04-26 |
| SPY | swing | 35.4% | 0.063 | 254 | 12% | 2026-04-26 |
| SPY | position | 35.8% | 0.082 | 158 | 15% | 2026-04-26 |
| XRP | intraday | 35.1% | 0.054 | 817 | 20% | 2026-04-26 |
| COIN | quick | 40.7% | 0.221 | 231 | 18% | 2026-05-19 |
| XLK | position | 45.3% | 0.359 | 64 | 13% | 2026-05-19 |
| XLK | swing | 35.8% | 0.074 | 81 | 13% | 2026-05-19 |
| XLF | position | 38.9% | 0.167 | 108 | 13% | 2026-05-19 |
| XLF | swing | 37.7% | 0.131 | 85 | 13% | 2026-05-19 |
| USO | swing | 41.1% | 0.233 | 73 | 16% | 2026-05-19 |
| AMZN | intraday | 35.2% | 0.056 | 105 | 15% | 2026-05-19 |
| AMZN | position | 45.8% | 0.375 | 72 | 16% | 2026-05-19 |
| SILVER | position | 46.2% | 0.385 | 52 | 14% | 2026-05-19 |
| GOLD | position | 46.7% | 0.400 | 90 | 13% | 2026-05-19 |
| COPPER | position | 42.0% | 0.260 | 100 | 14% | 2026-05-19 |
| OIL | position | 37.4% | 0.121 | 83 | 16% | 2026-05-19 |
| GOOGL | position | 53.1% | 0.592 | 49 | 13% | 2026-06-11 |
| GOOGL | swing | 39.1% | 0.172 | 64 | 15% | 2026-06-11 |
| NFLX | swing | 36.4% | 0.091 | 88 | 18% | 2026-06-11 |
| PLTR | swing | 45.4% | 0.361 | 97 | 21% | 2026-06-11 |
| SMCI | swing | 43.2% | 0.295 | 44 | 22% | 2026-06-11 |
| SOFI | swing | 36.7% | 0.101 | 79 | 19% | 2026-06-11 |

---

### 6.4 MOMO — Momentum Continuation

**R:R:** 2.0 : 1 | **Break-even:** 33.3% | **Timeframes:** 5m, 15m, 1h, 1D
**Supported markets:** Stocks, Crypto | **Directions:** Long only, Short only, Both
**Experience:** Intermediate, Advanced only

**Entry Rules:**
1. Require a strong directional candle with participation
2. Wait for the first clean pause or compression
3. Enter only when direction resumes
4. Keep risk inside the compression zone
5. Do not hold through major reaction areas

**Backtest Entry Logic (`backtestEngine.ts → momentumContinuation()`):**
```
PREREQUISITE: candles.length ≥ 50; loop starts at i = 25

ENTRY TRIGGER:
  e9[i] > e21[i]                            // EMA9 above EMA21 — uptrend
  candles[i-1].close > e9[i-1]             // 3-bar momentum build above EMA9
  candles[i-2].close > e9[i-2]
  candles[i-3].close > e9[i-3]
  candles[i].close >= e9[i] × 0.997        // first pause — at EMA9 zone
  candles[i].close <= e9[i] × 1.003

ENTRY:   candles[i+1].open
STOP:    e21[i]
RISK:    entry - stop
TARGET:  entry + risk × 2.0
```

**Approved Lane Win Rates:**

| Asset | Style | Win Rate | Expectancy | Trades | Max DD | Validated |
|---|---|---|---|---|---|---|
| BTC | swing | 44.0% | 0.320 | 100 | 19% | 2026-04-26 |
| BTC | position | 44.4% | 0.416 | 62 | 22% | 2026-05-10 |
| META | intraday | 37.5% | 0.125 | 72 | 18% | 2026-04-26 |
| META | quick | 35.2% | 0.056 | 54 | 18% | 2026-04-26 |
| TSLA | quick | 35.9% | 0.078 | 64 | 20% | 2026-04-26 |
| QQQ | intraday | 50.0% | 0.500 | 42 | 12% | 2026-05-19 |
| IWM | intraday | 46.5% | 0.395 | 43 | 13% | 2026-05-19 |
| SPY | intraday | 45.0% | 0.350 | 40 | 12% | 2026-05-19 |
| AMD | intraday | 41.9% | 0.257 | 43 | 17% | 2026-05-19 |
| XLK | position | 45.4% | 0.362 | 163 | 14% | 2026-05-19 |
| XLF | position | 42.7% | 0.281 | 171 | 13% | 2026-05-19 |
| AAPL | position | 41.1% | 0.233 | 265 | 14% | 2026-05-19 |
| AVGO | intraday | 40.7% | 0.221 | 123 | 14% | 2026-05-19 |
| GOLD | position | 44.1% | 0.322 | 152 | 13% | 2026-05-19 |
| OIL | position | 35.8% | 0.073 | 179 | 16% | 2026-05-19 |
| SILVER | position | 43.4% | 0.302 | 129 | 14% | 2026-05-19 |
| AMZN | position | 39.5% | 0.184 | 147 | 16% | 2026-06-11 |
| AMZN | swing | 40.4% | 0.213 | 94 | 17% | 2026-06-11 |
| GOOGL | position | 45.7% | 0.370 | 127 | 14% | 2026-06-11 |
| GOOGL | swing | 40.6% | 0.218 | 101 | 15% | 2026-06-11 |
| MU | position | 41.7% | 0.252 | 151 | 15% | 2026-06-11 |
| MU | swing | 45.9% | 0.378 | 98 | 16% | 2026-06-11 |
| NFLX | position | 42.5% | — | 139 | — | 2026-06-11 |
| PLTR | position | 37.0% | 0.109 | 46 | 20% | 2026-06-11 |
| PLTR | swing | 40.3% | 0.210 | 119 | 21% | 2026-06-11 |
| PYPL | position | 40.9% | 0.226 | 93 | 15% | 2026-06-11 |
| PYPL | swing | 36.4% | 0.091 | 121 | 16% | 2026-06-11 |
| SHOP | position | 44.2% | 0.326 | 95 | 17% | 2026-06-11 |
| SHOP | swing | 36.5% | 0.096 | 52 | 18% | 2026-06-11 |
| SMCI | position | 34.2% | 0.026 | 152 | 22% | 2026-06-11 |
| SMCI | swing | 37.1% | 0.112 | 89 | 23% | 2026-06-11 |
| SOFI | position | 35.4% | 0.062 | 48 | 19% | 2026-06-11 |

> MOMO:NFLX:intraday (WR 46.4%, n=112) is flagged `inactive_pending_onboarding` — excluded from assignment until ticker confirmed in live feed and wizard grid.

---

### 6.5 ORB — Opening Range Breakout

**R:R:** 1.5 : 1 | **Break-even:** 40.0% | **Timeframes:** 5m, 15m, 30m
**Supported markets:** Stocks, Crypto | **Directions:** Long only, Short only, Both
**Experience:** Beginner, Intermediate, Advanced

**Entry Rules:**
1. Define the opening range before engaging
2. Trade only breaks that close outside the range
3. Use expanding participation as confirmation
4. Respect the range midpoint or edge for invalidation
5. Step aside once the session loses its early structure

**Backtest Entry Logic (`backtestEngine.ts → openingRange()`):**
```
PREREQUISITE: candles.length ≥ 50; loop starts at i = 5

ENTRY TRIGGER:
  body      = |candles[i].close - candles[i].open|
  rangeSize = candles[i].high - candles[i].low  (min 0.0001 to avoid div/0)
  body / rangeSize > 0.60                         // strong directional body
  candles[i].volume > avgVolume × 1.30            // above-average participation

  bullish = (candles[i].close > candles[i].open)

ENTRY:  candles[i+1].open
STOP:   bullish → candles[i].low   |  bearish → candles[i].high  (candle extreme)
RISK:   |entry - stop|
TARGET: bullish → entry + risk × 1.5  |  bearish → entry - risk × 1.5
```

**Approved Lane Win Rates:**

| Asset | Style | Win Rate | Expectancy | Trades | Max DD | Validated |
|---|---|---|---|---|---|---|
| BTC | swing | 46.0% | 0.149 | 87 | 18% | 2026-04-26 |
| COIN | swing | 45.5% | 0.136 | 66 | 16% | 2026-04-26 |
| DOGE | swing | 44.4% | 0.111 | 63 | 20% | 2026-04-26 |
| ETH | intraday | 40.3% | 0.008 | 739 | 18% | 2026-04-26 |
| META | quick | 42.9% | 0.072 | 35 | 16% | 2026-04-26 |
| NVDA | quick | 43.8% | 0.094 | 16 | 16% | 2026-04-26 |
| QQQ | intraday | 40.5% | 0.013 | 37 | 13% | 2026-04-26 |
| SOL | swing | 58.2% | 0.456 | 79 | 18% | 2026-04-26 |
| TSLA | intraday | 42.9% | 0.072 | 35 | 20% | 2026-04-26 |
| ADA | swing | 44.1% | 0.102 | 930 | 18% | 2026-05-19 |
| NG | swing | 42.5% | 0.062 | 459 | 18% | 2026-05-19 |
| COPPER | position | 59.7% | 0.492 | 62 | 13% | 2026-05-19 |
| GOLD | position | 40.0% | 0.000 | 230 | 11% | 2026-05-19 |
| SILVER | position | 64.2% | 0.604 | 53 | 12% | 2026-05-19 |
| GOOGL | position | 40.0% | 0.200 | 275 | 11% | 2026-06-11 |
| GOOGL | swing | 42.5% | 0.274 | 113 | 12% | 2026-06-11 |
| MSTR | swing | 50.0% | 0.500 | 92 | 22% | 2026-06-11 |
| MU | swing | 46.0% | 0.378 | 37 | 15% | 2026-06-11 |
| NFLX | position | 40.1% | 0.203 | 414 | 14% | 2026-06-11 |
| NFLX | swing | 53.1% | 0.594 | 32 | 16% | 2026-06-11 |
| PLTR | position | 41.0% | 0.229 | 105 | 21% | 2026-06-11 |
| PLTR | swing | 40.3% | 0.209 | 273 | 22% | 2026-06-11 |
| PYPL | swing | 43.3% | 0.299 | 97 | 14% | 2026-06-11 |
| SHOP | swing | 41.2% | 0.237 | 177 | 17% | 2026-06-11 |
| SMCI | swing | 48.6% | 0.457 | 35 | 22% | 2026-06-11 |

> ORB:AVAX:swing (WR 41.4%, n=1,451) is flagged `disabled` — CoinGecko data fetch was rate-limited during the May 2026 validation pass. Pending retry before re-enablement.

---

### 6.6 RFADE — Range Fade

**R:R:** 1.5 : 1 | **Break-even:** 40.0% | **Timeframes:** 15m, 1h
**Supported markets:** Stocks, Crypto | **Directions:** Long only, Short only, Both
**Experience:** Beginner, Intermediate, Advanced

**Entry Rules:**
1. Identify a clear range with defended boundaries
2. Wait for a stretch into the boundary with momentum exhaustion
3. Require a rejection signal before framing entry
4. Keep invalidation beyond the boundary
5. Target range midpoint or opposite wall

**Backtest Entry Logic (`backtestEngine.ts → rangeFade()`):**
```
PREREQUISITE: candles.length ≥ 50; loop starts at i = 22

ENTRY TRIGGER (short/fade bias — fading the range top):
  flat    = |e9[i] - e21[i]| / candles[i].close < 0.01  // EMAs flat — ranging market
  r20H    = max(candles[0..i].high, last 20 bars)         // 20-period range high
  nearTop = candles[i].close >= r20H × 0.985              // within 1.5% of range top

ENTRY:  candles[i+1].open  (short)
STOP:   r20H × 1.01        (1% above range high)
RISK:   stop - entry
TARGET: entry - risk × 1.5  (toward range midpoint)
```

**Approved Lane Win Rates:**

| Asset | Style | Win Rate | Expectancy | Trades | Max DD | Validated |
|---|---|---|---|---|---|---|
| AMD | intraday | 45.8% | 0.144 | 59 | 13% | 2026-04-26 |
| IWM | intraday | 43.2% | 0.080 | 125 | 12% | 2026-04-26 |
| META | quick | 42.1% | 0.053 | 76 | 14% | 2026-04-26 |
| NVDA | intraday | 44.2% | 0.104 | 77 | 14% | 2026-04-26 |
| TSLA | intraday | 48.2% | 0.205 | 56 | 14% | 2026-04-26 |
| TSLA | quick | 43.2% | 0.080 | 44 | 14% | 2026-04-26 |
| XLF | swing | 55.3% | 0.382 | 304 | 11% | 2026-05-19 |
| ADA | swing | 49.3% | 0.231 | 199 | 18% | 2026-05-19 |
| GOLD | swing | 61.7% | 0.542 | 1,279 | 11% | 2026-05-19 |
| COPPER | swing | 57.4% | 0.434 | 1,180 | 12% | 2026-05-19 |
| NFLX | swing | 52.8% | 0.583 | 180 | 17% | 2026-06-11 |
| PYPL | swing | 43.7% | 0.310 | 174 | 15% | 2026-06-11 |

> RFADE:AVAX:swing (WR 48.4%, n=607) is flagged `disabled` — same CoinGecko rate-limit issue as ORB:AVAX. Pending retry.

---

## SECTION 7 — DISABLED LANES (Below Break-Even After Cleaning)

The following strategy × ticker × holdingStyle combinations exist in historical data but fall below the required break-even win rate. They are explicitly excluded from the active registry. This list exists to prevent future accidental re-addition without proper re-validation.

**Data sources:** `yahoo_extended_cleaned` (1Hour; zero-volume bars and single-bar close moves >15% stripped before re-run); `yahoo_continuous` (1Day; Panama back-adjusted via yfinance `auto_adjust=True`).

| Lane | Win Rate | Required | n | Source |
|---|---|---|---|---|
| BKOUT:COPPER:swing | 23.6% | 33.3% | 335 | yahoo_extended_cleaned |
| MOMO:COPPER:position | 31.8% | 33.3% | 154 | yahoo_continuous |
| MOMO:COPPER:swing | 23.2% | 33.3% | 427 | yahoo_extended_cleaned |
| ORB:COPPER:swing | 34.7% | 40.0% | 392 | yahoo_extended_cleaned |
| RFADE:COPPER:position | 30.7% | 40.0% | 248 | yahoo_continuous |
| TPULL:COPPER:swing | 27.1% | 33.3% | 499 | yahoo_extended_cleaned |
| BKOUT:GOLD:swing | 28.7% | 33.3% | 310 | yahoo_extended_cleaned |
| MOMO:GOLD:swing | 25.5% | 33.3% | 475 | yahoo_extended_cleaned |
| ORB:GOLD:swing | 39.2% | 40.0% | 526 | yahoo_extended_cleaned |
| RFADE:GOLD:position | 27.1% | 40.0% | 251 | yahoo_continuous |
| TPULL:GOLD:swing | 22.6% | 33.3% | 544 | yahoo_extended_cleaned |
| BKOUT:NG:position | 27.2% | 33.3% | 103 | yahoo_continuous |
| BKOUT:NG:swing | 30.1% | 33.3% | 256 | yahoo_extended_cleaned |
| MOMO:NG:position | 32.9% | 33.3% | 164 | yahoo_continuous |
| MOMO:NG:swing | 26.4% | 33.3% | 258 | yahoo_extended_cleaned |
| ORB:NG:position | 30.4% | 40.0% | 313 | yahoo_continuous |
| RFADE:NG:position | 22.5% | 40.0% | 173 | yahoo_continuous |
| RFADE:NG:swing | 36.2% | 40.0% | 578 | yahoo_extended_cleaned |
| SUPP:NG:position | 32.3% | 40.0% | 62 | yahoo_continuous |
| SUPP:NG:swing | 35.6% | 40.0% | 531 | yahoo_extended_cleaned |
| TPULL:NG:swing | 31.7% | 33.3% | 369 | yahoo_extended_cleaned |
| ORB:OIL:position | 37.0% | 40.0% | 316 | yahoo_continuous |
| ORB:OIL:swing | 33.5% | 40.0% | 529 | yahoo_extended_cleaned |
| RFADE:OIL:position | 20.0% | 40.0% | 260 | yahoo_continuous |
| RFADE:OIL:swing | 36.8% | 40.0% | 854 | yahoo_extended_cleaned |
| SUPP:OIL:position | 36.7% | 40.0% | 49 | yahoo_continuous |
| TPULL:OIL:swing | 31.6% | 33.3% | 415 | yahoo_extended_cleaned |
| BKOUT:SILVER:swing | 30.2% | 33.3% | 245 | yahoo_extended_cleaned |
| MOMO:SILVER:swing | 31.7% | 33.3% | 410 | yahoo_extended_cleaned |
| ORB:SILVER:swing | 33.7% | 40.0% | 572 | yahoo_extended_cleaned |
| RFADE:SILVER:position | 18.8% | 40.0% | 138 | yahoo_continuous |
| RFADE:SILVER:swing | 36.9% | 40.0% | 645 | yahoo_extended_cleaned |
| SUPP:SILVER:swing | 39.4% | 40.0% | 284 | yahoo_extended_cleaned |
| TPULL:SILVER:swing | 24.8% | 33.3% | 480 | yahoo_extended_cleaned |

---

## SECTION 8 — INACTIVE STRATEGIES (Not Available for Assignment)

### EMA Crossover (EMA)
`active: false` — No rows generated in `historical_event_samples`. The Python backtest engine has no EMA crossover runner. 6 lanes are validated and stored in the registry for future activation pending live data collection.

| Asset | Style | Win Rate | Trades |
|---|---|---|---|
| AAPL | intraday | 37.9% | 29 |
| BTC | swing | 45.1% | 51 |
| BTC | position | 45.5% | 32 |
| IWM | intraday | 40.4% | 47 |
| META | intraday | 35.1% | 37 |
| QQQ | intraday | 47.6% | 21 |

### Reversal Pattern (REV)
`active: false` — No Reversal Pattern runner in the Python backtest engine. 3 lanes stored for future activation.

| Asset | Style | Win Rate | Trades |
|---|---|---|---|
| NVDA | intraday | 51.8% | 27 |
| TSLA | intraday | 50.0% | 40 |
| TSLA | quick | 51.6% | 31 |

---

## SECTION 9 — BACKTEST METRICS DEFINITIONS

All metrics are computed identically across all 6 active strategy implementations in `backtestEngine.ts`.

| Metric | Definition |
|---|---|
| `winRate` | `wins / totalTrades` — raw percentage |
| `expectancy` | `netR / totalTrades` — average R per trade |
| `netR` | Sum of trade outcomes: wins add `+R`, losses add `−1` |
| `maxDrawdown` | Peak-to-trough equity decline as % of peak equity, across simulated trade sequence |
| `trades` | Total simulated trade count for that asset × strategy × holdingStyle lane |
| `source` | Always `'educational-backtest-simulation'` — never omitted from any result object |
| `statusLabel` | KEEP: WR ≥ 48% AND expectancy ≥ 0.30; IMPROVE: WR ≥ 40% OR expectancy ≥ 0.15; REMOVE: otherwise |

### Display Clamping

Raw backtest values are clamped before display to prevent outlier results from skewing user-facing metrics:

| Field | Clamp Range |
|---|---|
| `winRate` | 40% – 80% |
| `expectancy` | 0.10 – 1.20 |
| `maxDrawdown` | 5% – 35% |

---

## SECTION 10 — DATA SOURCES AND VALIDATION HISTORY

| Dataset | Description | Coverage |
|---|---|---|
| `alpaca` | Original backtest — Alpaca Markets OHLCV | 2022–2024 |
| `yahoo_extended` | Extended — Yahoo Finance via yfinance | 2010–2024 (241,638 rows, 25 tickers, 1Day + 1Hour max) |
| `yahoo_extended_cleaned` | Yahoo extended with zero-vol bars and >15% single-bar moves stripped | Commodity tickers only (GOLD, SILVER, OIL, COPPER, NG) |
| `yahoo_continuous` | Panama back-adjusted continuous contracts via yfinance `auto_adjust=True` | Commodity 1Day position lanes |
| CoinGecko hourly | Crypto hourly OHLCV synthesized from closes | ADA approved; AVAX pending re-fetch |

### Validation Timeline

| Date | Pass | Scope |
|---|---|---|
| 2026-04-26 | Initial validation | Original equity + crypto lanes (Alpaca window) |
| 2026-05-10 | Position lane expansion | Position holdingStyle added across 10 original equity + crypto tickers |
| 2026-05-19 | Yahoo extended revalidation | 241,638 rows — 25 tickers, 1Day + 1Hour. New lanes across all 6 strategies. Commodity cleaning pass. Panama continuous contract pass. CoinGecko crypto hourly pass |
| 2026-06-11 | June expansion backtest | AMZN, GOOGL, MU, NFLX, PLTR, PYPL, SHOP, SMCI, SOFI across TPULL / SUPP / BKOUT / MOMO / ORB / RFADE |

---

## SECTION 11 — FULL ASSIGNMENT FLOW

```
User completes 6-step wizard
         │
         ▼
wizard-answer-normalizer.ts
  holdingStyle: minutes/hours → intraday  |  days_1_3/multi_day → swing
  marketConditions → setupPreference:
    choppy → pullback  |  fast_volatile → breakout
    slow_grinding → key_levels  |  trend_reversals → reversal
  riskStyle: conservative → tight  |  balanced → balanced  |  aggressive → wider
  experience: beginner → beginner  |  developing/experienced → intermediate  |  advanced → advanced
  Silent: confirmationStyle=balanced, tradeFrequencyPreference=balanced,
          directionPreference=both, selectivity=A_PLUS_AND_A
         │
         ▼
strategy-lane-validation.ts — 10-step filter pipeline
  Step  1: filterByMarket          — REJECT_MARKET
  Step  2: filterByExperience      — REJECT_EXPERIENCE
  Step  3: filterBySelectivity     — REJECT_SELECTIVITY
  Step  4: filterByHoldingStyle    — REJECT_HOLDING_STYLE
  Step  5: filterBySetupPreference — REJECT_SETUP_TYPE  (adjacency allowed)
  Step  6: filterByConfirmation    — REJECT_CONFIRMATION
  Step  7: filterByRisk            — REJECT_RISK
  Step  8: filterByFrequency       — REJECT_FREQUENCY
  Step  9: filterByDirection       — REJECT_DIRECTION
  Step 10: validateLane            — lane.status = 'approved'
                                     win rate ≥ break-even for R:R
                                     strategy.active = true
                                     plan asset limit not exceeded
         │
         ▼
strategy-scoring.ts — 100-point score per remaining candidate
  setupPreference (25) + holdingStyle (20) + confirmation (10) + riskStyle (10)
  + frequency (10) + experience (10) + direction (5) + selectivity (5) + assetValidation (5)
         │
         ▼
master-assignment-engine.ts
  Sort: approved → highest score → strongest lane win rate
  Grade A+ (≥ 80) or A (65–79) → ASSIGN ONE strategy
  Score < 65 or no approved candidate → NULL result
  → Explicit no-match screen shown to user
  → No silent fallback. No random assignment. Never.
         │
         ▼
MasterAssignmentResult {
  assignedStrategy, ticker, holdingStyle, grade, score, laneKey,
  assignmentReasons[], fallbackCandidates[], debugInfo
}
         │
         ▼
Backend signal engine (api-server)
  alertEngine.ts  — 60s polling, strategy-specific signal gates
  pathConditionEngine.ts — 60s polling, Entry/Support/Resistance/Target tracking
  On condition change → SMS (Twilio) + Email (Resend) + Desk alert + 08:00 UTC Clerk brief
```

---

*End of audit document. All figures derived directly from source code: `strategy-registry.ts`, `strategy-scoring.ts`, `strategy-lane-validation.ts`, `master-assignment-engine.ts`, `backtestEngine.ts`, `steps.ts`. No data was estimated or manually adjusted for this report.*
