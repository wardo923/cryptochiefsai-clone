import { SiteHeader } from '@/components/site-header'
import { HeroSection } from '@/components/hero-section'
import { PortalSection } from '@/components/portal-section'
import { ReviewsSection } from '@/components/reviews-section'
import { FeaturesSection } from '@/components/features-section'
import { HowItWorksSection } from '@/components/how-it-works-section'
import { PricingSection } from '@/components/pricing-section'
import { FaqSection } from '@/components/faq-section'
import { SiteFooter } from '@/components/site-footer'
import { TelegramPopup } from '@/components/telegram-popup'

export default function Page() {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main>
        <HeroSection />
        <PortalSection />
        <ReviewsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <FaqSection />
      </main>
      <SiteFooter />
      <TelegramPopup />
    </div>
  )
}
