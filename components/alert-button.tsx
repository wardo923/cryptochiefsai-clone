"use client"

import { useState } from "react"
import { Bell, BellRing, Loader2, Check, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"

const PHONE_KEY = "sightline:phone"

export function AlertButton({ assetId, symbol }: { assetId: string; symbol: string }) {
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState("")
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle")
  const [message, setMessage] = useState<string | null>(null)

  // Prefill the last phone the user entered (saved locally for convenience).
  function openForm() {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(PHONE_KEY)
      if (saved && !phone) setPhone(saved)
    }
    setOpen(true)
  }

  async function subscribe() {
    setStatus("saving")
    setMessage(null)
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId, phone }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || "Couldn't set the alert")
      if (typeof window !== "undefined") window.localStorage.setItem(PHONE_KEY, phone)
      setStatus("done")
      setMessage(
        body.smsConfirmed
          ? `Done. We texted ${symbol} alerts confirmation to your phone.`
          : `Alert saved for ${symbol}. (Confirmation text couldn't send, but monitoring is on.)`,
      )
    } catch (e) {
      setStatus("error")
      setMessage((e as Error).message)
    }
  }

  if (status === "done") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-chart-3/30 bg-chart-3/10 px-3 py-2.5 text-sm text-chart-3">
        <Check className="size-4 shrink-0" />
        <span className="text-pretty">{message}</span>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={openForm}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-primary bg-primary/10 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
      >
        <Bell className="size-4" />
        Alert me when triggered
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/40 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <BellRing className="size-4 text-primary" />
        Text me when {symbol} flips LONG or SHORT
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 555 123 4567"
          className="h-11 flex-1 rounded-lg border border-border bg-card px-3 text-base outline-none transition-colors focus:border-ring sm:text-sm"
        />
        <button
          onClick={subscribe}
          disabled={status === "saving" || phone.trim().length < 8}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {status === "saving" ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />}
          Enable
        </button>
      </div>
      {status === "error" && message && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <TriangleAlert className="size-3.5 shrink-0" />
          {message}
        </div>
      )}
      <p className={cn("text-xs text-muted-foreground")}>
        Checked every 15 minutes. Standard message rates may apply. Reply STOP to opt out.
      </p>
    </div>
  )
}
