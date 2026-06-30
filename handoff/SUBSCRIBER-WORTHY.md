# Sightline — What Makes It Subscriber-Worthy

This is the honest roadmap for turning Sightline into something people pay for monthly.
The bar for a paid trading tool is high and skeptical. People churn the second it feels
like hype or a black box. Our edge is the opposite: **proven, tested, honest.** Everything
below protects that edge while giving people a reason to stay subscribed.

Read this WITH `REPLIT-MASTER-PROMPT.md`. That file fixes correctness (no intraday,
no fake grade, all questions count). This file is about retention — why someone keeps paying.

---

## The core principle
People don't pay for signals. They pay for **confidence + a reason to come back.**
A trading tool that you "check once and forget" gets cancelled. The job is to make
Sightline a calm weekly habit that quietly proves it was right to trust.

So every paid feature must do one of three things:
1. **Build trust** (show it behaved as promised)
2. **Reduce anxiety** (tell me what to do and when I'm safe)
3. **Create a habit** (a reason to open it on a schedule)

If a feature doesn't do one of those, it's not worth building.

---

## What you ALREADY have (the foundation — keep it pristine)
- **Validated engine** (`validated-engine.ts`) — 79 backtested swing/position pairings, real OOS survivors. This IS the product's credibility. Never dilute it.
- **The honesty stack card** (`SightlineStrategyCard.tsx`) — win rate always shown with drawdown + sample size. This is the trust anchor.
- **Honest risk calculator** — position sizing, never profit prediction.
- **The Desk** (`SightlineDeskView.tsx`) — a clean home for a user's chosen strategies.

This foundation is genuinely strong. The features below build ON it — they don't replace it.

---

## Tier 1 — Required to charge money at all (build first)
These are the "why would I pay" essentials. Without these, there's no subscription.

1. **Accounts + saved Desk (persistence).**
   A subscriber's matched strategies must persist across devices and sessions. Right now
   the Desk uses local storage — that's a demo, not a product. Use the project's real
   database (Neon is connected). Scope every row by user id.

2. **"How it's behaving NOW" status per Desk strategy.**
   The single most retention-critical feature. For each strategy on the Desk, show a calm
   status: *In a setup / Waiting / Sitting out this week.* This is what makes people open
   the app on a schedule. NOT live buy/sell calls — a behavioral status, honestly framed.

3. **Honest paywall.**
   Free: take the wizard, see ONE matched strategy + its full honesty card.
   Paid: save unlimited strategies to the Desk, see live status, and the weekly check-in.
   Never paywall the *truth* (the stats). Paywall the *convenience and ongoing tracking.*

## Tier 2 — Makes it sticky (build second)
4. **Weekly check-in (the habit engine).**
   One calm weekly summary per user: "Here's how your Desk behaved this week. 2 strategies
   sat out (healthy). 1 is in a setup." A scheduled reason to return. This alone drives
   most of the retention. Deliver in-app first; email later.

5. **The "why it sat out" explainer.**
   When a strategy did nothing, say so proudly: *"No qualifying setup this week — that
   patience is in the track record."* This reframes inactivity as discipline, which is the
   entire emotional sell of an honest tool. Turns a weakness into the brand.

6. **Per-strategy track record over time.**
   A simple equity-curve-style view of how the strategy performed across the tested window.
   Reinforces "this was proven," and gives subscribers something to watch.

## Tier 3 — Deepens trust + justifies a higher tier (build later)
7. **Personal risk profile that actually routes.**
   Tie the wizard's risk answers to real position-sizing defaults on the Desk. Makes the
   "we matched you" promise concrete and personal.
8. **Journaling / outcome logging.** Let users mark what they did. Increases commitment.
9. **Notifications, opt-in only.** "A strategy on your Desk entered a setup." Calm, rare,
   never spammy. Spammy alerts will kill the honest brand faster than anything.

---

## Anti-features — do NOT build these (they'll destroy the brand)
- ❌ Profit projections / "you could have made $X." (The calculator stays a RISK guide.)
- ❌ Live buy/sell signals or price targets. We show behavior, not commands.
- ❌ Intraday/scalp strategies. They failed validation. Never assign them.
- ❌ A leaderboard, hype feed, or "hot strategy" gamification. Erodes trust.
- ❌ Anything implying guaranteed or expected returns. Compliance + brand suicide.

---

## The honest one-line pitch this roadmap is building toward
"Sightline matches you to a strategy that was actually proven on data it had never seen,
then quietly tells you each week how it's behaving — including when the smart move is to
do nothing."

That sentence is the whole subscription. Every feature above either proves it or delivers it.

---

## Suggested build order for the Replit agent
1. Run `REPLIT-MASTER-PROMPT.md` first (correctness: real engine, no intraday, no fake grade).
2. Tier 1.1 — accounts + DB-backed Desk (persistence).
3. Tier 1.2 — per-strategy "behaving now" status.
4. Tier 1.3 — the paywall (free = 1 match; paid = save + track).
5. Tier 2.4 — weekly check-in.
6. Then Tier 2.5–2.6 and Tier 3 as capacity allows.

Keep the honesty rules from `REPLIT-MASTER-PROMPT.md` intact through ALL of it.
