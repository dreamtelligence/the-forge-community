import SmoothScroll from '@/components/SmoothScroll';
import CustomCursor from '@/components/landing/kimi/CustomCursor';
import Header from '@/components/landing/kimi/Header';
import LaunchHero from '@/components/LaunchHero';
import B2BSourcing from '@/components/landing/kimi/B2BSourcing';
import Marketing from '@/components/landing/kimi/Marketing';
import Services from '@/components/landing/kimi/Services';
import MarketIntelligence from '@/components/landing/kimi/MarketIntelligence';
import Mission from '@/components/landing/kimi/Mission';
import CategoryScroll from '@/components/landing/kimi/CategoryScroll';
import Practice from '@/components/landing/kimi/Practice';
import Testimonials from '@/components/landing/kimi/Testimonials';
import ForgeFeatures from '@/components/landing/kimi/ForgeFeatures';
import Pricing from '@/components/landing/kimi/Pricing';
import FAQ from '@/components/landing/kimi/FAQ';
import Footer from '@/components/landing/kimi/Footer';
import SignupCard from '@/components/landing/kimi/SignupCard';
import { I18nProvider } from '@/components/i18n/I18nProvider';
import type { Locale } from '@/lib/i18n';

export default function HomePage({ locale, copy }: { locale: Locale; copy: Record<string, any> }) {
  return (
    <I18nProvider locale={locale} copy={copy}>
      <SmoothScroll>
        <div className="relative min-h-screen bg-black text-white">
          <main>
            <CustomCursor />
            <Header />
            <LaunchHero enableShaderBackground />
            <B2BSourcing />
            <Marketing />
            <Services />
            <MarketIntelligence />
            <Mission />
            <CategoryScroll />
            <Practice />
            <Testimonials />
            <ForgeFeatures />
            <Pricing />
            <section id="start" className="relative overflow-hidden py-16 lg:py-24 bg-black">
              <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
                <SignupCard />
              </div>
            </section>

            <FAQ />
          </main>
          <Footer />
        </div>
      </SmoothScroll>
    </I18nProvider>
  );
}
