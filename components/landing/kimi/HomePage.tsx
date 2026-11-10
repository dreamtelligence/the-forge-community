import dynamic from 'next/dynamic';
import SmoothScroll from '@/components/SmoothScroll';
import CustomCursor from '@/components/landing/kimi/CustomCursor';
import Header from '@/components/landing/kimi/Header';
import LaunchHero from '@/components/LaunchHero';
import { I18nProvider } from '@/components/i18n/I18nProvider';
import type { Locale } from '@/lib/i18n';

// Below-the-fold Sektionen – lazy-loaded für kleineren Initial-Bundle
const B2BSourcing = dynamic(() => import('@/components/landing/kimi/B2BSourcing'));
const Marketing = dynamic(() => import('@/components/landing/kimi/Marketing'));
const Services = dynamic(() => import('@/components/landing/kimi/Services'));
const MarketIntelligence = dynamic(() => import('@/components/landing/kimi/MarketIntelligence'));
const Mission = dynamic(() => import('@/components/landing/kimi/Mission'));
const CategoryScroll = dynamic(() => import('@/components/landing/kimi/CategoryScroll'));
const Practice = dynamic(() => import('@/components/landing/kimi/Practice'));
const Testimonials = dynamic(() => import('@/components/landing/kimi/Testimonials'));
const ForgeFeatures = dynamic(() => import('@/components/landing/kimi/ForgeFeatures'));
const SignupCard = dynamic(() => import('@/components/landing/kimi/SignupCard'));
const FAQ = dynamic(() => import('@/components/landing/kimi/FAQ'));
const Footer = dynamic(() => import('@/components/landing/kimi/Footer'));

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
