'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { faqs } from '@/lib/site-data'
import { CtaButton } from '@/components/cta-button'

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" className="border-t border-border/60 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          FAQ
        </h2>
        <p className="mt-3 text-pretty text-muted-foreground">
          Quick answers about what the portal does and how to get access.
        </p>

        <div className="mt-8 space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = open === i
            return (
              <div
                key={faq.q}
                className="overflow-hidden rounded-xl border border-border/60 bg-card"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex min-h-12 w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-base font-medium">{faq.q}</span>
                  <ChevronDown
                    className={`size-5 shrink-0 text-muted-foreground transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <CtaButton href="#pricing">ACCESS NOW — $75/mo</CtaButton>
          <CtaButton href="#features" variant="ghost">
            Back to features
          </CtaButton>
        </div>
      </div>
    </section>
  )
}
