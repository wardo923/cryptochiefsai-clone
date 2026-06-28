import { CtaButton } from '@/components/cta-button'

const steps = [
  {
    title: 'Select a coin',
    body: 'Choose BTC or an altcoin from the dashboard list to load signals & context.',
  },
  {
    title: 'Review the idea',
    body: 'See entry range, key levels, and whether it is a Long or Short setup.',
  },
  {
    title: 'Manage risk',
    body: 'Use stop-loss placement ideas and acceptance notes to stay disciplined.',
  },
]

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="border-t border-border/60 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h3 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          How it works
        </h3>

        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="rounded-2xl border border-border/60 bg-card p-6"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent text-base font-bold text-primary-foreground">
                {i + 1}
              </span>
              <h4 className="mt-4 text-lg font-semibold">{step.title}</h4>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <CtaButton href="#pricing">ACCESS NOW</CtaButton>
          <CtaButton href="#faq" variant="ghost">
            Questions?
          </CtaButton>
        </div>
      </div>
    </section>
  )
}
