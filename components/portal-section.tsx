import Image from 'next/image'
import { CtaButton } from '@/components/cta-button'

const shots = [
  { src: '/portal-1.png', alt: 'Portal screenshot showing a Bitcoin chart with a long signal' },
  { src: '/portal-2.png', alt: 'Portal screenshot showing an altcoin signal list' },
  { src: '/portal-3.png', alt: 'Portal screenshot showing AI reasoning panel' },
  { src: '/portal-4.png', alt: 'Portal screenshot showing stop-loss and risk metrics' },
]

export function PortalSection() {
  return (
    <section id="portal" className="border-t border-border/60 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Portal preview
        </h2>
        <p className="mt-3 text-pretty text-muted-foreground">
          Clear signals and on demand analysis at your finger tips
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {shots.map((shot) => (
            <div
              key={shot.src}
              className="overflow-hidden rounded-2xl border border-border/60 bg-card"
            >
              <Image
                src={shot.src || "/placeholder.svg"}
                alt={shot.alt}
                width={900}
                height={560}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-border/60 bg-gradient-to-r from-primary/10 to-accent/10 p-8 text-center">
          <p className="text-balance text-lg font-semibold">
            Ready to access the AI portal and lock in the 50% discount?
          </p>
          <CtaButton href="#pricing">ACCESS NOW</CtaButton>
        </div>
      </div>
    </section>
  )
}
