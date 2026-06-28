'use client'

import { useState } from 'react'
import { Send, X } from 'lucide-react'

export function TelegramPopup() {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <a
        href="#"
        className="relative flex items-center gap-3 rounded-2xl border border-border/60 bg-card/95 py-3 pl-3 pr-5 shadow-xl shadow-black/40 backdrop-blur transition-colors hover:border-primary/60"
      >
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            setVisible(false)
          }}
          aria-label="Close popup"
          className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
        >
          <X className="size-3" />
        </button>
        <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Send className="size-5" />
        </span>
        <span className="text-xs font-bold uppercase leading-tight tracking-wide">
          Join the free
          <br />
          Telegram group
        </span>
      </a>
    </div>
  )
}
