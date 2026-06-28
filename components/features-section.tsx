import {
  Activity,
  Brain,
  ShieldCheck,
  LayoutDashboard,
  Coins,
  Lock,
} from 'lucide-react'
import { features } from '@/lib/site-data'

const icons = [Activity, Brain, ShieldCheck, LayoutDashboard, Coins, Lock]

export function FeaturesSection() {
  return (
    <section id="features" className="border-t border-border/60 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = icons[i % icons.length]
            return (
              <div
                key={feature.title}
                className="rounded-2xl border border-border/60 bg-card p-6"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 text-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
