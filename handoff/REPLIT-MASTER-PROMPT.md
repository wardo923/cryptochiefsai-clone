# Sightline — Master Handoff Prompt for the Replit Agent

Attach these three files from the lab, then paste the prompt below:
- `validated-engine.ts`  (the canonical, backtested strategy engine — 79 proven swing/position pairings + scorer + matcher)
- `SightlineStrategyCard.tsx`  (the result/Desk card + honest position-size risk calculator)
- `SightlineDeskView.tsx`  (the clean Desk screen — where named, deployed strategies live; self-contained with sample data)

---

## PASTE THIS TO THE REPLIT AGENT

We are fixing a serious code-drift problem. This Replit app is now the **single source of truth** for Sightline. Our strategy logic drifted from validated research and is doing dishonest things. I'm attaching two canonical files from our research lab. Adopt them as the ONLY way strategies get assigned and displayed. Do not invent new logic or stats.

### Files
1. `validated-engine.ts` — the canonical engine. 79 backtested pairings (swing + position only), the 7-question scorer, and `matchWizard()`.
2. `SightlineStrategyCard.tsx` — the strategy card (honesty stack) + position-size risk calculator. Self-contained, sample data built in.
3. `SightlineDeskView.tsx` — the Desk screen where a user's named, deployed strategies live. Self-contained, sample data built in. This is the clean Desk layout to match.

### Required changes (in priority order)

1. **Replace strategy assignment entirely.** Delete the old `pickStrategy()` / assignment switch. ALL assignment must go through `matchWizard(answers)` from `validated-engine.ts`. Remove the old switch once nothing references it.

2. **Remove intraday strategies from every assignable path.** The opening-range breakout (ORB), intraday pullback/momentum (MOMO), and range-fade (RFADE) strategies are NOT in the validated set — they lost money after real trading costs. The app must NEVER assign them. Make them unreachable from assignment.

3. **Delete the fake match grade.** Remove the "100-point score" and the A+/A grade. A grade everyone passes is misleading. If you want a confidence cue, show the pairing's real `tier` ("strong" vs "proven") and its actual stats instead.

4. **Every wizard question must affect the result.** The engine scores all 7 questions: `asset`, `hold`, `comfort`, `mover`, `activity`, `winStyle`, `proof`. Map the live wizard's questions to these exact `WizardAnswers` fields. Any question that doesn't map must be removed — no questions that secretly do nothing.

5. **Stats come from the engine data, never hardcoded.** Show win rate ONLY alongside drawdown (`maxDrawdownR`) and sample size (`trades`). Never expose a strategy's entry/exit rules — show name + behavior only.

6. **Use the card as the result/Desk UI.** Restyle `SightlineStrategyCard.tsx` to match the site, but keep its honesty rules intact (see below).

### The 7 wizard questions (must all count)
1. What do you want to trade? — Stocks & ETFs / Crypto / Either   → `asset`
2. How long do you want to hold? — A few days / A few weeks / No preference   → `hold`
3. How do you feel about price swings? — Keep it calm / Some is fine / Bring it on   → `comfort`
4. What kind of market appeals to you? — Steady & established / Fast & volatile / Doesn't matter   → `mover`
5. How often do you want to check in? — Once a week / A few times a week / Flexible   → `activity`
6. What feels better to you? — Winning more often / Bigger wins / No preference   → `winStyle`
7. How much proof do you want behind it? — Only the most proven / Lean proven / Best fit   → `proof`

### Guarantees to preserve (do NOT weaken)
- **A user is ALWAYS mapped to a strategy.** `matchWizard()` scores the full validated set and treats asset preference as a strong bonus, not a hard filter, so it can never dead-end.
- **Only swing (days) and position (weeks) horizons exist.** No scalps, no intraday. This is enforced by the data itself.
- **Honesty stack on the card:** what it is (name + horizon + "Survived OOS" badge) → why it fits you (plain reasons) → how it actually behaved (win rate + drawdown + sample size, together).
- **The calculator is a RISK guide, not a profit predictor.** It uses account size + risk-% + the strategy's real drawdown to show "worst tested streak would draw down ~X% of your account." It must NEVER multiply win rate by account to project earnings. Always show "This is a risk guide, not a profit forecast."
- **Never use the words "buy", "sell", or "guaranteed."** Describe structure ("conditions are present/aligning"), never give orders.
- **Quiet days are healthy.** When a strategy has no setup, say so calmly — never imply the user is missing out.

### Wiring to real data
- `matchWizard()` returns a `PublicPairing` already stripped of hidden logic. Feed the card's `pairing` prop from that, and `reasons` from `match.reasons`.
- Persist the chosen strategy to the user's Desk (Supabase). Store the stripped pairing fields only — never the entry/exit rules.

### Do NOT
- Do not invent new strategies, timeframes, or stats.
- Do not re-add intraday strategies to assignment.
- Do not expose strategy entry/exit logic anywhere in the UI or API.
- Do not create profit projections.

---

## After this is done
The live Replit app and the lab will finally agree: same validated roster, same scorer, same honest card. Going forward, treat THIS Replit repo as the one source of truth — connect one v0 chat to its GitHub repo as the lab, and stop creating new "clone" chats that fork the code.
