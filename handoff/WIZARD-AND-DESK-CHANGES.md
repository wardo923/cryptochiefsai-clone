# Wizard & Desk Changes — Quick Checklist

A plain checklist of exactly what changes in the **Wizard** and the **Desk**.
This is a summary of `REPLIT-MASTER-PROMPT.md` — read that file for full detail.
All of this is **this phase**, not a later one. The roadmap in `SUBSCRIBER-WORTHY.md` comes after.

You can restyle everything to match the site — just keep the honesty rules intact.

---

## WIZARD changes

- [ ] **Delete the "No approved match" screen entirely.** The "validation gate / 65-point fit / 10 calibration dimensions" screen is fabricated — it does not exist in the engine and must never exist. Remove any `if (!match) return <NoMatch/>` path.
- [ ] **Route all matching through `matchWizard(answers)`** from `validated-engine.ts`. Delete the old `pickStrategy()` and any custom threshold/gate logic.
- [ ] **Every wizard run ends on a matched strategy card.** `matchWizard()` always returns a best fit (`ranked[0]`) — it can never fail or dead-end.
- [ ] **All 7 questions must actually count** and map to these exact fields:
  1. What to trade → `asset`
  2. How long to hold → `hold`
  3. Feeling about price swings → `comfort`
  4. Kind of market → `mover`
  5. How often to check in → `activity`
  6. Win more often vs bigger wins → `winStyle`
  7. How much proof → `proof`
  Remove any question that doesn't map (no questions that secretly do nothing).
- [ ] **Delete the fake "A+ / 100-point grade."** Show the pairing's real `tier` ("strong" vs "proven") and actual stats instead.
- [ ] **No intraday strategies** ever appear (no ORB / MOMO / RFADE — they lost money after costs). Swing + position only. Make them unreachable from assignment.

## DESK changes

- [ ] **Use `SightlineDeskView.tsx`** as the clean Desk layout (where a user's named, deployed strategies live).
- [ ] **Use `SightlineStrategyCard.tsx`** for each strategy card. Keep the **honesty stack**:
  - what it is (name + horizon + "Survived OOS" badge)
  - why it fits you (plain-language reasons from `match.reasons`)
  - how it actually behaved (win rate shown **with** `maxDrawdownR` + `trades` sample size — never win rate alone)
- [ ] **The calculator is a RISK guide, not a profit predictor.** Show worst-tested drawdown % against account + risk-%. Never multiply win rate by account to project earnings. Always label: "This is a risk guide, not a profit forecast."
- [ ] **Persist the chosen strategy to the Desk** (Supabase). Store only the stripped `PublicPairing` fields — never entry/exit rules.
- [ ] **Never expose strategy entry/exit logic** anywhere in the UI or API — name + behavior only.

---

### Language rules (both screens)
- Never use "buy", "sell", or "guaranteed." Describe structure ("conditions are aligning"), never orders.
- Quiet days are healthy — when there's no setup, say so calmly. Never imply the user is missing out.
