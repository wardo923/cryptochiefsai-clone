import Image from 'next/image'
import { Check, Play } from 'lucide-react'
import { CtaButton } from '@/components/cta-button'

const checklist = [
  'Real-time Ideas for Long and Short Trades',
  'AI Analysis with Reasoning and Key Levels',
  'Stop-loss Placement Ideas to Manage Risk',
]

export function HeroSection() {
  return (
    <section id="top" className="relative overflow-hidden">
      {/* ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute -left-32 top-0 size-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-0 top-40 size-96 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
        <h1 className="max-w-3xl text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Dominate crypto with{' '}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            AI-driven
          </span>{' '}
          Signals &amp; Analysis
        </h1>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* video / preview card */}
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-border/60 bg-card">
            <Image
              src="/crypto-chiefs-logo.png"
              alt="Crypto Chiefs AI"
              width={420}
              height={120}
              className="absolute left-1/2 top-1/2 w-2/3 max-w-xs -translate-x-1/2 -translate-y-1/2 opacity-90"
            />
            <button
              type="button"
              aria-label="Play intro video"
              className="absolute bottom-4 left-4 flex size-12 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur transition-colors hover:bg-background"
            >
              <Play className="size-5 translate-x-0.5 fill-current" />
            </button>
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-border/60">
              <div className="h-full w-1/4 bg-gradient-to-r from-primary to-accent" />
            </div>
          </div>

          {/* offer card */}
          <div className="rounded-2xl border border-border/60 bg-card p-6">
            <ul className="space-y-3">
              {checklist.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent">
                    <Check className="size-3 text-primary-foreground" />
                  </span>
                  <span className="text-sm font-medium leading-relaxed text-foreground/90">
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-sm text-muted-foreground line-through">
                Was $150 / month
              </span>
              <span className="text-4xl font-bold text-foreground">$75</span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <CtaButton href="#pricing" className="w-full">
                ACCESS NOW
              </CtaButton>
              <CtaButton href="#portal" variant="ghost" className="w-full">
                Portal preview
              </CtaButton>
            </div>

            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              Personally trained model that reads BTC &amp; Altcoin charts in the
              same way as Chiefra.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Trading involves risk. This is analysis tooling, not financial
              advice.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
