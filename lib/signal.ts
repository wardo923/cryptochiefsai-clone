import { z } from "zod"

export const signalSchema = z.object({
  direction: z.enum(["LONG", "SHORT", "NEUTRAL"]).describe("The recommended trade direction."),
  confidence: z.number().min(0).max(100).describe("Conviction in the setup, 0-100."),
  timeframe: z.string().describe("Intended holding horizon, e.g. 'Swing (2-7 days)'."),
  entry: z.object({
    low: z.number().describe("Lower bound of the entry zone in USD."),
    high: z.number().describe("Upper bound of the entry zone in USD."),
  }),
  stopLoss: z.number().describe("Invalidation / stop-loss price in USD."),
  targets: z
    .array(
      z.object({
        price: z.number().describe("Take-profit price in USD."),
        label: z.string().describe("Short label, e.g. 'TP1'."),
      }),
    )
    .describe("Ordered take-profit targets."),
  riskReward: z.number().describe("Approximate reward-to-risk ratio of the primary target."),
  summary: z.string().describe("One or two sentence plain-English thesis."),
  reasoning: z.array(z.string()).describe("3-5 concise bullet points justifying the call, citing the indicators."),
  invalidation: z.string().describe("What would invalidate this idea."),
})

export type TradeSignal = z.infer<typeof signalSchema>
