'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import Link from 'next/link';
import CtaButton from '@/components/landing/kimi/CtaButton';
import { useI18n } from '@/components/i18n/I18nProvider';


const socialIcons = [
  { label: 'Instagram', src: '/instagram-logo-vector_svgstack_com_4011770101591.svg' },
  { label: 'LinkedIn', src: '/linkedin-logo-icon_svgstack_com_3961770101621.svg' },
  {
    label: 'TikTok',
    src: '/tiktok-logo-icon_svgstack_com_4021770101570.svg',
    href: 'https://www.tiktok.com/@stakeandscale?is_from_webapp=1&sender_device=pc',
  },
  { label: 'X', src: '/x-logo_svgstack_com_5651770101637.svg' },
];

const paymentIcons = [
  { label: 'Visa', src: '/vendor/payment-logos/assets/cards/visa.svg' },
  { label: 'Mastercard', src: '/vendor/payment-logos/assets/cards/mastercard.svg' },
  { label: 'American Express', src: '/vendor/payment-logos/assets/cards/american-express.svg' },
  { label: 'PayPal', src: '/vendor/payment-logos/assets/apm/paypal.svg' },
  { label: 'Apple Pay', src: '/vendor/payment-logos/assets/wallets/apple-pay.svg' },
  { label: 'Google Pay', src: '/vendor/payment-logos/assets/wallets/google-pay.svg' },
];

export default function Footer() {
  const { copy, link } = useI18n();
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const quickLinks = copy?.footer?.quickLinks ?? [];
  const legalLinks = copy?.footer?.legalLinks ?? [];

  return (
    <footer className="pt-16 lg:pt-24 pb-0 bg-black border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
          className="text-center mb-12"
        >
          <CtaButton label={copy?.footer?.backToTop} variant="outline" size="md" onClick={scrollToTop} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
          className="flex flex-col sm:flex-row justify-between items-center gap-8 mb-16"
        >
          <div className="text-center sm:text-left">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-3">{copy?.footer?.quickLinksLabel}</p>
            <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
              {quickLinks.map((item: { label: string; href: string }) => (
                <a key={item.label} href={link(item.href)} className="text-white/70 text-sm hover:text-white transition-colors duration-200">
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          <div className="text-center sm:text-left">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-3">{copy?.footer?.legal}</p>
            <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
              {legalLinks.map((item: { label: string; href: string }) => (
                <Link key={item.label} href={link(item.href)} className="text-white/70 text-sm hover:text-white transition-colors duration-200">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="text-center sm:text-right">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-3">{copy?.footer?.contact}</p>
            <a href="mailto:info@stakeandscale.de" className="text-[var(--accent)] text-sm hover:text-white transition-colors duration-200">
              info@stakeandscale.de
            </a>
          </div>
        </motion.div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-14">
          <div className="text-center md:text-left">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-3">{copy?.footer?.social}</p>
            <div className="flex items-center justify-center md:justify-start gap-4">
              {socialIcons.map((icon) => {
                const content = (
                  <span className="inline-flex items-center justify-center relative w-5 h-5 sm:w-6 sm:h-6">
                    <Image
                      src={icon.src}
                      alt={icon.label}
                      fill
                      className="object-contain opacity-75 hover:opacity-100 transition duration-200"
                    />
                  </span>
                );

                if (!icon.href) {
                  return (
                    <span key={icon.label}>
                      {content}
                    </span>
                  );
                }

                return (
                  <a
                    key={icon.label}
                    href={icon.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={icon.label}
                  >
                    {content}
                  </a>
                );
              })}
            </div>
          </div>

          <div className="text-center md:text-right">
            <p className="text-white/50 text-xs uppercase tracking-widest mb-3">{copy?.footer?.payments}</p>
            <div className="grid grid-cols-3 gap-x-4 gap-y-3 items-center justify-center md:justify-end">
              {paymentIcons.map((icon) => (
                <span key={icon.label} className="inline-flex items-center justify-center relative h-5 sm:h-6 w-16">
                  <Image
                    src={icon.src}
                    alt={icon.label}
                    fill
                    className="object-contain opacity-75 hover:opacity-100 transition duration-200"
                  />
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center text-white/30 text-xs">
          {copy?.footer?.rights}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
          className="mt-6 sm:mt-8 overflow-hidden"
        >
          <div className="text-center text-white font-black leading-[0.9] tracking-tight text-[clamp(4.5rem,24vw,18rem)] translate-y-1 sm:translate-y-2">
            ©2026
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
