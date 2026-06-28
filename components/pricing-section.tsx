'use client'

import { useEffect, useState } from 'react'
import { CtaButton } from '@/components/cta-button'

function format(n: number) {
  return n.toString().padStart(2, '0')
}

export function PricingSection() {
  const [seconds, setSeconds] = useState(23 * 3600 + 59 * 60 + 59)

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 23 * 3600 + 59 * 60 + 59))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  return (
    <section id="pricing" className="border-t border-border/60 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-card">
          <div className="border-b border-border/60 bg-gradient-to-r from-primary/15 to-accent/15 p-8 text-center">
            <h3 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
              Limited-time pricing
            </h3>

            <div className="mt-6 flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Regular price
                </p>
                <p className="mt-1 text-lg font-semibold text-muted-foreground line-through">
                  $150 / month
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Today only
                </p>
                <p className="mt-1 bg-gradient-to-r from-primary to-accent bg-clip-text text-2xl font-bold text-transparent">
                  $75 / month
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Offer countdown
            </p>
            <p className="mt-2 font-mono text-4xl font-bold tabular-nums">
              {format(h)}:{format(m)}:{format(s)}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Click below to secure the discount in the same window.
            </p>

            <CtaButton href="#" className="mt-6 w-full sm:w-auto">
              ACCESS NOW — 50% OFF
            </CtaButton>

            <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
              This product provides analysis tools and trade ideas. Always do
              your own research and manage risk.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
